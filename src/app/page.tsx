
'use client';
import React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import "./globals.css";

export default function Home() {
    const [prompt, setPrompt] = useState('Tom Cook');
    const [response, setResponse] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
  
// Inside your React component (assuming you're in /pages/page.tsx)

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);
  setResponse(''); // Clear previous response

  const token = localStorage.getItem('token');
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';

  try {
      // First, update or add user with token
      const addUserResponse = await fetch(`${baseUrl}/api/add-user`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: prompt, token: token }),
      });

      const addUserResult = await addUserResponse.json();
      if (addUserResult.success) {
        localStorage.setItem('Token', addUserResult.token.toString());  // Store the token in local storage
        console.log(addUserResult.token.toString());
        setResponse('User has been added and token retrieved.');

        // If user update/add is successful, fetch the player's ID using the token
        const idResponse = await fetch(`${baseUrl}/api/get-id-from-token`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token: addUserResult.token.toString() }),
      });
      
        const idResult = await idResponse.json();
        if (idResult.success) {
            localStorage.setItem('PlayerId', idResult.playerId.toString());  // Store the player ID in local storage
            console.log(idResult.playerId.toString());
            setResponse('User has been updated and ID retrieved.');

            router.push(`${baseUrl}/lobby`);

        } else {
            throw new Error(idResult.message);
        }

    } else {
        throw new Error(addUserResult.message);
    }

  } catch (error) {
      setResponse(`Failed to fetch response`);
  } finally {
      setIsLoading(false);
  }
};



  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setPrompt(e.target.value);
  };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSubmit(e as unknown as React.FormEvent);
      }
  };


return (
<>
<div className="bg-white">
  <header className="absolute inset-x-0 top-0 z-50">
    <nav className="flex items-center justify-between p-6 lg:px-8" aria-label="Global">

    </nav>
    
  
  </header>

  <div className="relative isolate px-6 pt-14 lg:px-8">
    <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
      <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"></div>
    </div>
    <div className="mx-auto max-w-[700px] py-32 sm:py-48 lg:py-56">
    <div className='text-center'>
  <h2 className="text-4xl mb-7 font-bold tracking-tight text-gray-900 sm:text-6xl">
    Scrab-ABLE!
  </h2>
</div>

<div className="mb-8 flex justify-center"> {/* Use flex and justify-center for all screen sizes */}
  <form onSubmit={handleSubmit} className="flex flex-col gap-4 items-center"> {/* Add items-center to center all children */}
    <textarea
      className="textarea textarea-bordered resize-none w-[250px] h-[32px] overflow-hidden relative rounded-md px-3 py-1 text-sm leading-6 text-gray-600 ring-1 ring-gray-900/10 hover:ring-gray-900/20 w-full" // Ensure full width within the form
      placeholder="Enter your name"
      value={prompt}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onKeyPress={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
    />
        <button
        type="submit"
        className={`max-w-2xl rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        disabled={isLoading}
        onClick={(e) => handleSubmit(e)}
        >
        {isLoading ? 'Loading...' : 'Play'}
        </button>
    </form>
      </div>
      <div className="text-center">
      
        <p className="mt-6 text-lg leading-8 text-gray-600">{response}</p>
      </div>
    </div>
    <div className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]" aria-hidden="true">
      <div className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]" ></div>
    </div>
  </div>
</div>
</>   
);

}



