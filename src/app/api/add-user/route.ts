import { NextResponse } from 'next/server';
import setupDatabase from '../../../lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: Request) {
    const db = await setupDatabase();
    const { name, token } = await req.json();
    let sessionToken = token;

    try {
        // Check if the token is valid
        const playerCheck = await db.get(
            `SELECT * FROM Players WHERE Token = ?`,
            [token]
        );

        if (playerCheck && new Date() < new Date(playerCheck.TokenExpiry)) {
            // Token is valid, update last login
            await db.run(
                `UPDATE Players SET LastLogin = datetime('now') WHERE Token = ?`,
                [token]
            );
        } else {
            // Token is not valid or does not exist, create a new one
            sessionToken = uuidv4();
            const expiry = new Date();
            expiry.setDate(expiry.getDate() + 1); // Set expiry to 24 hours later

            await db.run(
                `INSERT INTO Players (Name, LastLogin, LastModified, Token, TokenExpiry)
                VALUES (?, datetime('now'), datetime('now'), ?, ?)
                ON CONFLICT(Name) DO UPDATE SET
                LastLogin = datetime('now'), LastModified = datetime('now'), Token = ?, TokenExpiry = ?`,
                [name, sessionToken, expiry.toISOString(), sessionToken, expiry.toISOString()]
            );
        }

        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 1); // Set expiry to 24 hours later

        const response = {
          success: true,
          token: sessionToken
        };

        return new NextResponse(JSON.stringify(response), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Set-Cookie': `sessionToken=${sessionToken}; Expires=${expiry.toUTCString()}; Path=/`,
          }
        });
    } catch (error) {
        return new NextResponse(JSON.stringify({ success: false, message: 'Database error', error }), {
            status: 500
        });
    }
}
