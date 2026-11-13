import type { SerializationState, SerializingManga, MangaRecord, MangaConfiguration, MangaAbilities } from '@/types';
import { SeededRandom } from '@/utils/seededRandom';
import { RIVAL_CONFIG } from '@/game/config';
import {
  calculateBasePopularity,
  calculateStability,
  calculateExplosiveness,
} from '@/game/popularity';

/**
 * プレイヤー作品の連載状態を初期化
 */
function initializePlayerManga(
  manga: MangaRecord,
  rng: SeededRandom
): SerializingManga {
  const basePopularity = calculateBasePopularity(manga.totalAbility);

  return {
    id: manga.id,
    title: manga.configuration.title,
    configuration: manga.configuration,
    abilities: manga.abilities,
    totalAbility: manga.totalAbility,

    currentPopularity: basePopularity,
    popularityHistory: [],

    currentRanking: 3,
    currentPlacementRanking: 3,
    rankingHistory: [],

    totalSales: 0,
    lastSalesWeek: 0,
    salesHistory: [],

    stability: calculateStability(manga.totalAbility, rng),
    explosiveness: calculateExplosiveness(manga.totalAbility, rng),
    readerAffinityTrend: rng.nextFloat(-0.2, 0.2),
    editorExpectation: 0.7 + rng.nextFloat(-0.1, 0.2),

    lastEventId: null,
    lastEventWeek: -1,
    eventHistory: [],

    cancellationRisk: 0,
    lowRankingWeeks: 0,

    initialPopularity: basePopularity,
  };
}

/**
 * ライバル作品を1体生成
 */
function generateRivalManga(index: number, rng: SeededRandom): SerializingManga {
  // ライバルの能力値を決定（プレイヤーより若干低めだが、バラつきを持たせる）
  const rivalAbility = 80 + rng.nextInt(-RIVAL_CONFIG.ABILITY_VARIANCE, RIVAL_CONFIG.ABILITY_VARIANCE);

  // ライバルの初期人気
  const basePopularity =
    RIVAL_CONFIG.INITIAL_POPULARITY_MIN +
    rng.nextInt(0, RIVAL_CONFIG.INITIAL_POPULARITY_MAX - RIVAL_CONFIG.INITIAL_POPULARITY_MIN);

  // ジャンルなどをランダムに設定
  const genres: MangaConfiguration['genre'][] = [
    'shounen_action',
    'shounen_comedy',
    'shounen_adventure',
    'shounen_psychological',
    'shounen_romance',
  ];
  const worldviews: MangaConfiguration['worldview'][] = [
    'contemporary',
    'fantasy',
    'scifi',
    'historical',
    'supernatural',
  ];
  const protagonists: MangaConfiguration['protagonist'][] = [
    'ordinary_boy',
    'genius_girl',
    'antihero',
    'mysterious_entity',
    'underdog',
  ];
  const styles: MangaConfiguration['style'][] = [
    'traditional_shounen',
    'serious_dark',
    'comedy_slice_of_life',
    'experimental',
    'heartwarming',
  ];

  const config: MangaConfiguration = {
    genre: genres[rng.nextInt(0, genres.length)],
    worldview: worldviews[rng.nextInt(0, worldviews.length)],
    protagonist: protagonists[rng.nextInt(0, protagonists.length)],
    style: styles[rng.nextInt(0, styles.length)],
    title: `ライバル作品${index + 1}`,
    authorName: `作者${index + 1}`,
  };

  // 能力を均等に配分
  const abilities: MangaAbilities = {
    story: Math.floor(rivalAbility / 5),
    character: Math.floor(rivalAbility / 5),
    artwork: Math.floor(rivalAbility / 5),
    originality: Math.floor(rivalAbility / 5),
    composition: Math.floor(rivalAbility / 5),
  };

  return {
    id: `rival_${index}`,
    title: config.title,
    configuration: config,
    abilities,
    totalAbility: rivalAbility,

    currentPopularity: basePopularity,
    popularityHistory: [],

    currentRanking: index + 2,
    currentPlacementRanking: index + 2,
    rankingHistory: [],

    totalSales: 0,
    lastSalesWeek: 0,
    salesHistory: [],

    stability:
      RIVAL_CONFIG.STABILITY_MIN +
      rng.nextFloat(0, RIVAL_CONFIG.STABILITY_MAX - RIVAL_CONFIG.STABILITY_MIN),
    explosiveness:
      RIVAL_CONFIG.EXPLOSIVENESS_MIN +
      rng.nextFloat(0, RIVAL_CONFIG.EXPLOSIVENESS_MAX - RIVAL_CONFIG.EXPLOSIVENESS_MIN),
    readerAffinityTrend: rng.nextFloat(-0.2, 0.2),
    editorExpectation: 0.5 + rng.nextFloat(-0.2, 0.3),

    lastEventId: null,
    lastEventWeek: -1,
    eventHistory: [],

    cancellationRisk: 0,
    lowRankingWeeks: 0,

    initialPopularity: basePopularity,
  };
}

/**
 * ライバル作品群を生成
 */
function generateRivalMangas(rng: SeededRandom): SerializingManga[] {
  const rivals: SerializingManga[] = [];

  for (let i = 0; i < RIVAL_CONFIG.COUNT; i++) {
    rivals.push(generateRivalManga(i, rng));
  }

  return rivals;
}

/**
 * 連載状態を初期化
 */
export function initializeSerializationState(
  playerManga: MangaRecord,
  seed: number
): SerializationState {
  const rng = new SeededRandom(seed);

  const state: SerializationState = {
    id: `serialization_${Date.now()}`,
    playerMangaId: playerManga.id,
    playerManga: initializePlayerManga(playerManga, rng),
    rivalMangas: generateRivalMangas(rng),

    currentWeek: 0,
    isActive: true,
    endReason: null,

    seed,

    createdAt: Date.now(),
    startedAt: null,
    endedAt: null,
  };

  return state;
}

/**
 * 連載状態をシャローコピー（状態の保存用）
 */
export function cloneSerializationState(state: SerializationState): SerializationState {
  return {
    ...state,
    playerManga: {
      ...state.playerManga,
      abilities: { ...state.playerManga.abilities },
      popularityHistory: [...state.playerManga.popularityHistory],
      rankingHistory: [...state.playerManga.rankingHistory],
      salesHistory: [...state.playerManga.salesHistory],
      eventHistory: [...state.playerManga.eventHistory],
    },
    rivalMangas: state.rivalMangas.map((rival) => ({
      ...rival,
      abilities: { ...rival.abilities },
      popularityHistory: [...rival.popularityHistory],
      rankingHistory: [...rival.rankingHistory],
      salesHistory: [...rival.salesHistory],
      eventHistory: [...rival.eventHistory],
    })),
  };
}

/**
 * 連載状態から統計情報を取得
 */
export function getSerializationStatistics(state: SerializationState) {
  const playerManga = state.playerManga;

  return {
    currentWeek: state.currentWeek,
    playerTitle: playerManga.title,
    playerCurrentPopularity: playerManga.currentPopularity,
    playerCurrentRanking: playerManga.currentRanking,
    playerPlacementRanking: playerManga.currentPlacementRanking,
    playerTotalSales: playerManga.totalSales,
    playerCancellationRisk: playerManga.cancellationRisk,
    playerAvgPopularity:
      playerManga.popularityHistory.length > 0
        ? playerManga.popularityHistory.reduce((a, b) => a + b, 0) / playerManga.popularityHistory.length
        : playerManga.currentPopularity,
    isActive: state.isActive,
    endReason: state.endReason,
  };
}
