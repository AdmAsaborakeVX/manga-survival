import type { SerializingManga } from '@/types';
import { SeededRandom } from '@/utils/seededRandom';
import { POPULARITY_CONFIG } from '@/game/config';

/**
 * 総合能力から基本人気度を計算
 * 範囲: 0～100
 */
export function calculateBasePopularity(totalAbility: number): number {
  // Ability 100/130/160 maps to a competitive but non-saturated 40/49/58 range.
  return Math.max(15, Math.min(75, 25 + (totalAbility - 50) * 0.3));
}

/**
 * 作品の能力に基づいた人気の安定性を計算
 * 高能力ほど安定し、低能力ほど変動が大きい
 */
export function calculateStability(totalAbility: number, rng: SeededRandom): number {
  const baseStability = 0.3 + (totalAbility / 300) * 0.5;
  const variance = rng.nextFloat(-0.1, 0.1);
  return Math.max(
    POPULARITY_CONFIG.STABILITY_MIN,
    Math.min(POPULARITY_CONFIG.STABILITY_MAX, baseStability + variance)
  );
}

/**
 * 作品の爆発力を計算
 * 高能力ほど爆発力が低く（安定している）、低能力ほど変動幅が大きい
 */
export function calculateExplosiveness(totalAbility: number, rng: SeededRandom): number {
  const baseExplosiveness = 2.0 - (totalAbility / 300) * 1.0;
  const variance = rng.nextFloat(-0.3, 0.3);
  return Math.max(
    POPULARITY_CONFIG.EXPLOSIVENESS_MIN,
    Math.min(POPULARITY_CONFIG.EXPLOSIVENESS_MAX, baseExplosiveness + variance)
  );
}

/**
 * 毎週の人気変動を計算
 *
 * 計算式の考え方：
 * - 前週の人気を土台にしながら、能力に応じた基線へ毎週戻す
 * - 能力差が長期平均人気と回復力を決める
 * - 乱数とイベントによる短期的な逆転を許容する
 * - 人気が高い作品は高い水準を維持しやすい
 * - 人気が低い作品は低迷しやすい（ただし完全ではない）
 */
export function calculatePopularityChange(
  manga: SerializingManga,
  rng: SeededRandom,
  rivalPopularities: number[]
): number {
  const currentPopularity = manga.currentPopularity;
  const ability = manga.totalAbility;
  const stability = Math.max(0.1, Math.min(1.0, manga.stability));
  const explosiveness = Math.max(0.5, Math.min(3.0, manga.explosiveness));

  // ========== 基線を計算 ==========
  const baselinePopularity = calculateBasePopularity(ability);

  // ========== 前週の人気の継続 ==========
  // これが最も大きな要素で、人気は慣性を持つ
  // 最初の週は基線値を前週として扱う
  const previousPopularity = manga.popularityHistory.length > 0 
    ? manga.popularityHistory[manga.popularityHistory.length - 1] 
    : baselinePopularity;
  
  const momentumTerm = (previousPopularity - currentPopularity) * POPULARITY_CONFIG.MOMENTUM_FACTOR;

  // ========== 基線への緩い復帰 ==========
  // 能力値に基づいた期待値へ向かう傾向（ゆっくり）
  const popDifference = baselinePopularity - currentPopularity;
  const regressionTerm = popDifference * POPULARITY_CONFIG.BASE_CHANGE_RATE;

  // ========== ランダム変動（イベント的）==========
  // 爆発力と安定性で幅を決める
  const randomBase = rng.nextFloat(-1, 1);
  
  // ランダム項は爆発力で決まり、安定性で抑制される
  const maxRandomChange = explosiveness * 1.5;
  const randomTerm = randomBase * maxRandomChange * (1 - stability * POPULARITY_CONFIG.STABILITY_FACTOR);

  // ========== ライバルからの競争圧力 ==========
  // ライバルが強いと相対順位が下がる傾向（弱い効果）
  let competitionPressure = 0;
  if (rivalPopularities.length > 0) {
    const avgRivalPopularity = rivalPopularities.reduce((a, b) => a + b, 0) / rivalPopularities.length;
    competitionPressure = (avgRivalPopularity - currentPopularity) * 0.04;
  }

  // ========== 連載継続による長期減衰 ==========
  // 連載が長くなると新規性が失われ、緩やかに人気が減衰（20週以上で発動）
  const weekNumber = manga.popularityHistory.length;
  let progressMalus = 0;
  if (weekNumber >= 20) {
    progressMalus =
      -(weekNumber - 20) *
      POPULARITY_CONFIG.SERIES_PROGRESS_MALUS *
      (1 - stability * POPULARITY_CONFIG.STABILITY_FACTOR);
  }

  // ========== 総合計算 ==========
  const totalChange = momentumTerm + regressionTerm + randomTerm + competitionPressure + progressMalus;

  // NaN チェック（デバッグ用）
  if (!Number.isFinite(totalChange)) {
    console.warn('Non-finite popularity change detected:', {
      totalChange,
      momentumTerm,
      regressionTerm,
      randomTerm,
      competitionPressure,
      progressMalus,
      currentPopularity,
      previousPopularity,
      baselinePopularity,
    });
    return 0;
  }

  return totalChange;
}

/**
 * 人気値を範囲内にクリップして返す
 */
export function clampPopularity(popularity: number): number {
  return Math.max(POPULARITY_CONFIG.MIN, Math.min(POPULARITY_CONFIG.MAX, popularity));
}

/**
 * 毎週の人気更新（読者層との相性も考慮）
 */
export function updateMangaPopularity(
  manga: SerializingManga,
  rng: SeededRandom,
  rivalPopularities: number[]
): void {
  // 人気変動を計算
  const change = calculatePopularityChange(manga, rng, rivalPopularities);

  // 新しい人気値を計算
  const newPopularity = clampPopularity(manga.currentPopularity + change);

  // 履歴に保存（クリップした現在値を記録）
  manga.popularityHistory.push(clampPopularity(manga.currentPopularity));

  // 現在値を更新
  manga.currentPopularity = newPopularity;

  // 読者層との相性トレンドもランダムに微調整
  const trendChange = rng.nextFloat(-0.05, 0.05);
  manga.readerAffinityTrend = Math.max(-0.5, Math.min(0.5, manga.readerAffinityTrend + trendChange));
}

/**
 * 複数週のシミュレーション（テスト用）
 */
export function simulatePopularityTrend(
  totalAbility: number,
  weeks: number,
  seed: number
): number[] {
  const rng = new SeededRandom(seed);
  const mangaState: SerializingManga = {
    id: 'test',
    title: 'Test',
    configuration: {
      genre: 'shounen_action',
      worldview: 'contemporary',
      protagonist: 'ordinary_boy',
      style: 'traditional_shounen',
      title: 'Test',
      authorName: 'Test',
    },
    abilities: {
      story: totalAbility / 5,
      character: totalAbility / 5,
      artwork: totalAbility / 5,
      originality: totalAbility / 5,
      composition: totalAbility / 5,
    },
    totalAbility,
    currentPopularity: calculateBasePopularity(totalAbility),
    popularityHistory: [],
    currentRanking: 1,
    currentPlacementRanking: 1,
    rankingHistory: [],
    totalSales: 0,
    lastSalesWeek: 0,
    salesHistory: [],
    stability: calculateStability(totalAbility, rng),
    explosiveness: calculateExplosiveness(totalAbility, rng),
    readerAffinityTrend: 0,
    editorExpectation: 0.8,
    lastEventId: null,
    lastEventWeek: -1,
    eventHistory: [],
    cancellationRisk: 0,
    lowRankingWeeks: 0,
    initialPopularity: calculateBasePopularity(totalAbility),
  };

  const results: number[] = [mangaState.currentPopularity];

  for (let i = 0; i < weeks - 1; i++) {
    updateMangaPopularity(mangaState, rng, []);
    results.push(mangaState.currentPopularity);
  }

  return results;
}
