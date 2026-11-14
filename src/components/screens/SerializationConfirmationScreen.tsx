import { useEffect } from 'react';
import { scrollToTop } from '@/utils/scrollToTop';
import './SerializationConfirmationScreen.css';
import type { MangaRecord } from '@/types';

interface SerializationConfirmationScreenProps {
  manga: MangaRecord;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function SerializationConfirmationScreen({
  manga,
  onConfirm,
  onCancel,
}: SerializationConfirmationScreenProps) {
  useEffect(() => {
    scrollToTop();
  }, []);
  const { configuration, abilities, totalAbility } = manga;

  return (
    <div className="serialization-confirmation-screen">
      <div className="confirmation-container">
        <h1 className="confirmation-title">連載開始</h1>
        <p className="confirmation-subtitle">この作品を連載開始しますか？</p>

        <div className="manga-preview">
          <div className="preview-section">
            <h3>作品情報</h3>
            <div className="info-row">
              <span className="label">タイトル:</span>
              <span className="value">{configuration.title}</span>
            </div>
            <div className="info-row">
              <span className="label">作者:</span>
              <span className="value">{configuration.authorName}</span>
            </div>
            <div className="info-row">
              <span className="label">ジャンル:</span>
              <span className="value">{configuration.genre}</span>
            </div>
          </div>

          <div className="preview-section">
            <h3>作品能力</h3>
            <div className="abilities-grid">
              <div className="ability-item">
                <span className="ability-name">ストーリー</span>
                <span className="ability-value">{abilities.story}</span>
              </div>
              <div className="ability-item">
                <span className="ability-name">キャラクター</span>
                <span className="ability-value">{abilities.character}</span>
              </div>
              <div className="ability-item">
                <span className="ability-name">画力・演出</span>
                <span className="ability-value">{abilities.artwork}</span>
              </div>
              <div className="ability-item">
                <span className="ability-name">独自性</span>
                <span className="ability-value">{abilities.originality}</span>
              </div>
              <div className="ability-item">
                <span className="ability-name">構成・テンポ</span>
                <span className="ability-value">{abilities.composition}</span>
              </div>
            </div>
          </div>

          <div className="preview-section">
            <h3>能力値の合計</h3>
            <div className="total-ability">
              <span className="ability-value-large">{totalAbility}</span>
            </div>
          </div>
        </div>

        <div className="confirmation-actions">
          <button className="btn-primary" onClick={onConfirm}>
            連載を開始する
          </button>
          <button className="btn-secondary" onClick={onCancel}>
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}
