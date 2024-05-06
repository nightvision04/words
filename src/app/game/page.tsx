'use client';
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

interface Tile {
  Letter: string;
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
}

export default function ScrabbleBoard() {
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const searchParams = useSearchParams();
  const invitationId = searchParams.get('invitationId');
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';

  // Retrieve player ID from local storage and determine if the player is the creator
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
        setLoading(false); // Adjust this as needed for error handling
      }
    };
  
    checkGameStatus();
    const interval = setInterval(checkGameStatus, 1000); // This sets up a polling interval to regularly check the game status
    return () => clearInterval(interval);
  }, [baseUrl, invitationId, playerId]); // Added 'playerId' to the dependency list if it's used within the effect

  if (loading) {
    return <div>Loading... Waiting for the other player to join.</div>;
  }

  // Function to handle the Play button click
  const handlePlayClick = () => {
    console.log('Play button clicked');
    // Logic to trigger the API call to update-turn can go here
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gray-200">
      {game && (
        <div>
          <h1 className="text-lg">Game: {game.Id} - {game.IsStarted ? 'Started' : 'Waiting'}</h1>
          <div className="w-full max-w-screen-lg p-2 bg-white shadow-lg" style={{ display: 'grid', gridTemplateColumns: 'repeat(15, minmax(0, 1fr))', gap: '1px' }}>
            {game.Board.flat().map((cell, index) => (
              <div key={index} className="aspect-square w-full bg-gray-100 flex justify-center items-center border border-gray-300">
                {cell}
              </div>
            ))}
          </div>
          {/* Play button logic based on the game turn and player type */}
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
