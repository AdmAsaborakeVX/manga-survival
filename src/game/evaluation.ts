import type { SerializationState } from '@/types';

export type PopularityTier = '下層' | '中堅' | '準看板' | '主力' | '看板';
export type SerializationDurationRating = '超短期連載' | '短期連載' | '中期連載' | '長期連載';
type SerializationEndReason = SerializationState['endReason'];

type PlacementBand = 0 | 1 | 2 | 3;
type SalesBand = 0 | 1 | 2 | 3 | 4;

const POPULARITY_MATRIX: Record<SalesBand, Record<PlacementBand, PopularityTier>> = {
  0: { 0: '中堅', 1: '下層', 2: '下層', 3: '下層' },
  1: { 0: '主力', 1: '中堅', 2: '下層', 3: '下層' },
  2: { 0: '準看板', 1: '主力', 2: '中堅', 3: '下層' },
  3: { 0: '看板', 1: '準看板', 2: '主力', 3: '中堅' },
  4: { 0: '看板', 1: '看板', 2: '準看板', 3: '主力' },
};

const FINAL_EVALUATION_MATRIX: Record<
  PopularityTier,
  Record<SerializationDurationRating, PopularityTier>
> = {
  下層: { 超短期連載: '下層', 短期連載: '下層', 中期連載: '下層', 長期連載: '下層' },
  中堅: { 超短期連載: '下層', 短期連載: '中堅', 中期連載: '中堅', 長期連載: '中堅' },
  主力: { 超短期連載: '中堅', 短期連載: '主力', 中期連載: '主力', 長期連載: '準看板' },
  準看板: { 超短期連載: '中堅', 短期連載: '主力', 中期連載: '準看板', 長期連載: '準看板' },
  看板: { 超短期連載: '主力', 短期連載: '準看板', 中期連載: '看板', 長期連載: '看板' },
};

export const FINAL_EVALUATION_CONFIG = {
  SHORT_CANCELLED_FINAL_RATING_WEEKS: 20,
} as const;

function getSalesBand(sales: number): SalesBand {
  if (sales <= 50000) return 0;
  if (sales <= 150000) return 1;
  if (sales <= 400000) return 2;
  if (sales <= 1000000) return 3;
  return 4;
}

function getPlacementBand(averagePlacement: number): PlacementBand {
  if (averagePlacement <= 5) return 0;
  if (averagePlacement <= 10) return 1;
  if (averagePlacement <= 15) return 2;
  return 3;
}

export function evaluatePopularity(salesPerVolume: number, averagePlacement: number): PopularityTier {
  return POPULARITY_MATRIX[getSalesBand(salesPerVolume)][getPlacementBand(averagePlacement)];
}

export function calculateAveragePlacement(placementHistory: number[]): number | null {
  if (placementHistory.length === 0) return null;
  return placementHistory.reduce((total, rank) => total + rank, 0) / placementHistory.length;
}

export interface PlacementPeriodAverage {
  startWeek: number;
  endWeek: number;
  averagePlacement: number;
}

export function calculatePlacementAveragesByPeriod(
  placementHistory: number[]
): PlacementPeriodAverage[] {
  const weeksPerPeriod = 10;
  const periods: PlacementPeriodAverage[] = [];

  for (let startIndex = 0; startIndex < placementHistory.length; startIndex += weeksPerPeriod) {
    const period = placementHistory.slice(startIndex, startIndex + weeksPerPeriod);
    periods.push({
      startWeek: startIndex + 1,
      endWeek: startIndex + period.length,
      averagePlacement:
        period.reduce((total, rank) => total + rank, 0) / period.length,
    });
  }

  return periods;
}

export function evaluateSerializationDuration(weeks: number): SerializationDurationRating {
  if (weeks < 20) return '超短期連載';
  if (weeks < 50) return '短期連載';
  if (weeks < 150) return '中期連載';
  return '長期連載';
}

export function evaluateFinalRating(
  popularityRating: PopularityTier | null,
  weeks: number,
  endReason: SerializationEndReason
): PopularityTier | null {
  if (
    endReason === 'cancelled' &&
    weeks < FINAL_EVALUATION_CONFIG.SHORT_CANCELLED_FINAL_RATING_WEEKS
  ) {
    return '下層';
  }
  if (popularityRating === null) {
    return null;
  }

  const durationRating = evaluateSerializationDuration(weeks);
  return FINAL_EVALUATION_MATRIX[popularityRating][durationRating];
}
