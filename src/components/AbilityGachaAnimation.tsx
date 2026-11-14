import { useEffect, useState, useRef } from 'react';
import { scrollToTop } from '@/utils/scrollToTop';
import './AbilityGachaAnimation.css';

interface AbilityGachaAnimationProps {
  mangakaAbility: number;
  editorAbility: number;
  totalAbility: number;
  onAnimationComplete: () => void;
}

function getAbilityRating(ability: number): {
  label: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
} {
  if (ability >= 90) {
    return { label: '天才級', rarity: 'legendary' };
  }
  if (ability >= 80) {
    return { label: '逸材', rarity: 'epic' };
  }
  if (ability >= 70) {
    return { label: '有能', rarity: 'rare' };
  }
  if (ability >= 60) {
    return { label: '平均的', rarity: 'common' };
  }
  return { label: '実力不足', rarity: 'common' };
}

function generateAnimationSequence(max: number, count: number): number[] {
  const sequence: number[] = [];
  for (let i = 0; i < count; i++) {
    sequence.push(Math.floor(Math.random() * (max + 1)));
  }
  return sequence;
}

export default function AbilityGachaAnimation({
  mangakaAbility,
  editorAbility,
  totalAbility,
  onAnimationComplete,
}: AbilityGachaAnimationProps) {
  const [step, setStep] = useState<'start' | 'mangaka' | 'editor' | 'total' | 'complete'>(
    'start'
  );
  const [displayMangaka, setDisplayMangaka] = useState<number | string>('？？？');
  const [displayEditor, setDisplayEditor] = useState<number | string>('？？？');
  const [displayTotal, setDisplayTotal] = useState<number | string>('？？？');
  const [mangakaSequence, setMangakaSequence] = useState<number[]>([]);
  const [editorSequence, setEditorSequence] = useState<number[]>([]);
  const [isSkipped, setIsSkipped] = useState(false);
  const skipRequestedRef = useRef(false);

  const mangakaRating = getAbilityRating(mangakaAbility);
  const editorRating = getAbilityRating(editorAbility);

  const handleSkip = () => {
    skipRequestedRef.current = true;
    setIsSkipped(true);
    setDisplayMangaka(mangakaAbility);
    setDisplayEditor(editorAbility);
    setDisplayTotal(totalAbility);
    setStep('complete');
  };

  // 開始時にアニメーション準備
  useEffect(() => {
    const mangakaSeq = generateAnimationSequence(mangakaAbility, 20);
    const editorSeq = generateAnimationSequence(editorAbility, 20);
    setMangakaSequence(mangakaSeq);
    setEditorSequence(editorSeq);
    setStep('mangaka');
  }, []);

  // 漫画家能力アニメーション
  useEffect(() => {
    if (step !== 'mangaka' || mangakaSequence.length === 0) return;

    let animationFrame = 0;
    const animationDuration = 1500; // 1.5秒
    const frameCount = 20;
    const frameDuration = animationDuration / frameCount;

    const interval = setInterval(() => {
      if (skipRequestedRef.current) {
        clearInterval(interval);
        return;
      }
      
      if (animationFrame < frameCount) {
        setDisplayMangaka(mangakaSequence[animationFrame]);
        animationFrame++;
      } else {
        setDisplayMangaka(mangakaAbility);
        clearInterval(interval);
        setStep('editor');
      }
    }, frameDuration);

    return () => clearInterval(interval);
  }, [step, mangakaSequence, mangakaAbility]);

  // 担当編集能力アニメーション
  useEffect(() => {
    if (step !== 'editor' || editorSequence.length === 0) return;

    let animationFrame = 0;
    const animationDuration = 1500; // 1.5秒
    const frameCount = 20;
    const frameDuration = animationDuration / frameCount;

    const interval = setInterval(() => {
      if (skipRequestedRef.current) {
        clearInterval(interval);
        return;
      }
      
      if (animationFrame < frameCount) {
        setDisplayEditor(editorSequence[animationFrame]);
        animationFrame++;
      } else {
        setDisplayEditor(editorAbility);
        clearInterval(interval);
        setStep('total');
      }
    }, frameDuration);

    return () => clearInterval(interval);
  }, [step, editorSequence, editorAbility]);

  // 総合能力表示
  useEffect(() => {
    if (step !== 'total') return;

    if (skipRequestedRef.current) {
      setDisplayTotal(totalAbility);
      setStep('complete');
      return;
    }

    const timer = setTimeout(() => {
      setDisplayTotal(totalAbility);
      setStep('complete');
    }, 500); // 総合能力は少し遅延

    return () => clearTimeout(timer);
  }, [step, totalAbility]);

  // 完了時にコールバック
  useEffect(() => {
    if (step === 'complete') {
      const timer = setTimeout(() => {
        scrollToTop();
        onAnimationComplete();
      }, isSkipped ? 100 : 1500); // スキップ時は短い遅延

      return () => clearTimeout(timer);
    }
  }, [step, isSkipped, onAnimationComplete]);

  return (
    <div className="ability-gacha-animation">
      <div className="gacha-overlay" />

      <div className="gacha-container">
        <div className="gacha-header">
          <h2>創作者能力を抽選中...</h2>
        </div>

        <div className="gacha-content">
          {/* 漫画家能力 */}
          <div className={`ability-slot mangaka-slot ${step !== 'start' ? 'active' : ''}`}>
            <div className="slot-frame">
              <div className={`slot-number ${typeof displayMangaka === 'number' ? 'revealed' : ''}`}>
                {displayMangaka}
              </div>
            </div>
            <div className="slot-label">漫画家能力</div>
            {typeof displayMangaka === 'number' && (
              <div className={`ability-rating ${mangakaRating.rarity}`}>
                {mangakaRating.label}
              </div>
            )}
          </div>

          <div className="plus-sign">+</div>

          {/* 担当編集能力 */}
          <div className={`ability-slot editor-slot ${step !== 'start' && step !== 'mangaka' ? 'active' : ''}`}>
            <div className="slot-frame">
              <div className={`slot-number ${typeof displayEditor === 'number' ? 'revealed' : ''}`}>
                {displayEditor}
              </div>
            </div>
            <div className="slot-label">担当編集能力</div>
            {typeof displayEditor === 'number' && (
              <div className={`ability-rating ${editorRating.rarity}`}>
                {editorRating.label}
              </div>
            )}
          </div>

          <div className="equals-sign">=</div>

          {/* 総合能力 */}
          <div className={`ability-slot total-slot ${step === 'total' || step === 'complete' ? 'active' : ''}`}>
            <div className="slot-frame">
              <div className={`slot-number total-number ${typeof displayTotal === 'number' ? 'revealed' : ''}`}>
                {displayTotal}
              </div>
            </div>
            <div className="slot-label">総合能力</div>
            {typeof displayTotal === 'number' && (
              <div className="total-glow" />
            )}
          </div>
        </div>

        {/* 完了演出 */}
        {step === 'complete' && (
          <div className="completion-effect">
            <div className="star star-1" />
            <div className="star star-2" />
            <div className="star star-3" />
            <p className="completion-text">完了！</p>
          </div>
        )}

      </div>
    </div>
  );
}
