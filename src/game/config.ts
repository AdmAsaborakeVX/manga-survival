import type { MangaConfigOptions, GameConfig } from '@/types';

/**
 * 漫画設定の選択肢定義
 */
export const MANGA_CONFIG_OPTIONS: MangaConfigOptions = {
  genres: [
    {
      id: 'shounen_action',
      label: 'バトル・冒険',
      description: 'ド派手なアクションと熱いバトルが中心'
    },
    {
      id: 'shounen_comedy',
      label: 'ギャグ・コメディ',
      description: 'クスクス笑える日常と突飛なネタ'
    },
    {
      id: 'shounen_adventure',
      label: 'ミステリー・冒険',
      description: '謎解きと探索がメイン'
    },
    {
      id: 'shounen_psychological',
      label: 'サスペンス・心理戦',
      description: '登場人物の心理や葛藤を深く描写'
    },
    {
      id: 'shounen_romance',
      label: 'ラブコメ・恋愛',
      description: 'キャラの関係性と恋愛ドラマ'
    }
  ],
  worldviews: [
    {
      id: 'contemporary',
      label: '現代日本',
      description: '今のような世界観'
    },
    {
      id: 'fantasy',
      label: 'ファンタジー',
      description: '魔法や怪物がいる異世界'
    },
    {
      id: 'scifi',
      label: 'SF・近未来',
      description: 'テクノロジーと未来的な舞台'
    },
    {
      id: 'historical',
      label: '歴史冒険',
      description: '過去の時代や実在の歴史設定'
    },
    {
      id: 'supernatural',
      label: 'オカルト・超自然',
      description: '幽霊や超能力などの怪奇現象'
    }
  ],
  protagonists: [
    {
      id: 'ordinary_boy',
      label: '普通の少年',
      description: '平凡だけど夢と根性がある'
    },
    {
      id: 'genius_girl',
      label: '天才少女',
      description: '生まれながらの才能に恵まれている'
    },
    {
      id: 'antihero',
      label: 'アンチヒーロー',
      description: '自分勝手だけど魅力的なタイプ'
    },
    {
      id: 'mysterious_entity',
      label: '謎の存在',
      description: '正体不明で危険な空気がある'
    },
    {
      id: 'underdog',
      label: 'アンダードッグ',
      description: '最初は弱いが成長していく'
    }
  ],
  styles: [
    {
      id: 'traditional_shounen',
      label: 'オーソドックス',
      description: '王道少年漫画の構成'
    },
    {
      id: 'serious_dark',
      label: 'シリアス・ダーク',
      description: '重い雰囲気と深刻なテーマ'
    },
    {
      id: 'comedy_slice_of_life',
      label: '日常系・ほのぼの',
      description: 'キャラの関係と日常を描写'
    },
    {
      id: 'experimental',
      label: '実験的・前衛',
      description: '独創的で型破りな表現'
    },
    {
      id: 'heartwarming',
      label: 'ハートウォーミング',
      description: '感動と涙の人間ドラマ'
    }
  ]
};

/**
 * ゲーム全体の設定値
 */
export const GAME_CONFIG: GameConfig = {
  saveVersion: 1,
  
  // 漫画能力配分の制限
  mangaAbilityMinPerAbility: 0,
  mangaAbilityMaxPerAbility: 100,
  
  // 連載シミュレーション
  // 最大連載週数、最低生存人気、ライバル作品の数などの設定
  maxSerializationWeeks: 500,
  minPopularityToSurvive: 10,
  rivalCount: 20,
};

// ============================================
// Serialization Simulation Config
// ============================================

/** 人気計算の定数 */
export const POPULARITY_CONFIG = {
  // 範囲
  MIN: 0,
  MAX: 100,
  INITIAL: 50,
  
  // 安定性・爆発力
  STABILITY_MIN: 0.3,
  STABILITY_MAX: 1.0,
  EXPLOSIVENESS_MIN: 0.5,
  EXPLOSIVENESS_MAX: 2.5,
  
  // 変動率と補正係数
  BASE_CHANGE_RATE: 0.18,
  MOMENTUM_FACTOR: 0.15,
  STABILITY_FACTOR: 0.5,
  // Long-series fatigue is gradual and capped so it cannot overwhelm the ability baseline.
  SERIES_PROGRESS_MALUS: 0.01,
  MAX_SERIES_PROGRESS_MALUS: 1.5,
};

/** 打ち切り判定の定数 */
export const CANCELLATION_CONFIG = {
  MIN_WEEKS_TO_CANCEL: 10,
  LOW_RANKING_RATIO: 0.5,
  MIDDLE_SERIES_START_WEEK: 41,
  LONG_SERIES_START_WEEK: 101,
  MIDDLE_LOW_RANKING_STREAK: 10,
  LONG_LOW_RANKING_STREAK: 20,
  // Require sustained poor results before cancelling established series.
  EARLY_SERIES_CANCELLATION_RISK_THRESHOLD: 0.4,
  MIDDLE_SERIES_CANCELLATION_RISK_THRESHOLD: 0.65,
  LONG_SERIES_CANCELLATION_RISK_THRESHOLD: 0.75,
  
  // 打ち切り判定用の各種閾値（新しい計算ロジックで使用）
  // これらは古い計算式では使われなくなった
  LOW_RANKING_WEEKS_TO_CANCEL: 8,
  AVERAGE_RANKING_TO_CANCEL: 12,
  AVERAGING_WEEKS: 13,
  
  // 危険度は直近の状態を重視しつつ、回復時に速やかに下げる
  RISK_DECAY_RATE: 0.35,
  RISK_INCREASE_PER_LOW_WEEK: 0.2,
};

/** 完結判定の定数 */
export const COMPLETION_CONFIG = {
  MIN_WEEKS_TO_COMPLETE: 100,
  MIN_AVERAGE_POPULARITY: 44,
  MIN_RECENT_POPULARITY: 40,
  MAX_AVERAGE_RANKING_RATIO: 0.65,
  MAX_RECENT_PLACEMENT_RATIO: 0.7,
  MAX_AVERAGE_PLACEMENT_RATIO: 0.65,
  MIN_AVERAGE_PRINT_RUN: 150000,
  MIN_TOTAL_PRINT_RUN: 1000000,
  MIN_TOTAL_SALES: 600000,
  MIN_EDITOR_EXPECTATION: 0.55,
  MAX_COMPLETION_RISK: 0.85,
  BASE_WEEKLY_COMPLETION_CHANCE: 0.002,
  WEEKLY_COMPLETION_CHANCE_PER_WEEK: 0.00005,
  MAX_WEEKLY_COMPLETION_CHANCE: 0.015,
};

/** 掲載順位計算の調整値 */
export const PLACEMENT_CONFIG = {
  EMA_ALPHA: 0.15,
  TOP_RANK_NOISE_THRESHOLD: 5,
  TOP_RANK_NOISE: 6,
  EDITOR_EXPECTATION_FACTOR: 0.6,
  NEW_SERIAL_BONUS: 0.2,
  NEW_SERIAL_PROTECTION_WEEKS: 7,
  NEW_SERIAL_PROTECTION_STRENGTH: 3,
  LONG_SERIAL_PENALTY: 0.2,
  HIGH_SALES_THRESHOLD: 200000,
  HIGH_SALES_BONUS: 0.35,
  MEDIUM_SALES_THRESHOLD: 140000,
  MEDIUM_SALES_BONUS: 0.2,
};

/** 売上計算の定数 */
export const SALES_CONFIG = {
  EPISODE_PAGE_COUNT: 20,
  EPISODES_PER_VOLUME: 9,
  PRINT_RUN_ABILITY_TIERS: [
    { ability: 100, copies: 30000 },
    { ability: 110, copies: 50000 },
    { ability: 120, copies: 80000 },
    { ability: 130, copies: 200000 },
    { ability: 140, copies: 400000 },
    { ability: 150, copies: 700000 },
    { ability: 160, copies: 1500000 },
    { ability: 170, copies: 3000000 },
  ],
  POPULARITY_PRINT_RUN_FACTOR: 0.2,
  PLACEMENT_PRINT_RUN_FACTOR: 0.4,
  SUSTAINED_POPULARITY_THRESHOLD: 55,
  MIN_READER_BASE_PRINT_RUN_FACTOR: 0.7,
  SUSTAINED_POPULARITY_PRINT_RUN_FACTOR: 0.3,
  PRINT_RUN_RANDOM_VARIATION: 0.05,
  EVENT_PRINT_RUN_BONUS_SCALE: 1000000,
  MAX_EVENT_PRINT_RUN_BONUS: 0.1,
  BASE_SELL_THROUGH_RATE: 0.55,
  POPULARITY_SELL_THROUGH_FACTOR: 0.25,
  PLACEMENT_SELL_THROUGH_FACTOR: 0.15,
  MIN_SELL_THROUGH_RATE: 0.55,
  MAX_SELL_THROUGH_RATE: 0.95,
};

/** イベント発生確率（基本値） */
export const EVENT_CONFIG = {
  BASE_POSITIVE_PROBABILITY: 0.12,
  BASE_NEGATIVE_PROBABILITY: 0.10,
  COOLDOWN_WEEKS: 2,
  SAME_EVENT_COOLDOWN: 3,
};

/** ライバル作品生成 */
export const RIVAL_CONFIG = {
  COUNT: 20,
  ABILITY_CENTER: 130,
  ABILITY_VARIANCE: 25,
  INITIAL_POPULARITY_VARIANCE: 10,
  STABILITY_MIN: 0.4,
  STABILITY_MAX: 0.9,
  EXPLOSIVENESS_MIN: 0.6,
  EXPLOSIVENESS_MAX: 2.0,
};
