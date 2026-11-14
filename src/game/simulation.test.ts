import { describe, it, expect, beforeEach } from 'vitest';
import { SeededRandom, generateRandomSeed } from '@/utils/seededRandom';
import { createManga } from '@/game/manga';
import { cloneSerializationState, initializeSerializationState } from '@/game/serialization';
import {
  advanceWeek,
  advanceWeeks,
  simulateToEnd,
  validateSerializationState,
} from '@/game/simulation';
import { POPULARITY_CONFIG, GAME_CONFIG } from '@/game/config';

describe('Serialization Simulation Engine', () => {
  let mockMangaRecord: any;

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

  describe('Serialization Initialization', () => {
    it('should initialize serialization state', () => {
      const state = initializeSerializationState(mockMangaRecord, 12345);

      expect(state.id).toBeTruthy();
      expect(state.playerMangaId).toBe(mockMangaRecord.id);
      expect(state.currentWeek).toBe(0);
      expect(state.isActive).toBe(true);
      expect(state.endReason).toBeNull();
      expect(state.seed).toBe(12345);
    });

    it('should generate player and rival mangas', () => {
      const state = initializeSerializationState(mockMangaRecord, 12345);

      expect(state.playerManga).toBeTruthy();
      expect(state.playerManga.id).toBe(mockMangaRecord.id);
      expect(state.rivalMangas).toHaveLength(GAME_CONFIG.rivalCount);

      // ライバルがすべて異なるIDを持つか
      const rivalIds = state.rivalMangas.map((r) => r.id);
      const uniqueIds = new Set(rivalIds);
      expect(uniqueIds.size).toBe(rivalIds.length);
    });

    it('should set initial popularity within range', () => {
      const state = initializeSerializationState(mockMangaRecord, 12345);

      expect(state.playerManga.currentPopularity).toBeGreaterThanOrEqual(
        POPULARITY_CONFIG.MIN
      );
      expect(state.playerManga.currentPopularity).toBeLessThanOrEqual(
        POPULARITY_CONFIG.MAX
      );

      for (const rival of state.rivalMangas) {
        expect(rival.currentPopularity).toBeGreaterThanOrEqual(POPULARITY_CONFIG.MIN);
        expect(rival.currentPopularity).toBeLessThanOrEqual(POPULARITY_CONFIG.MAX);
      }
    });
  });

  describe('Weekly Advancement', () => {
    it('should increment week counter', () => {
      let state = initializeSerializationState(mockMangaRecord, 12345);
      expect(state.currentWeek).toBe(0);

      state = advanceWeek(state);
      expect(state.currentWeek).toBe(1);

      state = advanceWeek(state);
      expect(state.currentWeek).toBe(2);
    });

    it('should update popularity history', () => {
      let state = initializeSerializationState(mockMangaRecord, 12345);
      
      state = advanceWeek(state);

      expect(state.playerManga.popularityHistory).toHaveLength(1);
      // 人気履歴には前週の人気値が記録される
      expect(state.playerManga.popularityHistory[0]).toBeGreaterThanOrEqual(
        POPULARITY_CONFIG.MIN
      );
      expect(state.playerManga.popularityHistory[0]).toBeLessThanOrEqual(
        POPULARITY_CONFIG.MAX
      );
    });

    it('should update ranking history', () => {
      let state = initializeSerializationState(mockMangaRecord, 12345);

      state = advanceWeek(state);

      expect(state.playerManga.rankingHistory).toHaveLength(1);
      expect(state.playerManga.currentRanking).toBeGreaterThanOrEqual(1);
      expect(state.playerManga.currentRanking).toBeLessThanOrEqual(
        GAME_CONFIG.rivalCount + 1
      );
    });

    it('records each weekly placement separately from survey ranking', () => {
      let state = initializeSerializationState(mockMangaRecord, 12345);

      state = advanceWeek(state);

      expect(state.playerManga.placementHistory).toEqual([
        state.playerManga.currentPlacementRanking,
      ]);
      expect(state.playerManga.rankingHistory).toEqual([
        state.playerManga.currentRanking,
      ]);
    });

    it('keeps legacy saves without placement history playable without inventing past data', () => {
      const state = initializeSerializationState(mockMangaRecord, 12345);
      delete state.playerManga.placementHistory;

      const resumed = advanceWeek(cloneSerializationState(state));

      expect(resumed.playerManga.placementHistory).toBeUndefined();
    });

    it('should keep popularity in valid range', () => {
      let state = initializeSerializationState(mockMangaRecord, 12345);

      for (let i = 0; i < 20; i++) {
        state = advanceWeek(state);

        expect(state.playerManga.currentPopularity).toBeGreaterThanOrEqual(
          POPULARITY_CONFIG.MIN
        );
        expect(state.playerManga.currentPopularity).toBeLessThanOrEqual(
          POPULARITY_CONFIG.MAX
        );
      }
    });

    it('should maintain state consistency after multiple weeks', () => {
      let state = initializeSerializationState(mockMangaRecord, 12345);

      for (let i = 0; i < 10; i++) {
        state = advanceWeek(state);
        const validation = validateSerializationState(state);
        expect(validation.valid).toBe(true);
        if (!validation.valid) {
          console.log('Validation errors:', validation.errors);
        }
      }
    });
  });

  describe('Batch Advancement', () => {
    it('should advance multiple weeks', () => {
      let state = initializeSerializationState(mockMangaRecord, 12345);

      state = advanceWeeks(state, 5);

      expect(state.currentWeek).toBe(5);
      expect(state.playerManga.popularityHistory).toHaveLength(5);
      expect(state.playerManga.rankingHistory).toHaveLength(5);
    });

    it('should simulate to end', () => {
      let state = initializeSerializationState(mockMangaRecord, 12345);

      state = simulateToEnd(state);

      expect(state.isActive).toBe(false);
      expect(state.endReason).toBeTruthy();
      expect(['cancelled', 'completed']).toContain(state.endReason);
      expect(state.currentWeek).toBeGreaterThan(0);
      expect(state.currentWeek).toBeLessThanOrEqual(GAME_CONFIG.maxSerializationWeeks);
    });
  });

  describe('Same Seed Determinism', () => {
    it('should produce same results with same seed', () => {
      const seed = 999;

      // Run 1
      let state1 = initializeSerializationState(mockMangaRecord, seed);
      state1 = advanceWeeks(state1, 20);

      // Run 2
      let state2 = initializeSerializationState(mockMangaRecord, seed);
      state2 = advanceWeeks(state2, 20);

      // Check results are identical
      expect(state1.playerManga.currentPopularity).toBe(state2.playerManga.currentPopularity);
      expect(state1.playerManga.currentRanking).toBe(state2.playerManga.currentRanking);
      expect(state1.playerManga.popularityHistory).toEqual(
        state2.playerManga.popularityHistory
      );
      expect(state1.playerManga.rankingHistory).toEqual(
        state2.playerManga.rankingHistory
      );
    });

    it('should produce reproducible results when re-initialized with same seed', () => {
      const seed = 555;

      // Initial state
      let state = initializeSerializationState(mockMangaRecord, seed);
      state = advanceWeeks(state, 15);
      const beforeReplay = state.playerManga.currentPopularity;

      // Replay from beginning
      let replayState = initializeSerializationState(mockMangaRecord, seed);
      replayState = advanceWeeks(replayState, 15);
      const afterReplay = replayState.playerManga.currentPopularity;

      expect(beforeReplay).toBe(afterReplay);
    });
  });

  describe('End Conditions', () => {
    it('should eventually end', () => {
      let state = initializeSerializationState(mockMangaRecord, 12345);

      let weeks = 0;
      while (state.isActive && weeks < GAME_CONFIG.maxSerializationWeeks + 10) {
        state = advanceWeek(state);
        weeks++;
      }

      expect(state.isActive).toBe(false);
      expect(state.endedAt).not.toBeNull();
    });

    it('should not exceed max serialization weeks', () => {
      let state = initializeSerializationState(mockMangaRecord, 12345);

      state = simulateToEnd(state);

      expect(state.currentWeek).toBeLessThanOrEqual(GAME_CONFIG.maxSerializationWeeks);
    });
  });

  describe('Sales Calculation', () => {
    it('should calculate sales every nine serialization weeks', () => {
      let state = initializeSerializationState(mockMangaRecord, 12345);

      state = advanceWeeks(state, 8);
      expect(state.playerManga.salesHistory).toHaveLength(0);

      // Advance to week 9（最初の単行本発売）
      state = advanceWeeks(state, 1);

      // Check if sales were recorded
      const salesRecorded = state.playerManga.salesHistory.length > 0;
      expect(salesRecorded).toBe(true);

      // 売上は正数であるべき
      if (state.playerManga.salesHistory.length > 0) {
        expect(state.playerManga.salesHistory[0]).toBeGreaterThan(0);
      }
    });

    it('should accumulate total sales', () => {
      let state = initializeSerializationState(mockMangaRecord, 12345);

      const initialSales = state.playerManga.totalSales;
      state = advanceWeeks(state, 20);

      expect(state.playerManga.totalSales).toBeGreaterThanOrEqual(initialSales);
    });
  });

  describe('Event System', () => {
    it('should record events in history', () => {
      let state = initializeSerializationState(mockMangaRecord, 12345);

      state = advanceWeeks(state, 30);

      // イベントが少なくとも何か発生している可能性がある
      // ただし、発生確率があるので0の可能性もある
      expect(state.playerManga.eventHistory).toBeTruthy();
    });
  });

  describe('State Validation', () => {
    it('should pass validation for initialized state', () => {
      const state = initializeSerializationState(mockMangaRecord, 12345);

      const validation = validateSerializationState(state);
      expect(validation.valid).toBe(true);
    });

    it('should pass validation after advancing weeks', () => {
      let state = initializeSerializationState(mockMangaRecord, 12345);

      for (let i = 0; i < 15; i++) {
        state = advanceWeek(state);
        const validation = validateSerializationState(state);
        if (!validation.valid) {
          console.log(`Validation failed at week ${state.currentWeek}:`, validation.errors);
        }
        expect(validation.valid).toBe(true);
      }
    });
  });
});
