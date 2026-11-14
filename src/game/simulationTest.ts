import type {
  MangaAbilities,
  MangaConfiguration,
  MangaRecord,
  SerializingManga,
  SerializationState,
} from '@/types';
import { createManga } from '@/game/manga';
import { initializeAbilities } from '@/game/ability';
import { initializeSerializationState } from '@/game/serialization';
import { advanceWeek } from '@/game/simulation';
import { GAME_CONFIG, RIVAL_CONFIG } from '@/game/config';
import { SeededRandom } from '@/utils/seededRandom';

export type AbilityKey = keyof MangaAbilities;
export type ConfigurableValue = { mode: 'random' } | { mode: 'fixed'; value: number };
type FixedConfigurableValue = Extract<ConfigurableValue, { mode: 'fixed' }>;

export interface SimulationTestSettings {
  seed: number;
  rivalCount: number;
  maxWeeks: number;
  configuration: MangaConfiguration;
  mangakaAbility: ConfigurableValue;
  editorAbility: ConfigurableValue;
  abilities: Record<AbilityKey, ConfigurableValue>;
}

export interface SimulationTrial {
  mangakaAbility: number;
  editorAbility: number;
  totalAbility: number;
  abilities: MangaAbilities;
  weeks: number;
  endReason: string;
  peakPopularity: number;
  finalPopularity: number;
  averageRanking: number;
  bestRanking: number;
  finalRanking: number;
  averagePlacement: number;
  finalPlacement: number;
  totalSales: number;
  popularity: number[];
  placements: number[];
  cancellationRisks: number[];
}

export interface WeeklyAggregate {
  week: number;
  count: number;
  averagePopularity: number;
  medianPopularity: number;
  averagePlacement: number;
  medianPlacement: number;
  averageCancellationRisk: number;
}

export interface SimulationSummary {
  total: number;
  averageWeeks: number;
  medianWeeks: number;
  minWeeks: number;
  maxWeeks: number;
  standardDeviationWeeks: number;
  durationDistribution: Array<{ start: number; end: number; count: number }>;
  durationRates: Record<8 | 'cancelled10To20' | 20 | 40 | 60 | 80 | 100, number>;
  endReasons: Array<{ reason: string; count: number; percent: number; averageWeeks: number }>;
  averageMangakaAbility: number;
  averageEditorAbility: number;
  averageTotalAbility: number;
  averageAbilities: MangaAbilities;
  averagePeakPopularity: number;
  medianPeakPopularity: number;
  maxPeakPopularity: number;
  averageFinalPopularity: number;
  medianFinalPopularity: number;
  averageRanking: number;
  bestRanking: number;
  finalRanking: number;
  averagePlacement: number;
  finalPlacement: number;
  averageSales: number;
  medianSales: number;
  maxSales: number;
  salesDistribution: Array<{ range: string; count: number }>;
  weekly: WeeklyAggregate[];
}

const ABILITY_KEYS: AbilityKey[] = [
  'story',
  'character',
  'artwork',
  'originality',
  'composition',
];

const randomValue = (): ConfigurableValue => ({ mode: 'random' });

export function createDefaultSimulationSettings(seed = 12345): SimulationTestSettings {
  return {
    seed,
    rivalCount: RIVAL_CONFIG.COUNT,
    maxWeeks: GAME_CONFIG.maxSerializationWeeks,
    configuration: {
      genre: 'shounen_action',
      worldview: 'contemporary',
      protagonist: 'ordinary_boy',
      style: 'traditional_shounen',
      title: 'シミュレーション作品',
      authorName: 'テスト作者',
    },
    mangakaAbility: randomValue(),
    editorAbility: randomValue(),
    abilities: {
      story: randomValue(),
      character: randomValue(),
      artwork: randomValue(),
      originality: randomValue(),
      composition: randomValue(),
    },
  };
}

function balanceAbilities(total: number): MangaAbilities {
  const base = Math.floor(total / 5);
  const remainder = total % 5;
  return {
    story: base + (remainder > 0 ? 1 : 0),
    character: base + (remainder > 1 ? 1 : 0),
    artwork: base + (remainder > 2 ? 1 : 0),
    originality: base + (remainder > 3 ? 1 : 0),
    composition: base,
  };
}

export function createBalancedAbilitySettings(
  total: number
): {
  mangakaAbility: FixedConfigurableValue;
  editorAbility: FixedConfigurableValue;
  abilities: Record<AbilityKey, FixedConfigurableValue>;
} {
  if (!Number.isInteger(total) || total < 100 || total > 200) {
    throw new RangeError('総合能力は100〜200の整数で指定してください。');
  }

  const half = Math.floor(total / 2);
  const abilities = balanceAbilities(total);
  return {
    mangakaAbility: { mode: 'fixed', value: half },
    editorAbility: { mode: 'fixed', value: total - half },
    abilities: {
      story: { mode: 'fixed', value: abilities.story },
      character: { mode: 'fixed', value: abilities.character },
      artwork: { mode: 'fixed', value: abilities.artwork },
      originality: { mode: 'fixed', value: abilities.originality },
      composition: { mode: 'fixed', value: abilities.composition },
    },
  };
}

function getConfiguredAbility(
  setting: ConfigurableValue,
  generated: number
): number {
  return setting.mode === 'fixed' ? setting.value : generated;
}

export function validateSimulationSettings(settings: SimulationTestSettings): string | null {
  if (!Number.isInteger(settings.seed) || settings.seed < 0 || settings.seed > 0x7fffffff) {
    return 'シード値は0〜2,147,483,647の整数で指定してください。';
  }
  if (!Number.isInteger(settings.rivalCount) || settings.rivalCount < 0 || settings.rivalCount > 20) {
    return 'ライバル作品数は0〜20の整数で指定してください。';
  }
  if (!Number.isInteger(settings.maxWeeks) || settings.maxWeeks < 1 || settings.maxWeeks > 200) {
    return '最大連載週数は1〜200の整数で指定してください。';
  }

  for (const setting of [settings.mangakaAbility, settings.editorAbility]) {
    if (setting.mode === 'fixed' && (!Number.isInteger(setting.value) || setting.value < 50 || setting.value > 100)) {
      return '漫画家・編集者能力の固定値は50〜100の整数で指定してください。';
    }
  }

  let fixedAbilityTotal = 0;
  let randomAbilityCount = 0;
  for (const key of ABILITY_KEYS) {
    const setting = settings.abilities[key];
    if (setting.mode === 'fixed') {
      if (!Number.isInteger(setting.value) || setting.value < 0 || setting.value > 100) {
        return '作品能力の固定値は0〜100の整数で指定してください。';
      }
      fixedAbilityTotal += setting.value;
    } else {
      randomAbilityCount++;
    }
  }

  const minTotalAbility =
    (settings.mangakaAbility.mode === 'fixed' ? settings.mangakaAbility.value : 50) +
    (settings.editorAbility.mode === 'fixed' ? settings.editorAbility.value : 50);
  const maxTotalAbility =
    (settings.mangakaAbility.mode === 'fixed' ? settings.mangakaAbility.value : 100) +
    (settings.editorAbility.mode === 'fixed' ? settings.editorAbility.value : 100);

  if (fixedAbilityTotal > minTotalAbility) {
    return '固定した作品能力の合計が、ランダム生成時に取り得る総合能力を超えています。漫画家・編集者能力を固定するか、作品能力を下げてください。';
  }
  if (fixedAbilityTotal < maxTotalAbility - randomAbilityCount * 100) {
    return '残り能力項目の上限では総合能力を配分しきれません。固定値を増やすか、漫画家・編集者能力を調整してください。';
  }
  if (randomAbilityCount === 0 &&
      (settings.mangakaAbility.mode !== 'fixed' || settings.editorAbility.mode !== 'fixed')) {
    return '作品能力をすべて固定する場合は、漫画家能力と編集者能力も固定してください。';
  }

  return null;
}

function assignAbilities(
  manga: MangaRecord,
  settings: SimulationTestSettings,
  rng: SeededRandom
): MangaAbilities {
  const initialized = initializeAbilities(manga.totalAbility, rng);
  const abilities = { ...initialized };
  const randomKeys: AbilityKey[] = [];
  let pointsLeft = manga.totalAbility;

  for (const key of ABILITY_KEYS) {
    const setting = settings.abilities[key];
    if (setting.mode === 'fixed') {
      abilities[key] = setting.value;
      pointsLeft -= setting.value;
    } else {
      randomKeys.push(key);
    }
  }

  for (let index = 0; index < randomKeys.length; index++) {
    const key = randomKeys[index];
    const slotsLeft = randomKeys.length - index - 1;
    const min = Math.max(0, pointsLeft - slotsLeft * 100);
    const max = Math.min(100, pointsLeft);
    const value = index === randomKeys.length - 1
      ? pointsLeft
      : Math.max(min, Math.min(max, initialized[key]));
    abilities[key] = value;
    pointsLeft -= value;
  }

  return abilities;
}

function configureManga(
  manga: MangaRecord,
  settings: SimulationTestSettings,
  rng: SeededRandom
): MangaRecord {
  manga.mangakaAbility = getConfiguredAbility(settings.mangakaAbility, manga.mangakaAbility);
  manga.editorAbility = getConfiguredAbility(settings.editorAbility, manga.editorAbility);
  manga.totalAbility = manga.mangakaAbility + manga.editorAbility;
  manga.abilities = assignAbilities(manga, settings, rng);
  return manga;
}

function average(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function averageRankings(manga: SerializingManga): number {
  return average(manga.rankingHistory);
}

export function runSimulationTrial(
  settings: SimulationTestSettings,
  trialSeed: number
): SimulationTrial {
  const rng = new SeededRandom(trialSeed);
  const manga = configureManga(createManga(settings.configuration, rng), settings, rng);
  const state: SerializationState = initializeSerializationState(manga, trialSeed, settings.rivalCount);
  const placements: number[] = [];
  const cancellationRisks: number[] = [];

  while (state.isActive) {
    advanceWeek(state, settings.maxWeeks);
    placements.push(state.playerManga.currentPlacementRanking);
    cancellationRisks.push(state.playerManga.cancellationRisk);
  }

  const player = state.playerManga;
  const popularity = [...player.popularityHistory];
  return {
    mangakaAbility: manga.mangakaAbility,
    editorAbility: manga.editorAbility,
    totalAbility: manga.totalAbility,
    abilities: { ...manga.abilities },
    weeks: state.currentWeek,
    endReason: state.endReason ?? 'other',
    peakPopularity: Math.max(player.currentPopularity, ...popularity),
    finalPopularity: player.currentPopularity,
    averageRanking: averageRankings(player),
    bestRanking: player.rankingHistory.length > 0 ? Math.min(...player.rankingHistory) : player.currentRanking,
    finalRanking: player.currentRanking,
    averagePlacement: average(placements),
    finalPlacement: player.currentPlacementRanking,
    totalSales: player.totalSales,
    popularity,
    placements,
    cancellationRisks,
  };
}

export function summarizeSimulationTrials(trials: SimulationTrial[]): SimulationSummary {
  if (trials.length === 0) {
    throw new Error('シミュレーション結果がありません。');
  }

  const durations = trials.map((trial) => trial.weeks);
  const averageWeeks = average(durations);
  const variance = average(durations.map((weeks) => (weeks - averageWeeks) ** 2));
  const durationDistribution = Array.from({ length: Math.ceil(Math.max(...durations) / 5) }, (_, index) => {
    const start = index * 5 + 1;
    const end = start + 4;
    return {
      start,
      end,
      count: trials.filter((trial) => trial.weeks >= start && trial.weeks <= end).length,
    };
  });
  const durationRates = { 8: 0, cancelled10To20: 0, 20: 0, 40: 0, 60: 0, 80: 0, 100: 0 };
  durationRates.cancelled10To20 =
    (trials.filter((trial) =>
      trial.endReason === 'cancelled' && trial.weeks >= 10 && trial.weeks <= 20
    ).length / trials.length) * 100;
  for (const threshold of [8, 20, 40, 60, 80, 100] as const) {
    const matchingTrials = threshold === 8
      ? trials.filter((trial) => trial.weeks <= threshold)
      : trials.filter((trial) => trial.weeks >= threshold);
    durationRates[threshold] = (matchingTrials.length / trials.length) * 100;
  }

  const reasonNames = [...new Set(trials.map((trial) => trial.endReason))];
  const endReasons = reasonNames.map((reason) => {
    const group = trials.filter((trial) => trial.endReason === reason);
    return {
      reason,
      count: group.length,
      percent: (group.length / trials.length) * 100,
      averageWeeks: average(group.map((trial) => trial.weeks)),
    };
  });

  const maxWeek = Math.max(...trials.map((trial) => trial.weeks));
  const weekly: WeeklyAggregate[] = [];
  for (let index = 0; index < maxWeek; index++) {
    const active = trials.filter((trial) => trial.popularity.length > index);
    if (active.length === 0) continue;
    const popularities = active.map((trial) => trial.popularity[index]);
    const placements = active
      .filter((trial) => trial.placements.length > index)
      .map((trial) => trial.placements[index]);
    const risks = active
      .filter((trial) => trial.cancellationRisks.length > index)
      .map((trial) => trial.cancellationRisks[index]);
    weekly.push({
      week: index + 1,
      count: active.length,
      averagePopularity: average(popularities),
      medianPopularity: median(popularities),
      averagePlacement: average(placements),
      medianPlacement: median(placements),
      averageCancellationRisk: average(risks),
    });
  }

  const sales = trials.map((trial) => trial.totalSales);
  const salesBucketSize = 500000;
  const salesBucketCount = Math.max(1, Math.ceil(Math.max(...sales) / salesBucketSize));
  const salesDistribution = Array.from({ length: salesBucketCount }, (_, index) => {
    const start = index * salesBucketSize;
    const end = start + salesBucketSize - 1;
    return {
      range: `${(start / 1000000).toFixed(1)}〜${((end + 1) / 1000000).toFixed(1)}百万`,
      count: sales.filter((value) => value >= start && value <= end).length,
    };
  });

  return {
    total: trials.length,
    averageWeeks,
    medianWeeks: median(durations),
    minWeeks: Math.min(...durations),
    maxWeeks: Math.max(...durations),
    standardDeviationWeeks: Math.sqrt(variance),
    durationDistribution,
    durationRates,
    endReasons,
    averageMangakaAbility: average(trials.map((trial) => trial.mangakaAbility)),
    averageEditorAbility: average(trials.map((trial) => trial.editorAbility)),
    averageTotalAbility: average(trials.map((trial) => trial.totalAbility)),
    averageAbilities: {
      story: average(trials.map((trial) => trial.abilities.story)),
      character: average(trials.map((trial) => trial.abilities.character)),
      artwork: average(trials.map((trial) => trial.abilities.artwork)),
      originality: average(trials.map((trial) => trial.abilities.originality)),
      composition: average(trials.map((trial) => trial.abilities.composition)),
    },
    averagePeakPopularity: average(trials.map((trial) => trial.peakPopularity)),
    medianPeakPopularity: median(trials.map((trial) => trial.peakPopularity)),
    maxPeakPopularity: Math.max(...trials.map((trial) => trial.peakPopularity)),
    averageFinalPopularity: average(trials.map((trial) => trial.finalPopularity)),
    medianFinalPopularity: median(trials.map((trial) => trial.finalPopularity)),
    averageRanking: average(trials.map((trial) => trial.averageRanking)),
    bestRanking: Math.min(...trials.map((trial) => trial.bestRanking)),
    finalRanking: average(trials.map((trial) => trial.finalRanking)),
    averagePlacement: average(trials.map((trial) => trial.averagePlacement)),
    finalPlacement: average(trials.map((trial) => trial.finalPlacement)),
    averageSales: average(sales),
    medianSales: median(sales),
    maxSales: Math.max(...sales),
    salesDistribution,
    weekly,
  };
}

export function createComparisonProfiles(): Array<{
  id: string;
  label: string;
  mangaka: number;
  editor: number;
  abilities: MangaAbilities;
}> {
  const specialty = (key: AbilityKey): MangaAbilities => ({
    story: key === 'story' ? 50 : 20,
    character: key === 'character' ? 50 : 20,
    artwork: key === 'artwork' ? 50 : 20,
    originality: key === 'originality' ? 50 : 20,
    composition: key === 'composition' ? 50 : 20,
  });

  return [
    { id: 'total-100', label: '総合100・バランス', mangaka: 50, editor: 50, abilities: balanceAbilities(100) },
    { id: 'total-130', label: '総合130・バランス', mangaka: 65, editor: 65, abilities: balanceAbilities(130) },
    { id: 'total-160', label: '総合160・バランス', mangaka: 80, editor: 80, abilities: balanceAbilities(160) },
    ...ABILITY_KEYS.map((key) => ({
      id: `special-${key}`,
      label: `${({ story: 'ストーリー', character: 'キャラクター', artwork: '作画', originality: '独自性', composition: '構成' })[key]}特化`,
      mangaka: 65,
      editor: 65,
      abilities: specialty(key),
    })),
  ];
}
