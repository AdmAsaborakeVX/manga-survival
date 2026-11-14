import { useState, useMemo, useEffect } from 'react';
import type { MangaRecord, MangaAbilities } from '@/types';
import {
  calculateRemainingAbilityPoints,
  updateAbility,
  initializeAbilities,
} from '@/game/ability';
import { SeededRandom, generateRandomSeed } from '@/utils/seededRandom';
import AbilityGachaAnimation from './AbilityGachaAnimation';
import './AbilityAllocationStep.css';

interface AbilityAllocationStepProps {
  manga: MangaRecord;
  onComplete: (updatedManga: MangaRecord) => void;
  onBack?: () => void;
}

type AbilityKey = keyof MangaAbilities;
const ABILITY_KEYS: AbilityKey[] = [
  'story',
  'character',
  'artwork',
  'originality',
  'composition',
];

const ABILITY_LABELS: Record<AbilityKey, string> = {
  story: 'ストーリー',
  character: 'キャラクター',
  artwork: '画力・演出',
  originality: '独自性・テーマ',
  composition: '構成・テンポ',
};

export default function AbilityAllocationStep({
  manga: initialManga,
  onComplete,
  onBack,
}: AbilityAllocationStepProps) {
  const [abilities, setAbilities] = useState(initialManga.abilities);
  const [showAnimation, setShowAnimation] = useState(true);
  const [animationComplete, setAnimationComplete] = useState(false);

  const remaining = useMemo(
    () => calculateRemainingAbilityPoints(abilities, initialManga.totalAbility),
    [abilities, initialManga.totalAbility]
  );

  const handleAbilityChange = (key: AbilityKey, value: number) => {
    const updated = updateAbility(abilities, key, value, initialManga.totalAbility);
    if (updated) {
      setAbilities(updated);
    }
  };

  const handleReset = () => {
    const rng = new SeededRandom(generateRandomSeed());
    const reset = initializeAbilities(initialManga.totalAbility, rng);
    setAbilities(reset);
  };

  const handleAnimationComplete = () => {
    setAnimationComplete(true);
    setShowAnimation(false);
  };

  const handleComplete = () => {
    const updatedManga: MangaRecord = {
      ...initialManga,
      abilities,
    };
    onComplete(updatedManga);
  };

  // 配分が完了したかどうか（残りポイント = 0）
  const isBalanced = remaining === 0;

  return (
    <div className={`ability-allocation-step ${showAnimation ? 'animating' : ''}`}>
      {showAnimation && (
        <AbilityGachaAnimation
          mangakaAbility={initialManga.mangakaAbility}
          editorAbility={initialManga.editorAbility}
          totalAbility={initialManga.totalAbility}
          onAnimationComplete={handleAnimationComplete}
        />
      )}
      <div className="allocation-header">
        <h2>能力を配分する</h2>
        
        <div className="creator-abilities-info">
          <div className="ability-info-item">
            <span className="label">漫画家能力</span>
            <span className="value">{initialManga.mangakaAbility}</span>
          </div>
          <div className="ability-info-item">
            <span className="label">担当編集能力</span>
            <span className="value">{initialManga.editorAbility}</span>
          </div>
          <div className="ability-info-item total">
            <span className="label">総合能力</span>
            <span className="value">{initialManga.totalAbility}</span>
          </div>
        </div>
        
        <p className="allocation-instruction">下記から総合能力を配分してください</p>
      </div>

      <div className="allocation-container">
        <div className="abilities-list">
          {ABILITY_KEYS.map((key: AbilityKey) => (
            <div key={String(key)} className="ability-item">
              <label htmlFor={`ability-${String(key)}`}>{ABILITY_LABELS[key]}</label>
              <div className="ability-input-group">
                <input
                  id={`ability-${String(key)}`}
                  type="range"
                  min="0"
                  max={initialManga.totalAbility}
                  value={abilities[key]}
                  onChange={(e) =>
                    handleAbilityChange(key, parseInt(e.target.value, 10))
                  }
                  className="slider"
                />
                <input
                  type="number"
                  value={abilities[key]}
                  onChange={(e) =>
                    handleAbilityChange(key, parseInt(e.target.value, 10))
                  }
                  min="0"
                  max={initialManga.totalAbility}
                  className="value-input"
                />
              </div>
            </div>
          ))}
        </div>

        <div className={`remaining-points ${isBalanced ? 'complete' : ''}`}>
          <p>残りポイント: <strong>{remaining}</strong></p>
          {isBalanced && <p className="complete-message">✓ 配分完了（最適配分）</p>}
          {!isBalanced && <p className="info-message">自由に配分できます</p>}
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
          <button
            className="reset-button"
            onClick={handleReset}
            type="button"
          >
            リセット
          </button>
          <button
            className="complete-button"
            onClick={handleComplete}
            type="button"
          >
            確認画面へ
          </button>
        </div>
      </div>
    </div>
  );
}
