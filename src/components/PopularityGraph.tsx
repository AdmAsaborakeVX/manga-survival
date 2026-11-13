import './PopularityGraph.css';
import type { SerializingManga } from '@/types';

interface PopularityGraphProps {
  manga: SerializingManga;
  height?: number;
}

export default function PopularityGraph({ manga, height = 300 }: PopularityGraphProps) {
  const history = manga.popularityHistory;
  
  if (history.length === 0) {
    return (
      <div className="popularity-graph-container">
        <h3>人気推移</h3>
        <div className="graph-empty">データがまだありません</div>
      </div>
    );
  }

  // グラフのパラメータ
  const padding = 40;
  const graphHeight = height - padding * 2;
  const graphWidth = Math.max(500, Math.min(900, history.length * 40));
  const minPopularity = 0;
  const maxPopularity = 100;
  const popularityRange = maxPopularity - minPopularity;

  // ポイントを計算
  const points = history.map((popularity, week) => {
    const x = padding + (week / Math.max(1, history.length - 1)) * (graphWidth - padding * 2);
    const y = padding + graphHeight - ((popularity - minPopularity) / popularityRange) * graphHeight;
    return { x, y, week, popularity };
  });

  // パスを作成
  const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // 最大値、最小値、現在値のインデックス
  const maxIndex = history.reduce((max, current, i) => (current > history[max] ? i : max), 0);
  const minIndex = history.reduce((min, current, i) => (current < history[min] ? i : min), 0);

  return (
    <div className="popularity-graph-container">
      <h3>人気推移</h3>
      <div className="graph-wrapper">
        <svg
          width={graphWidth}
          height={height}
          className="popularity-graph"
          viewBox={`0 0 ${graphWidth} ${height}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* グリッドライン */}
          {[0, 25, 50, 75, 100].map((value) => {
            const y = padding + graphHeight - ((value - minPopularity) / popularityRange) * graphHeight;
            return (
              <g key={`grid-${value}`}>
                <line x1={padding} y1={y} x2={graphWidth - padding} y2={y} className="grid-line" />
                <text x={padding - 30} y={y + 4} className="grid-label">
                  {value}
                </text>
              </g>
            );
          })}

          {/* X軸ラベル */}
          {points.length > 1 &&
            points
              .filter((_, i) => history.length <= 10 || i % Math.ceil(history.length / 10) === 0)
              .map((p) => (
                <text
                  key={`label-${p.week}`}
                  x={p.x}
                  y={height - 10}
                  className="x-label"
                  textAnchor="middle"
                >
                  {p.week}
                </text>
              ))}

          {/* 塗りつぶし領域 */}
          <path
            d={`${pathData} L ${points[points.length - 1].x} ${padding + graphHeight} L ${padding} ${padding + graphHeight} Z`}
            className="graph-fill"
          />

          {/* 線 */}
          <path d={pathData} className="graph-line" />

          {/* データポイント */}
          {points.map((p, i) => (
            <circle
              key={`point-${i}`}
              cx={p.x}
              cy={p.y}
              r="4"
              className={`data-point ${i === maxIndex ? 'max' : i === minIndex ? 'min' : ''}`}
            />
          ))}

          {/* 最大値と最小値のラベル */}
          {points[maxIndex] && (
            <text x={points[maxIndex].x} y={points[maxIndex].y - 15} className="value-label max-label">
              MAX: {Math.round(points[maxIndex].popularity)}
            </text>
          )}
          {points[minIndex] && (
            <text x={points[minIndex].x} y={points[minIndex].y + 20} className="value-label min-label">
              MIN: {Math.round(points[minIndex].popularity)}
            </text>
          )}
        </svg>
      </div>

      <div className="graph-stats">
        <div className="stat">
          <span className="stat-label">平均人気:</span>
          <span className="stat-value">
            {Math.round(history.reduce((a, b) => a + b, 0) / history.length)}
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">最高人気:</span>
          <span className="stat-value">{Math.round(Math.max(...history))}</span>
        </div>
        <div className="stat">
          <span className="stat-label">最低人気:</span>
          <span className="stat-value">{Math.round(Math.min(...history))}</span>
        </div>
        <div className="stat">
          <span className="stat-label">現在:</span>
          <span className="stat-value">{Math.round(manga.currentPopularity)}</span>
        </div>
      </div>
    </div>
  );
}
