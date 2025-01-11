import { Trophy, ArrowLeft } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { useState, useEffect } from 'react';

interface LeaderboardProps {
  onBack: () => void;
}

interface Score {
  id: string;
  name: string;
  score: number;
  wave: number;
  create_date: string;
}

export function Leaderboard({ onBack }: LeaderboardProps) {
  const [scores, setScores] = useState<Score[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function fetchScores() {
    try {
      const scoresRef = collection(db, 'leaderboard');
      const q = query(
        scoresRef,
        orderBy('score', 'desc'), // Sort by score in descending order
        limit(10) // Get top 10 scores
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Format the date if needed
        //create_date: doc.data().create_date?.toDate().toLocaleDateString() || ''
      }));
    } catch (error) {
      console.error('Error fetching scores:', error);
      return [];
    }
  }

  useEffect(() => {
    const loadScores = async () => {
      setIsLoading(true);
      const fetchedScores = await fetchScores();
      setScores(fetchedScores as Score[]);
      setIsLoading(false);
    };

    loadScores();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center space-y-6 w-full max-w-md">
      <div className="flex items-center space-x-3">
        <Trophy className="w-8 h-8 text-yellow-400" />
        <h2 className="text-3xl font-bold text-white">High Scores</h2>
      </div>

      <div className="w-full bg-gray-800 rounded-lg shadow-xl overflow-hidden">
        {isLoading ? (
          <div className="text-center py-4 text-white">Loading scores...</div>
        ) : scores.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-700">
                <th className="py-3 px-4 text-left text-white">Rank</th>
                <th className="py-3 px-4 text-left text-white">Name</th>
                <th className="py-3 px-4 text-center text-white">Wave</th>
                <th className="py-3 px-4 text-right text-white">Score</th>
              </tr>
            </thead>
            <tbody>
              {scores
                .sort((a, b) => b.score - a.score)
                .slice(0, 10)
                .map((score, index) => (
                  <tr key={index} className="border-t border-gray-700">
                    <td className="py-3 px-4 text-gray-300">{index + 1}</td>
                    <td className="py-3 px-4 text-gray-300">{score.name}</td>
                    <td className="py-3 px-4 text-center text-gray-300">{score.wave}</td>
                    <td className="py-3 px-4 text-right text-gray-300">
                      {score.score.toLocaleString()}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        ) : (
          <div className="py-8 text-center text-gray-400">
            No high scores yet. Be the first!
          </div>
        )}
      </div>

      <button
        onClick={onBack}
        className="flex items-center justify-center space-x-2 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back to Menu</span>
      </button>
    </div>
  );
}