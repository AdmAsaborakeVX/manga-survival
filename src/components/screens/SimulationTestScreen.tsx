import { useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { GAME_CONFIG, MANGA_CONFIG_OPTIONS, RIVAL_CONFIG } from '@/game/config';
import {
  createComparisonProfiles,
  createBalancedAbilitySettings,
  createDefaultSimulationSettings,
  runSimulationTrial,
  summarizeSimulationTrials,
  validateSimulationSettings,
} from '@/game/simulationTest';
import type {
  AbilityKey,
  ConfigurableValue,
  SimulationSummary,
  SimulationTestSettings,
  SimulationTrial,
} from '@/game/simulationTest';
import './SimulationTestScreen.css';

const ABILITY_FIELDS: Array<{ key: AbilityKey; label: string }> = [
  { key: 'story', label: 'ストーリー' },
  { key: 'character', label: 'キャラクター' },
  { key: 'artwork', label: '画力・演出' },
  { key: 'originality', label: '独自性・テーマ' },
  { key: 'composition', label: '構成・テンポ' },
];

const REASON_LABELS: Record<string, string> = {
  cancelled: '打ち切り',
  completed: '円満完結',
  limit_reached: '安全上限到達',
  other: 'その他',
};

function formatNumber(value: number, digits = 1): string {
  return value.toLocaleString('ja-JP', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function getBalancedTotal(settings: SimulationTestSettings): string {
  const { mangakaAbility, editorAbility } = settings;
  if (
    mangakaAbility.mode !== 'fixed' ||
    editorAbility.mode !== 'fixed'
  ) {
    return '';
  }

  for (const total of [100, 130, 160]) {
    const preset = createBalancedAbilitySettings(total);
    if (
      mangakaAbility.value === preset.mangakaAbility.value &&
      editorAbility.value === preset.editorAbility.value &&
      ABILITY_FIELDS.every(({ key }) => {
        const setting = settings.abilities[key];
        return setting.mode === 'fixed' && setting.value === preset.abilities[key].value;
      })
    ) {
      return String(total);
    }
  }
  return '';
}

function ValueControl({
  label,
  value,
  min,
  max,
  onChange,
  disabled,
}: {
  label: string;
  value: ConfigurableValue;
  min: number;
  max: number;
  onChange: (value: ConfigurableValue) => void;
  disabled: boolean;
}) {
  return (
    <div className="sim-value-control">
      <span className="sim-value-label">{label}</span>
      <div className="sim-value-options">
        <label>
          <input
            type="radio"
            name={`mode-${label}`}
            checked={value.mode === 'random'}
            onChange={() => onChange({ mode: 'random' })}
            disabled={disabled}
          />
          ランダム
        </label>
        <label>
          <input
            type="radio"
            name={`mode-${label}`}
            checked={value.mode === 'fixed'}
            onChange={() => onChange({
              mode: 'fixed',
              value: value.mode === 'fixed' ? value.value : min,
            })}
            disabled={disabled}
          />
          固定
        </label>
        {value.mode === 'fixed' && (
          <input
            aria-label={`${label}固定値`}
            type="number"
            min={min}
            max={max}
            step="1"
            value={value.value}
            onChange={(event) => onChange({
              mode: 'fixed',
              value: Number(event.target.value),
            })}
            disabled={disabled}
          />
        )}
      </div>
    </div>
  );
}

function Histogram({
  title,
  items,
  formatLabel,
}: {
  title: string;
  items: Array<{ label: string; count: number }>;
  formatLabel?: (label: string) => string;
}) {
  const maxCount = Math.max(1, ...items.map((item) => item.count));
  return (
    <section className="sim-chart-card">
      <h3>{title}</h3>
      <div className="sim-histogram" role="img" aria-label={title}>
        {items.map((item) => (
          <div className="sim-histogram-column" key={item.label} title={`${item.label}: ${item.count}件`}>
            <span className="sim-histogram-count">{item.count || ''}</span>
            <div
              className="sim-histogram-bar"
              style={{ height: `${Math.max(1, (item.count / maxCount) * 145)}px` }}
            />
            <span className="sim-histogram-label">{formatLabel ? formatLabel(item.label) : item.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function LineChart({
  title,
  series,
  reverse = false,
  percent = false,
}: {
  title: string;
  series: Array<{ name: string; values: number[]; color: string }>;
  reverse?: boolean;
  percent?: boolean;
}) {
  const width = 720;
  const height = 270;
  const padding = { top: 20, right: 24, bottom: 42, left: 52 };
  const allValues = series.flatMap((item) => item.values);
  const min = reverse && allValues.length > 0 ? Math.min(...allValues) : 0;
  const max = Math.max(1, ...allValues);
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxPoints = Math.max(1, ...series.map((item) => item.values.length));
  const x = (index: number) => padding.left + (index / Math.max(1, maxPoints - 1)) * chartWidth;
  const y = (value: number) => {
    const ratio = (value - min) / (max - min || 1);
    return padding.top + (reverse ? ratio : 1 - ratio) * chartHeight;
  };
  const yTicks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <section className="sim-chart-card">
      <h3>{title}</h3>
      <div className="sim-line-chart-scroll">
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
          {yTicks.map((tick) => {
            const value = min + tick * (max - min);
            return (
              <g key={tick}>
                <line
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={y(value)}
                  y2={y(value)}
                  className="sim-grid-line"
                />
                <text x={padding.left - 8} y={y(value) + 4} textAnchor="end" className="sim-axis-label">
                  {percent ? `${Math.round(value * 100)}%` : formatNumber(value, 0)}
                </text>
              </g>
            );
          })}
          {series.map((item) => (
            <polyline
              key={item.name}
              fill="none"
              stroke={item.color}
              strokeWidth="2.5"
              points={item.values.map((value, index) => `${x(index)},${y(value)}`).join(' ')}
            />
          ))}
          <text x={padding.left} y={height - 12} className="sim-axis-label">1週</text>
          <text x={width - padding.right} y={height - 12} textAnchor="end" className="sim-axis-label">
            {maxPoints}週
          </text>
        </svg>
      </div>
      <div className="sim-chart-legend">
        {series.map((item) => (
          <span key={item.name}><i style={{ backgroundColor: item.color }} />{item.name}</span>
        ))}
      </div>
    </section>
  );
}

function SummaryResults({ summary }: { summary: SimulationSummary }) {
  const durationItems = summary.durationDistribution.map((item) => ({
    label: `${item.start}-${item.end}`,
    count: item.count,
  }));
  const popularitySeries = summary.weekly.map((item) => item.averagePopularity);
  const medianPopularitySeries = summary.weekly.map((item) => item.medianPopularity);
  const placementSeries = summary.weekly.map((item) => item.medianPlacement);
  const riskSeries = summary.weekly.map((item) => item.averageCancellationRisk);

  return (
    <div className="sim-results">
      <section className="sim-section">
        <h2>連載期間</h2>
        <div className="sim-stat-grid">
          <Stat label="平均" value={`${formatNumber(summary.averageWeeks)}週`} />
          <Stat label="中央値" value={`${formatNumber(summary.medianWeeks)}週`} />
          <Stat label="最短 / 最長" value={`${summary.minWeeks} / ${summary.maxWeeks}週`} />
          <Stat label="標準偏差" value={`${formatNumber(summary.standardDeviationWeeks)}週`} />
          {[8, 20, 40, 60, 80, 100].map((threshold) => (
            <Stat
              key={threshold}
              label={threshold === 8 ? '8週以内に終了' : `${threshold}週以上継続`}
              value={`${formatNumber(summary.durationRates[threshold as 8 | 20 | 40 | 60 | 80 | 100])}%`}
            />
          ))}
          <Stat label="10〜20週に打ち切り" value={`${formatNumber(summary.durationRates.cancelled10To20)}%`} />
        </div>
      </section>

      <section className="sim-section">
        <h2>実際に使用した能力 (平均)</h2>
        <div className="sim-stat-grid">
          <Stat label="漫画家 / 編集者 / 総合" value={`${formatNumber(summary.averageMangakaAbility)} / ${formatNumber(summary.averageEditorAbility)} / ${formatNumber(summary.averageTotalAbility)}`} />
          <Stat
            label="作品能力 (ストーリー / キャラクター / 画力 / 独自性 / 構成)"
            value={Object.values(summary.averageAbilities).map((value) => formatNumber(value)).join(' / ')}
          />
        </div>
      </section>

      <section className="sim-section">
        <h2>終了理由</h2>
        <div className="sim-reason-list">
          {['cancelled', 'completed', 'limit_reached', 'other'].map((reason) => {
            const item = summary.endReasons.find((entry) => entry.reason === reason);
            const count = item?.count ?? 0;
            const percent = item?.percent ?? 0;
            return (
              <div className="sim-reason-row" key={reason}>
                <span>{REASON_LABELS[reason]}</span>
                <div className="sim-reason-track"><i style={{ width: `${percent}%` }} /></div>
                <strong>{count}件 ({formatNumber(percent)}%)</strong>
                <small>平均 {formatNumber(item?.averageWeeks ?? 0)}週</small>
              </div>
            );
          })}
        </div>
      </section>

      <section className="sim-section">
        <h2>人気・順位・売上</h2>
        <div className="sim-stat-grid">
          <Stat label="最大人気 平均 / 中央値 / 全体最高" value={`${formatNumber(summary.averagePeakPopularity)} / ${formatNumber(summary.medianPeakPopularity)} / ${formatNumber(summary.maxPeakPopularity)}`} />
          <Stat label="最終人気 平均 / 中央値" value={`${formatNumber(summary.averageFinalPopularity)} / ${formatNumber(summary.medianFinalPopularity)}`} />
          <Stat label="平均アンケート順位" value={`${formatNumber(summary.averageRanking)}位`} />
          <Stat label="最高アンケート順位 (最良)" value={`${formatNumber(summary.bestRanking)}位`} />
          <Stat label="最終アンケート順位" value={`${formatNumber(summary.finalRanking)}位`} />
          <Stat label="平均掲載順位" value={`${formatNumber(summary.averagePlacement)}位`} />
          <Stat label="最終掲載順位" value={`${formatNumber(summary.finalPlacement)}位`} />
          <Stat label="累計売上 平均 / 中央値" value={`${formatNumber(summary.averageSales / 1000000, 2)} / ${formatNumber(summary.medianSales / 1000000, 2)}百万円`} />
          <Stat label="最大累計売上" value={`${formatNumber(summary.maxSales / 1000000, 2)}百万円`} />
        </div>
      </section>

      <div className="sim-chart-grid">
        <Histogram title="連載期間の分布 (週)" items={durationItems} />
        <Histogram
          title="累計売上の分布"
          items={summary.salesDistribution.map((item) => ({ label: item.range, count: item.count }))}
          formatLabel={(label) => label.replace('百万', 'M')}
        />
        <LineChart
          title="人気の推移 (終了作品を含む週別平均)"
          series={[
            { name: '平均人気', values: popularitySeries, color: '#4263eb' },
            { name: '中央値', values: medianPopularitySeries, color: '#f08c00' },
          ]}
        />
        <LineChart
          title="掲載順位の推移 (中央値・上位ほど上)"
          reverse
          series={[{ name: '中央値', values: placementSeries, color: '#7048e8' }]}
        />
        <LineChart
          title="打ち切り危険度の推移 (平均)"
          percent
          series={[{ name: '平均危険度', values: riskSeries, color: '#e03131' }]}
        />
      </div>
      <p className="sim-note">週別推移は各週まで連載が継続した作品を対象に集計しています。</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="sim-stat"><span>{label}</span><strong>{value}</strong></div>;
}

export default function SimulationTestScreen() {
  const [settings, setSettings] = useState(createDefaultSimulationSettings);
  const [trialInput, setTrialInput] = useState('1000');
  const [useGameSettings, setUseGameSettings] = useState(true);
  const [summary, setSummary] = useState<SimulationSummary | null>(null);
  const [comparison, setComparison] = useState<Array<{ label: string; summary: SimulationSummary }> | null>(null);
  const [progress, setProgress] = useState(0);
  const [totalProgress, setTotalProgress] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const profiles = useMemo(() => createComparisonProfiles(), []);
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>(['total-100', 'total-130', 'total-160']);
  const cancelRef = useRef(false);

  const trialCount = Number(trialInput);
  const settingsError = validateSimulationSettings(settings);
  const validTrialCount = Number.isInteger(trialCount) && trialCount >= 1 && trialCount <= 100000;

  const updateSetting = (key: 'mangakaAbility' | 'editorAbility', value: ConfigurableValue) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };
  const updateAbilitySetting = (key: AbilityKey, value: ConfigurableValue) => {
    setSettings((current) => ({
      ...current,
      abilities: { ...current.abilities, [key]: value },
    }));
  };
  const updateConfig = (event: ChangeEvent<HTMLSelectElement>, key: keyof SimulationTestSettings['configuration']) => {
    setSettings((current) => ({
      ...current,
      configuration: { ...current.configuration, [key]: event.target.value },
    }) as SimulationTestSettings);
  };

  const run = async (mode: 'single' | 'compare') => {
    if (settingsError) {
      setError(settingsError);
      return;
    }
    if (!validTrialCount) {
      setError('試行回数は1〜100,000の整数で指定してください。');
      return;
    }
    const selected = mode === 'compare'
      ? profiles.filter((profile) => selectedProfiles.includes(profile.id))
      : [];
    if (mode === 'compare' && selected.length < 2) {
      setError('比較には2つ以上の条件を選択してください。');
      return;
    }

    cancelRef.current = false;
    setIsRunning(true);
    setError(null);
    setSummary(null);
    setComparison(null);
    const runCount = mode === 'single' ? 1 : selected.length;
    const total = trialCount * runCount;
    setProgress(0);
    setTotalProgress(total);
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    try {
      const results: Array<{ label: string; summary: SimulationSummary }> = [];
      const scenarios = mode === 'single'
        ? [{ label: '', settings }]
        : selected.map((profile) => ({
            label: profile.label,
            settings: {
              ...settings,
              mangakaAbility: { mode: 'fixed' as const, value: profile.mangaka },
              editorAbility: { mode: 'fixed' as const, value: profile.editor },
              abilities: Object.fromEntries(
                ABILITY_FIELDS.map(({ key }) => [key, { mode: 'fixed', value: profile.abilities[key] }])
              ) as Record<AbilityKey, ConfigurableValue>,
            },
          }));

      let completed = 0;
      for (const scenario of scenarios) {
        const validationError = validateSimulationSettings(scenario.settings);
        if (validationError) throw new Error(validationError);
        const trials: SimulationTrial[] = [];
        for (let index = 0; index < trialCount; index++) {
          if (cancelRef.current) return;
          const trialSeed = (settings.seed + Math.imul(index, 0x9e3779b1)) >>> 0;
          trials.push(runSimulationTrial(scenario.settings, trialSeed));
          completed++;
          if (completed % 20 === 0 || completed === total) {
            setProgress(completed);
            await new Promise((resolve) => window.setTimeout(resolve, 0));
          }
        }
        results.push({ label: scenario.label, summary: summarizeSimulationTrials(trials) });
      }

      if (mode === 'single') setSummary(results[0].summary);
      else setComparison(results);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'シミュレーションに失敗しました。');
    } finally {
      setIsRunning(false);
    }
  };

  const stop = () => {
    cancelRef.current = true;
  };

  return (
    <main className="simulation-test-screen">
      <div className="simulation-test-container">
        <header className="sim-header">
          <div>
            <p className="sim-eyebrow">DEVELOPER TOOL</p>
            <h1>連載シミュレーション分析</h1>
            <p>通常プレイのセーブデータを変更せず、現在のゲームロジックで試行を行います。</p>
          </div>
          <a href="/">通常画面へ</a>
        </header>

        <section className="sim-settings-panel">
          <h2>実行条件</h2>
          <div className="sim-controls-grid">
            <label className="sim-field">
              <span>試行回数</span>
              <select value={trialInput} onChange={(event) => setTrialInput(event.target.value)} disabled={isRunning}>
                <option value="100">100回</option>
                <option value="1000">1,000回</option>
                <option value="10000">10,000回</option>
                <option value="custom">任意の数値</option>
              </select>
              {(trialInput === 'custom' || !['100', '1000', '10000'].includes(trialInput)) && (
                <input
                  type="number"
                  aria-label="任意の試行回数"
                  min="1"
                  max="100000"
                  value={trialInput === 'custom' ? '' : trialInput}
                  placeholder="1〜100,000"
                  onChange={(event) => setTrialInput(event.target.value)}
                  disabled={isRunning}
                />
              )}
            </label>
            <label className="sim-field">
              <span>シード値</span>
              <input
                type="number"
                min="0"
                max="2147483647"
                value={settings.seed}
                onChange={(event) => setSettings((current) => ({ ...current, seed: Number(event.target.value) }))}
                disabled={isRunning}
              />
            </label>
            <label className="sim-field sim-checkbox-field">
              <input
                type="checkbox"
                checked={useGameSettings}
                onChange={(event) => {
                  setUseGameSettings(event.target.checked);
                  if (event.target.checked) {
                    setSettings((current) => ({
                      ...current,
                      maxWeeks: GAME_CONFIG.maxSerializationWeeks,
                      rivalCount: RIVAL_CONFIG.COUNT,
                    }));
                  }
                }}
                disabled={isRunning}
              />
              現在のゲーム設定を使用
            </label>
            <label className="sim-field">
              <span>ライバル作品数</span>
              <input
                type="number"
                min="0"
                max="20"
                value={settings.rivalCount}
                onChange={(event) => {
                  setUseGameSettings(false);
                  setSettings((current) => ({ ...current, rivalCount: Number(event.target.value) }));
                }}
                disabled={isRunning || useGameSettings}
              />
            </label>
            <label className="sim-field">
              <span>最大連載週数</span>
              <input
                type="number"
                min="1"
                max={GAME_CONFIG.maxSerializationWeeks}
                value={settings.maxWeeks}
                onChange={(event) => {
                  setUseGameSettings(false);
                  setSettings((current) => ({ ...current, maxWeeks: Number(event.target.value) }));
                }}
                disabled={isRunning || useGameSettings}
              />
            </label>
          </div>
          <p className="sim-inline-note">
            {useGameSettings
              ? `現在値: ライバル${RIVAL_CONFIG.COUNT}作品 / 最大${GAME_CONFIG.maxSerializationWeeks}週`
              : '独自条件は現在の設定値を初期値として、ライバル数と最大週数を変更します。'}
          </p>
        </section>

        <section className="sim-settings-panel">
          <h2>作品設定</h2>
          <div className="sim-controls-grid sim-manga-config">
            <label className="sim-field">
              <span>ジャンル</span>
              <select value={settings.configuration.genre} onChange={(event) => updateConfig(event, 'genre')} disabled={isRunning}>
                {MANGA_CONFIG_OPTIONS.genres.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </label>
            <label className="sim-field">
              <span>世界観</span>
              <select value={settings.configuration.worldview} onChange={(event) => updateConfig(event, 'worldview')} disabled={isRunning}>
                {MANGA_CONFIG_OPTIONS.worldviews.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </label>
            <label className="sim-field">
              <span>主人公</span>
              <select value={settings.configuration.protagonist} onChange={(event) => updateConfig(event, 'protagonist')} disabled={isRunning}>
                {MANGA_CONFIG_OPTIONS.protagonists.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </label>
            <label className="sim-field">
              <span>作品スタイル</span>
              <select value={settings.configuration.style} onChange={(event) => updateConfig(event, 'style')} disabled={isRunning}>
                {MANGA_CONFIG_OPTIONS.styles.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </label>
          </div>
        </section>

        <section className="sim-settings-panel">
          <h2>漫画家・編集者能力</h2>
          <label className="sim-field">
            <span>総合能力 (バランス型)</span>
            <select
              aria-label="バランス型の総合能力値"
              value={getBalancedTotal(settings)}
              onChange={(event) => setSettings((current) => ({
                ...current,
                ...createBalancedAbilitySettings(Number(event.target.value)),
              }))}
              disabled={isRunning}
            >
              <option value="" disabled>個別設定</option>
              <option value="100">100 (20 / 20 / 20 / 20 / 20)</option>
              <option value="130">130 (26 / 26 / 26 / 26 / 26)</option>
              <option value="160">160 (32 / 32 / 32 / 32 / 32)</option>
            </select>
            <small>選択すると漫画家・編集者能力と5項目を固定します。比較実行では下の比較プロファイルを使用します。</small>
          </label>
          <div className="sim-value-grid">
            <ValueControl
              label="漫画家能力"
              value={settings.mangakaAbility}
              min={50}
              max={100}
              onChange={(value) => updateSetting('mangakaAbility', value)}
              disabled={isRunning}
            />
            <ValueControl
              label="編集者能力"
              value={settings.editorAbility}
              min={50}
              max={100}
              onChange={(value) => updateSetting('editorAbility', value)}
              disabled={isRunning}
            />
          </div>
        </section>

        <section className="sim-settings-panel">
          <h2>作品能力 (合計は総合能力と一致)</h2>
          <div className="sim-value-grid">
            {ABILITY_FIELDS.map(({ key, label }) => (
              <ValueControl
                key={key}
                label={label}
                value={settings.abilities[key]}
                min={GAME_CONFIG.mangaAbilityMinPerAbility}
                max={GAME_CONFIG.mangaAbilityMaxPerAbility}
                onChange={(value) => updateAbilitySetting(key, value)}
                disabled={isRunning}
              />
            ))}
          </div>
          {settingsError && <p className="sim-validation-error">{settingsError}</p>}
        </section>

        <section className="sim-settings-panel">
          <div className="sim-section-heading">
            <div>
              <h2>能力別の比較条件</h2>
              <p>選択した複数条件を同じ試行シードで実行します。</p>
            </div>
            <button type="button" className="sim-secondary-button" onClick={() => setSelectedProfiles(profiles.map((profile) => profile.id))} disabled={isRunning}>
              全条件を選択
            </button>
          </div>
          <div className="sim-profile-list">
            {profiles.map((profile) => (
              <label key={profile.id}>
                <input
                  type="checkbox"
                  checked={selectedProfiles.includes(profile.id)}
                  onChange={(event) => setSelectedProfiles((current) => event.target.checked
                    ? [...current, profile.id]
                    : current.filter((id) => id !== profile.id))}
                  disabled={isRunning}
                />
                <span>{profile.label}</span>
                <small>{Object.values(profile.abilities).join(' / ')}</small>
              </label>
            ))}
          </div>
        </section>

        <div className="sim-run-controls">
          <button type="button" className="sim-run-button" onClick={() => void run('single')} disabled={isRunning || !validTrialCount || Boolean(settingsError)}>
            この設定で実行
          </button>
          <button type="button" className="sim-compare-button" onClick={() => void run('compare')} disabled={isRunning || !validTrialCount}>
            選択条件を比較
          </button>
          {isRunning && <button type="button" className="sim-stop-button" onClick={stop}>停止</button>}
        </div>
        {isRunning && (
          <div className="sim-progress" aria-live="polite">
            <div><i style={{ width: `${totalProgress ? (progress / totalProgress) * 100 : 0}%` }} /></div>
            <span>実行中: {progress.toLocaleString()} / {totalProgress.toLocaleString()} 件</span>
          </div>
        )}
        {error && <p className="sim-validation-error" role="alert">{error}</p>}
        {summary && <SummaryResults summary={summary} />}
        {comparison && <ComparisonResults results={comparison} />}
      </div>
    </main>
  );
}

function ComparisonResults({
  results,
}: {
  results: Array<{ label: string; summary: SimulationSummary }>;
}) {
  const maxWeeks = Math.max(1, ...results.map((result) => result.summary.averageWeeks));
  return (
    <section className="sim-results sim-comparison-results">
      <h2>能力条件の比較 ({results[0]?.summary.total.toLocaleString()}回 / 条件)</h2>
      <div className="sim-comparison-table-wrap">
        <table className="sim-comparison-table">
          <thead>
            <tr>
              <th>条件</th><th>平均週数</th><th>中央値</th><th>40週以上</th><th>80週以上</th><th>打ち切り率</th>
            </tr>
          </thead>
          <tbody>
            {results.map(({ label, summary }) => {
              const cancelRate = summary.endReasons.find((item) => item.reason === 'cancelled')?.percent ?? 0;
              return (
                <tr key={label}>
                  <th>{label}</th>
                  <td>{formatNumber(summary.averageWeeks)}週</td>
                  <td>{formatNumber(summary.medianWeeks)}週</td>
                  <td>{formatNumber(summary.durationRates[40])}%</td>
                  <td>{formatNumber(summary.durationRates[80])}%</td>
                  <td>{formatNumber(cancelRate)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="sim-compare-bars" aria-label="平均連載週数の比較">
        {results.map(({ label, summary }, index) => (
          <div className="sim-compare-bar-row" key={label}>
            <span>{label}</span>
            <div><i style={{ width: `${(summary.averageWeeks / maxWeeks) * 100}%`, backgroundColor: `hsl(${220 + index * 36} 68% 55%)` }} /></div>
            <strong>{formatNumber(summary.averageWeeks)}週</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
