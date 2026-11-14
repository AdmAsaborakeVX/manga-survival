import { SeededRandom, generateRandomSeed } from '@/utils/seededRandom';
import { createManga } from '@/game/manga';
import { initializeSerializationState, cloneSerializationState } from '@/game/serialization';
import { simulateToEnd } from '@/game/simulation';
import type { MangaRecord, SerializationState } from '@/types';

interface SimulationStats {
  totalSims: number;
  avgWeeks: number;
  medianWeeks: number;
  minWeeks: number;
  maxWeeks: number;
  weeksDistribution: Record<number, number>;
  
  // 終了理由の分布
  cancelledCount: number;
  completedCount: number;
  cancelledPercent: number;
  completedPercent: number;
  
  // 連載週数の階級分布
  within8weeks: number;
  within20weeks: number;
  over20weeks: number;
  over40weeks: number;
  over80weeks: number;
  
  // 初期能力と連載週数の相関
  avgAbilityOfCancelled: number;
  avgAbilityOfCompleted: number;
  avgAbilityOverall: number;
  
  // 平均人気と連載週数の関係
  avgPopularityByDuration: Record<string, number>;
}

/**
 * 複数シードでシミュレーション実行
 */
export async function runMultipleSeedSimulation(
  seedCount: number,
  baseConfig: {
    genre: MangaRecord['configuration']['genre'];
    worldview: MangaRecord['configuration']['worldview'];
    protagonist: MangaRecord['configuration']['protagonist'];
    style: MangaRecord['configuration']['style'];
    title: string;
    authorName: string;
  }
): Promise<SimulationStats> {
  const results: Array<{
    weeks: number;
    endReason: string;
    totalAbility: number;
    avgPopularity: number;
  }> = [];

  for (let i = 0; i < seedCount; i++) {
    const seed = generateRandomSeed();
    const rng = new SeededRandom(seed);
    
    // マンガを生成
    const manga = createManga(baseConfig, rng);
    
    // 連載を初期化
    let state = initializeSerializationState(manga, seed);
    
    // シミュレーションを実行
    state = simulateToEnd(state);
    
    const weeks = state.playerManga.popularityHistory.length;
    const avgPopularity = weeks > 0 
      ? state.playerManga.popularityHistory.reduce((a, b) => a + b, 0) / weeks
      : 0;
    
    results.push({
      weeks,
      endReason: state.endReason || 'unknown',
      totalAbility: state.playerManga.totalAbility,
      avgPopularity,
    });
  }

  // 統計を計算
  const weeks = results.map((r) => r.weeks);
  const sortedWeeks = [...weeks].sort((a, b) => a - b);
  
  const cancelledResults = results.filter((r) => r.endReason === 'cancelled');
  const completedResults = results.filter((r) => r.endReason === 'completed');

  const weeksDistribution: Record<number, number> = {};
  for (const week of weeks) {
    weeksDistribution[week] = (weeksDistribution[week] || 0) + 1;
  }

  const avgPopularityByDuration: Record<string, number> = {
    '0-8': results
      .filter((r) => r.weeks <= 8)
      .reduce((sum, r) => sum + r.avgPopularity, 0) / Math.max(1, results.filter((r) => r.weeks <= 8).length),
    '9-20': results
      .filter((r) => r.weeks > 8 && r.weeks <= 20)
      .reduce((sum, r) => sum + r.avgPopularity, 0) / Math.max(1, results.filter((r) => r.weeks > 8 && r.weeks <= 20).length),
    '21-40': results
      .filter((r) => r.weeks > 20 && r.weeks <= 40)
      .reduce((sum, r) => sum + r.avgPopularity, 0) / Math.max(1, results.filter((r) => r.weeks > 20 && r.weeks <= 40).length),
    '41-80': results
      .filter((r) => r.weeks > 40 && r.weeks <= 80)
      .reduce((sum, r) => sum + r.avgPopularity, 0) / Math.max(1, results.filter((r) => r.weeks > 40 && r.weeks <= 80).length),
    '80+': results
      .filter((r) => r.weeks > 80)
      .reduce((sum, r) => sum + r.avgPopularity, 0) / Math.max(1, results.filter((r) => r.weeks > 80).length),
  };

  return {
    totalSims: seedCount,
    avgWeeks: weeks.reduce((a, b) => a + b, 0) / weeks.length,
    medianWeeks: sortedWeeks[Math.floor(sortedWeeks.length / 2)],
    minWeeks: Math.min(...weeks),
    maxWeeks: Math.max(...weeks),
    weeksDistribution,
    
    cancelledCount: cancelledResults.length,
    completedCount: completedResults.length,
    cancelledPercent: (cancelledResults.length / seedCount) * 100,
    completedPercent: (completedResults.length / seedCount) * 100,
    
    within8weeks: results.filter((r) => r.weeks <= 8).length,
    within20weeks: results.filter((r) => r.weeks <= 20).length,
    over20weeks: results.filter((r) => r.weeks > 20).length,
    over40weeks: results.filter((r) => r.weeks > 40).length,
    over80weeks: results.filter((r) => r.weeks > 80).length,
    
    avgAbilityOfCancelled: cancelledResults.length > 0
      ? cancelledResults.reduce((sum, r) => sum + r.totalAbility, 0) / cancelledResults.length
      : 0,
    avgAbilityOfCompleted: completedResults.length > 0
      ? completedResults.reduce((sum, r) => sum + r.totalAbility, 0) / completedResults.length
      : 0,
    avgAbilityOverall: results.reduce((sum, r) => sum + r.totalAbility, 0) / results.length,
    
    avgPopularityByDuration,
  };
}

/**
 * 統計を整形して出力
 */
export function formatSimulationStats(stats: SimulationStats): string {
  const lines: string[] = [];

  lines.push('='.repeat(70));
  lines.push('連載シミュレーション統計（複数シード実行結果）');
  lines.push('='.repeat(70));
  lines.push('');

  lines.push(`【実行条件】`);
  lines.push(`  総シミュレーション数: ${stats.totalSims}`);
  lines.push('');

  lines.push(`【連載週数の統計】`);
  lines.push(`  平均連載週数: ${stats.avgWeeks.toFixed(2)} 週`);
  lines.push(`  中央値: ${stats.medianWeeks} 週`);
  lines.push(`  最短: ${stats.minWeeks} 週`);
  lines.push(`  最長: ${stats.maxWeeks} 週`);
  lines.push('');

  lines.push(`【連載週数の階級分布】`);
  lines.push(`  8週以内: ${stats.within8weeks} 件 (${((stats.within8weeks / stats.totalSims) * 100).toFixed(1)}%)`);
  lines.push(`  9～20週: ${stats.within20weeks - stats.within8weeks} 件 (${(((stats.within20weeks - stats.within8weeks) / stats.totalSims) * 100).toFixed(1)}%)`);
  lines.push(`  21週以上: ${stats.over20weeks} 件 (${((stats.over20weeks / stats.totalSims) * 100).toFixed(1)}%)`);
  lines.push(`  41週以上: ${stats.over40weeks} 件 (${((stats.over40weeks / stats.totalSims) * 100).toFixed(1)}%)`);
  lines.push(`  81週以上: ${stats.over80weeks} 件 (${((stats.over80weeks / stats.totalSims) * 100).toFixed(1)}%)`);
  lines.push('');

  lines.push(`【終了理由の分布】`);
  lines.push(`  打ち切り: ${stats.cancelledCount} 件 (${stats.cancelledPercent.toFixed(1)}%)`);
  lines.push(`  円満完結: ${stats.completedCount} 件 (${stats.completedPercent.toFixed(1)}%)`);
  lines.push('');

  lines.push(`【能力値の平均（終了理由別）】`);
  lines.push(`  打ち切り作品: ${stats.avgAbilityOfCancelled.toFixed(1)}`);
  lines.push(`  完結作品: ${stats.avgAbilityOfCompleted.toFixed(1)}`);
  lines.push(`  全体平均: ${stats.avgAbilityOverall.toFixed(1)}`);
  lines.push('');

  lines.push(`【連載期間別の平均人気】`);
  lines.push(`  0～8週: ${stats.avgPopularityByDuration['0-8'].toFixed(1)}`);
  lines.push(`  9～20週: ${stats.avgPopularityByDuration['9-20'].toFixed(1)}`);
  lines.push(`  21～40週: ${stats.avgPopularityByDuration['21-40'].toFixed(1)}`);
  lines.push(`  41～80週: ${stats.avgPopularityByDuration['41-80'].toFixed(1)}`);
  lines.push(`  81週～: ${stats.avgPopularityByDuration['80+'].toFixed(1)}`);
  lines.push('');

  lines.push(`【週数分布トップ20】`);
  const topWeeks = Object.entries(stats.weeksDistribution)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20);
  
  for (const [week, count] of topWeeks) {
    const percent = ((count / stats.totalSims) * 100).toFixed(1);
    lines.push(`  ${week}週: ${count} 件 (${percent}%)`);
  }
  lines.push('');

  lines.push('='.repeat(70));

  return lines.join('\n');
}
