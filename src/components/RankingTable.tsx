import './RankingTable.css';
import type { SerializingManga } from '@/types';

interface RankingTableProps {
  playerMangaId: string;
  allMangas: SerializingManga[];
}

export default function RankingTable({ playerMangaId, allMangas }: RankingTableProps) {
  // ソート: アンケート順位でソート
  const sortedMangas = [...allMangas].sort((a, b) => a.currentRanking - b.currentRanking);

  return (
    <div className="ranking-table-container">
      <h3>週間ランキング</h3>
      <div className="ranking-table-wrapper">
        <table className="ranking-table">
          <thead>
            <tr>
              <th className="col-rank-anim">アンケート</th>
              <th className="col-rank-place">掲載順位</th>
              <th className="col-title">作品名</th>
              <th className="col-popularity">人気</th>
              <th className="col-delta">前週比</th>
            </tr>
          </thead>
          <tbody>
            {sortedMangas.map((manga) => {
              const isPlayerManga = manga.id === playerMangaId;
              const popularityDelta =
                manga.popularityHistory.length >= 2
                  ? manga.currentPopularity - manga.popularityHistory[manga.popularityHistory.length - 2]
                  : 0;

              return (
                <tr key={manga.id} className={isPlayerManga ? 'player-row' : ''}>
                  <td className="col-rank-anim">{manga.currentRanking}</td>
                  <td className="col-rank-place">{manga.currentPlacementRanking}</td>
                  <td className="col-title">
                    <span className={isPlayerManga ? 'player-title' : ''}>{manga.title}</span>
                    {isPlayerManga && <span className="player-badge">YOU</span>}
                  </td>
                  <td className="col-popularity">{Math.round(manga.currentPopularity)}</td>
                  <td className={`col-delta ${popularityDelta >= 0 ? 'positive' : 'negative'}`}>
                    {popularityDelta >= 0 ? '+' : ''}{Math.round(popularityDelta)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
