import { describe, expect, it } from 'vitest';
import { createManga } from '@/game/manga';
import { initializeSerializationState } from '@/game/serialization';
import { calculatePlacementRanking, updatePlacementRankings } from '@/game/ranking';
import { SeededRandom } from '@/utils/seededRandom';

function createMangas(count: number) {
  const rng = new SeededRandom(321);
  const manga = createManga(
    {
      genre: 'shounen_action',
      worldview: 'contemporary',
      protagonist: 'ordinary_boy',
      style: 'traditional_shounen',
      title: 'Test',
      authorName: 'Test',
    },
    rng
  );
  const state = initializeSerializationState(manga, 321, count - 1);
  return [state.playerManga, ...state.rivalMangas];
}

describe('placement ranking', () => {
  it('smooths a one-week survey spike using the available recent ranking history', () => {
    const [steady, volatile] = createMangas(2);
    steady.rankingHistory = Array(8).fill(5);
    volatile.rankingHistory = [...Array(7).fill(10), 1];
    steady.currentRanking = 5;
    volatile.currentRanking = 1;
    steady.currentPlacementRanking = 5;
    volatile.currentPlacementRanking = 10;

    expect(calculatePlacementRanking(volatile, [steady, volatile])).toBe(2);
  });

  it('ranks all series uniquely and falls back to the current survey rank without history', () => {
    const mangas = createMangas(3);
    mangas[0].rankingHistory = [];
    mangas[0].currentRanking = 3;
    mangas[1].rankingHistory = [1, 2, 1];
    mangas[2].rankingHistory = [2, 2, 2];
    mangas.forEach((manga) => {
      manga.editorExpectation = 0.5;
      manga.currentPlacementRanking = manga.currentRanking;
    });

    updatePlacementRankings(mangas);

    expect(mangas.map((manga) => manga.currentPlacementRanking).sort()).toEqual([1, 2, 3]);
    expect(mangas[1].currentPlacementRanking).toBe(1);
  });

  it('uses the existing current survey rank for legacy state without ranking history', () => {
    const [manga] = createMangas(1);
    manga.rankingHistory = [];
    manga.currentRanking = 4;
    manga.currentPlacementRanking = 4;
    manga.editorExpectation = 0.5;

    expect(calculatePlacementRanking(manga, [manga])).toBe(1);
  });

  it('lets top candidates rotate with seeded, bounded weekly score variation', () => {
    const mangas = createMangas(5);
    mangas.forEach((manga, index) => {
      manga.rankingHistory = Array(8).fill(index + 1);
      manga.currentRanking = index + 1;
      manga.currentPlacementRanking = index + 1;
      manga.editorExpectation = 0.5;
    });

    const leaderPlacements: number[] = [];
    for (let week = 1; week <= 40; week++) {
      updatePlacementRankings(mangas, Math.imul(week, 0x9e3779b9));
      leaderPlacements.push(mangas[0].currentPlacementRanking);
    }

    expect(new Set(leaderPlacements).size).toBeGreaterThan(1);
    expect(Math.max(...leaderPlacements)).toBeLessThanOrEqual(5);
  });
});
