'use client';
import React, { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function AddUser() {
  const router = useRouter();

  useEffect(() => {
    // Only run the effect if the router is ready
    if (!router.isReady) return;

    const fetchUser = async () => {
      const response = await fetch('/api/add-user', {
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
  }, [router]); // 

  return (
    <div>
      <p>Adding user...</p>
    </div>
  );
}
