import type { SerializationState } from '@/types';
import { SeededRandom } from '@/utils/seededRandom';
import { updateMangaPopularity, clampPopularity } from '@/game/popularity';
import { calculateRankings, updatePlacementRankings } from '@/game/ranking';
import { updateSales } from '@/game/sales';
import { checkEndCondition, updateCancellationRisk } from '@/game/endCondition';
import { generateWeeklyEvents, applyEventEffects, EVENT_DEFINITIONS } from '@/game/events';
import { GAME_CONFIG, POPULARITY_CONFIG } from '@/game/config';

/**
 * 毎週の進行処理
 * 
 * 処理順序：
 * 1. 週数を先に進める
 * 2. イベント発生判定と効果適用
 * 3. 人気変動計算
 * 4. アンケート順位算出
 * 5. 掲載順位算出
 * 6. 売上計算
 * 7. 打ち切り危険度更新
 * 8. 連載終了判定
 * 
 * 戻り値：更新された連載状態
 */
export function advanceWeek(
  state: SerializationState,
  maxWeeks: number = GAME_CONFIG.maxSerializationWeeks
): SerializationState {
  // 既に終了している場合は何もしない
  if (!state.isActive) {
    return state;
  }

  // ========== 0. 週数を進める ==========
  state.currentWeek++;

  // 連載開始時刻を設定（初回のみ）
  if (state.startedAt === null) {
    state.startedAt = Date.now();
  }

  // Seed付き乱数生成器を再構築
  // 週が進むたびに内部状態が変わるようにする
  const rng = new SeededRandom(state.seed ^ (state.currentWeek * 0x9e3779b9));

  // ========== 1. イベント発生判定 ==========
  const allMangas = [state.playerManga, ...state.rivalMangas];

  for (const manga of allMangas) {
    const event = generateWeeklyEvents(manga, rng, state.currentWeek);

    if (event) {
      // イベント定義を取得
      const definition = EVENT_DEFINITIONS.find((def) => def.id === event.id);
      if (definition) {
        // イベント効果を適用
        applyEventEffects(manga, definition, event);

        // イベント効果後の人気値をクリップ
        manga.currentPopularity = clampPopularity(manga.currentPopularity);

        // イベント履歴に記録
        manga.eventHistory.push({
          week: state.currentWeek,
          event,
        });

        // 最後のイベント情報を更新
        manga.lastEventId = event.id;
        manga.lastEventWeek = state.currentWeek;
      }
    }
  }

  // ========== 2. 人気変動計算 ==========
  const rivalPopularities = state.rivalMangas.map((r) => r.currentPopularity);

  for (const manga of allMangas) {
    updateMangaPopularity(manga, rng, rivalPopularities);

    // 人気値を範囲内にクリップ
    manga.currentPopularity = clampPopularity(manga.currentPopularity);
  }

  // ========== 3. アンケート順位算出 ==========
  const rankings = calculateRankings(allMangas);
  for (const manga of allMangas) {
    manga.currentRanking = rankings.get(manga.id) || 1;
    manga.rankingHistory.push(manga.currentRanking);
  }

  // ========== 4. 掲載順位算出 ==========
  updatePlacementRankings(allMangas);

  // ========== 5. 売上計算 ==========
  for (const manga of allMangas) {
    updateSales(manga, state.currentWeek, allMangas.length);
  }

  // ========== 6. 打ち切り危険度更新 ==========
  for (const manga of allMangas) {
    updateCancellationRisk(manga, allMangas.length);
  }

  // ========== 7. 連載終了判定（プレイヤー作品のみ） ==========
  const endCondition = checkEndCondition(
    state.playerManga,
    state.currentWeek,
    rng,
    maxWeeks,
    allMangas.length
  );

  if (endCondition) {
    state.isActive = false;
    state.endReason = endCondition;
    state.endedAt = Date.now();
  }

  return state;
}

/**
 * 複数週を一括進行（シミュレーション用）
 */
export function advanceWeeks(state: SerializationState, weeks: number): SerializationState {
  let current = state;

  for (let i = 0; i < weeks; i++) {
    if (!current.isActive) {
      break;
    }
    current = advanceWeek(current);
  }

  return current;
}

/**
 * 連載を最後まで進行
 */
export function simulateToEnd(
  state: SerializationState,
  maxWeeks: number = GAME_CONFIG.maxSerializationWeeks
): SerializationState {
  let current = state;

  while (current.isActive) {
    current = advanceWeek(current, maxWeeks);
  }

  return current;
}

/**
 * 連載状態をリセット（デバッグ用）
 */
export function resetSeriazlizationToWeek(state: SerializationState, targetWeek: number): SerializationState {
  // 簡易実装: 履歴をtargetWeekまで切り詰める
  // 実装時間の都合により、完全なロールバックはしない
  // 代わりに、最初から指定週まで再シミュレーションすることを推奨

  const manga = state.playerManga;
  if (targetWeek < manga.popularityHistory.length) {
    manga.popularityHistory = manga.popularityHistory.slice(0, targetWeek);
    manga.rankingHistory = manga.rankingHistory.slice(0, targetWeek);
    if (manga.placementHistory) {
      manga.placementHistory = manga.placementHistory.slice(0, targetWeek);
    }
    manga.eventHistory = manga.eventHistory.filter((e) => e.week < targetWeek);

    if (manga.popularityHistory.length > 0) {
      manga.currentPopularity = manga.popularityHistory[manga.popularityHistory.length - 1];
      manga.currentRanking = manga.rankingHistory[manga.rankingHistory.length - 1];
    }

    state.currentWeek = targetWeek;
  }

  return state;
}

/**
 * 連載状態の妥当性を検証（デバッグ用）
 */
export function validateSerializationState(state: SerializationState): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // プレイヤー作品の検証
  if (!state.playerManga.id) {
    errors.push('Player manga ID is missing');
  }

  // 人気値の範囲チェック
  if (state.playerManga.currentPopularity < POPULARITY_CONFIG.MIN || state.playerManga.currentPopularity > POPULARITY_CONFIG.MAX) {
    errors.push(`Player manga popularity out of range: ${state.playerManga.currentPopularity}`);
  }

  // 履歴の長さが一貫しているか
  const expectedHistoryLength = state.currentWeek;
  if (state.playerManga.popularityHistory.length !== expectedHistoryLength) {
    errors.push(
      `Player manga popularity history length mismatch: expected ${expectedHistoryLength}, got ${state.playerManga.popularityHistory.length}`
    );
  }

  if (state.playerManga.rankingHistory.length !== expectedHistoryLength) {
    errors.push(
      `Player manga ranking history length mismatch: expected ${expectedHistoryLength}, got ${state.playerManga.rankingHistory.length}`
    );
  }
  if (
    state.playerManga.placementHistory &&
    state.playerManga.placementHistory.length !== expectedHistoryLength
  ) {
    errors.push(
      `Player manga placement history length mismatch: expected ${expectedHistoryLength}, got ${state.playerManga.placementHistory.length}`
    );
  }

  // ライバル作品の検証
  for (let i = 0; i < state.rivalMangas.length; i++) {
    const rival = state.rivalMangas[i];
    if (rival.popularityHistory.length !== expectedHistoryLength) {
      errors.push(
        `Rival ${i} popularity history length mismatch: expected ${expectedHistoryLength}, got ${rival.popularityHistory.length}`
      );
    }
    if (rival.placementHistory && rival.placementHistory.length !== expectedHistoryLength) {
      errors.push(
        `Rival ${i} placement history length mismatch: expected ${expectedHistoryLength}, got ${rival.placementHistory.length}`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
