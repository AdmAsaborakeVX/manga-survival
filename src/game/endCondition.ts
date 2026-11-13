import type { SerializingManga } from '@/types';
import { CANCELLATION_CONFIG, COMPLETION_CONFIG, GAME_CONFIG } from '@/game/config';
import { calculateAverageRanking, countConsecutiveLowRankings } from '@/game/ranking';
import { SeededRandom } from '@/utils/seededRandom';

/**
 * 打ち切り危険度を更新
 */
export function updateCancellationRisk(manga: SerializingManga): void {
  // リスクの自然減衰
  manga.cancellationRisk *= CANCELLATION_CONFIG.RISK_DECAY_RATE;

  // 低順位が続いている場合、リスク上昇
  const consecutiveLowRankings = countConsecutiveLowRankings(
    manga,
    CANCELLATION_CONFIG.LOW_RANKING_THRESHOLD
  );

  if (consecutiveLowRankings > 0) {
    manga.lowRankingWeeks = consecutiveLowRankings;
    manga.cancellationRisk += consecutiveLowRankings * CANCELLATION_CONFIG.RISK_INCREASE_PER_LOW_WEEK;
  } else {
    manga.lowRankingWeeks = 0;
  }

  // リスク値を0～1に正規化
  manga.cancellationRisk = Math.max(0, Math.min(1, manga.cancellationRisk));
}

/**
 * 打ち切り判定（確定的）
 * 複数の条件を総合的に判定する
 */
export function shouldBeCancelled(manga: SerializingManga): boolean {
  // 連載開始から1週目は打ち切りにならない
  if (manga.popularityHistory.length < 2) {
    return false;
  }

  // 条件1: 連続して低順位が続いている
  if (manga.lowRankingWeeks >= CANCELLATION_CONFIG.LOW_RANKING_WEEKS_TO_CANCEL) {
    return true;
  }

  // 条件2: 平均順位が低い（一定期間）
  const avgRanking = calculateAverageRanking(manga, CANCELLATION_CONFIG.AVERAGING_WEEKS);
  if (avgRanking >= CANCELLATION_CONFIG.AVERAGE_RANKING_TO_CANCEL) {
    return true;
  }

  // 条件3: 人気が極端に低い状態が続いている
  if (manga.currentPopularity < GAME_CONFIG.minPopularityToSurvive && manga.lowRankingWeeks >= 4) {
    return true;
  }

  return false;
}

/**
 * 打ち切り判定（確率的・リバイバル要素）
 * 赤信号状態でも一定確率で復活できる機会を与える
 */
export function shouldBeCancelledWithChance(
  manga: SerializingManga,
  rng: SeededRandom
): boolean {
  // 確定的な打ち切り判定
  if (shouldBeCancelled(manga)) {
    // リスクが高いほど確実に打ち切り
    // リスク0.5ならば50%の確率で救われる
    const survivalChance = Math.max(0, 1 - manga.cancellationRisk);
    return rng.next() >= survivalChance;
  }

  return false;
}

/**
 * 円満完結判定
 */
export function shouldComplete(manga: SerializingManga): boolean {
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

  // 条件3: 平均順位が一定以上
  const avgRanking = calculateAverageRanking(manga);
  if (avgRanking > COMPLETION_CONFIG.MIN_AVERAGE_RANKING) {
    return false;
  }

  // 条件4: 累計売上が一定以上
  if (manga.totalSales < COMPLETION_CONFIG.MIN_TOTAL_SALES) {
    return false;
  }

  // 全ての条件を満たせば完結可能
  return true;
}

/**
 * 連載終了かどうかを判定
 * 戻り値: null = 継続、'cancelled' = 打ち切り、'completed' = 円満完結
 */
export function checkEndCondition(
  manga: SerializingManga,
  currentWeek: number,
  rng: SeededRandom
): 'cancelled' | 'completed' | null {
  // 最大連載期間に到達
  if (currentWeek >= GAME_CONFIG.maxSerializationWeeks) {
    return 'completed';
  }

  // 打ち切り判定
  if (shouldBeCancelledWithChance(manga, rng)) {
    return 'cancelled';
  }

  // 円満完結判定
  if (shouldComplete(manga)) {
    // ただし確定ではなく、一定確率で選択制にする（プレイヤーが続行を選べる可能性）
    // 今回の実装では自動終了とする
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
