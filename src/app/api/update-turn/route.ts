import { NextResponse } from 'next/server';
import setupDatabase from '../../../lib/db';

interface Tile {
  Letter: string;
  X: number;
  Y: number;
}

interface ScrabblePiece {
  letter: string;
  points: number;
}



export async function POST(req: Request) {
    const db = await setupDatabase();
    const { gameId, playerId, action, playedTiles, currentTiles }: { gameId: number; playerId: number; action: string; playedTiles: Tile[]; currentTiles: Tile[] } = await req.json();

    try {
        const game = await db.get(`SELECT * FROM Games WHERE Id = ?`, [gameId]);
        if (!game) {
            await db.close();
            return new NextResponse(JSON.stringify({ success: false, message: 'Game not found' }), { status: 404 });
        }

        const playerPieces = JSON.parse(game.IsCreatorTurn ? game.CreatorPieces : game.JoinerPieces) as ScrabblePiece[];

        if (action === 'endTurn') {
            const isValid = validateWords(gameId, playedTiles); 
            if (!isValid) {
                await db.close();
                return new NextResponse(JSON.stringify({ success: false, message: 'Invalid move' }), { status: 400 });
            }

            const score = calculateScore(gameId, playedTiles); // Define or import this function
            const updatedTiles = updateBoard(game.Board, playedTiles);

            // Update the current turn
            await db.run(`
                UPDATE GamesTurn
                SET LettersPlayed = ?, TurnScore = ?, EndLetters = ?, LastModified = datetime('now')
                WHERE GameId = ? AND LastModified = (
                    SELECT MAX(LastModified) FROM GamesTurn WHERE GameId = ?
                )`, [JSON.stringify(playedTiles), score, JSON.stringify(currentTiles.filter(ct => !playedTiles.some(pt => pt.Letter === ct.Letter))), gameId, gameId]
            );

            // Update game board
            await db.run(`
                UPDATE Games
                SET Board = ?, Turn = ?
                WHERE Id = ?`, [JSON.stringify(updatedTiles), game.Turn + 1, gameId]
            );

            // Start new turn: Draw tiles to make up to 7 and update player's pieces
            const { newTiles, remainingTiles } = drawTiles(playerPieces, currentTiles.length);
            await db.run(`
                INSERT INTO GamesTurn (GameId, IsCreatorTurn, StartLetters, LettersToAdd, DateCreated, LastModified)
                VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`, [gameId, 1 - game.IsCreatorTurn, JSON.stringify(currentTiles), JSON.stringify(newTiles)]
            );

            // Update player pieces in Games table
            const piecesField = game.IsCreatorTurn ? 'CreatorPieces' : 'JoinerPieces';
            await db.run(`
                UPDATE Games
                SET ${piecesField} = ?
                WHERE Id = ?`, [JSON.stringify(remainingTiles), gameId]
            );

            await db.close();
            return new NextResponse(JSON.stringify({ success: true, message: 'Turn updated successfully' }), { status: 200 });
        } else {
            await db.close();
            return new NextResponse(JSON.stringify({ success: false, message: 'Invalid action' }), { status: 400 });
        }
    } catch (error) {
        await db.close();
        return new NextResponse(JSON.stringify({ success: false, message: 'Database error', error }), { status: 500 });
    }
}


function calculateScore(gameId: number, tiles: Tile[]): number {
    // Looks up the Board by the game id, replace the tiles, and then calculate the score based on the tiles played
    return tiles.length; // Placeholder
}

function updateBoard(currentBoard: string, tiles: Tile[]): string[] {
    const board = JSON.parse(currentBoard);
    tiles.forEach(tile => {
        board[tile.Y * 15 + tile.X] = tile.Letter; // why is Y being multiplied by 15??
    });
    return board;
}

function drawTiles(pool: ScrabblePiece[], currentTileCount: number): { newTiles: ScrabblePiece[], remainingTiles: ScrabblePiece[] } {
    const neededTiles = 7 - currentTileCount;
    const shuffledTiles = shuffleArray(pool);
    const newTiles = shuffledTiles.slice(0, neededTiles);
    const remainingTiles = shuffledTiles.slice(neededTiles);
    return { newTiles, remainingTiles };
}

/**
 * Shuffles an array using Fisher-Yates (Knuth) shuffle algorithm.
 */
function shuffleArray<T>(array: T[]): T[] {
    let currentIndex = array.length, randomIndex;

    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]
        ];
    }

    return array;
}

async function validateWords(gameId: number, newTiles: Tile[]): Promise<boolean> {
    const db = await setupDatabase();

    try {
        // Fetch the current board from the database
        const game = await db.get(`SELECT Board FROM Games WHERE Id = ?`, [gameId]);
        if (!game) {
            console.error('Game not found');
            return false;
        }

        const board: string[][] = JSON.parse(game.Board);

        // Place new tiles on the board for validation
        for (const tile of newTiles) {
            if (board[tile.Y][tile.X] !== '') {
                console.error('Tile placement error: Space is already occupied.');
                return false;
            }
            board[tile.Y][tile.X] = tile.Letter;
        }

        // Validate that all new words formed are correct
        // const isValid = checkAllWords(board, newTiles); 
        const isValid = true; // placeholder for now
        return isValid;
    } catch (error) {
        console.error('Database error:', error);
        return false;
    } finally {
        db.close();
    }
}


