import { describe, expect, it } from 'vitest';
import { createManga } from '@/game/manga';
import { initializeSerializationState } from '@/game/serialization';
import {
  calculateCompletionChance,
  checkEndCondition,
  shouldBeCancelled,
  shouldComplete,
  updateCancellationRisk,
} from '@/game/endCondition';
import { countConsecutiveLowRankings } from '@/game/ranking';
import { SeededRandom } from '@/utils/seededRandom';
import type { SerializingManga } from '@/types';

function createPlayer(seed = 17): SerializingManga {
  const rng = new SeededRandom(seed);
  const manga = createManga({
    genre: 'shounen_action',
    worldview: 'contemporary',
    protagonist: 'ordinary_boy',
    style: 'traditional_shounen',
    title: '終了判定テスト',
    authorName: 'テスト作者',
  }, rng);
  return initializeSerializationState(manga, seed).playerManga;
}

function makeStrongSeries(manga: SerializingManga, weeks: number): SerializingManga {
  manga.currentPopularity = 72;
  manga.popularityHistory = Array(weeks).fill(72);
  manga.currentRanking = 2;
  manga.currentPlacementRanking = 2;
  manga.rankingHistory = Array(weeks).fill(2);
  manga.placementHistory = Array(weeks).fill(2);
  manga.salesHistory = Array(Math.floor(weeks / 9)).fill(1_200_000);
  manga.totalSales = manga.salesHistory.reduce((total, sales) => total + sales, 0);
  manga.printRunHistory = Array(Math.floor(weeks / 9)).fill(1_500_000);
  manga.totalPrintRun = manga.printRunHistory.reduce((total, copies) => total + (copies ?? 0), 0);
  manga.cancellationRisk = 0.1;
  manga.lowRankingWeeks = 0;
  manga.editorExpectation = 0.8;
  return manga;
}

describe('serialization end conditions', () => {
  it('counts bottom-half ranks as low and does not count top-half ranks', () => {
    const manga = createPlayer();
    manga.rankingHistory = [1, 2, 3, 4, 5, 6];

    expect(countConsecutiveLowRankings(manga, 4)).toBe(3);

    manga.rankingHistory = [1, 2, 3];
    expect(countConsecutiveLowRankings(manga, 4)).toBe(0);

    manga.rankingHistory = [4, 5, 6];
    expect(countConsecutiveLowRankings(manga, 4)).toBe(3);
  });

  it('does not complete a strong series before the middle-series phase ends', () => {
    const manga = createPlayer();
    makeStrongSeries(manga, 40);

    expect(shouldComplete(manga, 21)).toBe(false);
    expect(checkEndCondition(manga, 40, new SeededRandom(55), 300, 21)).toBeNull();
  });

  it('requires recent popularity, placement, and print-run evidence at week 100', () => {
    const manga = createPlayer();
    makeStrongSeries(manga, 99);
    expect(shouldComplete(manga, 21)).toBe(false);

    makeStrongSeries(manga, 100);
    expect(shouldComplete(manga, 21)).toBe(true);

    manga.popularityHistory.splice(-13, 13, ...Array(13).fill(35));
    expect(shouldComplete(manga, 21)).toBe(false);
  });

  it('falls back to known volume history when an older save lacks the print-run total', () => {
    const manga = createPlayer();
    makeStrongSeries(manga, 100);
    delete manga.totalPrintRun;

    expect(shouldComplete(manga, 21)).toBe(true);

    manga.printRunHistory = [null];
    expect(shouldComplete(manga, 21)).toBe(false);
  });

  it('increases completion chance gradually with maturity and preserves a success chance', () => {
    const manga = createPlayer();
    makeStrongSeries(manga, 100);
    const chanceAt100 = calculateCompletionChance(manga, 21);
    makeStrongSeries(manga, 250);
    const chanceAt250 = calculateCompletionChance(manga, 21);

    expect(chanceAt100).toBeGreaterThan(0);
    expect(chanceAt250).toBeGreaterThan(chanceAt100);
    expect(chanceAt250).toBeLessThan(0.01);
  });

  it('can cancel a long-running title after sustained bottom-tier performance', () => {
    const manga = createPlayer();
    manga.popularityHistory = Array(150).fill(30);
    manga.rankingHistory = Array(150).fill(20);
    manga.placementHistory = Array(150).fill(20);
    manga.cancellationRisk = 0.9;
    manga.lowRankingWeeks = 20;

    expect(shouldBeCancelled(manga, 21)).toBe(true);
  });

  it('respects the minimum cancellation age even for extremely poor results', () => {
    const manga = createPlayer();
    manga.popularityHistory = Array(9).fill(0);
    manga.rankingHistory = Array(9).fill(21);
    manga.cancellationRisk = 1;
    manga.lowRankingWeeks = 9;
    expect(shouldBeCancelled(manga, 21)).toBe(false);

    manga.popularityHistory.push(0);
    manga.rankingHistory.push(21);
    manga.lowRankingWeeks = 10;
    expect(shouldBeCancelled(manga, 21)).toBe(true);
  });

  it('does not cancel a popular, well-ranked long-running title', () => {
    const manga = createPlayer();
    makeStrongSeries(manga, 200);

    expect(shouldBeCancelled(manga, 21)).toBe(false);
  });

  it('uses the phase-specific risk threshold for middle and long series', () => {
    const manga = createPlayer();
    manga.popularityHistory = Array(50).fill(50);
    manga.rankingHistory = Array(50).fill(11);
    manga.lowRankingWeeks = 10;
    manga.cancellationRisk = 0.66;
    expect(shouldBeCancelled(manga, 21)).toBe(true);

    manga.popularityHistory = Array(150).fill(50);
    manga.rankingHistory = Array(150).fill(11);
    manga.lowRankingWeeks = 20;
    manga.cancellationRisk = 0.7;
    expect(shouldBeCancelled(manga, 21)).toBe(false);

    manga.cancellationRisk = 0.8;
    expect(shouldBeCancelled(manga, 21)).toBe(true);
  });

  it('keeps the safety limit distinct from an editorial completion', () => {
    const manga = createPlayer();
    makeStrongSeries(manga, 300);
    manga.cancellationRisk = 1;
    manga.lowRankingWeeks = 100;

    expect(checkEndCondition(manga, 300, new SeededRandom(55), 300, 21)).toBe('limit_reached');
  });

  it('reduces cancellation risk after rankings and popularity recover', () => {
    const manga = createPlayer();
    manga.popularityHistory = Array(10).fill(20);
    manga.rankingHistory = Array(10).fill(6);
    manga.cancellationRisk = 0.9;
    manga.editorExpectation = 0.5;
    updateCancellationRisk(manga, 6);
    const poorPerformanceRisk = manga.cancellationRisk;

    manga.popularityHistory = Array(10).fill(70);
    manga.rankingHistory = Array(10).fill(1);
    updateCancellationRisk(manga, 6);

    expect(manga.cancellationRisk).toBeLessThan(poorPerformanceRisk);
  });
});
