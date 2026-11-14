import { describe, expect, it } from 'vitest';
import { createManga } from '@/game/manga';
import { initializeSerializationState } from '@/game/serialization';
import { calculateBasePopularity, calculatePopularityChange } from '@/game/popularity';
import { SeededRandom } from '@/utils/seededRandom';

function makeManga(totalAbility: number) {
  const seed = 92;
  const manga = createManga({
    genre: 'shounen_action',
    worldview: 'contemporary',
    protagonist: 'ordinary_boy',
    style: 'traditional_shounen',
    title: '人気計算テスト',
    authorName: 'テスト作者',
  }, new SeededRandom(seed));
  manga.mangakaAbility = totalAbility / 2;
  manga.editorAbility = totalAbility / 2;
  manga.totalAbility = totalAbility;
  manga.abilities = {
    story: totalAbility / 5,
    character: totalAbility / 5,
    artwork: totalAbility / 5,
    originality: totalAbility / 5,
    composition: totalAbility / 5,
  };
  const state = initializeSerializationState(manga, seed);
  state.playerManga.currentPopularity = 50;
  state.playerManga.popularityHistory = [50];
  state.playerManga.stability = 0.5;
  state.playerManga.explosiveness = 1;
  return state.playerManga;
}

describe('ability-based popularity', () => {
  it('keeps the baseline below saturation and increases it with total ability', () => {
    expect(calculateBasePopularity(100)).toBe(40);
    expect(calculateBasePopularity(130)).toBe(49);
    expect(calculateBasePopularity(160)).toBe(58);
  });

  it('pulls the same starting popularity down for weak ability and up for strong ability', () => {
    const weakChange = calculatePopularityChange(makeManga(100), new SeededRandom(7), []);
    const mediumChange = calculatePopularityChange(makeManga(130), new SeededRandom(7), []);
    const strongChange = calculatePopularityChange(makeManga(160), new SeededRandom(7), []);

    expect(weakChange).toBeLessThan(0);
    expect(weakChange).toBeLessThan(mediumChange);
    expect(mediumChange).toBeLessThan(strongChange);
  });

  it('preserves seeded variation instead of making every outcome deterministic', () => {
    const changes = [1, 2, 3, 4].map((seed) =>
      calculatePopularityChange(makeManga(130), new SeededRandom(seed), [])
    );

    expect(new Set(changes).size).toBeGreaterThan(1);
  });
});
