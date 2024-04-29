'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Player {
  Id: number;
  DateCreated: string;
  Name: string;
  LastLogin: string;
  OverallScore: number;
  Wins: number;
  Losses: number;
  GameCount: number;
  LastModified: string;
  CurrentGame: number | null;
}

interface Invitation {
  Id: number;
  Name: string;
  SenderId: number;
  ReceiverId: number;
  Status: string;
  DateCreated: string;
}

export default function Lobby() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const router = useRouter();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
  const PlayerId = Number(localStorage.getItem('PlayerId'));

  const goToGame = async (senderId: number, receiverId: number) => {
    try {
      const response = await fetch(`${baseUrl}/api/setup-game`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ senderId, receiverId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to send invite');
        return;
      }

      // Navigate to game page if the invite is successfully sent
      router.push('/game');  // Removed 'baseUrl' from the path, assuming '/game' is correct
    } catch (error) {
      setError('Network error occurred');
      console.error('Failed to send invite:', error);
    }
  };

  const sendInvite = async (senderId: number | null, receiverId: number) => {
    try {
      const response = await fetch(`${baseUrl}/api/send-invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ senderId, receiverId }),
      });
      const data = await response.json();
      if (!data.success) {
        setError(data.message || 'Failed to send invite');
      }else{
        router.push(`${baseUrl}/game`);
      }
    } catch (error) {
      setError('Error sending invite');
    }
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch(`${baseUrl}/api/list-users`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();

        if (data.success) {
          setPlayers(data.players);
        } else {
          setError('Failed to fetch users');
        }
      } catch (error) {
        console.error('Error fetching users:', error);
        setError('An error occurred while fetching users');
      }

      setLoading(false);
    };

    const checkForInvitations = async () => {
      const interval = setInterval(async () => {
        // Assume retrieval of receiverId somehow (context, local storage, etc.)
        const PlayerId = localStorage.getItem('PlayerId');
        const response = await fetch(`${baseUrl}/api/check-for-invite`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ playerId: PlayerId }),
        });
    
        const data = await response.json();
    
        if (data.success && data.valid) {
          setInvitation(data.invitation);
        }
      }, 1000);
    
      return () => clearInterval(interval);
    };
    

    fetchUsers();
    checkForInvitations();
  }, [baseUrl]); // Adding an empty dependency array to ensure the effect runs only once after the component mounts.

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h1>Lobby</h1>
      <h2>Players:</h2>
      {players.length > 0 ? (
        <ul>
          {players.map(player => (
            <li key={player.Id}>
            {player.Name}
            <button 
            className="max-w-2xl rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600" 
            onClick={() => sendInvite(PlayerId, player.Id)}>Send Invite</button>
          </li>
          ))}
        </ul>
      ) : (
        <p>No players found.</p>
      )}
      <p>{invitation && (
        <div>
          <p>You have an invitation from Player: {invitation.Name} </p>
          <button
            className="ml-4 bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
            onClick={() => goToGame(invitation.SenderId, invitation.ReceiverId)}>Go to Game
          </button>
        </div>
      )}</p>
    </div>
  );
}
