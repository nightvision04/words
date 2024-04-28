import { NextResponse } from 'next/server';
import setupDatabase from '../../../lib/db';

export async function POST(req: Request) {
    const db = await setupDatabase();
    const { token } = await req.json();

    try {
        const player = await db.get(`SELECT Id FROM Players WHERE Token = ?`, [token]);
        if (player) {
            return new NextResponse(JSON.stringify({ success: true, playerId: player.Id }), { status: 200 });
        } else {
            return new NextResponse(JSON.stringify({ success: false, message: 'Token not found' }), { status: 200 });
        }
    } catch (error) {
        return new NextResponse(JSON.stringify({ success: false, message: 'Database error', error }), { status: 500 });
    }
}
