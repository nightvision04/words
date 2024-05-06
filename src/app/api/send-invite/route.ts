import { NextResponse } from 'next/server';
import setupDatabase from '../../../lib/db';

export async function POST(req: Request) {
    const db = await setupDatabase();
    const { senderId, receiverId } = await req.json();
    try {
        const receiver = await db.get(`SELECT Id FROM Players WHERE Id = ?`, [receiverId]);
        if (!receiver) {
            await db.close();
            return new NextResponse(JSON.stringify({ success: false, message: 'Receiver not found' }), { status: 404 });
        }

        // Insert the invitation and retrieve the last inserted row ID
        const result = await db.run(`INSERT INTO Invitations (SenderId, ReceiverId) VALUES (?, ?)`, [senderId, receiver.Id]);
        const invitationId = result.lastID; // Capture the ID of the newly created invitation
        await db.close();

        return new NextResponse(JSON.stringify({ success: true, message: 'Invitation sent', invitationId: invitationId }), { status: 200 });
    } catch (error) {
        await db.close();
        return new NextResponse(JSON.stringify({ success: false, message: 'Database error', error }), { status: 500 });
    }
}
