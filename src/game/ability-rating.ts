/**
 * 漫画能力の評価基準設定
 * 数値に応じた評価ランク、ゲージ色、ゲーム影響説明をまとめた設定ファイル
 */

export type RatingRank = '壊滅的' | '未熟' | '標準' | '良好' | '優秀' | '卓越' | '超一流';

export interface RatingLevel {
  rank: RatingRank;
  minValue: number;
  maxValue: number;
  color: string;
  backgroundColor: string;
  meaning: string;
}

export interface AbilityDescription {
  key: keyof typeof ABILITY_DESCRIPTIONS;
  label: string;
  impact: string;
  ratings: {
    poor: string;
    weak: string;
    standard: string;
    good: string;
    excellent: string;
    superior: string;
    supreme: string;
  };
}

/**
 * 評価ランクの定義（下限値～上限値）
 * 合計7段階のランク
 */
export const RATING_LEVELS: RatingLevel[] = [
  {
    rank: '壊滅的',
    minValue: 0,
    maxValue: 9,
    color: '#8B0000',
    backgroundColor: '#FFE0E0',
    meaning: '明確な弱点',
  },
  {
    rank: '未熟',
    minValue: 10,
    maxValue: 19,
    color: '#FF6B35',
    backgroundColor: '#FFE5CC',
    meaning: '読者を選ぶ弱点になりやすい',
  },
  {
    rank: '標準',
    minValue: 20,
    maxValue: 29,
    color: '#FFA500',
    backgroundColor: '#FFE8CC',
    meaning: '最低限の水準',
  },
  {
    rank: '良好',
    minValue: 30,
    maxValue: 39,
    color: '#4169E1',
    backgroundColor: '#E0E7FF',
    meaning: '平均よりも少し良い',
  },
  {
    rank: '優秀',
    minValue: 40,
    maxValue: 49,
    color: '#228B22',
    backgroundColor: '#E0F8E0',
    meaning: '強みとして機能する',
  },
  {
    rank: '卓越',
    minValue: 50,
    maxValue: 59,
    color: '#1E90FF',
    backgroundColor: '#D4E9FF',
    meaning: '明確な武器になる',
  },
  {
    rank: '超一流',
    minValue: 60,
    maxValue: 100,
    color: '#FFD700',
    backgroundColor: '#FFF8DC',
    meaning: '圧倒的な強み',
  },
];

/**
 * 数値から評価ランクを取得
 */
export function getRatingLevel(value: number): RatingLevel {
  const level = RATING_LEVELS.find((r) => value >= r.minValue && value <= r.maxValue);
  return level || RATING_LEVELS[0];
}

/**
 * ゲージの割合を計算（0～1）
 * 各ランクの最大値を基準に計算
 */
export function getGaugePercentage(value: number): number {
  const level = getRatingLevel(value);
  const relativeValue = value - level.minValue;
  const rangeSize = level.maxValue - level.minValue + 1;
  return Math.min(1, relativeValue / rangeSize);
}

/**
 * 各能力の説明定義
 * ゲームに与える影響を記載
 */
export const ABILITY_DESCRIPTIONS = {
  story: {
    label: 'ストーリー',
    impact: 'ストーリーの構成・テンポ・起承転結が作品の面白さに直結。弱いと読者の退屈感につながり、強いと安定した人気を維持できる。',
    ratings: {
      poor: '話が散漫で読みにくい状態。連載継続が難しい。',
      weak: '話の流れはあるが、不自然な展開が目立つ。',
      standard: '基本的な構成ができている。最低限の面白さを保証。',
      good: '話の流れが自然で、読者を引き込む力がある。',
      excellent: 'メリハリのある構成で、読者の期待を適切に満たす。',
      superior: '物語の構成が秀逸で、多くの読者を魅了できる実力がある。',
      supreme: '傑作と称される物語構成。単行本化時の売上も大きく左右する。',
    },
  },
  character: {
    label: 'キャラクター',
    impact: '個性的で魅力的なキャラクターは、ファンの獲得と二次創作の盛り上がりに影響。これが高いと、作品全体の評価が上がりやすい。',
    ratings: {
      poor: 'キャラの個性や差別化が全くない。読者が感情移入できない。',
      weak: 'キャラに魅力が薄く、背景キャラとの区別がつきにくい。',
      standard: 'キャラの基本的な個性はあり、読者も認識できる。',
      good: '主要キャラが個性的で、読者から好感を持たれやすい。',
      excellent: 'キャラが非常に魅力的で、ファンアートやコスプレが増える。',
      superior: '記憶に残るほど個性的なキャラ。二次創作文化が盛り上がる。',
      supreme: 'キャラそのものが作品の看板になるレベル。グッズ化やアニメ化で大きな収益が期待できる。',
    },
  },
  artwork: {
    label: '画力・演出',
    impact: '視覚的な印象は第一印象で決まる。画力が高いと初読者の獲得が容易。演出が秀逸なら、シーン毎の感動が大きく増幅される。',
    ratings: {
      poor: 'イラストが下手で、連載作として見劣りする。読者の離脱が早い。',
      weak: '基本的な画力はあるが、細部が雑。素人っぽく見える場面が多い。',
      standard: '商品化する最低限の画力。特に目立つわけではない。',
      good: '画力が高く、見映えが良い。イラスト集の販売も可能なレベル。',
      excellent: '圧倒的な画力で、見た瞬間に惹きつけられる。アニメ化の際、原画の質も高くなりやすい。',
      superior: '業界内でも一目置かれる画力。表紙や扉絵の依頼が増える。',
      supreme: '芸術的価値があり、単行本の売上にも直結する圧倒的な画力。',
    },
  },
  originality: {
    label: '独自性・テーマ',
    impact: 'オリジナリティの高さは、作品の長期継続と他作品との差別化に重要。新規性が高いと初期の話題性が高い。',
    ratings: {
      poor: '既存作品の焼き直しで、新規性が全くない。埋もれやすい。',
      weak: 'テーマは既存だが、若干のアレンジがある。ただし個性には欠ける。',
      standard: 'よくあるテーマだが、基本的な工夫がされている。',
      good: 'テーマに独自の視点があり、他作品との差別化ができている。',
      excellent: '非常にオリジナリティが高く、新しいジャンルを切り開くレベル。業界での評判も上がる。',
      superior: '革新的な設定やテーマで、読者の期待を大きく超える。',
      supreme: 'それまでにない全く新しい作品世界観。単なる娯楽を超えた社会現象を起こすレベル。',
    },
  },
  composition: {
    label: '構成・テンポ',
    impact: 'ページ配置・コマ割りのテンポ感は、読みやすさと臨場感に直結。テンポが悪いと読者の離脱が加速する。',
    ratings: {
      poor: '構成がぐちゃぐちゃで読みづらい。どのコマから読むのか不明な場面がある。',
      weak: 'コマ割りが単調で、読んでいてテンポが悪い。リズム感に欠ける。',
      standard: '基本的な読みやすさがある。特に工夫はないが、支障はない。',
      good: 'コマ割りが工夫されており、読みやすく、若干のリズム感がある。',
      excellent: 'ページをめくる楽しさがあり、テンポが非常に良い。アクションシーンが映える。',
      superior: 'マンガ表現の工夫が秀逸で、映画的な動きと臨場感がある。',
      supreme: 'コマ割りが傑作で、単行本で読み直した時にも感動できるレベルの構成。',
    },
  },
};

export type AbilityKey = keyof typeof ABILITY_DESCRIPTIONS;

/**
 * 能力キーを取得
 */
export function getAbilityKeys(): AbilityKey[] {
  return Object.keys(ABILITY_DESCRIPTIONS) as AbilityKey[];
}

/**
 * 能力の説明を取得
 */
export function getAbilityDescription(key: AbilityKey): (typeof ABILITY_DESCRIPTIONS)[AbilityKey] {
  return ABILITY_DESCRIPTIONS[key];
}

/**
 * 評価ランクに応じた詳細説明を取得
 */
export function getRatingDescription(key: AbilityKey, value: number): string {
  const level = getRatingLevel(value);
  const description = ABILITY_DESCRIPTIONS[key];
  
  const ratingMap = {
    '壊滅的': 'poor',
    '未熟': 'weak',
    '標準': 'standard',
    '良好': 'good',
    '優秀': 'excellent',
    '卓越': 'superior',
    '超一流': 'supreme',
  } as const;
  
  const ratingKey = ratingMap[level.rank] as keyof typeof description.ratings;
  return description.ratings[ratingKey];
}
