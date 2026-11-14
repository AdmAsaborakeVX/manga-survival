import { describe, expect, it } from 'vitest';
import { createManga } from '@/game/manga';
import { initializeSerializationState } from '@/game/serialization';
import { checkEndCondition, shouldBeCancelled, shouldComplete, updateCancellationRisk } from '@/game/endCondition';
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

  it('prioritizes an eligible cancellation over completion', () => {
    const manga = createPlayer();
    manga.popularityHistory = Array(40).fill(65);
    manga.rankingHistory = Array(40).fill(1);
    manga.totalSales = 2000000;
    manga.cancellationRisk = 1;
    manga.lowRankingWeeks = 5;

    expect(shouldComplete(manga, 6)).toBe(true);
    expect(shouldBeCancelled(manga, 6)).toBe(true);
    expect(checkEndCondition(manga, 40, new SeededRandom(55), 100, 6)).toBe('cancelled');
  });

  it('does not automatically complete a poorly performing series at week 40', () => {
    const manga = createPlayer();
    manga.popularityHistory = Array(40).fill(20);
    manga.rankingHistory = Array(40).fill(6);
    manga.totalSales = 0;
    manga.cancellationRisk = 0.2;
    manga.lowRankingWeeks = 0;

    expect(shouldComplete(manga, 6)).toBe(false);
    expect(checkEndCondition(manga, 40, new SeededRandom(55), 100, 6)).toBeNull();
  });

  it('keeps the maximum-week safety stop', () => {
    const manga = createPlayer();
    manga.popularityHistory = Array(100).fill(10);
    manga.rankingHistory = Array(100).fill(6);
    manga.cancellationRisk = 1;
    manga.lowRankingWeeks = 100;

    expect(checkEndCondition(manga, 100, new SeededRandom(55), 100, 6)).toBe('completed');
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
