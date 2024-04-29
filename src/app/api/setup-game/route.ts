import { NextResponse } from 'next/server';
import setupDatabase from '../../../lib/db';

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

    /**
     * Shuffles an array using Fisher-Yates (Knuth) shuffle algorithm.
     */
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    /**
     * Distributes Scrabble tiles to two players while attempting to balance the score.
     */
    function distributeTiles(scrabblePieces) {
        // Flatten the piece distribution according to count and shuffle them
        let allTiles = [];
        scrabblePieces.forEach(piece => {
            for (let i = 0; i < piece.count; i++) {
                allTiles.push({ letter: piece.letter, points: piece.points });
            }
        });
        allTiles = shuffleArray(allTiles);

        // Allocate tiles to players
        const midPoint = Math.floor(allTiles.length / 2);
        let playerOneTiles = allTiles.slice(0, midPoint);
        let playerTwoTiles = allTiles.slice(midPoint);

        // Optionally, you might want to implement additional logic to balance the points
        // This example assumes a simple split which might not perfectly balance the points

        return {
            creator: playerOneTiles,
            joiner: playerTwoTiles
        };
    }

    const db = await setupDatabase();
    const { playerId } = await req.json();

    try {
        const invitation = await db.get(`SELECT * FROM Invitations WHERE ReceiverId = ? AND Status = 'accepted'`, [playerId]);
        if (!invitation) {
            return new NextResponse(JSON.stringify({ success: false, message: 'No valid invitations found' }), { status: 404 });
        }

        // Check if game already exists
        const existingGame = await db.get(`SELECT * FROM Games WHERE CreatorId = ? OR JoinerId = ?`, [invitation.SenderId, invitation.ReceiverId]);
        if (existingGame) {
            return new NextResponse(JSON.stringify({ success: false, message: 'Game already set up' }), { status: 409 });
        }

        // Create a new game entry
        const tiles = distributeTiles(scrabblePieces); // This should handle drawing and point balancing
        const result = await db.run(`
            INSERT INTO Games (CreatorId, JoinerId, Board, CreatorPieces, JoinerPieces, DateCreated)
            VALUES (?, ?, ?, ?, ?, datetime('now'))`,
            [invitation.SenderId, invitation.ReceiverId, JSON.stringify({}), JSON.stringify(tiles.creator), JSON.stringify(tiles.joiner)]
        );

        return new NextResponse(JSON.stringify({ success: true, gameId: result.lastID }), { status: 201 });
    } catch (error) {
        return new NextResponse(JSON.stringify({ success: false, message: 'Database error', error }), { status: 500 });
    }
}
