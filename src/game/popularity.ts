import type { SerializingManga } from '@/types';
import { SeededRandom } from '@/utils/seededRandom';
import { POPULARITY_CONFIG } from '@/game/config';

/**
 * 総合能力から基本人気度を計算
 * 範囲: 0～100
 */
export function calculateBasePopularity(totalAbility: number): number {
  // totalAbility は通常 50～140 程度
  // 50が基準で、最大140なら高い人気
  // 線形変換: 50 -> 40, 140 -> 85
  const normalized = (totalAbility - 50) / 90;
  return Math.max(20, Math.min(85, 50 + normalized * 35));
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
 * - 基本は前週の人気から小幅変動
 * - 安定性が高いと変動が小さくなる
 * - 爆発力が高いと大きな変動の可能性がある
 * - 連載が長くなるにつれて人気は緩やかに減衰する傾向
 * - ランダム要素の強さは爆発力に影響を受ける
 */
export function calculatePopularityChange(
  manga: SerializingManga,
  rng: SeededRandom,
  rivalPopularities: number[]
): number {
  const currentPopularity = manga.currentPopularity;
  const ability = manga.totalAbility;
  const stability = manga.stability;
  const explosiveness = manga.explosiveness;

  // ========== 基本変動 ==========
  // 能力値に基づいた期待値へ向かう傾向
  const baselinePopularity = calculateBasePopularity(ability);
  const popDifference = baselinePopularity - currentPopularity;
  const regressionTerm = popDifference * POPULARITY_CONFIG.MOMENTUM_FACTOR * 0.1;

  // ========== 安定性による調整 ==========
  // 安定性が高いと前週の人気を継続しやすい
  const momentumTerm = (manga.popularityHistory.length > 0 ? manga.popularityHistory[manga.popularityHistory.length - 1] - currentPopularity : 0) * POPULARITY_CONFIG.MOMENTUM_FACTOR;

  // ========== ランダム変動 ==========
  // 爆発力の高さがランダム変動の幅を決める
  const randomBase = rng.nextFloat(-1, 1);
  const randomTerm = randomBase * (explosiveness * POPULARITY_CONFIG.BASE_CHANGE_RATE * 10);

  // 安定性が高いほど、ランダム変動を抑制
  const stabilityDamper = Math.pow(stability, 2);
  const dampedRandomTerm = randomTerm * (1 - stabilityDamper * 0.6);

  // ========== ライバルからの圧力 ==========
  // 周囲のライバルの人気が高いと、相対的に下がりやすくなる
  const avgRivalPopularity = rivalPopularities.length > 0 ? rivalPopularities.reduce((a, b) => a + b, 0) / rivalPopularities.length : 50;
  const competitionPressure = (avgRivalPopularity - currentPopularity) * 0.02;

  // ========== 連載期間による減衰 ==========
  // 連載が長くなるにつれて、新規性が失われ、人気が緩やかに減衰する傾向
  const weekNumber = manga.popularityHistory.length;
  const progressMalus = Math.pow(POPULARITY_CONFIG.SERIES_PROGRESS_MALUS, Math.max(0, weekNumber - 20)) - 1;

  // ========== 総合計算 ==========
  const totalChange = regressionTerm + momentumTerm + dampedRandomTerm + competitionPressure + progressMalus;

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

  // 履歴に保存
  manga.popularityHistory.push(manga.currentPopularity);

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
  const { SeededRandom } = require('@/utils/seededRandom');
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
