import type { GameData, SerializationState } from '@/types';
import { GAME_CONFIG } from '@/game/config';

const STORAGE_KEY = 'manga_survival_game_data';
const SERIALIZATION_STATE_KEY = 'manga_survival_serialization_state';

/**
 * ゲームデータを保存
 */
export function saveGameData(data: GameData): boolean {
  try {
    const json = JSON.stringify(data);
    localStorage.setItem(STORAGE_KEY, json);
    return true;
  } catch (error) {
    console.error('Failed to save game data:', error);
    return false;
  }
}

/**
 * ゲームデータを読み込み
 */
export function loadGameData(): GameData | null {
  try {
    const json = localStorage.getItem(STORAGE_KEY);
    if (!json) return null;

    const data = JSON.parse(json) as GameData;

    // バージョンチェック
    if (data.version !== GAME_CONFIG.saveVersion) {
      console.warn('Game data version mismatch, creating new save');
      return null;
    }

    return data;
  } catch (error) {
    console.error('Failed to load game data:', error);
    return null;
  }
}

/**
 * ゲームデータを削除
 */
export function deleteGameData(): boolean {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Failed to delete game data:', error);
    return false;
  }
}

/**
 * ゲームデータをクリア（新規開始）
 */
export function clearGameData(): GameData {
  const initialData: GameData = {
    version: GAME_CONFIG.saveVersion,
    mangas: [],
    serializations: [],
    results: [],
    lastUpdated: Date.now(),
  };
  saveGameData(initialData);
  return initialData;
}

/**
 * 前回のセッション状態を復元
 */
export function restoreGameSession(): GameData {
  const existing = loadGameData();
  return existing || clearGameData();
}

/**
 * 連載状態を保存
 */
export function saveSerializationState(state: SerializationState): boolean {
  try {
    const json = JSON.stringify(state);
    localStorage.setItem(SERIALIZATION_STATE_KEY, json);
    return true;
  } catch (error) {
    console.error('Failed to save serialization state:', error);
    return false;
  }
}

/**
 * 連載状態を読み込み
 */
export function loadSerializationState(): SerializationState | null {
  try {
    const json = localStorage.getItem(SERIALIZATION_STATE_KEY);
    if (!json) return null;
    return JSON.parse(json) as SerializationState;
  } catch (error) {
    console.error('Failed to load serialization state:', error);
    return null;
  }
}

/**
 * 連載状態を削除
 */
export function deleteSerializationState(): boolean {
  try {
    localStorage.removeItem(SERIALIZATION_STATE_KEY);
    return true;
  } catch (error) {
    console.error('Failed to delete serialization state:', error);
    return false;
  }
}
