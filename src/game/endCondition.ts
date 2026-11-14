import type { SerializingManga } from '@/types';
import { CANCELLATION_CONFIG, COMPLETION_CONFIG, GAME_CONFIG } from '@/game/config';
import { calculateAverageRanking, countConsecutiveLowRankings } from '@/game/ranking';
import { SeededRandom } from '@/utils/seededRandom';

/**
 * 直近N週の平均人気を計算
 */
function getAveragePopularityRecent(manga: SerializingManga, weeks: number): number {
  if (manga.popularityHistory.length === 0) {
    return manga.currentPopularity;
  }

  const recentWeeks = manga.popularityHistory.slice(-weeks);
  const sum = recentWeeks.reduce((a, b) => a + b, 0);
  return sum / recentWeeks.length;
}

/**
 * 人気の下降トレンドを計算（-1～1）
 * 負の値：下降トレンド
 * 正の値：上昇トレンド
 */
function getPopularityTrend(manga: SerializingManga, weeks: number = 4): number {
  if (manga.popularityHistory.length < weeks) {
    return 0;
  }

  const recent = manga.popularityHistory.slice(-weeks);
  
  // 線形回帰で傾きを推定（簡易版）
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < recent.length; i++) {
    const x = i;
    const y = recent[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }

  const n = recent.length;
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  
  // 傾きを正規化（-1～1の範囲に）
  return Math.max(-1, Math.min(1, slope / 20));
}

/**
 * 打ち切り危険度を更新（新しい計算式）
 * 
 * 危険度は以下の要素から計算される：
 * 1. 直近4週の平均順位（低いほど危険）
 * 2. 直近4週の平均人気（低いほど危険）
 * 3. 人気の下降トレンド（下降しているほど危険）
 * 4. 連続低順位の期間（長いほど危険）
 * 5. 連載期間による回復の可能性（長期連載は危険度を下げやすくする余地）
 * 
 * 最終的な危険度は 0～1 の範囲
 */
export function updateCancellationRisk(manga: SerializingManga, totalMangas = 6): void {
  const weekNumber = manga.popularityHistory.length;

  // 1週目は危険度を計算しない
  if (weekNumber < 2) {
    manga.cancellationRisk = 0;
    return;
  }

  // ========== コンポーネント1: 順位スコア ==========
  const recentAvgRanking = calculateAverageRanking(manga, 4);
  const rankingScore = Math.min(
    1,
    Math.max(0, (recentAvgRanking - 1) / Math.max(1, totalMangas - 1))
  );

  // ========== コンポーネント2: 人気スコア ==========
  const recentAvgPopularity = getAveragePopularityRecent(manga, 4);
  const popularityScore = Math.min(1, Math.max(0, (48 - recentAvgPopularity) / 35));

  // ========== コンポーネント3: トレンドスコア ==========
  const trend = getPopularityTrend(manga, 4);
  // 下降トレンドで危険度上昇
  const trendScore = Math.max(0, -trend);

  // ========== コンポーネント4: 連続低順位スコア ==========
  const consecutiveLowRankings = countConsecutiveLowRankings(
    manga,
    CANCELLATION_CONFIG.LOW_RANKING_THRESHOLD
  );
  const lowRankingScore = Math.min(1, consecutiveLowRankings / 5);

  const currentRiskScore = 
    rankingScore * 0.45 +
    popularityScore * 0.25 +
    trendScore * 0.1 +
    lowRankingScore * 0.2;

  manga.cancellationRisk = 
    manga.cancellationRisk * CANCELLATION_CONFIG.RISK_DECAY_RATE +
    currentRiskScore * (1 - CANCELLATION_CONFIG.RISK_DECAY_RATE);

  const expectationBonus = Math.max(0, manga.editorExpectation - 0.5) * 0.08;
  manga.cancellationRisk = Math.max(0, manga.cancellationRisk - expectationBonus);

  const salesPerVolume = manga.totalSales / Math.max(1, manga.salesHistory.length);
  if (salesPerVolume > 180000) {
    manga.cancellationRisk *= 0.85;
  } else if (salesPerVolume > 120000) {
    manga.cancellationRisk *= 0.93;
  }

  // ========== 正規化 ==========
  manga.cancellationRisk = Math.max(0, Math.min(1, manga.cancellationRisk));

  // ========== 低順位週数の更新 ==========
  manga.lowRankingWeeks = consecutiveLowRankings;
}

/**
 * 打ち切り判定（確定的）
 * 複数の条件を総合的に判定する
 */
export function shouldBeCancelled(manga: SerializingManga, totalMangas = 6): boolean {
  const weekNumber = manga.popularityHistory.length;

  // 1週目は打ち切りにならない
  if (weekNumber < 2) {
    return false;
  }

  // ========== 条件1: 即座打ち切り（極端に悪い成績が続いている） ==========
  if (weekNumber >= 2) {
    const recentPopularities = manga.popularityHistory.slice(-2);
    const recentRankings = manga.rankingHistory.slice(-2);
    
    if (
      recentPopularities.every((pop) => pop < 8) &&
      recentRankings.every((rank) => rank >= CANCELLATION_CONFIG.LOW_RANKING_THRESHOLD)
    ) {
      return true;
    }
  }

  if (manga.cancellationRisk > 0.85 && weekNumber >= 3) {
    if (manga.lowRankingWeeks >= 2) {
      return true;
    }
  }

  if (weekNumber < CANCELLATION_CONFIG.MIN_WEEKS_TO_CANCEL) {
    return false;
  }

  if (manga.cancellationRisk > 0.68 && manga.lowRankingWeeks >= 2) {
    return true;
  }

  if (manga.cancellationRisk > 0.4) {
    if (manga.lowRankingWeeks >= 3) {
      return true;
    }

    const avgRanking = calculateAverageRanking(manga, 10);
    if (avgRanking >= totalMangas * 0.7 && weekNumber >= 10) {
      return true;
    }

    const avgPopularity = getAveragePopularityRecent(manga, 6);
    if (avgPopularity < 20 && weekNumber >= 6) {
      return true;
    }
  }

  return false;
}

/**
 * 打ち切り判定（確率的・リバイバル要素）
 * 赤信号状態でも一定確率で復活できる機会を与える
 */
export function shouldBeCancelledWithChance(
  manga: SerializingManga,
  rng: SeededRandom,
  totalMangas = 6
): boolean {
  // 確定的な打ち切り判定
  if (shouldBeCancelled(manga, totalMangas)) {
    // 危険度が高いほど確実に打ち切り
    // 危険度0.5なら50%の確率で救われる
    const survivalChance = Math.max(0, 1 - manga.cancellationRisk);
    return rng.next() >= survivalChance;
  }

  return false;
}

/**
 * 円満完結判定
 */
export function shouldComplete(manga: SerializingManga, totalMangas = 6): boolean {
  const weeksRun = manga.popularityHistory.length;

  // 条件1: 最小連載期間を満たしている
  if (weeksRun < COMPLETION_CONFIG.MIN_WEEKS_TO_COMPLETE) {
    return false;
  }

  // 条件2: 平均人気が一定以上
  const avgPopularity = manga.popularityHistory.reduce((a, b) => a + b, 0) / manga.popularityHistory.length;
  if (avgPopularity < COMPLETION_CONFIG.MIN_AVERAGE_POPULARITY) {
    return false;
  }

  // 条件3: 雑誌内で上位40%程度の平均順位を保っている
  const avgRanking = calculateAverageRanking(manga);
  if (avgRanking > totalMangas * COMPLETION_CONFIG.MAX_AVERAGE_RANKING_RATIO) {
    return false;
  }

  // 条件4: 累計売上が一定以上
  if (manga.totalSales < COMPLETION_CONFIG.MIN_TOTAL_SALES) {
    return false;
  }

  return manga.editorExpectation >= 0.55;
}

function calculateCompletionChance(manga: SerializingManga, totalMangas: number): number {
  const averagePopularity =
    manga.popularityHistory.reduce((sum, value) => sum + value, 0) /
    Math.max(1, manga.popularityHistory.length);
  const averageRanking = calculateAverageRanking(manga);
  const maxCompletionRanking = totalMangas * COMPLETION_CONFIG.MAX_AVERAGE_RANKING_RATIO;
  const popularityScore = Math.min(1, Math.max(0,
    (averagePopularity - COMPLETION_CONFIG.MIN_AVERAGE_POPULARITY) / 18
  ));
  const rankingScore = Math.min(1, Math.max(0,
    (maxCompletionRanking - averageRanking) / Math.max(1, maxCompletionRanking - 1)
  ));
  const salesScore = Math.min(1, Math.max(0,
    (manga.totalSales - COMPLETION_CONFIG.MIN_TOTAL_SALES) / 1400000
  ));
  const expectationScore = Math.min(1, Math.max(0, (manga.editorExpectation - 0.5) / 0.4));
  const safetyScore = Math.min(1, Math.max(0, 1 - manga.cancellationRisk / 0.5));

  return Math.min(
    0.75,
    0.05 +
      popularityScore * 0.15 +
      rankingScore * 0.18 +
      salesScore * 0.12 +
      expectationScore * 0.08 +
      safetyScore * 0.17
  );
}

/**
 * 連載終了かどうかを判定
 * 戻り値: null = 継続、'cancelled' = 打ち切り、'completed' = 円満完結
 */
export function checkEndCondition(
  manga: SerializingManga,
  currentWeek: number,
  rng: SeededRandom,
  maxWeeks: number = GAME_CONFIG.maxSerializationWeeks,
  totalMangas = 6
): 'cancelled' | 'completed' | null {
  // 最大連載期間に到達
  if (currentWeek >= maxWeeks) {
    return 'completed';
  }

  // 打ち切り判定
  if (shouldBeCancelledWithChance(manga, rng, totalMangas)) {
    return 'cancelled';
  }

  // 円満完結判定
  if (shouldComplete(manga, totalMangas) && rng.next() < calculateCompletionChance(manga, totalMangas)) {
    return 'completed';
  }

  return null;
}

/**
 * 連載結果の評価を計算
 */
export function evaluateSerializationResult(manga: SerializingManga): 'legendary' | 'excellent' | 'good' | 'average' | 'poor' {
  const weeksRun = manga.popularityHistory.length;
  const avgPopularity = manga.popularityHistory.reduce((a, b) => a + b, 0) / manga.popularityHistory.length;
  const peakPopularity = Math.max(...manga.popularityHistory);
  const totalSales = manga.totalSales;

  // スコア計算
  let score = 0;

  // 連載週数
  if (weeksRun >= 80) score += 25;
  else if (weeksRun >= 50) score += 20;
  else if (weeksRun >= 30) score += 15;
  else score += 5;

  // 平均人気
  if (avgPopularity >= 70) score += 25;
  else if (avgPopularity >= 55) score += 20;
  else if (avgPopularity >= 40) score += 15;
  else score += 5;

  // ピーク人気
  if (peakPopularity >= 85) score += 15;
  else if (peakPopularity >= 70) score += 10;
  else if (peakPopularity >= 50) score += 5;

  // 売上
  if (totalSales >= 5000000) score += 20;
  else if (totalSales >= 2000000) score += 15;
  else if (totalSales >= 1000000) score += 10;
  else if (totalSales >= 500000) score += 5;

  // スコアから評価を決定
  if (score >= 95) {
    return 'legendary';
  } else if (score >= 75) {
    return 'excellent';
  } else if (score >= 55) {
    return 'good';
  } else if (score >= 35) {
    return 'average';
  } else {
    return 'poor';
  }
}

/**
 * 打ち切り危険度を文字列で表現
 */
export function describeCancellationRisk(risk: number): string {
  if (risk < 0.2) {
    return '安全';
  } else if (risk < 0.4) {
    return 'やや注意';
  } else if (risk < 0.6) {
    return '注意';
  } else if (risk < 0.8) {
    return '危険';
  } else {
    return '危機一髪';
  }
}
