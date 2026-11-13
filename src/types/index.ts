// ============================================
// Game State Types
// ============================================

/** ゲーム全体の状態 */
export type GameState = 'title' | 'creation' | 'confirmation' | 'serialization' | 'result' | 'gallery';

/** 連載ステータス */
export type SerializationStatus = 'running' | 'completed' | 'cancelled';

// ============================================
// Manga & Ability Types
// ============================================

/** 漫画設定ID型 */
export type MangaGenre = 'shounen_action' | 'shounen_comedy' | 'shounen_adventure' | 'shounen_psychological' | 'shounen_romance';
export type MangaWorldview = 'contemporary' | 'fantasy' | 'scifi' | 'historical' | 'supernatural';
export type MangaProtagonist = 'ordinary_boy' | 'genius_girl' | 'antihero' | 'mysterious_entity' | 'underdog';
export type MangaStyle = 'traditional_shounen' | 'serious_dark' | 'comedy_slice_of_life' | 'experimental' | 'heartwarming';

/** 漫画設定 */
export interface MangaConfiguration {
  genre: MangaGenre;
  worldview: MangaWorldview;
  protagonist: MangaProtagonist;
  style: MangaStyle;
  title: string;
  authorName: string;
}

/** 漫画能力（5項目） */
export interface MangaAbilities {
  story: number;           // ストーリー
  character: number;       // キャラクター
  artwork: number;         // 画力・演出
  originality: number;     // 独自性・テーマ
  composition: number;     // 構成・テンポ
}

/** 漫画の基本情報 */
export interface MangaRecord {
  id: string;
  configuration: MangaConfiguration;
  totalAbility: number;    // 漫画家能力 + 編集者能力
  abilities: MangaAbilities;
  createdAt: number;
}

// ============================================
// Serialization Types
// ============================================

/** 1週間の記録 */
export interface WeeklyRecord {
  week: number;
  popularity: number;
  rankingPosition: number;
  sales: number;
  events: GameEvent[];
}

/** 連載記録 */
export interface SerializationRecord {
  id: string;
  mangaId: string;
  seed: number;
  status: SerializationStatus;
  startedAt: number;
  endedAt: number | null;
  weeksCount: number;
  weeklyRecords: WeeklyRecord[];
}

/** 連載終了時の結果 */
export interface SerializationResult {
  serializationId: string;
  status: SerializationStatus;
  totalWeeks: number;
  peakPopularity: number;
  finalPopularity: number;
  totalSales: number;
  evaluation: 'legendary' | 'excellent' | 'good' | 'average' | 'poor';
}

// ============================================
// Event Types
// ============================================

/** ゲームイベント */
export interface GameEvent {
  id: string;
  type: 'positive' | 'negative' | 'neutral';
  title: string;
  description: string;
  popularityDelta: number;
}

// ============================================
// Game Data (Save File)
// ============================================

/** ゲームセーブデータ */
export interface GameData {
  version: number;
  mangas: MangaRecord[];
  serializations: SerializationRecord[];
  results: SerializationResult[];
  lastUpdated: number;
}

// ============================================
// Configuration Types
// ============================================

/** 漫画設定の選択肢 */
export interface MangaConfigOptions {
  genres: { id: MangaGenre; label: string; description: string }[];
  worldviews: { id: MangaWorldview; label: string; description: string }[];
  protagonists: { id: MangaProtagonist; label: string; description: string }[];
  styles: { id: MangaStyle; label: string; description: string }[];
}

/** ゲーム全体の設定 */
export interface GameConfig {
  saveVersion: number;
  mangaAbilityMinPerAbility: number;
  mangaAbilityMaxPerAbility: number;
  maxSerializationWeeks: number;
  minPopularityToSurvive: number;
  rivalCount: number;
}
