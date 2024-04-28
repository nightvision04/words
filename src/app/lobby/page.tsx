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

export default function Lobby() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
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

    fetchUsers();
  }, []);

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
    </div>
  );
}