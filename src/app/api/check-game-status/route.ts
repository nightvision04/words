import { NextResponse } from 'next/server';
import setupDatabase from '../../../lib/db';

export async function POST(req: Request) {
    const db = await setupDatabase();
    const { invitationId } = await req.json();  // Using invitationId to fetch game status

    try {
        // Fetch the game that matches the invitation ID
        const game = await db.get(`
            SELECT g.*, gt.*  FROM Games g
            JOIN Invitations i ON g.InvitationsId = i.Id
            JOIN GamesTurn gt ON gt.GameId = g.Id
            WHERE i.Id = ? AND i.Status = 'accepted' and LettersPlayed IS NULL
            ORDER BY gt.Id DESC
            LIMIT 1`, [invitationId]);

        await db.close();

        if (game && game.IsStarted) {
            return new NextResponse(JSON.stringify({ success: true, game }), { status: 200 });
        } else {
            return new NextResponse(JSON.stringify({ success: false, message: 'Waiting for player' }), { status: 200 });
        }
    } catch (error) {
        await db.close();
        return new NextResponse(JSON.stringify({ success: false, message: 'Database error', error }), { status: 500 });
    }
}
