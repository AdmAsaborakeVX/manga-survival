import { describe, expect, it } from 'vitest';
import {
  calculateAveragePlacement,
  calculatePlacementAveragesByPeriod,
  evaluatePopularity,
  evaluateFinalRating,
  evaluateSerializationDuration,
} from '@/game/evaluation';

describe('popularity evaluation boundaries', () => {
  it.each([
    [50000, 1, '中堅'],
    [50001, 1, '主力'],
    [150000, 11, '下層'],
    [150001, 11, '中堅'],
    [400000, 1, '準看板'],
    [400000, 6, '主力'],
    [400000, 16, '下層'],
    [400001, 1, '看板'],
    [1000000, 6, '準看板'],
    [1000000, 11, '主力'],
    [1000000, 16, '中堅'],
    [1000001, 6, '看板'],
  ] as const)('maps sales %i and placement %i to %s', (sales, placement, expected) => {
    expect(evaluatePopularity(sales, placement)).toBe(expected);
  });

  it.each([
    [5, '看板'],
    [6, '看板'],
    [10, '看板'],
    [11, '準看板'],
    [15, '準看板'],
    [16, '主力'],
  ] as const)('maps placement boundary %i to %s for sales above 100万', (placement, expected) => {
    expect(evaluatePopularity(1000001, placement)).toBe(expected);
  });

  it('uses the placement cutoffs at 5, 10, and 15 for sales up to 5万', () => {
    expect(evaluatePopularity(50000, 5)).toBe('中堅');
    expect(evaluatePopularity(50000, 6)).toBe('下層');
    expect(evaluatePopularity(50000, 10)).toBe('下層');
    expect(evaluatePopularity(50000, 11)).toBe('下層');
    expect(evaluatePopularity(50000, 15)).toBe('下層');
    expect(evaluatePopularity(50000, 16)).toBe('下層');
  });
});

describe('serialization duration evaluation boundaries', () => {
  it.each([
    [19, '超短期連載'],
    [20, '短期連載'],
    [49, '短期連載'],
    [50, '中期連載'],
    [149, '中期連載'],
    [150, '長期連載'],
  ] as const)('rates %i weeks as %s', (weeks, expected) => {
    expect(evaluateSerializationDuration(weeks)).toBe(expected);
  });
});

describe('final serialization evaluation', () => {
  it.each([11, 17, 19])('fixes a %i-week cancelled series at the lower tier', (weeks) => {
    expect(evaluateFinalRating('看板', weeks, 'cancelled')).toBe('下層');
  });

  it('uses the normal matrix at 20 weeks and for non-cancelled short series', () => {
    expect(evaluateFinalRating('看板', 20, 'cancelled')).toBe('準看板');
    expect(evaluateFinalRating('看板', 19, 'completed')).toBe('主力');
  });

  it('rewards strong long-running work without making duration alone a top rating', () => {
    expect(evaluateFinalRating('主力', 250, 'completed')).toBe('準看板');
    expect(evaluateFinalRating('下層', 250, 'cancelled')).toBe('下層');
    expect(evaluateFinalRating('看板', 100, 'cancelled')).toBe('看板');
  });

  it('can apply the short-cancellation override even when ranking data is unavailable', () => {
    expect(evaluateFinalRating(null, 17, 'cancelled')).toBe('下層');
    expect(evaluateFinalRating(null, 20, 'cancelled')).toBeNull();
  });
});

describe('average placement', () => {
  it('returns the average of recorded placement ranks and null when unavailable', () => {
    expect(calculateAveragePlacement([2, 4, 3])).toBe(3);
    expect(calculateAveragePlacement([])).toBeNull();
  });

  it('groups weekly placement into ten-week averages and keeps a final partial period', () => {
    const history = [...Array(10).fill(5), ...Array(10).fill(8), 10, 12, 14];

    expect(calculatePlacementAveragesByPeriod(history)).toEqual([
      { startWeek: 1, endWeek: 10, averagePlacement: 5 },
      { startWeek: 11, endWeek: 20, averagePlacement: 8 },
      { startWeek: 21, endWeek: 23, averagePlacement: 12 },
    ]);
  });

  it('returns no periods when placement history is unavailable', () => {
    expect(calculatePlacementAveragesByPeriod([])).toEqual([]);
  });
});
