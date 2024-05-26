import { NextResponse } from 'next/server';
import setupDatabase from '../../../lib/db';
import { convertTilesToScrabblePieces } from '../../../scripts/tileConversion';

interface Tile {
  letter: string;
  X: number;
  Y: number;
  isVisible: boolean;
}

interface ScrabblePiece {
  letter: string;
  points: number;
}

export async function POST(req: Request) {
  const db = await setupDatabase();
  const { gameId, playerId, action, playedTiles, currentTiles }: { gameId: number; playerId: number; action: string; playedTiles: Tile[]; currentTiles: Tile[] } = await req.json();

  try {
    await db.run('BEGIN TRANSACTION');  // Start transaction

    const game = await db.get(`SELECT * FROM Games WHERE Id = ?`, [gameId]);
    if (!game) {
      await db.run('ROLLBACK');
      await db.close();
      return new NextResponse(JSON.stringify({ success: false, message: 'Game not found' }), { status: 404 });
    }

    const isCreator = game.CreatorId === playerId;
    const lastTurn = await db.get(`
      SELECT * FROM GamesTurn
      WHERE GameId = ? AND IsCreatorTurn = ?
      ORDER BY LastModified DESC
      LIMIT 1`, [gameId, isCreator ? 1 : 0]);

    if (!lastTurn) {
      await db.run('ROLLBACK');
      await db.close();
      return new NextResponse(JSON.stringify({ success: false, message: 'No previous turn found' }), { status: 404 });
    }

    const isCreatorTurn = lastTurn.IsCreatorTurn;
    if (isNaN(isCreatorTurn)) {
      throw new Error('isCreatorTurn is not a valid number');
    }

    if (action === 'endTurn') {
      if (lastTurn.IsTurnEnded) {
        await db.run('ROLLBACK');
        await db.close();
        return new NextResponse(JSON.stringify({ success: false, message: 'Turn already ended' }), { status: 400 });
      }

      if (playedTiles.length === 0) {
        await db.run('ROLLBACK');
        await db.close();
        return new NextResponse(JSON.stringify({ success: false, message: 'No tiles played' }), { status: 400 });
      }

      const { isValid, error: validationError } = await validateWords(game.Board, playedTiles);
      if (!isValid) {
        await db.run('ROLLBACK');
        await db.close();
        return new NextResponse(JSON.stringify({ success: false, message: validationError || 'Invalid move' }), { status: 400 });
      }

      const updatedBoard = updateBoard(game.Board, playedTiles, currentTiles);
      const score = calculateScore(playedTiles);

      // Fetch the current pieces from the database
      const currentPieces = JSON.parse(isCreator ? game.CreatorPieces : game.JoinerPieces) || [];
      const startLetters = JSON.parse(lastTurn.StartLetters) || [];

      // Compute the available pieces by removing startLetters from currentPieces
      const availablePieces = currentPieces.filter(
        (piece: ScrabblePiece) => !startLetters.some((start: ScrabblePiece) => start.letter === piece.letter)
      );

      const scrabblePieces = convertTilesToScrabblePieces(availablePieces);
      const { newTiles, remainingTiles } = drawTiles(scrabblePieces, currentTiles.length);

      const endLetters = updateEndLetters(JSON.parse(lastTurn.StartLetters), playedTiles);

      // Update the turn with end letters and new tiles
      await db.run(`
        UPDATE GamesTurn
        SET LettersPlayed = ?, TurnScore = ?, EndLetters = ?, LettersAddedAfterTurn = ?, LastModified = datetime('now'), IsTurnEnded = 1
        WHERE GameId = ? AND Id = ?`, [JSON.stringify(playedTiles), score, JSON.stringify(endLetters), JSON.stringify(newTiles), gameId, lastTurn.Id]
      );

      await db.run('COMMIT');  // Commit transaction

      // Log the contents before summing and updating the Games table
      console.log('Last Turn End Letters:', lastTurn.EndLetters);
      console.log('Last Turn Letters Added After Turn:', lastTurn.LettersAddedAfterTurn);
  

      // Ensure both fields are not null before updating
      const updatedLastTurn = await db.get(`
        SELECT EndLetters, LettersAddedAfterTurn
        FROM GamesTurn
        WHERE GameId = ? AND Id = ?`, [gameId, lastTurn.Id]);

      if (updatedLastTurn.EndLetters === null || updatedLastTurn.LettersAddedAfterTurn === null) {
        throw new Error('EndLetters or LettersAddedAfterTurn are null after update');
      }

        // Add any available json lists from the fields lastTurn.EndLetters and lastTurn.LettersAddedAfterTurn
      // to a new array
      const morenewTiles = JSON.parse(updatedLastTurn.LettersAddedAfterTurn) || [];
      const moreendLetters = JSON.parse(updatedLastTurn.EndLetters) || [];
      const totalNewTiles = [...morenewTiles, ...moreendLetters];

      // Log the contents before summing and updating the Games table
      console.log('Last Turn End Letters:', updatedLastTurn.EndLetters);
      console.log('Last Turn Letters Added After Turn:', updatedLastTurn.LettersAddedAfterTurn);

      // Update the Games table with the new tiles in CurrentCreatorTiles or CurrentJoinerTiles, based on the turn
      await db.run(`
        UPDATE Games
        SET ${isCreatorTurn ? 'CreatorCurrentTiles' : 'JoinerCurrentTiles'} = ?
        WHERE Id = ?`, [JSON.stringify(totalNewTiles), gameId]
      );

      // Update the board and turn
      await db.run(`
        UPDATE Games
        SET Board = ?, Turn = ?
        WHERE Id = ?`, [JSON.stringify(updatedBoard), game.Turn + 1, gameId]
      );

      const nextIsCreatorTurn = 1 - isCreatorTurn;
      const nextStartLetters = nextIsCreatorTurn ? JSON.stringify(JSON.parse(game.CreatorPieces).slice(0, 7)) : JSON.stringify(JSON.parse(game.JoinerPieces).slice(0, 7));
      await db.run(`
        INSERT INTO GamesTurn (GameId, IsCreatorTurn, StartLetters, DateCreated, LastModified, IsTurnEnded)
        VALUES (?, ?, ?, datetime('now'), datetime('now'), 0)`, [gameId, nextIsCreatorTurn, nextStartLetters]
      );

      await db.close();
      return new NextResponse(JSON.stringify({ success: true, message: 'Turn updated successfully' }), { status: 200 });
    } else {
      await db.run('ROLLBACK');
      await db.close();
      return new NextResponse(JSON.stringify({ success: false, message: 'Invalid action' }), { status: 400 });
    }
  } catch (error) {
    console.error('Error during update-turn:', error);

    if (error instanceof Error) {
      await db.run('ROLLBACK');
      await db.close();
      return new NextResponse(JSON.stringify({ success: false, message: 'Database error', error: error.message }), { status: 500 });
    } else {
      await db.run('ROLLBACK');
      await db.close();
      return new NextResponse(JSON.stringify({ success: false, message: 'Unknown error occurred' }), { status: 500 });
    }
  }
}

function calculateScore(tiles: Tile[]): number {
  return tiles.reduce((score, tile) => score + 1, 0);
}

function updateBoard(currentBoard: string, tiles: Tile[], currentTurnTiles: Tile[]): string[][] {
  const board: string[][] = JSON.parse(currentBoard);
  tiles.forEach(tile => {
    board[tile.Y][tile.X] = tile.letter;
  });
  return board;
}

function drawTiles(pool: ScrabblePiece[], currentTileCount: number): { newTiles: ScrabblePiece[], remainingTiles: ScrabblePiece[] } {
  const neededTiles = 7 - currentTileCount;
  const shuffledTiles = shuffleArray(pool);
  const newTiles = shuffledTiles.slice(0, neededTiles);
  const remainingTiles = shuffledTiles.slice(neededTiles);
  return { newTiles, remainingTiles };
}

function shuffleArray<T>(array: T[]): T[] {
  let currentIndex = array.length, randomIndex;

  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }

  return array;
}

function updateEndLetters(startLetters: ScrabblePiece[], playedTiles: Tile[]): ScrabblePiece[] {
  const updatedLetters = [...startLetters];
  playedTiles.forEach(tile => {
    const index = updatedLetters.findIndex(letter => letter.letter === tile.letter);
    if (index !== -1) {
      updatedLetters.splice(index, 1);
    }
  });
  return updatedLetters;
}

async function validateWords(currentBoard: string, newTiles: Tile[]): Promise<{ isValid: boolean, error?: string }> {
  const board: string[][] = JSON.parse(currentBoard);
  const tempBoard = board.map(row => [...row]);

  for (const tile of newTiles) {
    tempBoard[tile.Y][tile.X] = tile.letter;
  }

  const isValid = checkIfWordsAreValid(tempBoard, newTiles);
  return { isValid };
}

function checkIfWordsAreValid(board: string[][], newTiles: Tile[]): boolean {
  return true;
}

function removePlayedTiles(playerPieces: ScrabblePiece[], playedTiles: Tile[]): ScrabblePiece[] {
  const remainingPieces = [...playerPieces];

  playedTiles.forEach(tile => {
    const index = remainingPieces.findIndex(piece => piece.letter === tile.letter);
    if (index !== -1) {
      remainingPieces.splice(index, 1);
    }
  });

  return remainingPieces;
}
