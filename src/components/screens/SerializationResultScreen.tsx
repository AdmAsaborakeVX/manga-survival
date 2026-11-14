import { useEffect } from 'react';
import { scrollToTop } from '@/utils/scrollToTop';
import './SerializationResultScreen.css';
import type { SerializationState } from '@/types';

interface SerializationResultScreenProps {
  serializationState: SerializationState;
  onBackToTitle: () => void;
}

export default function SerializationResultScreen({
  serializationState,
  onBackToTitle,
}: SerializationResultScreenProps) {
  useEffect(() => {
    scrollToTop();
  }, []);
  const playerManga = serializationState.playerManga;

  // 終了理由を判定
  const getEndReason = (): string => {
    switch (serializationState.endReason) {
      case 'cancelled':
        return '打ち切り';
      case 'completed':
        return '円満完結';
      default:
        return '連載終了';
    }
  };

  // 評価を計算
  const getEvaluation = (): { label: string; color: string } => {
    const avgPopularity =
      playerManga.popularityHistory.length > 0
        ? playerManga.popularityHistory.reduce((a, b) => a + b, 0) / playerManga.popularityHistory.length
        : playerManga.currentPopularity;

    const avgRanking =
      playerManga.rankingHistory.length > 0
        ? playerManga.rankingHistory.reduce((a, b) => a + b, 0) / playerManga.rankingHistory.length
        : playerManga.currentRanking;

    if (serializationState.endReason === 'completed' && avgPopularity >= 70 && avgRanking <= 5) {
      return { label: '伝説級', color: '#ffd700' };
    } else if (avgPopularity >= 70 && avgRanking <= 5) {
      return { label: '大成功', color: '#ff69b4' };
    } else if (avgPopularity >= 50 && avgRanking <= 10) {
      return { label: '成功', color: '#28a745' };
    } else if (avgPopularity >= 30 && avgRanking <= 15) {
      return { label: '及第点', color: '#ffc107' };
    } else if (avgPopularity >= 20) {
      return { label: '惜敗', color: '#fd7e14' };
    } else {
      return { label: '大失敗', color: '#dc3545' };
    }
  };

  const evaluation = getEvaluation();
  const avgPopularity =
    playerManga.popularityHistory.length > 0
      ? playerManga.popularityHistory.reduce((a, b) => a + b, 0) / playerManga.popularityHistory.length
      : playerManga.currentPopularity;
  const avgRanking =
    playerManga.rankingHistory.length > 0
      ? playerManga.rankingHistory.reduce((a, b) => a + b, 0) / playerManga.rankingHistory.length
      : playerManga.currentRanking;

  return (
    <div className="serialization-result-screen">
      <div className="result-container">
        <div className="result-header">
          <h1 className="result-title">連載終了</h1>
        </div>

        <div className="result-content">
          <div className="manga-info-section">
            <h2 className="manga-title">{playerManga.title}</h2>
            <p className="manga-author">作者: {playerManga.configuration.authorName}</p>
          </div>

          <div className="evaluation-section">
            <div className="evaluation-badge" style={{ borderColor: evaluation.color }}>
              <span className="evaluation-label" style={{ color: evaluation.color }}>
                {evaluation.label}
              </span>
            </div>
          </div>

          <div className="result-grid">
            <div className="result-item">
              <span className="result-label">終了理由</span>
              <span className="result-value">{getEndReason()}</span>
            </div>

            <div className="result-item">
              <span className="result-label">連載期間</span>
              <span className="result-value">{serializationState.currentWeek}週</span>
            </div>

            <div className="result-item">
              <span className="result-label">平均人気</span>
              <span className="result-value">{Math.round(avgPopularity)}</span>
            </div>

            <div className="result-item">
              <span className="result-label">平均順位</span>
              <span className="result-value">{Math.round(avgRanking)}</span>
            </div>

            <div className="result-item">
              <span className="result-label">最高人気</span>
              <span className="result-value">{Math.round(Math.max(...playerManga.popularityHistory, playerManga.currentPopularity))}</span>
            </div>

            <div className="result-item">
              <span className="result-label">最終人気</span>
              <span className="result-value">{Math.round(playerManga.currentPopularity)}</span>
            </div>

            <div className="result-item">
              <span className="result-label">最高順位</span>
              <span className="result-value">{Math.min(...playerManga.rankingHistory, playerManga.currentRanking)}</span>
            </div>

            <div className="result-item">
              <span className="result-label">単行本売上</span>
              <span className="result-value">{playerManga.totalSales.toLocaleString()}</span>
            </div>
          </div>

          {playerManga.eventHistory.length > 0 && (
            <div className="events-summary">
              <h3>イベント履歴</h3>
              <div className="events-list">
                {playerManga.eventHistory.slice(-5).map((entry, index) => (
                  <div key={index} className="event-item">
                    <span className="event-week">第{entry.week}週</span>
                    <span className="event-name">{entry.event.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="result-actions">
          <button className="btn-back" onClick={onBackToTitle}>
            タイトル画面に戻る
          </button>
        </div>
      </div>
    </div>
  );
}
