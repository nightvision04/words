import { NextResponse } from 'next/server';
import setupDatabase from '../../../lib/db';
import { convertTilesToScrabblePieces } from '../../../scripts/tileConversion';

interface Tile {
  letter: string;
  X: number;
  Y: number;
  isVisible: boolean; // Add isVisible property to Tile interface
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

    if (action === 'endTurn') {
      const lastTurn = await db.get(`
        SELECT * FROM GamesTurn
        WHERE GameId = ?
        ORDER BY LastModified DESC
        LIMIT 1`, [gameId]);

      if (lastTurn.IsTurnEnded) {
        await db.run('ROLLBACK');
        await db.close();
        return new NextResponse(JSON.stringify({ success: false, message: 'Turn already ended' }), { status: 400 });
      }

      const isValid = await validateWords(game.Board, playedTiles);
      if (!isValid) {
        await db.run('ROLLBACK');
        await db.close();
        return new NextResponse(JSON.stringify({ success: false, message: 'Invalid move' }), { status: 400 });
      }

      const score = calculateScore(playedTiles);
      const updatedTiles = updateBoard(game.Board, playedTiles);

      await db.run(`
        UPDATE GamesTurn
        SET LettersPlayed = ?, TurnScore = ?, EndLetters = ?, LastModified = datetime('now'), IsTurnEnded = 1
        WHERE GameId = ? AND Id = ?`, [JSON.stringify(playedTiles), score, JSON.stringify(currentTiles), gameId, lastTurn.Id]
      );

      await db.run(`
        UPDATE Games
        SET Board = ?, Turn = ?
        WHERE Id = ?`, [JSON.stringify(updatedTiles), game.Turn + 1, gameId]
      );

      const scrabblePieces = convertTilesToScrabblePieces(currentTiles);
      const { newTiles, remainingTiles } = drawTiles(scrabblePieces, scrabblePieces.length);

      await db.run(`
        INSERT INTO GamesTurn (GameId, IsCreatorTurn, StartLetters, LettersToAdd, DateCreated, LastModified, IsTurnEnded)
        VALUES (?, ?, ?, ?, datetime('now'), datetime('now'), 0)`, [gameId, 1 - game.IsCreatorTurn, JSON.stringify(currentTiles), JSON.stringify(newTiles)]
      );

      const piecesField = game.IsCreatorTurn ? 'CreatorPieces' : 'JoinerPieces';
      await db.run(`
        UPDATE Games
        SET ${piecesField} = ?
        WHERE Id = ?`, [JSON.stringify(remainingTiles), gameId]
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
    await db.run('ROLLBACK');
    await db.close();
    return new NextResponse(JSON.stringify({ success: false, message: 'Database error', error }), { status: 500 });
  }
}

function calculateScore(tiles: Tile[]): number {
  // Implement your scoring logic here
  return tiles.reduce((score, tile) => {
    // Example scoring: each tile is worth 1 point
    return score + 1;
  }, 0);
}

function updateBoard(currentBoard: string, tiles: Tile[]): string[][] {
  const board: string[][] = JSON.parse(currentBoard);
  tiles.forEach(tile => {
    if (board[tile.Y][tile.X] === '') {
      board[tile.Y][tile.X] = tile.letter;
    } else {
      console.error(`Cannot update board: Space at (${tile.X}, ${tile.Y}) is already occupied.`);
    }
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

async function validateWords(currentBoard: string, newTiles: Tile[]): Promise<boolean> {
  const board: string[][] = JSON.parse(currentBoard);

  console.log('Current Board:', board);
  console.log('New Tiles:', newTiles);

  // Use a temporary board to validate the new tiles
  const tempBoard = board.map(row => [...row]);

  // Only validate new tiles, ignore already placed tiles
  for (const tile of newTiles) {
    if (tempBoard[tile.Y][tile.X] !== '') {
      console.error(`Tile placement error: Space is already occupied at (${tile.X}, ${tile.Y}). Current value: ${tempBoard[tile.Y][tile.X]}`);
      return false;
    }
    tempBoard[tile.Y][tile.X] = tile.letter;
  }

  // Add logic to validate words here
  const isValid = checkIfWordsAreValid(tempBoard, newTiles); // Implement this function
  return isValid;
}

function checkIfWordsAreValid(board: string[][], newTiles: Tile[]): boolean {
  // Implement word validation logic here
  // Example: Check if tiles form valid words horizontally and vertically
  // Add more detailed validation logic as needed
  return true; // Placeholder
}
