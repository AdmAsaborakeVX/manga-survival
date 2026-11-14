import type { SerializingManga } from '@/types';
import { SALES_CONFIG } from '@/game/config';

/**
 * 単行本が発売されるかどうかを判定
 * 通常は8週ごとに単行本が発売されるという想定
 */
export function shouldReleaseVolume(manga: SerializingManga, currentWeek: number): boolean {
  return currentWeek % SALES_CONFIG.VOLUME_RELEASE_INTERVAL === 0 && currentWeek > 0;
}

/**
 * 単行本発売時の売上を計算
 * 
 * 考慮要素：
 * - 現在の人気
 * - 人気の累積（平均人気）
 * - 順位
 * - 固定ファンの強さ（安定性で推測）
 */
export function calculateVolumeSales(
  manga: SerializingManga,
  currentWeek: number,
  totalMangas = 6
): number {
  // 基本売上（定数）
  let sales = SALES_CONFIG.BASE_SALES_PER_VOLUME;

  // 現在の人気による加算
  sales += manga.currentPopularity * SALES_CONFIG.POPULARITY_TO_SALES_FACTOR;

  // 平均人気による加算（固定ファン度）
  if (manga.popularityHistory.length > 0) {
    const avgPopularity = manga.popularityHistory.reduce((a, b) => a + b, 0) / manga.popularityHistory.length;
    sales += (avgPopularity * 0.8) * (SALES_CONFIG.POPULARITY_TO_SALES_FACTOR * 0.5);
  }

  // 順位による補正（好順位ほど売上が増える）
  const rankingBonus = Math.max(
    0,
    (totalMangas + 1 - manga.currentRanking) * SALES_CONFIG.RANKING_BONUS_FACTOR
  );
  sales += rankingBonus;

  // 安定性による加算（固定ファンの強さ）
  sales += manga.stability * 20000;

  // 連載週数による補正（長期連載は売上が伸びにくい傾向）
  if (currentWeek > 40) {
    const decayRate = Math.pow(0.98, currentWeek - 40);
    sales *= decayRate;
  }

  return Math.floor(sales);
}

/**
 * イベントによる売上ボーナス
 */
export function getEventSalesBonus(manga: SerializingManga, currentWeek: number): number {
  // 直近のイベント履歴を確認
  let bonus = 0;

  for (const { week, event } of manga.eventHistory) {
    // イベントが発生した週から2週間は影響が残る
    if (currentWeek - week <= 2) {
      // ポジティブイベントなら売上ボーナス
      if (event.type === 'positive') {
        bonus += 30000;
      }
    }
  }

  return bonus;
}

/**
 * 週ごとの売上更新処理
 */
export function updateSales(manga: SerializingManga, currentWeek: number, totalMangas = 6): void {
  // 単行本発売時のみ計算
  if (!shouldReleaseVolume(manga, currentWeek)) {
    return;
  }

  // 基本売上を計算
  const volumeSales = calculateVolumeSales(manga, currentWeek, totalMangas);

  // イベントボーナスを追加
  const eventBonus = getEventSalesBonus(manga, currentWeek);

  const totalSales = volumeSales + eventBonus;

  // 累計売上に加算
  manga.totalSales += totalSales;

  // 売上履歴に記録
  manga.salesHistory.push(totalSales);

  // 最後の売上週を更新
  manga.lastSalesWeek = currentWeek;
}

/**
 * 売上から推定される人気度
 * （UI表示用・分析用）
 */
export function estimatePopularityFromSales(totalSales: number): number {
  // 売上から人気を逆算する簡易式
  return Math.min(100, Math.max(0, totalSales / 300000 * 100));
}

/**
 * 現在までの平均売上を計算
 */
export function calculateAverageSalesPerVolume(manga: SerializingManga): number {
  if (manga.salesHistory.length === 0) {
    return 0;
  }
  return manga.salesHistory.reduce((a, b) => a + b, 0) / manga.salesHistory.length;
}

/**
 * 売上がどの程度のレベルか を文字列で返す
 */
export function evaluateSalesLevel(manga: SerializingManga): string {
  const avgSales = calculateAverageSalesPerVolume(manga);

  if (avgSales >= 200000) {
    return '超ヒット';
  } else if (avgSales >= 150000) {
    return 'ヒット';
  } else if (avgSales >= 100000) {
    return '好調';
  } else if (avgSales >= 50000) {
    return '平均';
  } else if (avgSales >= 30000) {
    return '低調';
  } else {
    return '惨憺';
  }
}
