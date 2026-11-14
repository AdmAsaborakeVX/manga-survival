import './PlacementGraph.css';
import type { SerializingManga } from '@/types';

interface PlacementGraphProps {
  manga: SerializingManga;
  totalSerializations: number;
  height?: number;
}

export default function PlacementGraph({
  manga,
  totalSerializations,
  height = 300,
}: PlacementGraphProps) {
  const history = manga.placementHistory ?? [];

  if (history.length === 0) {
    return (
      <div className="placement-graph-container">
        <h3>掲載順推移</h3>
        <div className="graph-empty">データがまだありません</div>
      </div>
    );
  }

  const padding = 40;
  const graphHeight = height - padding * 2;
  const graphWidth = Math.max(500, Math.min(900, history.length * 40));
  const maxRank = Math.max(1, totalSerializations, ...history);
  const rankRange = Math.max(1, maxRank - 1);
  const tickCount = Math.min(5, maxRank);
  const rankTicks = tickCount === 1
    ? [1]
    : Array.from({ length: tickCount }, (_, index) =>
        Math.round(1 + (index * (maxRank - 1)) / (tickCount - 1))
      );

  const points = history.map((rank, index) => {
    const x = padding + (index / Math.max(1, history.length - 1)) * (graphWidth - padding * 2);
    const y = padding + ((rank - 1) / rankRange) * graphHeight;
    return { x, y, week: index + 1, rank };
  });
  const pathData = points.map((point, index) =>
    `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
  ).join(' ');

  return (
    <div className="placement-graph-container">
      <h3>掲載順推移</h3>
      <div className="graph-wrapper">
        <svg
          width={graphWidth}
          height={height}
          className="placement-graph"
          viewBox={`0 0 ${graphWidth} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="週ごとの掲載順位推移"
        >
          {rankTicks.map((rank) => {
            const y = padding + ((rank - 1) / rankRange) * graphHeight;
            return (
              <g key={`rank-${rank}`}>
                <line
                  x1={padding}
                  y1={y}
                  x2={graphWidth - padding}
                  y2={y}
                  className="grid-line"
                />
                <text x={padding - 10} y={y + 4} className="grid-label">
                  {rank}
                </text>
              </g>
            );
          })}

          {points.length > 1 &&
            points
              .filter((_, index) =>
                history.length <= 10 || index % Math.ceil(history.length / 10) === 0
              )
              .map((point) => (
                <text
                  key={`week-${point.week}`}
                  x={point.x}
                  y={height - 10}
                  className="x-label"
                  textAnchor="middle"
                >
                  {point.week}
                </text>
              ))}

          <path d={pathData} className="graph-line" />
          {points.map((point) => (
            <circle
              key={`point-${point.week}`}
              cx={point.x}
              cy={point.y}
              r="4"
              className="data-point"
            />
          ))}
        </svg>
      </div>
      <div className="placement-graph-axis-labels">
        <span>掲載順位（1位が上位）</span>
        <span>週</span>
      </div>
    </div>
  );
}
