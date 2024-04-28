import { NextResponse } from 'next/server';
import setupDatabase from '../../../lib/db';
import { v4 as uuidv4 } from 'uuid';

interface ApiResponse {
  success: boolean;
  token?: string;
  player?: any;
  message?: string;
  error?: any;
}

export async function POST(req: Request) {
  try {
    const { name } = await req.json();
    const token = uuidv4();
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 1); // Set expiry to 24 hours later

    const db = await setupDatabase();
    const player = await db.run(
      `INSERT INTO Players (Name, LastLogin, LastModified)
      VALUES (?, datetime('now'), datetime('now'))
      ON CONFLICT (Name) DO UPDATE SET
        LastLogin = datetime('now'),
        LastModified = datetime('now')`,
      [name]
    );

    const response: ApiResponse = {
      success: true,
      token,
      player,
    };

    const headers = {
      'Set-Cookie': `token=${token}; Expires=${expiry.toUTCString()}; Path=/`,
      'Content-Type': 'application/json',
    };

    return new NextResponse(JSON.stringify(response), { status: 200, headers });
  } catch (error) {
    const errorResponse: ApiResponse = {
      success: false,
      message: 'Database error',
      error,
    };

    return new NextResponse(JSON.stringify(errorResponse), { status: 500 });
  }
}