import { useState } from 'react';
import { generateMangakaAbility, generateEditorAbility } from '@/game/ability';
import { SeededRandom, generateRandomSeed } from '@/utils/seededRandom';
import './AbilityDistributionTestScreen.css';

interface DistributionStats {
  mean: number;
  min: number;
  max: number;
  median: number;
  count50: number;
  count60: number;
  count70: number;
  count80: number;
  count90: number;
  count100: number;
  percent50: number;
  percent60: number;
  percent70: number;
  percent80: number;
  percent90: number;
  percent100: number;
}

interface TotalDistributionStats extends DistributionStats {
  rangeStats: Array<{
    range: string;
    min: number;
    max: number;
    count: number;
    percent: number;
  }>;
}

interface HistogramData {
  [key: number]: number;
}

export default function AbilityDistributionTestScreen() {
  const [trialCount, setTrialCount] = useState<100 | 1000 | 10000>(1000);
  const [mangakaStats, setMangakaStats] = useState<DistributionStats | null>(null);
  const [editorStats, setEditorStats] = useState<DistributionStats | null>(null);
  const [totalStats, setTotalStats] = useState<TotalDistributionStats | null>(null);
  const [mangakaHistogram, setMangakaHistogram] = useState<HistogramData>({});
  const [editorHistogram, setEditorHistogram] = useState<HistogramData>({});
  const [totalHistogram, setTotalHistogram] = useState<HistogramData>({});
  const [isRunning, setIsRunning] = useState(false);

  const calculateStats = (values: number[]): DistributionStats => {
    const sorted = [...values].sort((a, b) => a - b);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const count50 = values.filter((v) => v >= 50).length;
    const count60 = values.filter((v) => v >= 60).length;
    const count70 = values.filter((v) => v >= 70).length;
    const count80 = values.filter((v) => v >= 80).length;
    const count90 = values.filter((v) => v >= 90).length;
    const count100 = values.filter((v) => v === 100).length;

    return {
      mean: Math.round(mean * 100) / 100,
      min,
      max,
      median,
      count50,
      count60,
      count70,
      count80,
      count90,
      count100,
      percent50: Math.round((count50 / values.length) * 10000) / 100,
      percent60: Math.round((count60 / values.length) * 10000) / 100,
      percent70: Math.round((count70 / values.length) * 10000) / 100,
      percent80: Math.round((count80 / values.length) * 10000) / 100,
      percent90: Math.round((count90 / values.length) * 10000) / 100,
      percent100: Math.round((count100 / values.length) * 10000) / 100,
    };
  };

  const calculateTotalStats = (values: number[]): TotalDistributionStats => {
    const baseStats = calculateStats(values);
    
    const rangeStats = [];
    for (let start = 100; start < 200; start += 10) {
      const end = start + 10;
      const count = values.filter((v) => v >= start && v < end).length;
      const percent = Math.round((count / values.length) * 10000) / 100;
      rangeStats.push({
        range: `${start}～${end - 1}`,
        min: start,
        max: end - 1,
        count,
        percent,
      });
    }
    // 200ちょうどの場合
    const count200 = values.filter((v) => v === 200).length;
    const percent200 = Math.round((count200 / values.length) * 10000) / 100;
    rangeStats.push({
      range: '200',
      min: 200,
      max: 200,
      count: count200,
      percent: percent200,
    });

    return {
      ...baseStats,
      rangeStats,
    };
  };

  const buildHistogram = (values: number[]): HistogramData => {
    const histogram: HistogramData = {};
    for (const value of values) {
      histogram[value] = (histogram[value] || 0) + 1;
    }
    return histogram;
  };

  const runTest = () => {
    setIsRunning(true);

    setTimeout(() => {
      const mangakaValues: number[] = [];
      const editorValues: number[] = [];
      const totalValues: number[] = [];

      const seed = generateRandomSeed();
      const rng = new SeededRandom(seed);

      for (let i = 0; i < trialCount; i++) {
        const mangaka = generateMangakaAbility(rng);
        const editor = generateEditorAbility(rng);
        const total = mangaka + editor;

        mangakaValues.push(mangaka);
        editorValues.push(editor);
        totalValues.push(total);
      }

      setMangakaStats(calculateStats(mangakaValues));
      setEditorStats(calculateStats(editorValues));
      setTotalStats(calculateTotalStats(totalValues));
      setMangakaHistogram(buildHistogram(mangakaValues));
      setEditorHistogram(buildHistogram(editorValues));
      setTotalHistogram(buildHistogram(totalValues));
      setIsRunning(false);
    }, 0);
  };

  const HistogramChart = ({
    histogram,
    title,
    maxValue,
  }: {
    histogram: HistogramData;
    title: string;
    maxValue: number;
  }) => {
    const maxCount = Math.max(...Object.values(histogram), 1);
    const values = Object.keys(histogram)
      .map(Number)
      .sort((a, b) => a - b);

    return (
      <div className="histogram-container">
        <h4>{title}</h4>
        <div className="histogram">
          {values.map((value) => (
            <div key={value} className="histogram-bar-wrapper">
              <div
                className="histogram-bar"
                style={{
                  height: `${(histogram[value] / maxCount) * 200}px`,
                }}
              />
              <div className="histogram-label">{value}</div>
              <div className="histogram-count">{histogram[value]}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const StatsDisplay = ({
    stats,
    title,
  }: {
    stats: DistributionStats | null;
    title: string;
  }) => {
    if (!stats) return null;

    return (
      <div className="stats-card">
        <h3>{title}</h3>
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">平均</span>
            <span className="stat-value">{stats.mean}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">中央値</span>
            <span className="stat-value">{stats.median}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">最小</span>
            <span className="stat-value">{stats.min}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">最大</span>
            <span className="stat-value">{stats.max}</span>
          </div>
        </div>
        <div className="stats-distribution">
          <div className="dist-item">
            <span>50以上</span>
            <span className="dist-value">
              {stats.count50} / {trialCount} ({stats.percent50}%)
            </span>
          </div>
          <div className="dist-item">
            <span>60以上</span>
            <span className="dist-value">
              {stats.count60} / {trialCount} ({stats.percent60}%)
            </span>
          </div>
          <div className="dist-item">
            <span>70以上</span>
            <span className="dist-value">
              {stats.count70} / {trialCount} ({stats.percent70}%)
            </span>
          </div>
          <div className="dist-item">
            <span>80以上</span>
            <span className="dist-value">
              {stats.count80} / {trialCount} ({stats.percent80}%)
            </span>
          </div>
          <div className="dist-item">
            <span>90以上</span>
            <span className="dist-value">
              {stats.count90} / {trialCount} ({stats.percent90}%)
            </span>
          </div>
          <div className="dist-item">
            <span>100</span>
            <span className="dist-value">
              {stats.count100} / {trialCount} ({stats.percent100}%)
            </span>
          </div>
        </div>
      </div>
    );
  };

  const TotalStatsDisplay = ({
    stats,
  }: {
    stats: TotalDistributionStats | null;
  }) => {
    if (!stats) return null;

    return (
      <div className="stats-card total-stats-card">
        <h3>総合能力</h3>
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">平均</span>
            <span className="stat-value">{stats.mean}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">中央値</span>
            <span className="stat-value">{stats.median}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">最小</span>
            <span className="stat-value">{stats.min}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">最大</span>
            <span className="stat-value">{stats.max}</span>
          </div>
        </div>
        <div className="stats-distribution">
          {stats.rangeStats.map((range) => (
            <div key={range.range} className="dist-item">
              <span>{range.range}</span>
              <span className="dist-value">
                {range.count} / {trialCount} ({range.percent}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="ability-test-screen">
      <div className="test-container">
        <h1>🧪 能力抽選テスト画面 (開発者向け)</h1>

        <div className="control-panel">
          <div className="trial-selector">
            <label htmlFor="trial-count">抽選回数:</label>
            <select
              id="trial-count"
              value={trialCount}
              onChange={(e) => setTrialCount(Number(e.target.value) as 100 | 1000 | 10000)}
              disabled={isRunning}
            >
              <option value={100}>100回</option>
              <option value={1000}>1,000回</option>
              <option value={10000}>10,000回</option>
            </select>
          </div>

          <button
            className="test-button"
            onClick={runTest}
            disabled={isRunning}
          >
            {isRunning ? '実行中...' : 'テスト実行'}
          </button>
        </div>

        {mangakaStats && editorStats && totalStats && (
          <div className="test-results">
            <div className="stats-section">
              <StatsDisplay stats={mangakaStats} title="漫画家能力" />
              <StatsDisplay stats={editorStats} title="担当編集能力" />
              <TotalStatsDisplay stats={totalStats} />
            </div>

            <div className="histogram-section">
              <HistogramChart
                histogram={mangakaHistogram}
                title="漫画家能力 分布"
                maxValue={100}
              />
              <HistogramChart
                histogram={editorHistogram}
                title="担当編集能力 分布"
                maxValue={100}
              />
              <HistogramChart
                histogram={totalHistogram}
                title="総合能力 分布"
                maxValue={200}
              />
            </div>
          </div>
        )}

        {!mangakaStats && (
          <div className="placeholder">
            <p>「テスト実行」ボタンをクリックして、能力値の分布を確認します</p>
          </div>
        )}
      </div>
    </div>
  );
}
