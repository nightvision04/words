import { NextResponse } from 'next/server';
import setupDatabase from '../../../lib/db';

export async function POST(req: Request) {
    const db = await setupDatabase();
    const { playerId } = await req.json();

    try {
        const invitation = await db.get(`SELECT i.*, p.Name FROM Invitations i JOIN Players p ON p.Id = i.SenderId WHERE ReceiverId = ? AND Status = 'pending'`, [playerId]);
        if (invitation) {
            return new NextResponse(JSON.stringify({ success: true, valid: true, invitation }), { status: 200 });
        } else {
            return new NextResponse(JSON.stringify({ success: false, valid: false, message: 'No invitations found' }), { status: 200 });
        }
    } catch (error) {
        return new NextResponse(JSON.stringify({ success: false, valid: false, message: 'Database error', error }), { status: 500 });
    }
}
