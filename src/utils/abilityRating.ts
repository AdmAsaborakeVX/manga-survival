export type AbilityRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface AbilityRating {
  label: string;
  rarity: AbilityRarity;
}

export type TotalAbilityRarity = 'poor' | 'standard' | 'good' | 'high' | 'superior' | 'top' | 'supreme' | 'legend';

export interface TotalAbilityRating {
  label: string;
  rarity: TotalAbilityRarity;
}

/**
 * 能力値に基づいて評価ラベルとレアリティを取得（漫画家能力・担当編集能力用）
 */
export function getAbilityRating(ability: number): AbilityRating {
  if (ability >= 90) {
    return { label: '天才級', rarity: 'legendary' };
  }
  if (ability >= 80) {
    return { label: '逸材', rarity: 'epic' };
  }
  if (ability >= 70) {
    return { label: '有能', rarity: 'rare' };
  }
  return { label: '実力派', rarity: 'common' };
}

/**
 * 総合能力に基づいて評価ラベルとレアリティを取得
 */
export function getTotalAbilityRating(totalAbility: number): TotalAbilityRating {
  if (totalAbility >= 180) {
    return { label: '伝説級', rarity: 'legend' };
  }
  if (totalAbility >= 170) {
    return { label: '超一流', rarity: 'supreme' };
  }
  if (totalAbility >= 160) {
    return { label: 'トップクラス', rarity: 'top' };
  }
  if (totalAbility >= 150) {
    return { label: '卓越', rarity: 'superior' };
  }
  if (totalAbility >= 140) {
    return { label: '高水準', rarity: 'high' };
  }
  if (totalAbility >= 130) {
    return { label: '良好', rarity: 'good' };
  }
  if (totalAbility >= 120) {
    return { label: '標準', rarity: 'standard' };
  }
  return { label: '平凡', rarity: 'poor' };
}
