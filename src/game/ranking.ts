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

function getSmoothedSurveyRanking(manga: SerializingManga): number {
  const recentRankings = manga.rankingHistory.slice(-PLACEMENT_CONFIG.SURVEY_HISTORY_WEEKS);
  if (recentRankings.length === 0) return manga.currentRanking;

  return recentRankings.reduce((total, rank) => total + rank, 0) / recentRankings.length;
}

function getPlacementScore(manga: SerializingManga): number {
  const smoothedSurveyRanking = getSmoothedSurveyRanking(manga);
  const adjustedRanking =
    smoothedSurveyRanking * PLACEMENT_CONFIG.SURVEY_SCORE_WEIGHT +
    manga.currentPlacementRanking * PLACEMENT_CONFIG.PREVIOUS_PLACEMENT_WEIGHT;

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

  return adjustedRanking - editorExpectationBonus - newSerialBonus - salesBonus + longSerialPenalty;
}

function getPlacementOrder(allMangas: SerializingManga[], seed?: number): SerializingManga[] {
  const scoredMangas = allMangas.map((manga, index) => {
    let score = getPlacementScore(manga);
    if (seed !== undefined && score <= PLACEMENT_CONFIG.TOP_RANK_NOISE_THRESHOLD) {
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
    const scoreDifference = a.score - b.score;
    if (scoreDifference !== 0) return scoreDifference;
    const previousRankDifference =
      a.manga.currentPlacementRanking - b.manga.currentPlacementRanking;
    return previousRankDifference || a.manga.id.localeCompare(b.manga.id);
  }).map(({ manga }) => manga);
}

/**
 * 平滑化したアンケート順位を全作品で比較して掲載順位を算出
 */
export function calculatePlacementRanking(
  manga: SerializingManga,
  allMangas: SerializingManga[],
  seed?: number
): number {
  const order = getPlacementOrder(allMangas, seed);
  const index = order.findIndex((entry) => entry.id === manga.id);
  return index < 0 ? Math.max(1, Math.min(allMangas.length, manga.currentRanking)) : index + 1;
}

/**
 * 複数の作品の掲載順位を一括計算
 */
export function updatePlacementRankings(allMangas: SerializingManga[], seed?: number): void {
  const order = getPlacementOrder(allMangas, seed);
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
