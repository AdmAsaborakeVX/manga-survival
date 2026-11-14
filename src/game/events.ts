import type { EventDefinition, GameEvent, SerializingManga } from '@/types';
import { SeededRandom } from '@/utils/seededRandom';
import { EVENT_CONFIG } from '@/game/config';

/**
 * イベント定義集
 */
export const EVENT_DEFINITIONS: EventDefinition[] = [
  // ========== ポジティブイベント ==========
  {
    id: 'protagonist_popular',
    name: '主人公に注目が集まる',
    type: 'positive',
    description: '主人公キャラクターがSNSで話題になり、ファンアート投稿が急増',
    baseOccurrenceProbability: 0.08,
    effects: {
      popularity: 12,
      stability: 0.15,
      explosiveness: 0.3,
    },
  },
  {
    id: 'special_technique_trending',
    name: '必殺技が話題になる',
    type: 'positive',
    description: '作品内の必殺技がネット上でミーム化し、バズる',
    baseOccurrenceProbability: 0.07,
    effects: {
      popularity: 10,
      explosiveness: 0.4,
    },
  },
  {
    id: 'character_debut',
    name: '期待のキャラクターが登場',
    type: 'positive',
    description: 'ファンの期待度が高いキャラクターが初登場',
    baseOccurrenceProbability: 0.09,
    effects: {
      popularity: 15,
      explosiveness: 0.5,
    },
  },
  {
    id: 'godly_episode',
    name: '神回と評価される',
    type: 'positive',
    description: 'ストーリー展開が秀逸で、アンケート票が殺到',
    baseOccurrenceProbability: 0.06,
    effects: {
      popularity: 18,
      explosiveness: 0.8,
    },
  },
  {
    id: 'sns_trending',
    name: 'SNSで話題になる',
    type: 'positive',
    description: '大手インフルエンサーが作品について好意的にツイート',
    baseOccurrenceProbability: 0.07,
    effects: {
      popularity: 14,
      explosiveness: 0.6,
    },
  },
  {
    id: 'volume_boom',
    name: '単行本売上が急増する',
    type: 'positive',
    description: 'コミックスが重版がかかり、売上が倍以上に',
    baseOccurrenceProbability: 0.08,
    effects: {
      popularity: 8,
      sales: 100000,
      stability: 0.1,
    },
  },
  {
    id: 'anime_announcement',
    name: 'アニメ化が決定',
    type: 'positive',
    description: '作品のアニメ化が発表され、注目度が急上昇',
    baseOccurrenceProbability: 0.03,
    effects: {
      popularity: 25,
      explosiveness: 1.2,
      stability: 0.3,
    },
  },

  // ========== ネガティブイベント ==========
  {
    id: 'story_mannerism',
    name: '展開がマンネリ化する',
    type: 'negative',
    description: 'ストーリーの繰り返しが目立ち、読者がつまらないと批判',
    baseOccurrenceProbability: 0.09,
    effects: {
      popularity: -13,
      stability: -0.2,
    },
  },
  {
    id: 'protagonist_unpopular',
    name: '主人公の言動が批判される',
    type: 'negative',
    description: 'キャラクターの言動がうざいと批判され、嫌いなキャラ投票で低位置',
    baseOccurrenceProbability: 0.08,
    effects: {
      popularity: -15,
      explosiveness: -0.4,
    },
  },
  {
    id: 'story_too_complex',
    name: 'ストーリーが難解すぎると批判される',
    type: 'negative',
    description: '伏線が複雑すぎて読者がついていけず、掲示板で批判が沸騰',
    baseOccurrenceProbability: 0.07,
    effects: {
      popularity: -12,
      stability: -0.3,
    },
  },
  {
    id: 'artwork_degradation',
    name: '作画品質が低下する',
    type: 'negative',
    description: 'スケジュール逼迫で作画が雑になり、読者から質の低下を指摘される',
    baseOccurrenceProbability: 0.08,
    effects: {
      popularity: -10,
      stability: -0.25,
    },
  },
  {
    id: 'plot_twist_failure',
    name: '伏線回収に失敗する',
    type: 'negative',
    description: '張られていた伏線が回収されないまま放置されて、読者が落胆',
    baseOccurrenceProbability: 0.05,
    effects: {
      popularity: -18,
      stability: -0.4,
    },
  },
  {
    id: 'serialization_break',
    name: '休載が発生する',
    type: 'negative',
    description: '作者の体調不良や作画作業の遅延により、予定外の休載が発生',
    baseOccurrenceProbability: 0.06,
    effects: {
      popularity: -8,
      stability: -0.35,
    },
  },
  {
    id: 'controversy',
    name: '炎上・批判が殺到する',
    type: 'negative',
    description: 'ストーリーやキャラの言動が社会的に問題として炎上',
    baseOccurrenceProbability: 0.04,
    effects: {
      popularity: -20,
      stability: -0.5,
    },
  },

  // ========== 特殊イベント ==========
  {
    id: 'sudden_drama',
    name: '急展開で読者の期待が急上昇',
    type: 'neutral',
    description: '予想外の急展開が起きて、読者の期待が爆発的に上昇',
    baseOccurrenceProbability: 0.04,
    effects: {
      popularity: 22,
      explosiveness: 1.5,
    },
  },
  {
    id: 'unexpected_character_popularity',
    name: '脇役キャラクターに注目が集まる',
    type: 'neutral',
    description: '脇役キャラが予想外に注目を集め、新たな読者層を開拓',
    baseOccurrenceProbability: 0.05,
    effects: {
      popularity: 16,
      explosiveness: 0.7,
      stability: 0.2,
    },
  },
  {
    id: 'rival_boom',
    name: 'ライバル作品の大ヒット',
    type: 'neutral',
    description: 'ライバル誌のアニメ化など、競合環境が激化',
    baseOccurrenceProbability: 0.03,
    effects: {
      popularity: -6,
      stability: -0.2,
    },
  },
];

/**
 * イベント定義から発生イベントを生成
 */
export function createGameEvent(definition: EventDefinition): GameEvent {
  return {
    id: definition.id,
    type: definition.type,
    title: definition.name,
    description: definition.description,
    popularityDelta: definition.effects.popularity || 0,
  };
}

/**
 * 条件に基づいてイベントを発生させるかどうかを判定
 */
export function shouldEventOccur(
  definition: EventDefinition,
  manga: SerializingManga,
  rng: SeededRandom,
  currentWeek: number
): boolean {
  // クールダウン中か確認
  if (manga.lastEventWeek >= 0) {
    const weeksSinceLastEvent = currentWeek - manga.lastEventWeek;
    if (weeksSinceLastEvent < EVENT_CONFIG.COOLDOWN_WEEKS) {
      return false;
    }

    // 同じイベントは一定期間発生しない
    if (
      manga.lastEventId === definition.id &&
      weeksSinceLastEvent < (definition.cooldown || EVENT_CONFIG.SAME_EVENT_COOLDOWN)
    ) {
      return false;
    }
  }

  // 確率判定
  let probability = definition.baseOccurrenceProbability;

  // イベント確率を作品の能力で調整（高能力は良いイベントが発生しやすい）
  const abilityFactor = manga.totalAbility / 300; // 300が基準値
  if (definition.type === 'positive') {
    probability *= (0.8 + abilityFactor * 0.4);
  } else if (definition.type === 'negative') {
    probability *= Math.max(0.4, 1.2 - abilityFactor * 0.4);
  }

  // 人気に基づいた調整
  const popularityFactor = manga.currentPopularity / 100;
  if (definition.type === 'positive') {
    probability *= (0.7 + popularityFactor * 0.6);
  } else if (definition.type === 'negative') {
    probability *= Math.max(0.5, 1.5 - popularityFactor * 0.8);
  }

  return rng.next() < probability;
}

/**
 * 毎週のイベント発生処理
 */
export function generateWeeklyEvents(
  manga: SerializingManga,
  rng: SeededRandom,
  currentWeek: number
): GameEvent | null {
  // 複数のイベントが同時に発生することはない
  // イベント定義をシャッフルして、最初に発生条件を満たしたものを採用
  const shuffledDefinitions = [...EVENT_DEFINITIONS].sort(() => rng.nextFloat(-1, 1));

  for (const definition of shuffledDefinitions) {
    if (shouldEventOccur(definition, manga, rng, currentWeek)) {
      const event = createGameEvent(definition);
      return event;
    }
  }

  return null;
}

/**
 * イベント効果を作品に適用
 */
export function applyEventEffects(
  manga: SerializingManga,
  definition: EventDefinition
): void {
  // 人気変動
  if (definition.effects.popularity !== undefined) {
    manga.currentPopularity += definition.effects.popularity;
  }

  // 安定性変動
  if (definition.effects.stability !== undefined) {
    manga.stability += definition.effects.stability;
  }

  // 爆発力変動
  if (definition.effects.explosiveness !== undefined) {
    manga.explosiveness += definition.effects.explosiveness;
  }

  if (definition.effects.sales !== undefined) {
    manga.pendingPrintRunBonus =
      (manga.pendingPrintRunBonus ?? 0) + definition.effects.sales;
  }
}
