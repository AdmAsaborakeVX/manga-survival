import { useEffect } from 'react';
import { scrollToTop } from '@/utils/scrollToTop';
import {
  calculateAveragePrintRunPerVolume,
  calculateAverageSalesPerVolume,
} from '@/game/sales';
import {
  calculateAveragePlacement,
  calculatePlacementAveragesByPeriod,
  FINAL_EVALUATION_CONFIG,
  evaluateFinalRating,
  evaluatePopularity,
  evaluateSerializationDuration,
} from '@/game/evaluation';
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
  const placementHistory = playerManga.placementHistory ?? [];
  const printRunHistory = playerManga.printRunHistory;
  const hasCompletePlacementHistory =
    serializationState.currentWeek > 0 &&
    placementHistory.length === serializationState.currentWeek;
  const cumulativePrintRun =
    printRunHistory &&
    printRunHistory.length === playerManga.salesHistory.length &&
    printRunHistory.every((copies) => copies !== null)
      ? playerManga.totalPrintRun ??
        printRunHistory.reduce<number>((total, copies) => total + (copies ?? 0), 0)
      : null;
  const averagePlacement =
    hasCompletePlacementHistory
      ? calculateAveragePlacement(placementHistory)
      : null;
  const placementPeriods = hasCompletePlacementHistory
    ? calculatePlacementAveragesByPeriod(placementHistory)
    : [];
  const averageVolumeSales = calculateAverageSalesPerVolume(playerManga);
  const averageVolumePrintRun = calculateAveragePrintRunPerVolume(playerManga);
  const popularityEvaluation =
    averagePlacement === null ? null : evaluatePopularity(averageVolumeSales, averagePlacement);
  const finalRating = evaluateFinalRating(
    popularityEvaluation,
    serializationState.currentWeek,
    serializationState.endReason
  );
  const shortCancelledSeries =
    serializationState.endReason === 'cancelled' &&
    serializationState.currentWeek < FINAL_EVALUATION_CONFIG.SHORT_CANCELLED_FINAL_RATING_WEEKS;
  const averageVolumeSalesInTenThousands = (averageVolumeSales / 10000).toLocaleString('ja-JP', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  // 終了理由を判定
  const getEndReason = (): string => {
    switch (serializationState.endReason) {
      case 'cancelled':
        return '打ち切り';
      case 'completed':
        return '円満完結';
      case 'limit_reached':
        return '安全上限到達（完結ではありません）';
      default:
        return '連載終了';
    }
  };

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
            <div className="evaluation-card">
              <span className="evaluation-card-title">売上・掲載順評価</span>
              <strong className="evaluation-card-value">
                {popularityEvaluation ?? '掲載順データ不足'}
              </strong>
              <div className="evaluation-card-details">
                <span>平均単巻売上</span>
                <strong>{averageVolumeSalesInTenThousands}万部</strong>
                <span>平均掲載順位</span>
                <strong>{averagePlacement === null ? '—' : `${averagePlacement.toFixed(1)}位`}</strong>
              </div>
              {averagePlacement === null && (
                <small className="evaluation-note">
                  このセーブには全週分の掲載順位履歴がありません。
                </small>
              )}
            </div>
            <div className="evaluation-card">
              <span className="evaluation-card-title">連載期間評価</span>
              <strong className="evaluation-card-value">
                {evaluateSerializationDuration(serializationState.currentWeek)}
              </strong>
              <span className="evaluation-card-detail">
                {serializationState.currentWeek}週
              </span>
            </div>
            <div className="evaluation-card">
              <span className="evaluation-card-title">最終評価</span>
              <strong className="evaluation-card-value">{finalRating ?? '評価データ不足'}</strong>
              {shortCancelledSeries && (
                <small className="evaluation-note">20週未満の打ち切りのため下層評価</small>
              )}
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
              <span className="result-label">平均アンケート順位</span>
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
              <span className="result-label">累計単行本売上</span>
              <span className="result-value">{playerManga.totalSales.toLocaleString()}</span>
            </div>

            <div className="result-item">
              <span className="result-label">累計発行部数</span>
              <span className="result-value">
                {cumulativePrintRun === null ? '旧巻の履歴なし' : cumulativePrintRun.toLocaleString()}
              </span>
            </div>

            <div className="result-item">
              <span className="result-label">1巻当たり平均発行部数</span>
              <span className="result-value">
                {averageVolumePrintRun === null
                  ? 'データなし'
                  : `${Math.round(averageVolumePrintRun).toLocaleString()}部`}
              </span>
              {averageVolumePrintRun !== null && printRunHistory?.some((copies) => copies === null) && (
                <small className="result-item-note">発行部数が記録された巻のみの平均</small>
              )}
            </div>
          </div>

          <section className="placement-analysis">
            <h3>掲載順位推移</h3>
            {hasCompletePlacementHistory ? (
              <>
                <PlacementTrendChart
                  placementHistory={placementHistory}
                  maxRank={serializationState.rivalMangas.length + 1}
                />
                <div className="placement-table-wrap">
                  <table className="placement-average-table">
                    <thead>
                      <tr>
                        <th>週</th>
                        <th>平均掲載順位</th>
                      </tr>
                    </thead>
                    <tbody>
                      {placementPeriods.map((period) => (
                        <tr key={period.startWeek}>
                          <td>
                            {period.startWeek}～{period.endWeek}週目
                            {period.endWeek - period.startWeek < 9 &&
                              `（${period.endWeek - period.startWeek + 1}週）`}
                          </td>
                          <td>{period.averagePlacement.toFixed(1)}位</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="placement-analysis-note">
                このセーブには全週分の掲載順位履歴がありません。
              </p>
            )}
          </section>

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

function PlacementTrendChart({
  placementHistory,
  maxRank,
}: {
  placementHistory: number[];
  maxRank: number;
}) {
  const width = 640;
  const height = 250;
  const padding = { top: 20, right: 24, bottom: 38, left: 48 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const rankLimit = Math.max(1, maxRank);
  const x = (index: number) =>
    padding.left + (index / Math.max(1, placementHistory.length - 1)) * chartWidth;
  const y = (rank: number) =>
    padding.top +
    ((Math.min(rankLimit, Math.max(1, rank)) - 1) / Math.max(1, rankLimit - 1)) *
      chartHeight;
  const yTicks = [...new Set([1, Math.ceil(rankLimit / 2), rankLimit])];

  return (
    <div className="placement-chart-scroll">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="週ごとの掲載順位推移。グラフ上部ほど上位です。"
      >
        {yTicks.map((rank) => (
          <g key={rank}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={y(rank)}
              y2={y(rank)}
              className="placement-grid-line"
            />
            <text
              x={padding.left - 8}
              y={y(rank) + 4}
              textAnchor="end"
              className="placement-axis-label"
            >
              {rank}位
            </text>
          </g>
        ))}
        <polyline
          fill="none"
          stroke="#667eea"
          strokeWidth="2.5"
          points={placementHistory.map((rank, index) => `${x(index)},${y(rank)}`).join(' ')}
        />
        <text x={padding.left} y={height - 10} className="placement-axis-label">
          1週
        </text>
        <text
          x={width - padding.right}
          y={height - 10}
          textAnchor="end"
          className="placement-axis-label"
        >
          {placementHistory.length}週
        </text>
      </svg>
    </div>
  );
}
