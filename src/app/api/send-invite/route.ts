import { NextResponse } from 'next/server';
import setupDatabase from '../../../lib/db';

export async function POST(req: Request) {
    const db = await setupDatabase();
    const { senderId, receiverId } = await req.json();
    try {
        const receiver = await db.get(`SELECT Id FROM Players WHERE Id = ?`, [receiverId]);
        await db.close();
        if (!receiver) {
            return new NextResponse(JSON.stringify({ success: false, message: 'Receiver not found' }), { status: 404 });
        }

        const db2 = await setupDatabase();
        await db2.run(`INSERT INTO Invitations (SenderId, ReceiverId) VALUES (?, ?)`, [senderId, receiver.Id]);
        await db2.close();

        return new NextResponse(JSON.stringify({ success: true, message: 'Invitation sent' }), { status: 200 });
    } catch (error) {
        return new NextResponse(JSON.stringify({ success: false, message: 'Database error', error }), { status: 500 });
    }
}
