import { useState } from 'react';
import type { GameData, MangaConfiguration, MangaRecord } from '@/types';
import { MANGA_CONFIG_OPTIONS } from '@/game/config';
import { SeededRandom, generateRandomSeed } from '@/utils/seededRandom';
import { createManga } from '@/game/manga';
import { saveGameData } from '@/utils/storage';
import MangaConfigStep from '../MangaConfigStep';
import AbilityAllocationStep from '../AbilityAllocationStep';
import './MangaCreationScreen.css';

interface MangaCreationScreenProps {
  gameData: GameData;
  setGameData: (data: GameData) => void;
  onComplete: () => void;
}

type CreationStep = 'config' | 'ability' | 'confirmation';

export default function MangaCreationScreen({
  gameData,
  setGameData,
  onComplete,
}: MangaCreationScreenProps) {
  const [step, setStep] = useState<CreationStep>('config');
  const [mangaRecord, setMangaRecord] = useState<MangaRecord | null>(null);

  const handleConfigComplete = (newConfig: MangaConfiguration) => {
    const rng = new SeededRandom(generateRandomSeed());
    const manga = createManga(newConfig, rng);
    setMangaRecord(manga);
    setStep('ability');
  };

  const handleAbilityComplete = (updatedManga: (typeof gameData.mangas)[0]) => {
    if (!updatedManga) return;

    const newGameData: GameData = {
      ...gameData,
      mangas: [...gameData.mangas, updatedManga],
      lastUpdated: Date.now(),
    };

    setGameData(newGameData);
    saveGameData(newGameData);

    setStep('confirmation');
  };

  const handleConfirm = () => {
    onComplete();
  };

  return (
    <div className="manga-creation-screen">
      <div className="creation-container">
        <h1 className="creation-title">漫画を制作する</h1>

        {step === 'config' && (
          <MangaConfigStep
            options={MANGA_CONFIG_OPTIONS}
            onComplete={handleConfigComplete}
          />
        )}

        {step === 'ability' && mangaRecord && (
          <AbilityAllocationStep
            manga={mangaRecord}
            onComplete={handleAbilityComplete}
          />
        )}

        {step === 'confirmation' && mangaRecord && (
          <ConfirmationStep manga={mangaRecord} onConfirm={handleConfirm} />
        )}
      </div>
    </div>
  );
}

function ConfirmationStep({
  manga,
  onConfirm,
}: {
  manga: MangaRecord;
  onConfirm: () => void;
}) {
  return (
    <div className="confirmation-step">
      <div className="manga-summary">
        <h2>{manga.configuration.title}</h2>
        <p className="author">作者: {manga.configuration.authorName}</p>

        <div className="summary-grid">
          <div className="summary-item">
            <span className="label">ジャンル</span>
            <span className="value">{manga.configuration.genre}</span>
          </div>
          <div className="summary-item">
            <span className="label">世界観</span>
            <span className="value">{manga.configuration.worldview}</span>
          </div>
          <div className="summary-item">
            <span className="label">主人公</span>
            <span className="value">{manga.configuration.protagonist}</span>
          </div>
          <div className="summary-item">
            <span className="label">作風</span>
            <span className="value">{manga.configuration.style}</span>
          </div>
        </div>

        <div className="abilities-summary">
          <h3>能力配分</h3>
          <div className="ability-bars">
            <AbilityBar label="ストーリー" value={manga.abilities.story} />
            <AbilityBar label="キャラクター" value={manga.abilities.character} />
            <AbilityBar label="画力・演出" value={manga.abilities.artwork} />
            <AbilityBar label="独自性・テーマ" value={manga.abilities.originality} />
            <AbilityBar label="構成・テンポ" value={manga.abilities.composition} />
          </div>
          <p className="total">総合能力: {manga.totalAbility}</p>
        </div>
      </div>

      <button className="confirm-button" onClick={onConfirm}>
        連載を開始する
      </button>
    </div>
  );
}

function AbilityBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="ability-bar">
      <span className="ability-label">{label}</span>
      <div className="bar-container">
        <div className="bar-fill" style={{ width: `${(value / 100) * 100}%` }} />
      </div>
      <span className="ability-value">{value}</span>
    </div>
  );
}
