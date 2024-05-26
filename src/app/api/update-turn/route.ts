// src/app/api/update-turn/route.ts
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
    console.log('Retrieved game:', game); // Debugging

    if (!game) {
      await db.run('ROLLBACK');
      await db.close();
      return new NextResponse(JSON.stringify({ success: false, message: 'Game not found' }), { status: 404 });
    }

    const lastTurn = await db.get(`
      SELECT * FROM GamesTurn
      WHERE GameId = ?
      ORDER BY LastModified DESC
      LIMIT 1`, [gameId]);

    if (!lastTurn) {
      await db.run('ROLLBACK');
      await db.close();
      return new NextResponse(JSON.stringify({ success: false, message: 'No previous turn found' }), { status: 404 });
    }

    const isCreatorTurn = lastTurn.IsCreatorTurn;
    console.log('lastTurn.IsCreatorTurn:', lastTurn.IsCreatorTurn);
    console.log('isCreatorTurn:', isCreatorTurn);

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

      // Only update the board after successful validation
      const updatedBoard = updateBoard(game.Board, playedTiles, currentTiles);
      const score = calculateScore(playedTiles);

      const scrabblePieces = convertTilesToScrabblePieces(currentTiles);
      const { newTiles, remainingTiles } = drawTiles(scrabblePieces, scrabblePieces.length);

      // Update the existing turn
      const endLetters = updateEndLetters(JSON.parse(lastTurn.StartLetters), playedTiles);

      await db.run(`
        UPDATE GamesTurn
        SET LettersPlayed = ?, TurnScore = ?, EndLetters = ?, LettersAddedAfterTurn = ?, LastModified = datetime('now'), IsTurnEnded = 1
        WHERE GameId = ? AND Id = ?`, [JSON.stringify(playedTiles), score, JSON.stringify(endLetters), JSON.stringify(newTiles), gameId, lastTurn.Id]
      );

      await db.run(`
        UPDATE Games
        SET Board = ?, Turn = ?
        WHERE Id = ?`, [JSON.stringify(updatedBoard), game.Turn + 1, gameId]
      );

      const nextIsCreatorTurn = 1 - isCreatorTurn;
      console.log('nextIsCreatorTurn:', nextIsCreatorTurn);

      const nextStartLetters = nextIsCreatorTurn ? JSON.stringify(JSON.parse(game.CreatorPieces).slice(0, 7)) : JSON.stringify(JSON.parse(game.JoinerPieces).slice(0, 7));

      await db.run(`
        INSERT INTO GamesTurn (GameId, IsCreatorTurn, StartLetters, DateCreated, LastModified, IsTurnEnded)
        VALUES (?, ?, ?, datetime('now'), datetime('now'), 0)`, [gameId, nextIsCreatorTurn, nextStartLetters]
      );

      // Remove played tiles from the player's pieces
      const updatedPieces = removePlayedTiles(isCreatorTurn ? JSON.parse(game.CreatorPieces) : JSON.parse(game.JoinerPieces), playedTiles);
      const piecesField = isCreatorTurn ? 'CreatorPieces' : 'JoinerPieces';
      await db.run(`
        UPDATE Games
        SET ${piecesField} = ?, ${isCreatorTurn ? 'CreatorCurrentTiles' : 'JoinerCurrentTiles'} = ?
        WHERE Id = ?`, [JSON.stringify(updatedPieces), JSON.stringify(newTiles), gameId]
      );

      await db.run('COMMIT');  // Commit transaction
      await db.close();
      return new NextResponse(JSON.stringify({ success: true, message: 'Turn updated successfully' }), { status: 200 });
    } else {
      await db.run('ROLLBACK');
      await db.close();
      return new NextResponse(JSON.stringify({ success: false, message: 'Invalid action' }), { status: 400 });
    }
  } catch (error) {
    console.error('Error during update-turn:', error);

    // Type guard to check if error is an instance of Error
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
  // Implement your scoring logic here
  return tiles.reduce((score, tile) => {
    // Example scoring: each tile is worth 1 point
    return score + 1;
  }, 0);
}

function updateBoard(currentBoard: string, tiles: Tile[], currentTurnTiles: Tile[]): string[][] {
  const board: string[][] = JSON.parse(currentBoard);
  tiles.forEach(tile => {
    // Always override the tile, regardless of occupancy
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

/**
 * Shuffles an array using Fisher-Yates (Knuth) shuffle algorithm.
 */
function shuffleArray<T>(array: T[]): T[] {
  let currentIndex = array.length, randomIndex;

  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]
    ];
  }

  return array;
}

function updateEndLetters(startLetters: ScrabblePiece[], playedTiles: Tile[]): ScrabblePiece[] {
  const updatedLetters = [...startLetters];

  playedTiles.forEach(tile => {
    const index = updatedLetters.findIndex(piece => piece.letter === tile.letter);
    if (index !== -1) {
      updatedLetters.splice(index, 1);
    }
  });

  return updatedLetters;
}

async function validateWords(currentBoard: string, newTiles: Tile[]): Promise<{ isValid: boolean, error?: string }> {
  const board: string[][] = JSON.parse(currentBoard);

  console.log('Current Board:', board);
  console.log('New Tiles:', newTiles);

  // Use a temporary board to validate the new tiles
  const tempBoard = board.map(row => [...row]);

  // Only validate new tiles, ignore already placed tiles
  for (const tile of newTiles) {
    // Allow overriding by skipping the occupied check
    tempBoard[tile.Y][tile.X] = tile.letter;
  }

  // Add logic to validate words here
  const isValid = checkIfWordsAreValid(tempBoard, newTiles); // Implement this function
  return { isValid };
}

function checkIfWordsAreValid(board: string[][], newTiles: Tile[]): boolean {
  // Implement word validation logic here
  // Example: Check if tiles form valid words horizontally and vertically
  // Add more detailed validation logic as needed
  return true; // Placeholder
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
