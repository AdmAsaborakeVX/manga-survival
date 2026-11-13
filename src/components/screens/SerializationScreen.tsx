import { useState, useEffect, useCallback } from 'react';
import './SerializationScreen.css';
import type { SerializationState } from '@/types';
import { advanceWeek, simulateToEnd } from '@/game/simulation';
import { cloneSerializationState } from '@/game/serialization';
import EventNotification from '../EventNotification';
import RankingTable from '../RankingTable';
import PopularityGraph from '../PopularityGraph';

interface SerializationScreenProps {
  serializationState: SerializationState;
  onStateChange: (state: SerializationState) => void;
  onSerializationEnd: () => void;
}

export default function SerializationScreen({
  serializationState,
  onStateChange,
  onSerializationEnd,
}: SerializationScreenProps) {
  const [state, setState] = useState<SerializationState>(serializationState);
  const [isAdvancing, setIsAdvancing] = useState(false);

  // propsが変わった時に内部stateを同期
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(serializationState);
  }, [serializationState]);

  const handleStateChange = useCallback(
    (newState: SerializationState) => {
      setState(newState);
      onStateChange(newState);
    },
    [onStateChange]
  );

  const handleAdvanceWeek = useCallback(
    (weeks: number) => {
      if (isAdvancing || !state.isActive) return;

      setIsAdvancing(true);
      let current = cloneSerializationState(state);

      for (let i = 0; i < weeks; i++) {
        if (!current.isActive) break;
        current = advanceWeek(current);
      }

      handleStateChange(current);
      setIsAdvancing(false);

      if (!current.isActive) {
        setTimeout(() => {
          onSerializationEnd();
        }, 500);
      }
    },
    [state, isAdvancing, handleStateChange, onSerializationEnd]
  );

  const handleSimulateToEnd = useCallback(() => {
    if (isAdvancing || !state.isActive) return;

    setIsAdvancing(true);
    let current = cloneSerializationState(state);
    current = simulateToEnd(current);

    handleStateChange(current);
    setIsAdvancing(false);

    if (!current.isActive) {
      setTimeout(() => {
        onSerializationEnd();
      }, 500);
    }
  }, [state, isAdvancing, handleStateChange, onSerializationEnd]);

  const playerManga = state.playerManga;
  const allMangas = [playerManga, ...state.rivalMangas];
  const avgPopularity =
    playerManga.popularityHistory.length > 0
      ? playerManga.popularityHistory.reduce((a, b) => a + b, 0) / playerManga.popularityHistory.length
      : playerManga.currentPopularity;

  // リスク度を計算
  const riskPercentage = Math.round(state.playerManga.cancellationRisk * 100);

  return (
    <div className="serialization-screen">
      <div className="serialization-container">
        <header className="serialization-header">
          <div className="header-title-area">
            <h1 className="series-title">{playerManga.title}</h1>
            <p className="author-name">作者: {playerManga.configuration.authorName}</p>
          </div>
          <div className="header-status">
            <div className="status-item">
              <span className="status-label">連載週数</span>
              <span className="status-value">{state.currentWeek}</span>
            </div>
            <div className="status-item">
              <span className="status-label">状態</span>
              <span className={`status-value status-${state.isActive ? 'active' : 'inactive'}`}>
                {state.isActive ? '連載中' : '連載終了'}
              </span>
            </div>
          </div>
        </header>

        <div className="serialization-content">
          <aside className="sidebar">
            <div className="info-panel">
              <div className="info-section">
                <h3>現在の状況</h3>
                <div className="info-grid">
                  <div className="info-row">
                    <span className="info-label">現在の人気</span>
                    <span className="info-value">{Math.round(playerManga.currentPopularity)}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">平均人気</span>
                    <span className="info-value">{Math.round(avgPopularity)}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">アンケート順位</span>
                    <span className="info-value">{playerManga.currentRanking}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">掲載順位</span>
                    <span className="info-value">{playerManga.currentPlacementRanking}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">単行本売上</span>
                    <span className="info-value">{playerManga.totalSales.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="info-section">
                <h3>打ち切り危険度</h3>
                <div className="risk-meter">
                  <div className="risk-bar">
                    <div className={`risk-fill risk-level-${getRiskLevel(riskPercentage)}`} style={{ width: `${riskPercentage}%` }}></div>
                  </div>
                  <div className="risk-label">{riskPercentage}%</div>
                </div>
                {playerManga.lowRankingWeeks > 0 && (
                  <div className="risk-info">低順位が{playerManga.lowRankingWeeks}週続いています</div>
                )}
              </div>

              <div className="info-section">
                <h3>作品能力</h3>
                <div className="abilities-small">
                  <div className="ability-row">
                    <span>ストーリー</span>
                    <span>{playerManga.abilities.story}</span>
                  </div>
                  <div className="ability-row">
                    <span>キャラ</span>
                    <span>{playerManga.abilities.character}</span>
                  </div>
                  <div className="ability-row">
                    <span>画力</span>
                    <span>{playerManga.abilities.artwork}</span>
                  </div>
                  <div className="ability-row">
                    <span>独自性</span>
                    <span>{playerManga.abilities.originality}</span>
                  </div>
                  <div className="ability-row">
                    <span>構成</span>
                    <span>{playerManga.abilities.composition}</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <main className="main-content">
            <div className="controls-section">
              <button
                className="btn btn-advance"
                onClick={() => handleAdvanceWeek(1)}
                disabled={!state.isActive || isAdvancing}
              >
                1週進める
              </button>
              <button
                className="btn btn-advance"
                onClick={() => handleAdvanceWeek(5)}
                disabled={!state.isActive || isAdvancing}
              >
                5週進める
              </button>
              <button
                className="btn btn-advance"
                onClick={() => handleAdvanceWeek(10)}
                disabled={!state.isActive || isAdvancing}
              >
                10週進める
              </button>
              <button
                className="btn btn-simulate"
                onClick={handleSimulateToEnd}
                disabled={!state.isActive || isAdvancing}
              >
                最後まで進める
              </button>
            </div>

            {state.playerManga.eventHistory.length > 0 && (
              <EventNotification events={state.playerManga.eventHistory} />
            )}

            <PopularityGraph manga={playerManga} />

            <RankingTable playerMangaId={playerManga.id} allMangas={allMangas} />
          </main>
        </div>
      </div>
    </div>
  );
}

function getRiskLevel(percentage: number): string {
  if (percentage < 20) return 'low';
  if (percentage < 50) return 'medium';
  if (percentage < 80) return 'high';
  return 'critical';
}
