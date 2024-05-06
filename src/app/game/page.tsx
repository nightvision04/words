'use client';
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

interface Tile {
  letter: string;
  X: number;
  Y: number;
}

interface Game {
  Id: number;
  IsStarted: boolean;
  Board: string[][];
  CreatorId: number;
  JoinerId: number;
  Turn: number;
  LettersPlayed: string | null;
  StartLetters: string | null;
  LettersToAdd: string | null;
  EndLetters: string | null;
}

export default function ScrabbleBoard() {
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const searchParams = useSearchParams();
  const invitationId = searchParams.get('invitationId');
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';

  const playerId = parseInt(localStorage.getItem('PlayerId') || '0');
  const [isCreator, setIsCreator] = useState<boolean | null>(null);

  useEffect(() => {
    const checkGameStatus = async () => {
      const response = await fetch(`${baseUrl}/api/check-game-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationId }) 
      });
      const data = await response.json();
      if (data.success && data.game) {
        const parsedBoard = JSON.parse(data.game.Board);
        data.game.Board = parsedBoard;
        setGame(data.game);
        setIsCreator(data.game.CreatorId === playerId);
        setLoading(false);
      } else if (!data.success && data.message) {
        console.error('Error checking game status:', data.message);
        setLoading(false);
      }
    };
  
    checkGameStatus();
    const interval = setInterval(checkGameStatus, 1000);
    return () => clearInterval(interval);
  }, [baseUrl, invitationId, playerId]);

  if (loading) {
    return <div>Loading... Waiting for the other player to join.</div>;
  }

  const handlePlayClick = async () => {
    console.log('Play button clicked');

    // Example tiles played, replace with actual game logic
    if (game) {
        const playedTiles = [{ letter: 'A', X: 7, Y: 7 }]; // Example tile
        const currentTiles = game.Board.flat().filter(cell => cell !== '');

        const response = await fetch(`${baseUrl}/api/update-turn`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                gameId: game.Id,
                playerId,
                action: 'endTurn',
                playedTiles,
                currentTiles
            })
        });
        const data = await response.json();
        if (data.success) {
            console.log('Turn updated successfully');
            // Optionally update local game state here or re-fetch game status
        } else {
            console.error('Failed to update turn:', data.message);
        }
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gray-200">
      {game && (
        <div>
          <h1 className="text-lg">Game: {game.Id} - {game.IsStarted ? 'Started' : 'Waiting'}</h1>
          <div className="w-full max-w-screen-lg p-2 bg-white shadow-lg" style={{ display: 'grid', gridTemplateColumns: 'repeat(15, minmax(0, 1fr))', gap: '1px' }}>
            {game.Board.flat().map((cell, index) => (
              <div key={index} className="aspect-square w-full bg-gray-100 flex justify-center items-center border border-gray-300 rounded-lg shadow-sm">
                {cell}
              </div>
            ))}
          </div>
          <button
            onClick={handlePlayClick}
            disabled={game.Turn % 2 === (isCreator ? 0 : 1)}
            className={`mt-4 ${game.Turn % 2 === (isCreator ? 0 : 1) ? "bg-gray-300" : "bg-blue-500 hover:bg-blue-700"} text-white font-bold py-2 px-4 rounded`}
          >
            {game.Turn % 2 === (isCreator ? 0 : 1) ? 'Waiting for Players...' : 'Play'}
          </button>
        </div>
      )}
    </div>
  );
}
