import { describe, expect, it } from 'vitest';
import {
  createBalancedAbilitySettings,
  createDefaultSimulationSettings,
  runSimulationTrial,
  summarizeSimulationTrials,
  validateSimulationSettings,
} from '@/game/simulationTest';

describe('developer simulation test runner', () => {
  it.each([
    [100, [20, 20, 20, 20, 20]],
    [130, [26, 26, 26, 26, 26]],
    [160, [32, 32, 32, 32, 32]],
  ])('uses the selected balanced ability total %i in a seeded trial', (total, expectedAbilities) => {
    const settings = createDefaultSimulationSettings(54321);
    Object.assign(settings, createBalancedAbilitySettings(total));
    const trial = runSimulationTrial(settings, 54321);
    const summary = summarizeSimulationTrials([trial]);

    expect(trial.totalAbility).toBe(total);
    expect(trial.mangakaAbility + trial.editorAbility).toBe(total);
    expect(Object.values(trial.abilities)).toEqual(expectedAbilities);
    expect(summary.averageTotalAbility).toBe(total);
    expect(Object.values(summary.averageAbilities)).toEqual(expectedAbilities);
  });

  it('reflects balanced ability differences in same-seed simulation results', () => {
    const trials = [100, 130, 160].map((total) => {
      const settings = createDefaultSimulationSettings(12345);
      Object.assign(settings, createBalancedAbilitySettings(total));
      return runSimulationTrial(settings, 12345);
    });

    expect(new Set(trials.map((trial) => trial.finalPopularity)).size).toBeGreaterThan(1);
    expect(new Set(trials.map((trial) => trial.averageRanking)).size).toBeGreaterThan(1);
    expect(new Set(trials.map((trial) => trial.totalSales)).size).toBeGreaterThan(1);
    expect(new Set(trials.map((trial) => `${trial.endReason}:${trial.weeks}`)).size).toBeGreaterThan(1);
  });

  it('reproduces the same run for the same seed and settings', () => {
    const settings = createDefaultSimulationSettings(54321);
    const first = runSimulationTrial(settings, 54321);
    const second = runSimulationTrial(settings, 54321);

    expect(first).toEqual(second);
  });

  it('keeps fixed ability totals consistent and honors custom rival/week settings', () => {
    const settings = createDefaultSimulationSettings(123);
    settings.mangakaAbility = { mode: 'fixed', value: 50 };
    settings.editorAbility = { mode: 'fixed', value: 50 };
    settings.rivalCount = 0;
    settings.maxWeeks = 5;
    settings.abilities = {
      story: { mode: 'fixed', value: 20 },
      character: { mode: 'fixed', value: 20 },
      artwork: { mode: 'fixed', value: 20 },
      originality: { mode: 'fixed', value: 20 },
      composition: { mode: 'fixed', value: 20 },
    };

    expect(validateSimulationSettings(settings)).toBeNull();
    expect(runSimulationTrial(settings, 123).weeks).toBe(5);
  });

  it('accepts the configured safety limit and rejects larger run lengths', () => {
    const settings = createDefaultSimulationSettings(123);
    expect(validateSimulationSettings(settings)).toBeNull();

    settings.maxWeeks += 1;
    expect(validateSimulationSettings(settings)).toContain('最大連載週数');
  });

  it('rejects inconsistent fixed ability and creator totals', () => {
    const settings = createDefaultSimulationSettings();
    settings.mangakaAbility = { mode: 'fixed', value: 50 };
    settings.editorAbility = { mode: 'fixed', value: 50 };
    settings.abilities.story = { mode: 'fixed', value: 101 };

    expect(validateSimulationSettings(settings)).toContain('作品能力');
  });

  it('reports the eight-week early-end rate and long-run rates at their exact thresholds', () => {
    const settings = createDefaultSimulationSettings(42);
    const sample = runSimulationTrial(settings, 42);
    const summary = summarizeSimulationTrials([
      { ...sample, weeks: 8, endReason: 'cancelled' },
      { ...sample, weeks: 20, endReason: 'cancelled' },
      { ...sample, weeks: 100, endReason: 'completed' },
    ]);

    expect(summary.durationRates[8]).toBeCloseTo(100 / 3);
    expect(summary.durationRates.cancelled10To20).toBeCloseTo(100 / 3);
    expect(summary.durationRates[20]).toBeCloseTo(200 / 3);
    expect(summary.durationRates[100]).toBeCloseTo(100 / 3);
  });

  it('summarizes placement swings, first-place streaks, periods, and correlations', () => {
    const settings = createDefaultSimulationSettings(42);
    settings.maxWeeks = 5;
    const sample = runSimulationTrial(settings, 42);
    const summary = summarizeSimulationTrials([
      {
        ...sample,
        placements: [1, 1, 3, 14],
        averagePlacement: 5,
        averagePopularity: 10,
        totalAbility: 110,
      },
      {
        ...sample,
        placements: [3, 1, 1, 1],
        averagePlacement: 2,
        averagePopularity: 20,
        totalAbility: 120,
      },
    ]);

    expect(summary.bestPlacement).toBe(1);
    expect(summary.worstPlacement).toBe(14);
    expect(summary.averageWeeklyPlacementChange).toBe(2.5);
    expect(summary.tenPlusPlacementChanges).toBe(1);
    expect(summary.placementChangeDistribution).toContainEqual({
      label: '変動なし',
      count: 3,
      percent: 50,
    });
    expect(summary.firstPlaceCount).toBe(5);
    expect(summary.firstPlaceRate).toBeCloseTo(62.5);
    expect(summary.maxConsecutiveFirstPlaceWeeks).toBe(3);
    expect(summary.averagePopularityPlacementCorrelation).toBeCloseTo(-1);
    expect(summary.abilityPlacementCorrelation).toBeCloseTo(-1);
    expect(summary.placementPeriods[0]).toMatchObject({
      startWeek: 1,
      endWeek: 5,
      count: 2,
      averagePlacement: 3.125,
    });
  });

  it('calculates the correlation between weekly survey and placement rankings', () => {
    const settings = createDefaultSimulationSettings(42);
    settings.maxWeeks = 5;
    const sample = runSimulationTrial(settings, 42);
    const summary = summarizeSimulationTrials([
      {
        ...sample,
        surveyRankings: [1, 2, 3, 4],
        placements: [1, 2, 3, 4],
      },
    ]);

    expect(summary.surveyPlacementCorrelation).toBeCloseTo(1);
  });

  it('measures large changes between consecutive ten-week average placements', () => {
    const settings = createDefaultSimulationSettings(42);
    settings.maxWeeks = 30;
    const sample = runSimulationTrial(settings, 42);
    const placements = [
      ...Array(10).fill(5),
      ...Array(10).fill(10),
      ...Array(10).fill(19),
    ];
    const summary = summarizeSimulationTrials([
      { ...sample, weeks: 30, placements },
    ]);

    expect(summary.averageTenWeekPlacementChange).toBe(7);
    expect(summary.tenWeekPlacementChangesFivePlusCount).toBe(2);
    expect(summary.tenWeekPlacementChangesFivePlusRate).toBe(100);
    expect(summary.tenWeekPlacementChangesEightPlusCount).toBe(1);
    expect(summary.tenWeekPlacementChangesEightPlusRate).toBe(50);
    expect(summary.maximumTenWeekPlacementChange).toBe(9);
  });

  it.each([100, 1000, 10000])('summarizes %i simulation trials', (count) => {
    const settings = createDefaultSimulationSettings(20261114);
    const trials = Array.from({ length: count }, (_, index) =>
      runSimulationTrial(settings, (20261114 + Math.imul(index, 0x9e3779b1)) >>> 0)
    );
    const summary = summarizeSimulationTrials(trials);

    expect(summary.total).toBe(count);
    expect(summary.minWeeks).toBeGreaterThan(0);
    expect(summary.maxWeeks).toBeLessThanOrEqual(settings.maxWeeks);
    expect(summary.endReasons.reduce((total, reason) => total + reason.count, 0)).toBe(count);
  }, 120000);
});
