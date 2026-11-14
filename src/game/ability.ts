import type { MangaAbilities } from '@/types';
import { SeededRandom, generateRandomSeed } from '@/utils/seededRandom';
import { GAME_CONFIG } from '@/game/config';

/**
 * Box-Muller変換を使用して、正規分布に従う乱数を生成
 * 平均0・標準偏差1の正規分布
 */
function boxMullerNormal(rng: SeededRandom): number {
  const u1 = rng.next();
  const u2 = rng.next();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * 平均と標準偏差を指定して、正規分布に従う乱数を生成
 * 最小値・最大値の範囲外の値は再抽選
 */
function generateNormalRandom(
  rng: SeededRandom,
  mean: number,
  stdDev: number,
  min: number,
  max: number
): number {
  let value = mean + boxMullerNormal(rng) * stdDev;
  
  // min未満またはmax超の値は再抽選（最大10回まで試行）
  for (let i = 0; i < 10 && (value < min || value > max); i++) {
    value = mean + boxMullerNormal(rng) * stdDev;
  }
  
  // それでも範囲外の場合はクリップ
  return Math.max(min, Math.min(max, Math.round(value)));
}

/**
 * 漫画家能力を生成（50～100、平均65・標準偏差10の正規分布）
 */
export function generateMangakaAbility(rng: SeededRandom): number {
  return generateNormalRandom(rng, 65, 10, 50, 100);
}

/**
 * 担当編集能力を生成（50～100、平均65・標準偏差10の正規分布）
 */
export function generateEditorAbility(rng: SeededRandom): number {
  return generateNormalRandom(rng, 65, 10, 50, 100);
}

/**
 * 総合能力を生成（漫画家能力 + 担当編集能力）
 */
export function generateTotalAbility(rng: SeededRandom): { mangakaAbility: number; editorAbility: number; totalAbility: number } {
  const mangakaAbility = generateMangakaAbility(rng);
  const editorAbility = generateEditorAbility(rng);
  const totalAbility = mangakaAbility + editorAbility;
  
  return { mangakaAbility, editorAbility, totalAbility };
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
