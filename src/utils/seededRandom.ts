/**
 * Seed付き乱数生成器（Xorshift32）
 * 同じSeedで同じ結果を再現できる
 */

export class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    // 0は避ける（Xorshiftの要件）
    this.seed = seed === 0 ? 1 : seed & 0xffffffff;
  }

  /**
   * 0以上1未満の乱数を生成
   */
  next(): number {
    this.seed ^= this.seed << 13;
    this.seed ^= this.seed >> 17;
    this.seed ^= this.seed << 5;
    return ((this.seed >>> 0) / 0x100000000) >>> 0;
  }

  /**
   * min以上max未満の整数を生成
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min) + min);
  }

  /**
   * min以上max未満の小数を生成
   */
  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  /**
   * 現在のSeedを取得
   */
  getSeed(): number {
    return this.seed;
  }

  /**
   * Seedをリセット（復元）
   */
  setSeed(seed: number): void {
    this.seed = seed === 0 ? 1 : seed & 0xffffffff;
  }
}

/**
 * ランダムなSeedを生成
 */
export function generateRandomSeed(): number {
  return Math.floor(Math.random() * 0x7fffffff) || 1;
}

/**
 * 複数の選択肢からランダムに1つを選択
 */
export function randomChoice<T>(
  items: T[],
  rng: SeededRandom
): T {
  if (items.length === 0) {
    throw new Error('Cannot choose from empty array');
  }
  return items[rng.nextInt(0, items.length)];
}

/**
 * 配列をランダムにシャッフル（Fisher-Yates）
 */
export function shuffle<T>(
  items: T[],
  rng: SeededRandom
): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = rng.nextInt(0, i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
