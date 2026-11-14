import { useState, useMemo } from 'react';
import type { MangaRecord, MangaAbilities } from '@/types';
import {
  calculateRemainingAbilityPoints,
  updateAbility,
  initializeAbilities,
} from '@/game/ability';
import { getAbilityRating, getTotalAbilityRating } from '@/utils/abilityRating';
import { SeededRandom, generateRandomSeed } from '@/utils/seededRandom';
import AbilityGachaAnimation from './AbilityGachaAnimation';
import AbilityCard from './AbilityCard';
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

export default function AbilityAllocationStep({
  manga: initialManga,
  onComplete,
  onBack,
}: AbilityAllocationStepProps) {
  const [abilities, setAbilities] = useState(initialManga.abilities);
  // 演出済みフラグをチェック（初回のみ true、2回目以降は false）
  const [showAnimation, setShowAnimation] = useState(!initialManga.animationShown);

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
    setShowAnimation(false);
  };

  const handleComplete = () => {
    // 残りポイントがマイナスの場合は先に進めない
    if (remaining < 0) {
      return;
    }

    const updatedManga: MangaRecord = {
      ...initialManga,
      abilities,
      animationShown: true, // 演出表示済みフラグを立てる
    };
    onComplete(updatedManga);
  };

  // 配分が完了したかどうか（残りポイント = 0）
  const isBalanced = remaining === 0;
  // ボタンが押せるかどうか（残りポイント >= 0）
  const canProceed = remaining >= 0;

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
            <span className={`ability-rating ${getAbilityRating(initialManga.mangakaAbility).rarity}`}>
              {getAbilityRating(initialManga.mangakaAbility).label}
            </span>
          </div>
          <div className="ability-info-item">
            <span className="label">担当編集能力</span>
            <span className="value">{initialManga.editorAbility}</span>
            <span className={`ability-rating ${getAbilityRating(initialManga.editorAbility).rarity}`}>
              {getAbilityRating(initialManga.editorAbility).label}
            </span>
          </div>
          <div className="ability-info-item total">
            <span className="label">総合能力</span>
            <span className="value">{initialManga.totalAbility}</span>
            <span className={`ability-rating total-rating ${getTotalAbilityRating(initialManga.totalAbility).rarity}`}>
              {getTotalAbilityRating(initialManga.totalAbility).label}
            </span>
          </div>
        </div>
        
        <p className="allocation-instruction">下記から総合能力を配分してください</p>
      </div>

      <div className="allocation-container">
        <div className="abilities-grid">
          {ABILITY_KEYS.map((key: AbilityKey) => (
            <AbilityCard
              key={String(key)}
              abilityKey={key}
              value={abilities[key]}
              onChange={(value) => handleAbilityChange(key, value)}
              maxValue={initialManga.totalAbility}
            />
          ))}
        </div>

        <div className={`remaining-points ${isBalanced ? 'complete' : ''} ${!canProceed ? 'error' : ''}`}>
          <p>残りポイント: <strong>{remaining}</strong></p>
          {isBalanced && <p className="complete-message">✓ 配分完了（最適配分）</p>}
          {!isBalanced && canProceed && <p className="info-message">自由に配分できます</p>}
          {!canProceed && <p className="error-message">⚠ ポイントを使いすぎています</p>}
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
            disabled={!canProceed}
          >
            確認画面へ
          </button>
        </div>
      </div>
    </div>
  );
}
