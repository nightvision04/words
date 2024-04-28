'use client';
import React from 'react';
import { useRouter } from 'next/navigation';

export default function AddUser() {
  const router = useRouter();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';

  const fetchUser = async () => {
    const response = await fetch(`${baseUrl}/api/add-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Your Name' }),
    });

    const data = await response.json();
    if (data.success) {
      console.log('User added/updated', data);
      router.push('/lobby');
    }
  };

  fetchUser();

  return (
    <div>
      <p>Adding user...</p>
    </div>
  );
}