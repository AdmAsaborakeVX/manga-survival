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
export function updateCancellationRisk(manga: SerializingManga): void {
  const weekNumber = manga.popularityHistory.length;

  // 1週目は危険度を計算しない
  if (weekNumber < 2) {
    manga.cancellationRisk = 0;
    return;
  }

  // ========== コンポーネント1: 順位スコア ==========
  const recentAvgRanking = calculateAverageRanking(manga, 4);
  // 順位6位が「平均的」、15位以上で「危険」
  const totalMangas = 6; // プレイヤー + ライバル5
  const rankingScore = Math.min(1, Math.max(0, (recentAvgRanking - 2) / (totalMangas + 4)));

  // ========== コンポーネント2: 人気スコア ==========
  const recentAvgPopularity = getAveragePopularityRecent(manga, 4);
  // 人気40以上は「安全」、20以下で「危険」
  const popularityScore = Math.min(1, Math.max(0, (40 - recentAvgPopularity) / 30));

  // ========== コンポーネント3: トレンドスコア ==========
  const trend = getPopularityTrend(manga, 4);
  // 下降トレンドで危険度上昇
  const trendScore = Math.max(0, -trend);

  // ========== コンポーネント4: 連続低順位スコア ==========
  const consecutiveLowRankings = countConsecutiveLowRankings(
    manga,
    CANCELLATION_CONFIG.LOW_RANKING_THRESHOLD
  );
  // 8週以上で最大危険度に（段階的）
  const lowRankingScore = Math.min(1, consecutiveLowRankings / 8);

  // ========== 各コンポーネントの重み付け合成 ==========
  // 順位と人気が主要、トレンドが二次的
  const currentRiskScore = 
    rankingScore * 0.35 +
    popularityScore * 0.35 +
    trendScore * 0.15 +
    lowRankingScore * 0.15;

  // ========== 前週危険度の減衰と現週スコアの合成 ==========
  // 前週危険度は50%残存、現週スコアは50%の重み
  // これにより、短期的な悪化でも危険度が上昇しやすくなる
  const decayFactor = 0.5;
  const newScore = 0.5;
  
  manga.cancellationRisk = 
    manga.cancellationRisk * decayFactor + 
    currentRiskScore * newScore;

  // ========== 期待度による補正 ==========
  // 編集部期待度が高いと危険度を低下させやすくする
  const expectationBonus = Math.max(0, manga.editorExpectation - 0.5) * 0.2;
  manga.cancellationRisk = Math.max(0, manga.cancellationRisk - expectationBonus);

  // ========== 売上による補正 ==========
  // 単行本売上が好調だと危険度を低下
  const salesPerVolume = manga.totalSales / Math.max(1, Math.floor(weekNumber / 8));
  if (salesPerVolume > 80000) {
    manga.cancellationRisk *= 0.8;
  } else if (salesPerVolume > 60000) {
    manga.cancellationRisk *= 0.85;
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
export function shouldBeCancelled(manga: SerializingManga): boolean {
  const weekNumber = manga.popularityHistory.length;

  // 1週目は打ち切りにならない
  if (weekNumber < 2) {
    return false;
  }

  // ========== 条件1: 即座打ち切り（極端に悪い成績が続いている） ==========
  // 人気 < 5 かつ 順位 > 20 が2週連続
  if (weekNumber >= 2) {
    const recentPopularities = manga.popularityHistory.slice(-2);
    const recentRankings = manga.rankingHistory.slice(-2);
    
    if (
      recentPopularities.every((pop) => pop < 5) &&
      recentRankings.every((rank) => rank > 20)
    ) {
      return true;
    }
  }

  // ========== 条件2: 短期打ち切り（危険度が高い状態） ==========
  // 危険度 > 0.7 が2週連続で低順位
  if (manga.cancellationRisk > 0.7 && weekNumber >= 3) {
    // 低順位が2週以上続いている
    if (manga.lowRankingWeeks >= 2) {
      return true;
    }
  }

  // ========== 条件3: 通常打ち切り（中期低迷） ==========
  // 危険度が0.5を超えており、かつ以下のいずれかを満たす
  if (manga.cancellationRisk > 0.5) {
    // 3a. 連続低順位が5週以上
    if (manga.lowRankingWeeks >= 5) {
      return true;
    }

    // 3b. 平均順位が低い状態が10週以上継続
    const avgRanking = calculateAverageRanking(manga, 10);
    if (avgRanking >= 5 && weekNumber >= 10) {
      return true;
    }

    // 3c. 平均人気が極端に低い
    const avgPopularity = getAveragePopularityRecent(manga, 6);
    if (avgPopularity < 20 && weekNumber >= 6) {
      return true;
    }
  }

  // ========== 条件4: 完全に期待を失った状態 ==========
  // 危険度 > 0.85
  if (manga.cancellationRisk > 0.85) {
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
