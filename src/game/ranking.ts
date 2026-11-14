import type { SerializingManga } from '@/types';

/**
 * 全作品の人気値からアンケート順位を算出
 * 順位1が最高（最も人気）
 */
export function calculateRankings(allMangas: SerializingManga[]): Map<string, number> {
  const rankings = new Map<string, number>();

  // 人気の高い順でソート
  const sorted = [...allMangas].sort((a, b) => b.currentPopularity - a.currentPopularity);

  // 順位を付与
  sorted.forEach((manga, index) => {
    rankings.set(manga.id, index + 1);
  });

  return rankings;
}

/**
 * アンケート順位から掲載順位を算出
 * 
 * 掲載順位はアンケート順位を基本としながらも、以下の要因で調整される：
 * - 編集部期待度
 * - 新連載補正（開始時の特典）
 * - 長期連載作品への補正（マンネリ化防止）
 * - 単行本売上
 * - イベント補正
 */
export function calculatePlacementRanking(
  manga: SerializingManga,
  allMangas: SerializingManga[]
): number {
  let adjustedRanking = manga.currentRanking;

  // 編集部期待度による小さな補正
  const editorExpectationBonus = (manga.editorExpectation - 0.5) * 1.2;
  adjustedRanking -= editorExpectationBonus;

  // 新連載補正（上位へ固定されない程度にする）
  if (manga.popularityHistory.length < 5) {
    adjustedRanking -= 0.5;
  }

  // 長期連載補正（20週以上だと、アンケート順位との乖離を戻す傾向）
  if (manga.popularityHistory.length >= 20) {
    // この補正により、長期連載でも安定して掲載されやすくなる
    adjustedRanking += 0.5;
  }

  // 単行本売上による補正
  // 売上が好調だと編集部の推し度が上昇
  const salesPerVolume = manga.totalSales / Math.max(1, manga.salesHistory.length);
  if (salesPerVolume > 200000) {
    adjustedRanking -= 0.5;
  } else if (salesPerVolume > 140000) {
    adjustedRanking -= 0.25;
  }

  return Math.max(1, Math.min(allMangas.length, Math.round(adjustedRanking)));
}

/**
 * 複数の作品の掲載順位を一括計算
 */
export function updatePlacementRankings(allMangas: SerializingManga[]): void {
  allMangas.forEach((manga) => {
    manga.currentPlacementRanking = calculatePlacementRanking(manga, allMangas);
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
  // 掲載順位が良いほど早いページに掲載される
  // 簡易計算: 1位が1ページ目、2位が2ページ目、という線形関係
  return Math.max(1, Math.min(totalSerializations, placementRanking));
}
