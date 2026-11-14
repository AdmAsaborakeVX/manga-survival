// ============================================
// Game State Types
// ============================================

/** ゲーム全体の状態 */
export type GameState = 'title' | 'creation' | 'confirmation' | 'serialization' | 'result' | 'gallery';

/** 連載ステータス */
export type SerializationStatus = 'running' | 'completed' | 'cancelled' | 'limit_reached';

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
  mangakaAbility: number;  // 漫画家能力（50～100）
  editorAbility: number;   // 担当編集能力（50～100）
  totalAbility: number;    // 漫画家能力 + 担当編集能力
  abilities: MangaAbilities;
  createdAt: number;
  animationShown?: boolean; // 演出表示済みフラグ
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

/** イベント定義 */
export interface EventDefinition {
  id: string;
  name: string;
  type: 'positive' | 'negative' | 'neutral';
  description: string;
  baseOccurrenceProbability: number;
  effects: {
    popularity?: number;
    stability?: number;
    explosiveness?: number;
    /** Temporary potential print-run increase, applied at the next volume release */
    sales?: number;
  };
  cooldown?: number;
}

// ============================================
// Serialization State Types
// ============================================

/** 連載中の単一作品の状態 */
export interface SerializingManga {
  id: string;
  title: string;
  configuration: MangaConfiguration;
  abilities: MangaAbilities;
  totalAbility: number;
  
  // 連載統計
  currentPopularity: number;
  popularityHistory: number[];
  
  // 順位
  currentRanking: number;
  currentPlacementRanking: number;
  rankingHistory: number[];
  /** 週次掲載順位。旧セーブでは未記録の場合がある */
  placementHistory?: number[];
  
  // 売上
  totalSales: number;
  lastSalesWeek: number;
  salesHistory: number[];
  /** 発行部数。移行前の巻は不明値として null で保持する */
  totalPrintRun?: number;
  printRunHistory?: Array<number | null>;
  /** 次巻の発行時に適用するイベント起因の発行部数補正 */
  pendingPrintRunBonus?: number;
  
  // 状態
  stability: number;
  explosiveness: number;
  readerAffinityTrend: number;
  editorExpectation: number;
  
  // イベント
  lastEventId: string | null;
  lastEventWeek: number;
  eventHistory: Array<{ week: number; event: GameEvent }>;
  
  // 打ち切り危険度
  cancellationRisk: number;
  lowRankingWeeks: number;
  
  // 連載開始時の初期値
  initialPopularity: number;
}

/** 連載状態全体 */
export interface SerializationState {
  id: string;
  playerMangaId: string;
  playerManga: SerializingManga;
  rivalMangas: SerializingManga[];
  
  currentWeek: number;
  isActive: boolean;
  endReason: 'running' | 'cancelled' | 'completed' | 'limit_reached' | null;
  
  seed: number;
  
  createdAt: number;
  startedAt: number | null;
  endedAt: number | null;
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
