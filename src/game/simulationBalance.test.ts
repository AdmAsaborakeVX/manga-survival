import { describe, expect, it } from 'vitest';
import {
  createComparisonProfiles,
  createDefaultSimulationSettings,
  runSimulationTrial,
  summarizeSimulationTrials,
} from '@/game/simulationTest';
import type { SimulationTrial } from '@/game/simulationTest';

describe('ability-based serialization balance', () => {
  it('correlates 1,000 paired trials with ability and meets the week 10-20 cutoff target at 130', () => {
    const profiles = createComparisonProfiles().filter((profile) =>
      ['total-100', 'total-130', 'total-160'].includes(profile.id)
    );
    const count = 1000;
    const summaries = profiles.map((profile) => {
      const settings = createDefaultSimulationSettings(20261114);
      settings.configuration = {
        ...settings.configuration,
        protagonist: 'ordinary_boy',
        genre: 'shounen_action',
        worldview: 'contemporary',
        style: 'traditional_shounen',
      };
      settings.mangakaAbility = { mode: 'fixed', value: profile.mangaka };
      settings.editorAbility = { mode: 'fixed', value: profile.editor };
      for (const key of Object.keys(profile.abilities) as Array<keyof typeof profile.abilities>) {
        settings.abilities[key] = { mode: 'fixed', value: profile.abilities[key] };
      }

      const trials: SimulationTrial[] = Array.from({ length: count }, (_, index) =>
        runSimulationTrial(settings, (20261114 + Math.imul(index, 0x9e3779b1)) >>> 0)
      );
      const summary = summarizeSimulationTrials(trials);
      const averagePopularity =
        trials.reduce((sum, trial) =>
          sum + trial.popularity.reduce((total, value) => total + value, 0) / trial.weeks, 0
        ) / count;
      const cutoff10To20 =
        trials.filter((trial) => trial.endReason === 'cancelled' && trial.weeks >= 10 && trial.weeks <= 20).length /
        count;
      const exact40WeekEndRate = trials.filter((trial) => trial.weeks === 40).length / count;
      const completedRate =
        (summary.endReasons.find((reason) => reason.reason === 'completed')?.percent ?? 0) / 100;
      return { summary, averagePopularity, cutoff10To20, exact40WeekEndRate, completedRate };
    });

    expect(summaries[1].cutoff10To20).toBeGreaterThanOrEqual(0.5);
    expect(summaries[0].summary.averageWeeks).toBeLessThan(summaries[1].summary.averageWeeks);
    expect(summaries[1].summary.averageWeeks).toBeLessThan(summaries[2].summary.averageWeeks);
    expect(summaries[0].averagePopularity).toBeLessThan(summaries[1].averagePopularity);
    expect(summaries[1].averagePopularity).toBeLessThan(summaries[2].averagePopularity);
    expect(summaries[0].summary.averageRanking).toBeGreaterThan(summaries[1].summary.averageRanking);
    expect(summaries[1].summary.averageRanking).toBeGreaterThan(summaries[2].summary.averageRanking);
    expect(summaries[0].summary.averageSales).toBeLessThan(summaries[1].summary.averageSales);
    expect(summaries[1].summary.averageSales).toBeLessThan(summaries[2].summary.averageSales);
    expect(summaries[0].completedRate).toBeLessThan(summaries[1].completedRate);
    expect(summaries[1].completedRate).toBeLessThan(summaries[2].completedRate);
    expect(summaries[2].summary.durationRates[40]).toBeGreaterThan(summaries[1].summary.durationRates[40]);
    expect(summaries[1].exact40WeekEndRate).toBeLessThan(0.1);
    expect(summaries[2].summary.standardDeviationWeeks).toBeGreaterThan(0);
  }, 60000);
});
