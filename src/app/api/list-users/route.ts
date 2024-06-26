import { NextResponse } from 'next/server';
import setupDatabase from '../../../lib/db';

interface ApiResponse {
  success: boolean;
  players?: any[];
  message?: string;
  error?: any;
}

export async function GET(req: Request) {
  try {
    const db = await setupDatabase();
    const players = await db.all('SELECT * FROM Players');
    const simplifiedPlayers = players.map(player => ({
      Id: player.Id,
      Name: player.Name,
      LastLogin: player.LastLogin,
      // other fields as necessary
    }));
    await db.close();
    console.log('Players:', players);

    const response: ApiResponse = {
      success: true,
      players: simplifiedPlayers,
    };

    return new NextResponse(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    const errorResponse: ApiResponse = {
      success: false,
      message: 'Database error',
      error,
    };

    return new NextResponse(JSON.stringify(errorResponse), {
      status: 500,
    });
  }
}