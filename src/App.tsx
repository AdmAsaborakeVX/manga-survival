import { useState, useEffect } from 'react';
import type { GameState, GameData } from '@/types';
import { restoreGameSession } from '@/utils/storage';
import TitleScreen from './components/screens/TitleScreen';
import MangaCreationScreen from './components/screens/MangaCreationScreen';
import './App.css';

function App() {
  const [gameState, setGameState] = useState<GameState>('title');
  const [gameData, setGameData] = useState<GameData | null>(null);

  useEffect(() => {
    // ゲームセッションを復元
    const data = restoreGameSession();
    setGameData(data);
  }, []);

  if (!gameData) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="app">
      {gameState === 'title' && (
        <TitleScreen onStart={() => setGameState('creation')} />
      )}
      {gameState === 'creation' && (
        <MangaCreationScreen
          gameData={gameData}
          setGameData={setGameData}
          onComplete={() => setGameState('confirmation')}
        />
      )}
      {/* Other screens will be added here */}
    </div>
  );
}

export default App;
