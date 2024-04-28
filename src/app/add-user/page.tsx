'use client';
import React, { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export default function AddUser() {
  const router = useRouter();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';

  const fetchUser = useCallback(async () => {
    try {
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
      } else {
        console.error('Error adding/updating user:', data.message);
      }
    } catch (error) {
      console.error('Error adding/updating user:', error);
    }
  }, [baseUrl, router]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      fetchUser();
    }
  }, [fetchUser]);

  return (
    <div>
      <p>Adding user...</p>
    </div>
  );
}