import type { MangaGenre, MangaWorldview, MangaProtagonist, MangaStyle } from '@/types';

/**
 * ジャンル ID から日本語ラベルを取得
 */
export function getGenreLabel(genreId: MangaGenre): string {
  const genreMap: Record<MangaGenre, string> = {
    shounen_action: 'バトル・アクション',
    shounen_comedy: 'ギャグ・コメディ',
    shounen_adventure: '冒険・ファンタジー',
    shounen_psychological: 'サスペンス・心理戦',
    shounen_romance: '恋愛・ラブコメ',
  };
  return genreMap[genreId] || genreId;
}

/**
 * 世界観 ID から日本語ラベルを取得
 */
export function getWorldviewLabel(worldviewId: MangaWorldview): string {
  const worldviewMap: Record<MangaWorldview, string> = {
    contemporary: '現代日本',
    historical: '歴史・戦国',
    fantasy: 'ファンタジー世界',
    scifi: 'SF・近未来',
  };
  return worldviewMap[worldviewId] || worldviewId;
}

/**
 * 主人公タイプ ID から日本語ラベルを取得
 */
export function getProtagonistLabel(protagonistId: MangaProtagonist): string {
  const protagonistMap: Record<MangaProtagonist, string> = {
    ordinary_boy: '平凡な少年',
    confident_boy: '自信満々の少年',
    genius_boy: '天才少年',
    mysterious_boy: '謎めいた少年',
    reluctant_boy: '無理矢理巻き込まれた少年',
  };
  return protagonistMap[protagonistId] || protagonistId;
}

/**
 * スタイル ID から日本語ラベルを取得
 */
export function getStyleLabel(styleId: MangaStyle): string {
  const styleMap: Record<MangaStyle, string> = {
    traditional_shounen: 'オーソドックス',
    modern_comic: 'モダン・ポップ',
    avant_garde: 'アバンギャルド',
    serious: 'シリアス',
  };
  return styleMap[styleId] || styleId;
}
