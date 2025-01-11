'use client';

import HandTracker from '../components/HandTracker';
import { useState } from 'react';
import { Game } from '@/components/Game';
import { Menu } from '@/components/Menu';
import { Leaderboard } from '@/components/Leaderboard';
import { GameOver } from '@/components/GameOver';
import { GameStatus } from '@/types/game';

const App = () => {
  const [gameStatus, setGameStatus] = useState<GameStatus>('menu');
  const [currentScore, setCurrentScore] = useState(0);
  const [currentWave, setCurrentWave] = useState(1);

  const handleGameOver = (score: number, wave: number) => {
    setCurrentScore(score);
    setCurrentWave(wave);
    setGameStatus('gameOver');
  };

  const handleRestart = () => {
    setGameStatus('playing');
    setCurrentScore(0);
    setCurrentWave(1);
  };

  return (
    <div className='min-h-screen bg-gray-900 flex items-center justify-center'>
      {gameStatus === 'menu' && (
        <Menu onStartGame={() => setGameStatus('playing')} onShowLeaderboard={() => setGameStatus('paused')} />
      )}

      {gameStatus === 'playing' && <Game onGameOver={handleGameOver} onGameQuit={() => setGameStatus('menu')} />}

      {gameStatus === 'paused' && <Leaderboard onBack={() => setGameStatus('menu')} />}

      {gameStatus === 'gameOver' && (
        <GameOver
          score={currentScore}
          wave={currentWave}
          onRestart={handleRestart}
          onMainMenu={() => setGameStatus('menu')}
        />
      )}
    </div>
  );
};

export default App;
