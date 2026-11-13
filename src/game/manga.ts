import type { MangaRecord, MangaConfiguration, MangaAbilities } from '@/types';
import { generateTotalAbility, initializeAbilities } from '@/game/ability';
import { SeededRandom } from '@/utils/seededRandom';

/**
 * 新しい漫画を作成
 */
export function createManga(
  configuration: MangaConfiguration,
  rng: SeededRandom
): MangaRecord {
  const totalAbility = generateTotalAbility(rng);
  const abilities = initializeAbilities(totalAbility, rng);

  return {
    id: generateMangaId(),
    configuration,
    totalAbility,
    abilities,
    createdAt: Date.now(),
  };
}

/**
 * 漫画IDを生成（UUID風）
 */
export function generateMangaId(): string {
  return `manga_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 漫画の表示用タイトル
 */
export function getMangaDisplayTitle(manga: MangaRecord): string {
  return `『${manga.configuration.title}』 / 作者: ${manga.configuration.authorName}`;
}

/**
 * 漫画の設定から能力への補正（将来実装）
 * 現在は能力配分のみで決定される
 */
export function getAbilityBonus(_config: MangaConfiguration): Partial<MangaAbilities> {
  // TODO: 実装
  // 例：ジャンルが「バトル・冒険」なら"artwork"に+5ボーナス
  return {};
}
