export type AbilityRarity = 'lack' | 'common' | 'rare' | 'epic' | 'legendary';

export interface AbilityRating {
  label: string;
  rarity: AbilityRarity;
}

export type TotalAbilityRarity = 'poor' | 'low' | 'standard' | 'good' | 'high' | 'superior' | 'top' | 'supreme' | 'legend';

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
    return { label: '優秀', rarity: 'rare' };
  }
  if (ability >= 60) {
    return { label: '平均的', rarity: 'common' };
  }
  return { label: '実力不足', rarity: 'lack' };
}

/**
 * 総合能力に基づいて評価ラベルとレアリティを取得
 */
export function getTotalAbilityRating(totalAbility: number): TotalAbilityRating {
  if (totalAbility >= 170) {
    return { label: '伝説級', rarity: 'legend' };
  }
  if (totalAbility >= 160) {
    return { label: 'トップクラス', rarity: 'top' };
  }
  if (totalAbility >= 150) {
    return { label: '卓越', rarity: 'superior' };
  }
  if (totalAbility >= 140) {
    return { label: '良好', rarity: 'high' };
  }
  if (totalAbility >= 130) {
    return { label: '標準', rarity: 'good' };
  }
  if (totalAbility >= 120) {
    return { label: '平均的', rarity: 'standard' };
  }
  if (totalAbility >= 110) {
    return { label: '低め', rarity: 'low' };
  }
  return { label: '悪い', rarity: 'poor' };
}
