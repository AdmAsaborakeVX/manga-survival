import { describe, expect, it } from 'vitest';
import { createManga } from '@/game/manga';
import { initializeSerializationState } from '@/game/serialization';
import {
  calculatePlacementRanking,
  calculatePlacementTargetScore,
  updatePlacementRankings,
} from '@/game/ranking';
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
  it('applies EMA to the evaluation score instead of blending the previous placement', () => {
    const [manga] = createMangas(1);
    manga.currentRanking = 10;
    manga.currentPlacementRanking = 10;
    manga.editorExpectation = 0.5;
    manga.popularityHistory = Array(20).fill(50);
    manga.placementEmaScore = -4;
    const targetScore = calculatePlacementTargetScore(manga);

    updatePlacementRankings([manga]);

    expect(targetScore).toBe(-10.2);
    expect(manga.placementEmaScore).toBeCloseTo(-4 * 0.85 + targetScore * 0.15);
  });

  it('keeps editorial, new-series, sales, and long-series adjustments in the target score', () => {
    const [newSeries, establishedSeries] = createMangas(2);
    for (const manga of [newSeries, establishedSeries]) {
      manga.currentRanking = 5;
      manga.editorExpectation = 0.8;
      manga.totalSales = 250000;
      manga.salesHistory = [250000];
    }
    newSeries.popularityHistory = [];
    establishedSeries.popularityHistory = Array(20).fill(50);

    expect(calculatePlacementTargetScore(newSeries)).toBeCloseTo(-4.27);
    expect(calculatePlacementTargetScore(establishedSeries)).toBeCloseTo(-4.67);
  });

  it('ranks by higher EMA score even when another series has a better current survey rank', () => {
    const mangas = createMangas(2);
    mangas[0].currentRanking = 1;
    mangas[0].placementEmaScore = -15;
    mangas[1].currentRanking = 15;
    mangas[1].placementEmaScore = -1;
    mangas.forEach((manga) => {
      manga.editorExpectation = 0.5;
      manga.popularityHistory = Array(10).fill(50);
    });

    updatePlacementRankings(mangas);

    expect(mangas[1].currentPlacementRanking).toBe(1);
    expect(mangas[0].currentPlacementRanking).toBe(2);
  });

  it('initializes EMA from legacy ranking data when the saved score is missing', () => {
    const [manga] = createMangas(1);
    manga.rankingHistory = [5, 4];
    manga.currentRanking = 4;
    manga.currentPlacementRanking = 4;
    manga.editorExpectation = 0.5;
    manga.popularityHistory = Array(10).fill(50);
    delete manga.placementEmaScore;

    updatePlacementRankings([manga]);

    expect(manga.placementEmaScore).toBeCloseTo(-4.85);
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

  it('forces ranks one and four through six without regard to the new series score', () => {
    const mangas = createMangas(21);
    const newSeries = mangas[0];
    newSeries.isNewSerial = true;
    newSeries.currentRanking = 21;
    newSeries.currentPlacementRanking = 21;
    newSeries.placementEmaScore = -100;
    newSeries.popularityHistory = [50];

    updatePlacementRankings(mangas, 101);
    expect(newSeries.currentPlacementRanking).toBe(1);
    expect(new Set(mangas.map((manga) => manga.currentPlacementRanking)).size).toBe(21);

    newSeries.popularityHistory = Array(2).fill(50);
    updatePlacementRankings(mangas, 202);
    const secondWeekPlacement = newSeries.currentPlacementRanking;
    expect(secondWeekPlacement).toBeGreaterThanOrEqual(4);
    expect(secondWeekPlacement).toBeLessThanOrEqual(6);

    newSeries.totalAbility = 170;
    newSeries.currentRanking = 1;
    newSeries.placementEmaScore = 100;
    updatePlacementRankings(mangas, 202);
    expect(newSeries.currentPlacementRanking).toBe(secondWeekPlacement);
  });

  it('uses seeded positions from four through fourteen during weeks three to seven', () => {
    const mangas = createMangas(21);
    const newSeries = mangas[0];
    newSeries.isNewSerial = true;

    for (let week = 3; week <= 7; week++) {
      newSeries.popularityHistory = Array(week).fill(50);
      const weekSeed = Math.imul(week, 0x9e3779b9);
      const firstPlacement = calculatePlacementRanking(newSeries, mangas, weekSeed);
      const repeatedPlacement = calculatePlacementRanking(newSeries, mangas, weekSeed);

      expect(firstPlacement).toBeGreaterThanOrEqual(4);
      expect(firstPlacement).toBeLessThanOrEqual(14);
      expect(repeatedPlacement).toBe(firstPlacement);
    }
  });

  it('returns to ordinary EMA ranking from week eight onward', () => {
    const mangas = createMangas(21);
    const newSeries = mangas[0];
    newSeries.isNewSerial = true;
    newSeries.currentRanking = 21;
    newSeries.popularityHistory = Array(8).fill(50);
    newSeries.placementEmaScore = -100;
    mangas.slice(1).forEach((manga, index) => {
      manga.isNewSerial = false;
      manga.placementEmaScore = -1;
      manga.currentRanking = index + 1;
      manga.popularityHistory = Array(8).fill(50);
    });

    updatePlacementRankings(mangas, 808);

    expect(newSeries.currentPlacementRanking).toBe(21);
  });
});
