import { useState, useEffect, useMemo, useCallback } from 'react';
import type { GameState, GameData, SerializationState, MangaRecord } from '@/types';
import { restoreGameSession, loadSerializationState, saveSerializationState, deleteSerializationState } from '@/utils/storage';
import { initializeSerializationState } from '@/game/serialization';
import { generateRandomSeed } from '@/utils/seededRandom';
import { scrollToTop } from '@/utils/scrollToTop';
import TitleScreen from './components/screens/TitleScreen';
import MangaCreationScreen from './components/screens/MangaCreationScreen';
import SerializationConfirmationScreen from './components/screens/SerializationConfirmationScreen';
import SerializationScreen from './components/screens/SerializationScreen';
import SerializationResultScreen from './components/screens/SerializationResultScreen';
import AbilityDistributionTestScreen from './components/screens/AbilityDistributionTestScreen';
import SimulationTestScreen from './components/screens/SimulationTestScreen';
import './App.css';

function App() {
  const [gameState, setGameState] = useState<GameState>('title');
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [selectedManga, setSelectedManga] = useState<MangaRecord | null>(null);
  const [serializationState, setSerializationState] = useState<SerializationState | null>(null);
  const [developerScreen] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('dev');
  });

  // 初期化をメモ化して不要な再実行を防ぐ
  const initializationResult = useMemo(() => {
    if (developerScreen) {
      return { data: null, savedSerialization: null };
    }
    const data = restoreGameSession();
    const savedSerialization = loadSerializationState();
    return { data, savedSerialization };
  }, [developerScreen]);

  useEffect(() => {
    const { data, savedSerialization } = initializationResult;
    setGameData(data);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (savedSerialization && savedSerialization.isActive) {
      setSerializationState(savedSerialization);
      setGameState('serialization');
    }
  }, [initializationResult]);

  // 画面遷移時にスクロール最上部に設定
  useEffect(() => {
    scrollToTop();
  }, [gameState]);

  const handleMangaCreationComplete = useCallback((manga: MangaRecord) => {
    setSelectedManga(manga);
    setGameState('confirmation');
  }, []);

  const handleSerializationStart = useCallback(() => {
    if (!selectedManga) return;

    const newSerializationState = initializeSerializationState(
      selectedManga,
      generateRandomSeed()
    );
    newSerializationState.startedAt = Date.now();

    setSerializationState(newSerializationState);
    saveSerializationState(newSerializationState);
    setGameState('serialization');
  }, [selectedManga]);

  const handleSerializationStateChange = useCallback((state: SerializationState) => {
    setSerializationState(state);
    saveSerializationState(state);
  }, []);

  const handleSerializationEnd = useCallback(() => {
    deleteSerializationState();
    setGameState('result');
  }, []);

  const handleBackToTitle = useCallback(() => {
    setGameState('title');
    setSerializationState(null);
    setSelectedManga(null);
    deleteSerializationState();
  }, []);

  const handleCancel = useCallback(() => {
    setGameState('title');
    setSelectedManga(null);
  }, []);

  if (developerScreen === 'simulation-test') {
    return (
      <div className="app">
        <SimulationTestScreen />
      </div>
    );
  }

  if (!gameData) {
    return <div className="loading">Loading...</div>;
  }

  if (developerScreen === 'ability-test') {
    return (
      <div className="app">
        <AbilityDistributionTestScreen />
      </div>
    );
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
          onComplete={handleMangaCreationComplete}
        />
      )}
      {gameState === 'confirmation' && selectedManga && (
        <SerializationConfirmationScreen
          manga={selectedManga}
          onConfirm={handleSerializationStart}
          onCancel={handleCancel}
        />
      )}
      {gameState === 'serialization' && serializationState && (
        <SerializationScreen
          serializationState={serializationState}
          onStateChange={handleSerializationStateChange}
          onSerializationEnd={handleSerializationEnd}
        />
      )}
      {gameState === 'result' && serializationState && (
        <SerializationResultScreen
          serializationState={serializationState}
          onBackToTitle={handleBackToTitle}
        />
      )}
    </div>
  );
}

export default App;
