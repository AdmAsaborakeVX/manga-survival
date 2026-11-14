import { describe, expect, it } from 'vitest';
import {
  calculateAveragePlacement,
  calculatePlacementAveragesByPeriod,
  evaluatePopularity,
  evaluateSerializationDuration,
} from '@/game/evaluation';

describe('popularity evaluation boundaries', () => {
  it.each([
    [50000, 1, '中堅'],
    [50001, 1, '準看板'],
    [150000, 11, '下層'],
    [150001, 11, '中堅'],
    [400000, 1, '準看板'],
    [400001, 1, '看板'],
    [1000000, 6, '準看板'],
    [1000001, 6, '主力'],
  ] as const)('maps sales %i and placement %i to %s', (sales, placement, expected) => {
    expect(evaluatePopularity(sales, placement)).toBe(expected);
  });

  it.each([
    [5, '看板'],
    [6, '主力'],
    [10, '主力'],
    [11, '主力'],
    [15, '主力'],
    [16, '主力'],
  ] as const)('maps placement boundary %i to %s for sales above 100万', (placement, expected) => {
    expect(evaluatePopularity(1000001, placement)).toBe(expected);
  });

  it('uses the placement cutoffs at 5, 10, and 15 for lower sales bands', () => {
    expect(evaluatePopularity(50000, 10)).toBe('中堅');
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
