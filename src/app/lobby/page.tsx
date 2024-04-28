'use client';

import React, { useEffect, useState } from 'react';

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
  SenderId: number;
  Status: string;
  DateCreated: string;
}

export default function Lobby() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';

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
        const receiverId = 1; // Placeholder for the actual receiverId retrieval
        const response = await fetch(`${baseUrl}/api/check-for-invite`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          // This part is modified as GET requests shouldn't include a body
          // Passing parameters should be through the URL or derived from session
        });

        const data = await response.json();

        if (data.success) {
          if (data.success) {
            setInvitation(data.invitation);
          }
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
            <li key={player.Id}>{player.Name}</li>
          ))}
        </ul>
      ) : (
        <p>No players found.</p>
      )}
      <p>{invitation && (
        <div>
          <p>You have an invitation from Player ID: {invitation.SenderId}</p>
        </div>
      )}</p>
    </div>
  );
}
