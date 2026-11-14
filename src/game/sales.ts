import type { SerializingManga } from '@/types';
import { SALES_CONFIG } from '@/game/config';
import { SeededRandom } from '@/utils/seededRandom';

/**
 * 単行本が発売されるかどうかを判定
 * 1週を1話として扱い、9話ごとに発売する
 */
export function shouldReleaseVolume(manga: SerializingManga, currentWeek: number): boolean {
  return currentWeek % SALES_CONFIG.EPISODES_PER_VOLUME === 0 && currentWeek > 0;
}

/**
 * 総合能力に応じた基準発行部数を線形補間する
 */
export function calculateBasePrintRun(totalAbility: number): number {
  const tiers = SALES_CONFIG.PRINT_RUN_ABILITY_TIERS;
  const first = tiers[0];
  const last = tiers[tiers.length - 1];

  if (totalAbility <= first.ability) {
    const next = tiers[1];
    const perAbility = (next.copies - first.copies) / (next.ability - first.ability);
    return Math.max(1, Math.round(first.copies + (totalAbility - first.ability) * perAbility));
  }

  if (totalAbility >= last.ability) {
    const previous = tiers[tiers.length - 2];
    const perAbility = (last.copies - previous.copies) / (last.ability - previous.ability);
    return Math.round(last.copies + (totalAbility - last.ability) * perAbility);
  }

  for (let index = 1; index < tiers.length; index++) {
    const upper = tiers[index];
    if (totalAbility <= upper.ability) {
      const lower = tiers[index - 1];
      const progress = (totalAbility - lower.ability) / (upper.ability - lower.ability);
      return Math.round(lower.copies + (upper.copies - lower.copies) * progress);
    }
  }

  return last.copies;
}

function getAveragePopularity(manga: SerializingManga): number {
  const recentPopularities = [
    ...manga.popularityHistory.slice(-(SALES_CONFIG.EPISODES_PER_VOLUME - 1)),
    manga.currentPopularity,
  ];

  return recentPopularities.reduce((sum, popularity) => sum + popularity, 0) /
    recentPopularities.length;
}

function getSustainedPopularityFactor(manga: SerializingManga): number {
  const popularityHistory = [...manga.popularityHistory, manga.currentPopularity];
  const sustainedPopularityRate =
    popularityHistory.filter(
      (popularity) => popularity >= SALES_CONFIG.SUSTAINED_POPULARITY_THRESHOLD
    ).length / popularityHistory.length;

  return (
    SALES_CONFIG.MIN_READER_BASE_PRINT_RUN_FACTOR +
    sustainedPopularityRate * SALES_CONFIG.SUSTAINED_POPULARITY_PRINT_RUN_FACTOR
  );
}

function getPlacementScore(manga: SerializingManga, totalMangas: number): number {
  if (totalMangas <= 1) {
    return 1;
  }

  const placement = Math.min(totalMangas, Math.max(1, manga.currentPlacementRanking));
  return (totalMangas - placement) / (totalMangas - 1);
}

/**
 * 能力を基準に、掲載順位・直近人気・継続人気・イベント・乱数で単巻発行部数を補正する
 */
export function calculateVolumePrintRun(
  manga: SerializingManga,
  totalMangas: number,
  rng: SeededRandom
): number {
  const averagePopularity = getAveragePopularity(manga);
  const placementScore = getPlacementScore(manga, totalMangas);
  const popularityFactor =
    1 + (averagePopularity / 100 - 0.5) * SALES_CONFIG.POPULARITY_PRINT_RUN_FACTOR;
  const placementFactor =
    1 + (placementScore - 0.5) * SALES_CONFIG.PLACEMENT_PRINT_RUN_FACTOR;
  const eventBonusRate = Math.min(
    SALES_CONFIG.MAX_EVENT_PRINT_RUN_BONUS,
    Math.max(0, (manga.pendingPrintRunBonus ?? 0) / SALES_CONFIG.EVENT_PRINT_RUN_BONUS_SCALE)
  );
  const eventFactor = 1 + eventBonusRate;
  const randomFactor = 1 + rng.nextFloat(
    -SALES_CONFIG.PRINT_RUN_RANDOM_VARIATION,
    SALES_CONFIG.PRINT_RUN_RANDOM_VARIATION
  );

  return Math.max(
    1,
    Math.floor(
      calculateBasePrintRun(manga.totalAbility) *
        popularityFactor *
        placementFactor *
        getSustainedPopularityFactor(manga) *
        eventFactor *
        randomFactor
    )
  );
}

/**
 * 発行部数から、人気・掲載順位に応じた実売部数を計算する
 */
export function calculateVolumeSales(
  manga: SerializingManga,
  printRun: number,
  totalMangas = 6
): number {
  const averagePopularity = getAveragePopularity(manga);
  const placementScore = getPlacementScore(manga, totalMangas);
  const sellThroughRate = Math.min(
    SALES_CONFIG.MAX_SELL_THROUGH_RATE,
    Math.max(
      SALES_CONFIG.MIN_SELL_THROUGH_RATE,
      SALES_CONFIG.BASE_SELL_THROUGH_RATE +
        (averagePopularity / 100) * SALES_CONFIG.POPULARITY_SELL_THROUGH_FACTOR +
        placementScore * SALES_CONFIG.PLACEMENT_SELL_THROUGH_FACTOR
    )
  );

  return Math.min(printRun, Math.floor(printRun * sellThroughRate));
}

/**
 * 週ごとの売上更新処理
 */
export function updateSales(
  manga: SerializingManga,
  currentWeek: number,
  totalMangas: number,
  rng: SeededRandom
): void {
  // 単行本発売時のみ計算
  if (!shouldReleaseVolume(manga, currentWeek)) {
    return;
  }

  const printRun = calculateVolumePrintRun(manga, totalMangas, rng);
  const volumeSales = calculateVolumeSales(manga, printRun, totalMangas);

  // 累計売上に加算
  manga.totalSales += volumeSales;

  // 売上履歴に記録
  manga.salesHistory.push(volumeSales);

  // 旧セーブの過去巻は実際の発行部数を復元できないため、不明値として保持する
  if (!manga.printRunHistory) {
    manga.printRunHistory = manga.salesHistory.slice(0, -1).map(() => null);
  }
  manga.totalPrintRun = (manga.totalPrintRun ?? 0) + printRun;
  manga.printRunHistory.push(printRun);
  manga.pendingPrintRunBonus = 0;

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
 * 記録されている巻の平均発行部数を返す。旧セーブの不明値は集計しない。
 */
export function calculateAveragePrintRunPerVolume(manga: SerializingManga): number | null {
  const knownPrintRuns = (manga.printRunHistory ?? []).filter(
    (copies): copies is number => copies !== null
  );
  if (knownPrintRuns.length === 0) {
    return null;
  }
  return knownPrintRuns.reduce((total, copies) => total + copies, 0) / knownPrintRuns.length;
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
