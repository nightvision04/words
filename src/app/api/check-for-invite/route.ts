import { NextResponse } from 'next/server';
import setupDatabase from '../../../lib/db';

export async function GET(req: Request) {
    const db = await setupDatabase();
    const url = new URL(req.url); // Convert req.url to a URL object
    const receiverId = url.searchParams.get('receiverId'); // Use searchParams to get the query parameter

    try {
        const invitation = await db.get(`SELECT * FROM Invitations WHERE ReceiverId = ? AND Status = 'pending'`, [receiverId]);
        if (invitation) {
            return new NextResponse(JSON.stringify({ success: true, invitation }), { status: 200 });
        } else {
            return new NextResponse(JSON.stringify({ success: false, message: 'No invitations found' }), { status: 404 });
        }
    } catch (error) {
        return new NextResponse(JSON.stringify({ success: false, message: 'Database error', error }), { status: 500 });
    }
}
