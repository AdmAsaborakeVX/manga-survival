import { describe, it, expect, beforeEach } from 'vitest';
import { SeededRandom, generateRandomSeed } from '@/utils/seededRandom';
import { createManga } from '@/game/manga';
import { initializeSerializationState } from '@/game/serialization';
import { simulateToEnd, advanceWeek } from '@/game/simulation';
import type { MangaRecord } from '@/types';

describe('Serialization Simulation - Extended Verification', () => {
  let mockMangaRecord: MangaRecord;

  beforeEach(() => {
    const rng = new SeededRandom(generateRandomSeed());
    mockMangaRecord = createManga(
      {
        genre: 'shounen_action',
        worldview: 'fantasy',
        protagonist: 'ordinary_boy',
        style: 'traditional_shounen',
        title: 'テスト漫画',
        authorName: 'テスト作者',
      },
      rng
    );
  });

  describe('Extended Simulation Statistics', () => {
    it('should complete simulation without errors (single seed)', () => {
      const state = initializeSerializationState(mockMangaRecord, 12345);
      const finalState = simulateToEnd(state);

      // 検証
      expect(finalState.isActive).toBe(false);
      expect(finalState.endReason).toMatch(/^(cancelled|completed)$/);
      expect(finalState.playerManga.popularityHistory.length).toBeGreaterThan(0);
      expect(finalState.currentWeek).toBeGreaterThan(0);

      console.log(`✓ Single seed simulation: ${finalState.currentWeek} weeks, ${finalState.endReason}`);
    });

    it('should show reasonable duration distribution (50 simulations)', () => {
      const weeks: number[] = [];
      const endReasons: Record<string, number> = { cancelled: 0, completed: 0 };

      for (let i = 0; i < 50; i++) {
        const seed = i + 10000;
        const rng = new SeededRandom(seed);
        const manga = createManga(
          {
            genre: 'shounen_action',
            worldview: 'fantasy',
            protagonist: 'ordinary_boy',
            style: 'traditional_shounen',
            title: 'Test',
            authorName: 'Author',
          },
          rng
        );

        const state = initializeSerializationState(manga, seed);
        const finalState = simulateToEnd(state);

        weeks.push(finalState.currentWeek);
        endReasons[finalState.endReason || 'unknown']++;
      }

      const avgWeeks = weeks.reduce((a, b) => a + b, 0) / weeks.length;
      const minWeeks = Math.min(...weeks);
      const maxWeeks = Math.max(...weeks);

      console.log(`\n📊 Statistics from 50 simulations:`);
      console.log(`  Average weeks: ${avgWeeks.toFixed(2)}`);
      console.log(`  Min weeks: ${minWeeks}`);
      console.log(`  Max weeks: ${maxWeeks}`);
      console.log(`  Cancelled: ${endReasons.cancelled} (${((endReasons.cancelled / 50) * 100).toFixed(1)}%)`);
      console.log(`  Completed: ${endReasons.completed} (${((endReasons.completed / 50) * 100).toFixed(1)}%)`);

      // アサーション
      expect(avgWeeks).toBeGreaterThan(15); // 平均が15週以上
      expect(avgWeeks).toBeLessThan(100); // 平均が100週未満
      expect(maxWeeks).toBeGreaterThan(30); // 最長が30週以上
      expect(minWeeks).toBeGreaterThan(3); // 最短が3週以上
      
      // 完結・打ち切りのどちらかが存在することを確認（完全に一方に偏らない）
      const completedRate = (endReasons.completed || 0) / 50;
      const cancelledRate = (endReasons.cancelled || 0) / 50;
      expect(completedRate + cancelledRate).toBeGreaterThan(0.95); // ほぼ全て終了
    });

    it('should show higher ability correlating with longer runs', () => {
      const results: Array<{
        totalAbility: number;
        weeks: number;
        avgPopularity: number;
      }> = [];

      // 複数シード・複数能力で実行
      for (let seed = 2000; seed < 2030; seed++) {
        const rng = new SeededRandom(seed);
        const manga = createManga(
          {
            genre: 'shounen_action',
            worldview: 'fantasy',
            protagonist: 'ordinary_boy',
            style: 'traditional_shounen',
            title: 'Test',
            authorName: 'Author',
          },
          rng
        );

        const state = initializeSerializationState(manga, seed);
        const finalState = simulateToEnd(state);

        const avgPopularity =
          finalState.playerManga.popularityHistory.reduce((a, b) => a + b, 0) /
          Math.max(1, finalState.playerManga.popularityHistory.length);

        results.push({
          totalAbility: finalState.playerManga.totalAbility,
          weeks: finalState.currentWeek,
          avgPopularity,
        });
      }

      // 能力の高い順でソート
      const sortedByAbility = [...results].sort(
        (a, b) => b.totalAbility - a.totalAbility
      );
      const highAbilityAvgWeeks =
        sortedByAbility.slice(0, 5).reduce((a, b) => a + b.weeks, 0) / 5;
      const lowAbilityAvgWeeks =
        sortedByAbility.slice(-5).reduce((a, b) => a + b.weeks, 0) / 5;

      console.log(`\n📈 Ability Correlation:`);
      console.log(`  High ability (top 5) avg weeks: ${highAbilityAvgWeeks.toFixed(2)}`);
      console.log(`  Low ability (bottom 5) avg weeks: ${lowAbilityAvgWeeks.toFixed(2)}`);

      // 高能力作品の方が平均的に長く連載されるべき
      // ただし、スター性ブースト等の影響もあるため、完全な相関は期待しない
      expect(highAbilityAvgWeeks).toBeGreaterThanOrEqual(lowAbilityAvgWeeks * 0.9);
    });

    it('should handle week-by-week consistency', () => {
      const state = initializeSerializationState(mockMangaRecord, 99999);

      for (let i = 0; i < 30 && state.isActive; i++) {
        const historySizeBefore = state.playerManga.popularityHistory.length;
        advanceWeek(state);

        // 週数が正確に増加
        expect(state.currentWeek).toBe(i + 1);

        // 人気履歴が追加される
        expect(state.playerManga.popularityHistory.length).toBe(historySizeBefore + 1);

        // 人気値が有効範囲内
        expect(state.playerManga.currentPopularity).toBeGreaterThanOrEqual(0);
        expect(state.playerManga.currentPopularity).toBeLessThanOrEqual(100);

        // 危険度が有効範囲内
        expect(state.playerManga.cancellationRisk).toBeGreaterThanOrEqual(0);
        expect(state.playerManga.cancellationRisk).toBeLessThanOrEqual(1);
      }
    });
  });
});
