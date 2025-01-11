import { Rocket, Trophy, Play } from 'lucide-react';

interface MenuProps {
  onStartGame: () => void;
  onShowLeaderboard: () => void;
}

export function Menu({ onStartGame, onShowLeaderboard }: MenuProps) {
  return (
    <div className='flex flex-col items-center justify-center space-y-6'>
      <div className='flex items-center space-x-3'>
        <Rocket className='w-12 h-12 text-purple-400' />
        <h1 className='text-4xl font-bold text-white'>Space Invaders</h1>
      </div>

      <div className='flex flex-col space-y-4 w-64'>
        <button
          onClick={onStartGame}
          className='flex items-center justify-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-colors'
        >
          <Play className='w-5 h-5' />
          <span>Start Game</span>
        </button>

        <button
          onClick={onShowLeaderboard}
          className='flex items-center justify-center space-x-2 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors'
        >
          <Trophy className='w-5 h-5' />
          <span>Leaderboard</span>
        </button>
      </div>
    </div>
  );
}
