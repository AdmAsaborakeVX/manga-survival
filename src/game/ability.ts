import type { MangaAbilities } from '@/types';
import { SeededRandom, generateRandomSeed } from '@/utils/seededRandom';
import { GAME_CONFIG } from '@/game/config';

/**
 * 漫画家能力と編集者能力の和から総合能力を生成
 * MVP：両者の能力を区別せず、合計値をプレイヤーが配分可能なポイントとする
 */
export function generateTotalAbility(rng: SeededRandom): number {
  // 漫画家能力: 30〜80
  const mangakaAbility = rng.nextInt(30, 81);
  // 編集者能力: 20〜60
  const editorAbility = rng.nextInt(20, 61);
  return mangakaAbility + editorAbility;
}

/**
 * 総合能力を5項目に初期配分
 * 均等配分を基本として、ランダムに変動を加える
 */
export function initializeAbilities(
  totalAbility: number,
  rng: SeededRandom
): MangaAbilities {
  const base = Math.floor(totalAbility / 5);
  const remainder = totalAbility % 5;

  // 均等に配分
  let abilities: MangaAbilities = {
    story: base,
    character: base,
    artwork: base,
    originality: base,
    composition: base,
  };

  // 余りを分配
  const keys: (keyof MangaAbilities)[] = ['story', 'character', 'artwork', 'originality', 'composition'];
  for (let i = 0; i < remainder; i++) {
    const keyIndex = rng.nextInt(0, 5);
    abilities[keys[keyIndex]]++;
  }

  return abilities;
}

/**
 * 能力配分の妥当性を検証
 */
export function validateAbilities(abilities: MangaAbilities, totalAbility: number): boolean {
  const sum = Object.values(abilities).reduce((a, b) => a + b, 0);
  
  // 合計値が一致するか
  if (sum !== totalAbility) return false;

  // 各項目が範囲内か
  const min = GAME_CONFIG.mangaAbilityMinPerAbility;
  const max = GAME_CONFIG.mangaAbilityMaxPerAbility;
  
  for (const ability of Object.values(abilities)) {
    if (ability < min || ability > max) return false;
  }

  return true;
}

/**
 * 能力を一括配分（テスト・デバッグ用）
 */
export function setAbilities(
  abilities: Partial<MangaAbilities>,
  totalAbility: number
): MangaAbilities | null {
  const keys: (keyof MangaAbilities)[] = ['story', 'character', 'artwork', 'originality', 'composition'];
  const values: MangaAbilities = {
    story: 0,
    character: 0,
    artwork: 0,
    originality: 0,
    composition: 0,
  };

  // 既に設定された値をコピー
  for (const key of keys) {
    if (abilities[key] !== undefined) {
      values[key] = abilities[key];
    }
  }

  // 合計が一致しているか確認
  if (!validateAbilities(values, totalAbility)) {
    return null;
  }

  return values;
}

/**
 * 残りのポイント数を計算（UI用）
 */
export function calculateRemainingAbilityPoints(
  abilities: MangaAbilities,
  totalAbility: number
): number {
  const sum = Object.values(abilities).reduce((a, b) => a + b, 0);
  return totalAbility - sum;
}

/**
 * 能力を個別に更新（ポイント配分用）
 * 
 * UIでの自由な配分を許可し、確定時にのみバリデーション
 * ユーザーが1つの値を変更する際には、最大値までの制限のみを行う
 */
export function updateAbility(
  abilities: MangaAbilities,
  key: keyof MangaAbilities,
  newValue: number,
  totalAbility: number
): MangaAbilities | null {
  const min = GAME_CONFIG.mangaAbilityMinPerAbility;
  const max = GAME_CONFIG.mangaAbilityMaxPerAbility;

  // 個別の能力値が範囲内か確認
  if (newValue < min || newValue > max) {
    return null;
  }

  // 単純に値を更新（合計チェックは行わない）
  // ユーザーは各能力値を自由に配分できる
  const updated = { ...abilities, [key]: newValue };
  
  return updated;
}

/**
 * 能力配分をリセット
 */
export function resetAbilities(totalAbility: number): MangaAbilities {
  return initializeAbilities(totalAbility, new SeededRandom(generateRandomSeed()));
}
