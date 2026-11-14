import { describe, expect, it } from 'vitest';
import type { SerializingManga } from '@/types';
import {
  calculateAveragePrintRunPerVolume,
  calculateBasePrintRun,
  calculateVolumePrintRun,
  calculateVolumeSales,
  shouldReleaseVolume,
  updateSales,
} from '@/game/sales';
import { applyEventEffects, EVENT_DEFINITIONS } from '@/game/events';
import { SeededRandom } from '@/utils/seededRandom';

function createManga(totalAbility = 130): SerializingManga {
  return {
    id: 'test-manga',
    title: 'Test',
    configuration: {
      genre: 'shounen_action',
      worldview: 'contemporary',
      protagonist: 'ordinary_boy',
      style: 'traditional_shounen',
      title: 'Test',
      authorName: 'Test',
    },
    abilities: {
      story: totalAbility / 5,
      character: totalAbility / 5,
      artwork: totalAbility / 5,
      originality: totalAbility / 5,
      composition: totalAbility / 5,
    },
    totalAbility,
    currentPopularity: 50,
    popularityHistory: Array(9).fill(50),
    currentRanking: 10,
    currentPlacementRanking: 11,
    rankingHistory: [],
    placementHistory: [],
    totalSales: 0,
    lastSalesWeek: 0,
    salesHistory: [],
    totalPrintRun: 0,
    printRunHistory: [],
    pendingPrintRunBonus: 0,
    stability: 0.6,
    explosiveness: 1,
    readerAffinityTrend: 0,
    editorExpectation: 0.7,
    lastEventId: null,
    lastEventWeek: -1,
    eventHistory: [],
    cancellationRisk: 0,
    lowRankingWeeks: 0,
    initialPopularity: 50,
  };
}

describe('sales and print-run model', () => {
  it.each([
    [100, 30000],
    [110, 50000],
    [120, 80000],
    [130, 200000],
    [140, 400000],
    [150, 700000],
    [160, 1500000],
    [170, 3000000],
  ])('uses the print-run tier for total ability %i', (ability, expectedPrintRun) => {
    expect(calculateBasePrintRun(ability)).toBe(expectedPrintRun);
  });

  it('releases a volume every nine episodes, not after an incomplete volume', () => {
    const manga = createManga();

    expect(shouldReleaseVolume(manga, 8)).toBe(false);
    expect(shouldReleaseVolume(manga, 9)).toBe(true);
    expect(shouldReleaseVolume(manga, 18)).toBe(true);
  });

  it('keeps print runs ability-led and reproducible with a seeded random source', () => {
    const low = calculateVolumePrintRun(createManga(100), 21, new SeededRandom(42));
    const medium = calculateVolumePrintRun(createManga(130), 21, new SeededRandom(42));
    const high = calculateVolumePrintRun(createManga(160), 21, new SeededRandom(42));
    const repeatedMedium = calculateVolumePrintRun(createManga(130), 21, new SeededRandom(42));

    expect(low).toBeLessThan(medium);
    expect(medium).toBeLessThan(high);
    expect(repeatedMedium).toBe(medium);
  });

  it('bases the print-run audience factor on sustained popularity, not a short-lived peak', () => {
    const weak = createManga();
    weak.currentPopularity = 40;
    weak.popularityHistory = Array(9).fill(40);

    const briefPeak = createManga();
    briefPeak.currentPopularity = 40;
    briefPeak.popularityHistory = [100, ...Array(8).fill(40)];

    const sustained = createManga();
    sustained.currentPopularity = 70;
    sustained.popularityHistory = Array(9).fill(70);
    const sustainedLong = {
      ...sustained,
      popularityHistory: Array(90).fill(70),
    };

    const weakRun = calculateVolumePrintRun(weak, 21, new SeededRandom(42));
    const briefPeakRun = calculateVolumePrintRun(briefPeak, 21, new SeededRandom(42));
    const sustainedRun = calculateVolumePrintRun(sustained, 21, new SeededRandom(42));
    const sustainedLongRun = calculateVolumePrintRun(
      sustainedLong,
      21,
      new SeededRandom(42)
    );

    expect(briefPeakRun).toBeGreaterThan(weakRun);
    expect(sustainedRun).toBeGreaterThan(briefPeakRun);
    expect(sustainedLongRun).toBe(sustainedRun);
  });

  it('limits sold copies to the number printed', () => {
    const manga = createManga();
    manga.currentPopularity = 100;
    manga.popularityHistory = Array(9).fill(100);
    manga.currentPlacementRanking = 1;
    const printRun = 200000;

    expect(calculateVolumeSales(manga, printRun, 21)).toBeLessThanOrEqual(printRun);
  });

  it('applies sales events as a bounded bonus to the next print run', () => {
    const manga = createManga();
    const control = createManga();
    control.currentPopularity += 8;
    const eventDefinition = EVENT_DEFINITIONS.find((event) => event.id === 'volume_boom');
    if (!eventDefinition) {
      throw new Error('volume_boom event definition is missing');
    }

    applyEventEffects(manga, eventDefinition);

    const printRunWithEvent = calculateVolumePrintRun(manga, 21, new SeededRandom(42));
    const printRunWithoutEvent = calculateVolumePrintRun(control, 21, new SeededRandom(42));
    expect(manga.totalSales).toBe(0);
    expect(manga.pendingPrintRunBonus).toBe(100000);
    expect(printRunWithEvent).toBeGreaterThan(printRunWithoutEvent);

    updateSales(manga, 9, 21, new SeededRandom(42));
    expect(manga.pendingPrintRunBonus).toBe(0);
  });

  it('records printed and sold copies only on release weeks', () => {
    const manga = createManga();
    const rng = new SeededRandom(42);

    updateSales(manga, 8, 21, rng);
    expect(manga.salesHistory).toHaveLength(0);
    expect(manga.printRunHistory).toHaveLength(0);

    updateSales(manga, 9, 21, rng);
    expect(manga.printRunHistory).toHaveLength(1);
    expect(manga.printRunHistory[0]).toBeGreaterThan(0);
    expect(manga.salesHistory[0]).toBeGreaterThan(0);
    expect(manga.salesHistory[0]).toBeLessThanOrEqual(manga.printRunHistory[0]!);
    expect(manga.totalPrintRun).toBe(manga.printRunHistory[0]);
    expect(manga.totalSales).toBe(manga.salesHistory[0]);
  });

  it('preserves unknown print-run history when updating an older save', () => {
    const manga = createManga();
    manga.salesHistory = [120000];
    manga.totalSales = 120000;
    delete manga.printRunHistory;
    delete manga.totalPrintRun;

    updateSales(manga, 9, 21, new SeededRandom(42));

    expect(manga.printRunHistory).toHaveLength(2);
    expect(manga.printRunHistory?.[0]).toBeNull();
    expect(manga.printRunHistory?.[1]).toBeGreaterThan(0);
    expect(manga.totalPrintRun).toBe(manga.printRunHistory?.[1]);
  });

  it('averages known volume print runs without treating unknown history as zero', () => {
    const manga = createManga();
    manga.printRunHistory = [null, 100000, 300000];

    expect(calculateAveragePrintRunPerVolume(manga)).toBe(200000);
    expect(calculateAveragePrintRunPerVolume({ ...manga, printRunHistory: [null] })).toBeNull();
    expect(calculateAveragePrintRunPerVolume({ ...manga, printRunHistory: undefined })).toBeNull();
  });
});
