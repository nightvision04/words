'use client';
import React from 'react';

export default function ScrabbleBoard() {
    // Generate the board as a 12x12 grid
    const boardSize = 12;
    const board = Array.from({ length: boardSize }, (_, i) =>
        Array.from({ length: boardSize }, (_, j) => ({
            id: `${i}-${j}`,
            letter: '', // Placeholder for letters on the board
        }))
    );

    return (
        <div className="flex justify-center items-center h-screen bg-gray-200">
            <div className="grid grid-cols-12 gap-1 bg-white p-2 shadow-lg">
                {board.flat().map(cell => (
                    <div key={cell.id} className="w-10 h-10 bg-gray-100 flex justify-center items-center border border-gray-300">
                        {/* Display the letter here if any */}
                        {cell.letter}
                    </div>
                ))}
            </div>
        </div>
    );
}
