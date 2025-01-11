import React, { useState } from 'react';
import { Trophy, RotateCcw, Home } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

interface GameOverProps {
  score: number;
  wave: number;
  onRestart: () => void;
  onMainMenu: () => void;
}

export function GameOver({ score, wave, onRestart, onMainMenu }: GameOverProps) {
  const [playerName, setPlayerName] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (playerName.trim()) {
      try {
        const scoresRef = collection(db, 'leaderboard');
        await addDoc(scoresRef, {
          name: playerName,
          score: score,
          wave: wave,
          create_date: new Date().toLocaleString(),
        });

        setSaved(true);
      } catch (error) {
        console.error('Error saving score:', error);
      }
    }
  };

  return (
    <div className='flex flex-col items-center justify-center space-y-6'>
      <h2 className='text-3xl font-bold text-white'>Game Over</h2>
      <div className='flex flex-col items-center space-y-2'>
        <div className='text-2xl text-purple-400'>Score: {score.toLocaleString()}</div>
        <div className='text-xl text-blue-400'>Wave: {wave}</div>
      </div>

      {!saved ? (
        <form onSubmit={handleSubmit} className='flex flex-col items-center space-y-4'>
          <input
            type='text'
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder='Enter your name'
            maxLength={15}
            className='bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500'
          />
          <button
            type='submit'
            className='flex w-full justify-center items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-colors'
          >
            <Trophy className='w-5 h-5' />
            <span>Save Score</span>
          </button>
        </form>
      ) : (
        <div className='flex flex-col space-y-4'>
          <button
            onClick={onRestart}
            className='flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors'
          >
            <RotateCcw className='w-5 h-5' />
            <span>Play Again</span>
          </button>
          <button
            onClick={onMainMenu}
            className='flex items-center justify-center space-x-2 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors'
          >
            <Home className='w-5 h-5' />
            <span>Main Menu</span>
          </button>
        </div>
      )}
    </div>
  );
}
