import { useState, useEffect } from 'react';
import type { GameData, MangaConfiguration, MangaRecord } from '@/types';
import { MANGA_CONFIG_OPTIONS } from '@/game/config';
import { SeededRandom, generateRandomSeed } from '@/utils/seededRandom';
import { createManga } from '@/game/manga';
import { saveGameData } from '@/utils/storage';
import { scrollToTop } from '@/utils/scrollToTop';
import MangaConfigStep from '../MangaConfigStep';
import AbilityAllocationStep from '../AbilityAllocationStep';
import './MangaCreationScreen.css';

interface MangaCreationScreenProps {
  gameData: GameData;
  setGameData: (data: GameData) => void;
  onComplete: (manga: MangaRecord) => void;
}

type CreationStep = 'config' | 'ability' | 'confirmation';

export default function MangaCreationScreen({
  gameData,
  setGameData,
  onComplete,
}: MangaCreationScreenProps) {
  const [step, setStep] = useState<CreationStep>('config');
  const [mangaRecord, setMangaRecord] = useState<MangaRecord | null>(null);
  const [initialConfig, setInitialConfig] = useState<MangaConfiguration | null>(null);
  const [hasCreatedManga, setHasCreatedManga] = useState(false);

  useEffect(() => {
    scrollToTop();
  }, []);

  // step 変更時にスクロール最上部に設定
  useEffect(() => {
    scrollToTop();
  }, [step]);

  const handleConfigComplete = (newConfig: MangaConfiguration) => {
    // 最初の1回のみMangaRecordを生成
    let manga: MangaRecord;
    
    if (!hasCreatedManga) {
      const rng = new SeededRandom(generateRandomSeed());
      manga = createManga(newConfig, rng);
      setHasCreatedManga(true);
    } else {
      // 2回目以降は設定を更新するのみ
      if (!mangaRecord) return;
      manga = {
        ...mangaRecord,
        configuration: newConfig,
      };
    }
    
    setMangaRecord(manga);
    setInitialConfig(newConfig);
    setStep('ability');
  };

  const handleAbilityComplete = (updatedManga: MangaRecord) => {
    if (!updatedManga) return;

    // updatedMangaを保存（GameDataには保存しない）
    setMangaRecord(updatedManga);
    setStep('confirmation');
  };

  const handleBackFromConfirmation = () => {
    setStep('ability');
  };

  const handleBackFromAbility = () => {
    setStep('config');
  };

  const handleConfirm = () => {
    if (mangaRecord) {
      // 確認時にGameDataに保存
      const newGameData: GameData = {
        ...gameData,
        mangas: [...gameData.mangas, mangaRecord],
        lastUpdated: Date.now(),
      };

      setGameData(newGameData);
      saveGameData(newGameData);

      onComplete(mangaRecord);
    }
  };

  return (
    <div className="manga-creation-screen">
      <div className="creation-container">
        <h1 className="creation-title">漫画を制作する</h1>

        {step === 'config' && (
          <MangaConfigStep
            options={MANGA_CONFIG_OPTIONS}
            onComplete={handleConfigComplete}
            initialConfig={initialConfig}
          />
        )}

        {step === 'ability' && mangaRecord && (
          <AbilityAllocationStep
            manga={mangaRecord}
            onComplete={handleAbilityComplete}
            onBack={handleBackFromAbility}
          />
        )}

        {step === 'confirmation' && mangaRecord && (
          <ConfirmationStep
            manga={mangaRecord}
            onConfirm={handleConfirm}
            onBack={handleBackFromConfirmation}
          />
        )}
      </div>
    </div>
  );
}

function ConfirmationStep({
  manga,
  onConfirm,
  onBack,
}: {
  manga: MangaRecord;
  onConfirm: () => void;
  onBack?: () => void;
}) {
  // ジャンルのラベルを取得
  const genreLabel = MANGA_CONFIG_OPTIONS.genres.find(
    (g) => g.id === manga.configuration.genre
  )?.label || manga.configuration.genre;

  // 世界観のラベルを取得
  const worldviewLabel = MANGA_CONFIG_OPTIONS.worldviews.find(
    (w) => w.id === manga.configuration.worldview
  )?.label || manga.configuration.worldview;

  // 主人公のラベルを取得
  const protagonistLabel = MANGA_CONFIG_OPTIONS.protagonists.find(
    (p) => p.id === manga.configuration.protagonist
  )?.label || manga.configuration.protagonist;

  // 作風のラベルを取得
  const styleLabel = MANGA_CONFIG_OPTIONS.styles.find(
    (s) => s.id === manga.configuration.style
  )?.label || manga.configuration.style;

  return (
    <div className="confirmation-step">
      <div className="manga-summary">
        <h2>{manga.configuration.title}</h2>
        <p className="author">作者: {manga.configuration.authorName}</p>

        <div className="summary-grid">
          <div className="summary-item">
            <span className="label">ジャンル</span>
            <span className="value">{genreLabel}</span>
          </div>
          <div className="summary-item">
            <span className="label">世界観</span>
            <span className="value">{worldviewLabel}</span>
          </div>
          <div className="summary-item">
            <span className="label">主人公</span>
            <span className="value">{protagonistLabel}</span>
          </div>
          <div className="summary-item">
            <span className="label">作風</span>
            <span className="value">{styleLabel}</span>
          </div>
        </div>

        <div className="creator-abilities">
          <h3>創作者能力</h3>
          <div className="creator-ability-items">
            <div className="creator-ability-item">
              <span className="label">漫画家能力</span>
              <span className="value">{manga.mangakaAbility}</span>
            </div>
            <div className="creator-ability-item">
              <span className="label">担当編集能力</span>
              <span className="value">{manga.editorAbility}</span>
            </div>
            <div className="creator-ability-item total">
              <span className="label">総合能力</span>
              <span className="value">{manga.totalAbility}</span>
            </div>
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
        </div>
      </div>

      <div className="buttons-group">
        {onBack && (
          <button
            className="back-button"
            onClick={onBack}
            type="button"
          >
            戻る
          </button>
        )}
        <button className="confirm-button" onClick={onConfirm}>
          連載を開始する
        </button>
      </div>
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