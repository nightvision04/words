import { NextResponse } from 'next/server';
import setupDatabase from '../../../lib/db';
import { distributeTiles } from '../../../scripts/distributeTiles.js';

export async function POST(req: Request) {


    const scrabblePieces = [
        { letter: 'A', count: 9, points: 1 }, { letter: 'B', count: 2, points: 3 }, { letter: 'C', count: 2, points: 3 },
        { letter: 'D', count: 4, points: 2 }, { letter: 'E', count: 12, points: 1 }, { letter: 'F', count: 2, points: 4 },
        { letter: 'G', count: 3, points: 2 }, { letter: 'H', count: 2, points: 4 }, { letter: 'I', count: 9, points: 1 },
        { letter: 'J', count: 1, points: 8 }, { letter: 'K', count: 1, points: 5 }, { letter: 'L', count: 4, points: 1 },
        { letter: 'M', count: 2, points: 3 }, { letter: 'N', count: 6, points: 1 }, { letter: 'O', count: 8, points: 1 },
        { letter: 'P', count: 2, points: 3 }, { letter: 'Q', count: 1, points: 10 }, { letter: 'R', count: 6, points: 1 },
        { letter: 'S', count: 4, points: 1 }, { letter: 'T', count: 6, points: 1 }, { letter: 'U', count: 4, points: 1 },
        { letter: 'V', count: 2, points: 4 }, { letter: 'W', count: 2, points: 4 }, { letter: 'X', count: 1, points: 8 },
        { letter: 'Y', count: 2, points: 4 }, { letter: 'Z', count: 1, points: 10 }, { letter: 'BLANK', count: 2, points: 0 }
    ];

    const db = await setupDatabase();
    const { senderId, receiverId, invitationId } = await req.json();
    const emptyBoardJson = generateEmptyGameBoard();

    try {
        // Validate invitation and fetch game details if existing
        const invitation = await db.get(`SELECT * FROM Invitations WHERE SenderId = ? AND ReceiverId = ? AND Status = 'pending' AND Id = ?`, [senderId, receiverId, invitationId]);

        if (!invitation) {
            await db.close();
            return new NextResponse(JSON.stringify({ success: false, message: 'No valid invitations found' }), { status: 404 });
        }

        // Update the invitation status to 'accepted'
        await db.run(`UPDATE Invitations SET Status = 'accepted' WHERE Id = ?`, [invitation.Id]);

        // Check if game already exists
        const existingGame = await db.get(`SELECT * FROM Games WHERE CreatorId = ? OR JoinerId = ?`, [senderId, receiverId]);
        if (existingGame) {
            await db.close();
            return new NextResponse(JSON.stringify({ success: false, message: 'Game already set up' }), { status: 409 });
        }

        // Distribute tiles and create game and initial turn
        const tiles = distributeTiles(scrabblePieces);
        const gameId = await db.run(`
        INSERT INTO Games (CreatorId, JoinerId, Board, CreatorPieces, JoinerPieces, DateCreated, IsStarted, InvitationsId, Turn)
        VALUES (?, ?, ?, ?, ?, datetime('now'), 1, ?, 1)`, [senderId, receiverId, emptyBoardJson, JSON.stringify(tiles.creator), JSON.stringify(tiles.joiner), invitation.Id]
        ).then(res => res.lastID);

        // Initialize first turn
        await db.run(`
        INSERT INTO GamesTurn (GameId, IsCreatorTurn, StartLetters, DateCreated, LastModified)
        VALUES (?, 1, ?, datetime('now'), datetime('now'))`, [gameId, JSON.stringify(tiles.creator.slice(0, 7))]
        );

        await db.close();
        return new NextResponse(JSON.stringify({ success: true, gameId, message: 'Game and initial turn set up successfully' }), { status: 201 });
        } catch (error) {
        await db.close();
        return new NextResponse(JSON.stringify({ success: false, message: 'Database error', error }), { status: 500 });
    }
}

function generateEmptyGameBoard(): string {
    const size = 15; // Standard Scrabble board size is 15x15
    const board = Array(size).fill(null).map(() => Array(size).fill(''));
    return JSON.stringify(board);
}

