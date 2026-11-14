import type { SerializingManga } from '@/types';
import { PLACEMENT_CONFIG } from '@/game/config';
import { SeededRandom } from '@/utils/seededRandom';

/**
 * 全作品の人気値からアンケート順位を算出
 * 順位1が最高（最も人気）
 */
export function calculateRankings(allMangas: SerializingManga[]): Map<string, number> {
  const rankings = new Map<string, number>();

  const sorted = [...allMangas].sort((a, b) => b.currentPopularity - a.currentPopularity);
  sorted.forEach((manga, index) => {
    rankings.set(manga.id, index + 1);
  });

  return rankings;
}

function getTargetScoreForRanking(manga: SerializingManga, surveyRanking: number): number {
  const editorExpectationBonus =
    (manga.editorExpectation - 0.5) * PLACEMENT_CONFIG.EDITOR_EXPECTATION_FACTOR;
  const weeksSerialized = manga.popularityHistory.length;
  const newSerialBonus =
    weeksSerialized < 5 ? PLACEMENT_CONFIG.NEW_SERIAL_BONUS : 0;
  const longSerialPenalty =
    weeksSerialized >= 20 ? PLACEMENT_CONFIG.LONG_SERIAL_PENALTY : 0;
  const salesPerVolume = manga.totalSales / Math.max(1, manga.salesHistory.length);
  const salesBonus =
    salesPerVolume > PLACEMENT_CONFIG.HIGH_SALES_THRESHOLD
      ? PLACEMENT_CONFIG.HIGH_SALES_BONUS
      : salesPerVolume > PLACEMENT_CONFIG.MEDIUM_SALES_THRESHOLD
        ? PLACEMENT_CONFIG.MEDIUM_SALES_BONUS
        : 0;

  return -surveyRanking + editorExpectationBonus + newSerialBonus + salesBonus - longSerialPenalty;
}

export function calculatePlacementTargetScore(manga: SerializingManga): number {
  return getTargetScoreForRanking(manga, manga.currentRanking);
}

function getLegacyEmaFallback(manga: SerializingManga): number {
  const previousSurveyRanking = manga.rankingHistory.length > 1
    ? manga.rankingHistory[manga.rankingHistory.length - 2]
    : manga.currentPlacementRanking || manga.currentRanking;
  return getTargetScoreForRanking(manga, previousSurveyRanking);
}

function getNextEmaScore(manga: SerializingManga): number {
  const targetScore = calculatePlacementTargetScore(manga);
  const previousEmaScore =
    typeof manga.placementEmaScore === 'number' && Number.isFinite(manga.placementEmaScore)
      ? manga.placementEmaScore
      : getLegacyEmaFallback(manga);

  return (
    PLACEMENT_CONFIG.EMA_ALPHA * targetScore +
    (1 - PLACEMENT_CONFIG.EMA_ALPHA) * previousEmaScore
  );
}

function getPlacementOrder(
  allMangas: SerializingManga[],
  emaScores: Map<string, number>,
  seed?: number
): SerializingManga[] {
  const scoredMangas = allMangas.map((manga, index) => {
    let score = emaScores.get(manga.id) ?? getNextEmaScore(manga);
    if (seed !== undefined && score >= -PLACEMENT_CONFIG.TOP_RANK_NOISE_THRESHOLD) {
      const mangaSeed = seed ^ Math.imul(index + 1, 0x9e3779b9);
      const rng = new SeededRandom(mangaSeed);
      score += rng.nextFloat(
        -PLACEMENT_CONFIG.TOP_RANK_NOISE,
        PLACEMENT_CONFIG.TOP_RANK_NOISE
      );
    }
    return { manga, score };
  });

  return scoredMangas.sort((a, b) => {
    const scoreDifference = b.score - a.score;
    if (scoreDifference !== 0) return scoreDifference;
    const previousRankDifference =
      a.manga.currentPlacementRanking - b.manga.currentPlacementRanking;
    return previousRankDifference || a.manga.id.localeCompare(b.manga.id);
  }).map(({ manga }) => manga);
}

/**
 * 今週のアンケート評価をEMAで平滑化し、掲載順位を算出
 */
export function calculatePlacementRanking(
  manga: SerializingManga,
  allMangas: SerializingManga[],
  seed?: number
): number {
  const scores = new Map(
    allMangas.map((entry) => [entry.id, getNextEmaScore(entry)])
  );
  const order = getPlacementOrder(allMangas, scores, seed);
  const index = order.findIndex((entry) => entry.id === manga.id);
  return index < 0 ? Math.max(1, Math.min(allMangas.length, manga.currentRanking)) : index + 1;
}

/**
 * 複数の作品の掲載順位を一括計算
 */
export function updatePlacementRankings(allMangas: SerializingManga[], seed?: number): void {
  const emaScores = new Map<string, number>();
  for (const manga of allMangas) {
    const emaScore = getNextEmaScore(manga);
    manga.placementEmaScore = emaScore;
    emaScores.set(manga.id, emaScore);
  }

  const order = getPlacementOrder(allMangas, emaScores, seed);
  order.forEach((manga, index) => {
    manga.currentPlacementRanking = index + 1;
  });

  allMangas.forEach((manga) => {
    manga.placementHistory?.push(manga.currentPlacementRanking);
  });
}

/**
 * 順位の長期統計を計算（打ち切り判定用）
 */
export function calculateAverageRanking(manga: SerializingManga, weeks: number = 13): number {
  if (manga.rankingHistory.length === 0) {
    return manga.currentRanking;
  }

  const recentRankings = manga.rankingHistory.slice(-weeks);
  const sum = recentRankings.reduce((a, b) => a + b, 0);
  return sum / recentRankings.length;
}

/**
 * 低順位状態が何週続いているかをカウント
 */
export function countConsecutiveLowRankings(
  manga: SerializingManga,
  lowRankingThreshold: number
): number {
  let count = 0;
  for (let i = manga.rankingHistory.length - 1; i >= 0; i--) {
    if (manga.rankingHistory[i] >= lowRankingThreshold) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

/**
 * 掲載順位から最大何ページ目に掲載されるかを推定
 * （UI表示用。実際のページは将来的に別途計算される可能性）
 */
export function estimatePlacementPage(placementRanking: number, totalSerializations: number): number {
  return Math.max(1, Math.min(totalSerializations, placementRanking));
}
