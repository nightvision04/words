// src/app/api/update-board/route.ts
import { NextResponse } from 'next/server';
import setupDatabase from '../../../lib/db';

interface Tile {
  letter: string;
  X: number;
  Y: number;
}

export async function POST(req: Request) {
  const db = await setupDatabase();
  const { gameId, playerId, tiles }: { gameId: number; playerId: number; tiles: Tile[] } = await req.json();

    console.log('Tiles:', tiles); // Debugging
    console.log('GameId:', gameId); // Debugging

  try {
    const game = await db.get(`SELECT * FROM Games WHERE Id = ?`, [gameId]);
    if (!game) {
      await db.close();
      return new NextResponse(JSON.stringify({ success: false, message: 'Game not found' }), { status: 404 });
    }

    const board: string[][] = JSON.parse(game.Board);

    // Validate that the spaces are not already occupied
    for (const tile of tiles) {
      if (board[tile.Y][tile.X] !== '') {
        await db.close();
        return new NextResponse(JSON.stringify({ success: false, message: `Space is already occupied at (${tile.X}, ${tile.Y})` }), { status: 400 });
      }
    }

    // Temporarily update the board with the new tiles for validation
    tiles.forEach(tile => {
      board[tile.Y][tile.X] = tile.letter;
    });

    await db.run(`UPDATE Games SET Board = ? WHERE Id = ?`, [JSON.stringify(board), gameId]);
    await db.close();

    return new NextResponse(JSON.stringify({ success: true, message: 'Board updated successfully' }), { status: 200 });
  } catch (error) {
    await db.close();
    return new NextResponse(JSON.stringify({ success: false, message: 'Database error', error }), { status: 500 });
  }
}
