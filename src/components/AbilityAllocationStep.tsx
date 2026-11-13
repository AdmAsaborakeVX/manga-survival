import { useState, useMemo } from 'react';
import type { MangaRecord, MangaAbilities } from '@/types';
import {
  calculateRemainingAbilityPoints,
  updateAbility,
  initializeAbilities,
} from '@/game/ability';
import { SeededRandom, generateRandomSeed } from '@/utils/seededRandom';
import './AbilityAllocationStep.css';

interface AbilityAllocationStepProps {
  manga: MangaRecord;
  onComplete: (updatedManga: MangaRecord) => void;
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
}: AbilityAllocationStepProps) {
  const [abilities, setAbilities] = useState(initialManga.abilities);
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

  const handleComplete = () => {
    const updatedManga: MangaRecord = {
      ...initialManga,
      abilities,
    };
    onComplete(updatedManga);
  };

  const isComplete = remaining === 0;

  return (
    <div className="ability-allocation-step">
      <div className="allocation-header">
        <h2>能力を配分する</h2>
        <p>総合能力: {initialManga.totalAbility} ポイント</p>
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

        <div className={`remaining-points ${remaining === 0 ? 'complete' : ''}`}>
          <p>残りポイント: <strong>{remaining}</strong></p>
          {remaining === 0 && <p className="complete-message">✓ 配分完了</p>}
        </div>

        <div className="buttons-group">
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
            disabled={!isComplete}
            type="button"
          >
            確認画面へ
          </button>
        </div>
      </div>
    </div>
  );
}
