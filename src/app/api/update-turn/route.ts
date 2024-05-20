import { NextResponse } from 'next/server';
import setupDatabase from '../../../lib/db';
import { convertTilesToScrabblePieces } from '../../../scripts/tileConversion';

interface Tile {
  letter: string;
  X: number;
  Y: number;
}

interface ScrabblePiece {
  letter: string;
  points: number;
}

export async function POST(req: Request) {
  const db = await setupDatabase();
  const { gameId, playerId, action, playedTiles, currentTiles }: { gameId: number; playerId: number; action: string; playedTiles: Tile[]; currentTiles: Tile[] } = await req.json();

  try {
    const game = await db.get(`SELECT * FROM Games WHERE Id = ?`, [gameId]);
    if (!game) {
      await db.close();
      return new NextResponse(JSON.stringify({ success: false, message: 'Game not found' }), { status: 404 });
    }

    if (action === 'endTurn') {
      const isValid = await validateWords(gameId, playedTiles);
      if (!isValid) {
        await db.close();
        return new NextResponse(JSON.stringify({ success: false, message: 'Invalid move' }), { status: 400 });
      }

      const score = calculateScore(playedTiles);
      const updatedTiles = updateBoard(game.Board, playedTiles);

      await db.run(`
        UPDATE GamesTurn
        SET LettersPlayed = ?, TurnScore = ?, EndLetters = ?, LastModified = datetime('now')
        WHERE GameId = ? AND LastModified = (
          SELECT MAX(LastModified) FROM GamesTurn WHERE GameId = ?
        )`, [JSON.stringify(playedTiles), score, JSON.stringify(currentTiles), gameId, gameId]
      );

      await db.run(`
        UPDATE Games
        SET Board = ?, Turn = ?
        WHERE Id = ?`, [JSON.stringify(updatedTiles), game.Turn + 1, gameId]
      );

      const scrabblePieces = convertTilesToScrabblePieces(currentTiles);
      const { newTiles, remainingTiles } = drawTiles(scrabblePieces, scrabblePieces.length);

      await db.run(`
        INSERT INTO GamesTurn (GameId, IsCreatorTurn, StartLetters, LettersToAdd, DateCreated, LastModified)
        VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`, [gameId, 1 - game.IsCreatorTurn, JSON.stringify(currentTiles), JSON.stringify(newTiles)]
      );

      const piecesField = game.IsCreatorTurn ? 'CreatorPieces' : 'JoinerPieces';
      await db.run(`
        UPDATE Games
        SET ${piecesField} = ?
        WHERE Id = ?`, [JSON.stringify(remainingTiles), gameId]
      );

      await db.close();
      return new NextResponse(JSON.stringify({ success: true, message: 'Turn updated successfully' }), { status: 200 });
    } else {
      await db.close();
      return new NextResponse(JSON.stringify({ success: false, message: 'Invalid action' }), { status: 400 });
    }
  } catch (error) {
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

async function validateWords(gameId: number, newTiles: Tile[]): Promise<boolean> {
  const db = await setupDatabase();

  try {
    const game = await db.get(`SELECT Board FROM Games WHERE Id = ?`, [gameId]);
    if (!game) {
      console.error('Game not found');
      return false;
    }

    const board: string[][] = JSON.parse(game.Board);

    console.log('Current Board:', board);
    console.log('New Tiles:', newTiles);

    // Only validate new tiles, ignore already placed tiles
    for (const tile of newTiles) {
      if (board[tile.Y][tile.X] !== '') {
        console.error(`Tile placement error: Space is already occupied at (${tile.X}, ${tile.Y}).`);
        return false;
      }
      board[tile.Y][tile.X] = tile.letter;
    }

    // Add logic to validate words here
    const isValid = checkIfWordsAreValid(board, newTiles); // Implement this function
    return isValid;
  } catch (error) {
    console.error('Database error:', error);
    return false;
  } finally {
    db.close();
  }
}

function checkIfWordsAreValid(board: string[][], newTiles: Tile[]): boolean {
  // Implement word validation logic here
  // Example: Check if tiles form valid words horizontally and vertically
  return true; // Placeholder
}
