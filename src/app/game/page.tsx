'use client';
import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface Tile {
  letter: string;
  X: number;
  Y: number;
  isVisible: boolean;
}

interface Game {
  Id: number;
  IsStarted: boolean;
  Board: string[][]; // Change Board to a 2D array of strings
  CreatorId: number;
  JoinerId: number;
  Turn: number;
  LettersPlayed: string | null;
  StartLetters: string | null;
  LettersAddedAfterTurn: string | null;
  EndLetters: string | null;
}

interface PlayerTile {
  letter: string;
  points: number;
}

function ScrabbleBoard() {
  const [game, setGame] = useState<Game | null>(null);
  const [playerTiles, setPlayerTiles] = useState<PlayerTile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const searchParams = useSearchParams();
  const invitationId = searchParams.get('invitationId');
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
  const [playerId, setPlayerId] = useState<number>(0);
  const [isCreator, setIsCreator] = useState<boolean | null>(null);
  const [playedTiles, setPlayedTiles] = useState<Tile[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedPlayerId = parseInt(localStorage.getItem('PlayerId') || '0');
      setPlayerId(storedPlayerId);

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
          setIsCreator(data.game.CreatorId === storedPlayerId);
          setPlayerTiles(
            data.game.CreatorId === storedPlayerId
              ? JSON.parse(data.game.CreatorPieces).slice(0, 7)
              : JSON.parse(data.game.JoinerPieces).slice(0, 7)
          );
          setLoading(false);
        } else if (!data.success && data.message) {
          console.error('Error checking game status:', data.message);
          setLoading(false);
        }
      };

      checkGameStatus();
      const interval = setInterval(checkGameStatus, 1000);
      return () => clearInterval(interval);
    }
  }, [baseUrl, invitationId]);

  const onDrop = async (e: React.DragEvent, x: number, y: number) => {
    const letter = e.dataTransfer.getData("letter");
    const newTile: Tile = { letter, X: x, Y: y, isVisible: true }; // Set isVisible to true for current player
  
    if (game) {
      // Fetch the latest game state from the server
      const response = await fetch(`${baseUrl}/api/check-game-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationId })
      });
      const data = await response.json();
      if (!data.success) {
        console.error('Failed to fetch game status:', data.message);
        return;
      }
  
      const latestGame = data.game;
      const updatedBoard = JSON.parse(latestGame.Board);


      console.log('OnDrop latestGame:', latestGame);
      console.log('Current Board:', updatedBoard);
      console.log(`Placing Tile: ${letter} at (${x}, ${y})`);
  
      if (updatedBoard[y][x] !== '') {
        console.error(`Cannot place tile: Space at (${x}, ${y}) is already occupied.`);
        return; // Prevent placing tile if space is occupied
      }
  
      updatedBoard[y][x] = letter; // Update the board with the letter
      setGame({ ...latestGame, Board: updatedBoard });
      setPlayedTiles([...playedTiles, newTile]);
  
      const updateResponse = await fetch(`${baseUrl}/api/update-board`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: latestGame.GameId,
          playerId,
          tiles: [newTile]
        })
      });
  
      const updateData = await updateResponse.json();
      if (!updateData.success) {
        console.error('Failed to update board:', updateData.message);
        // Optionally, handle UI changes for invalid move
      } else {
        console.log('Board updated successfully');
      }
    }
  };
  
  
  
  

  const onDragStart = (e: React.DragEvent, letter: string) => {
    e.dataTransfer.setData("letter", letter);
  };

  const handlePlayClick = async () => {
    if (game) {
      // Fetch the latest game state from the server
      const response = await fetch(`${baseUrl}/api/check-game-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationId })
      });
      const data = await response.json();
      if (!data.success) {
        console.error('Failed to fetch game status:', data.message);
        return;
      }
  
      const latestGame = data.game;
      const currentTiles = playerTiles.filter(tile => !playedTiles.some(pt => pt.letter === tile.letter));
      const updatedPlayedTiles = playedTiles.map(tile => ({ ...tile, isVisible: false })); // Set isVisible to false for opponent
  
      const playResponse = await fetch(`${baseUrl}/api/update-turn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: latestGame.GameId,
          playerId,
          action: 'endTurn',
          playedTiles: updatedPlayedTiles,
          currentTiles
        })
      });
  
      const playData = await playResponse.json();
      if (playData.success) {
        console.log('Turn updated successfully');
        setPlayerTiles(currentTiles);
        setPlayedTiles([]);
      } else {
        console.error('Failed to update turn:', playData.message);
        // Optionally, handle UI changes for invalid turn
      }
    }
  };
  
  
  
  

  if (loading) {
    return <div>Loading... Waiting for the other player to join.</div>;
  }

  const isCurrentPlayerTurn = game && ((isCreator && game.Turn % 2 === 0) || (!isCreator && game.Turn % 2 === 1));

  return (
    <div className="flex flex-col justify-center items-center h-screen bg-gray-200">
      {game && (
        <>
          <h1 className="text-lg">Game: {game.Id} - {game.IsStarted ? 'Started' : 'Waiting'}</h1>
          <div className="w-full max-w-screen-lg p-2 bg-white shadow-lg" style={{ display: 'grid', gridTemplateColumns: 'repeat(15, minmax(0, 1fr))', gap: '1px' }}>
            {game.Board.flat().map((cell, index) => {
              const x = index % 15;
              const y = Math.floor(index / 15);
              const isPlayedTile = playedTiles.some(tile => tile.X === x && tile.Y === y);
              const tile = game.Board[y][x];
  
              const playedTile = playedTiles.find(tile => tile.X === x && tile.Y === y);
              const shouldDisplayLetter = playedTile && playedTile.isVisible;
  
              return (
                <div
                  key={index}
                  className={`aspect-square w-full flex justify-center items-center border border-gray-300 rounded-lg shadow-sm ${isPlayedTile ? 'bg-blue-500' : 'bg-gray-100'}`}
                  onDrop={(e) => onDrop(e, x, y)}
                  onDragOver={(e) => e.preventDefault()}
                >
                  {isPlayedTile && shouldDisplayLetter ? tile : isPlayedTile ? '' : tile}
                </div>
              );
            })}
          </div>
          <div className="flex space-x-2 mt-4">
            {playerTiles.map((tile, index) => (
              <div
                key={index}
                className="w-10 h-10 bg-blue-500 text-white flex justify-center items-center rounded-lg shadow-sm cursor-pointer"
                draggable
                onDragStart={(e) => onDragStart(e, tile.letter)}
              >
                {tile.letter}
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
        </>
      )}
    </div>
  );
  
}

export default function GamePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ScrabbleBoard />
    </Suspense>
  );
}
