import { useState } from 'react';
import type {
  MangaConfiguration,
  MangaConfigOptions,
  MangaGenre,
  MangaWorldview,
  MangaProtagonist,
  MangaStyle,
} from '@/types';
import './MangaConfigStep.css';

interface MangaConfigStepProps {
  options: MangaConfigOptions;
  onComplete: (config: MangaConfiguration) => void;
}

export default function MangaConfigStep({
  options,
  onComplete,
}: MangaConfigStepProps) {
  const [config, setConfig] = useState<MangaConfiguration>({
    genre: 'shounen_action',
    worldview: 'contemporary',
    protagonist: 'ordinary_boy',
    style: 'traditional_shounen',
    title: '',
    authorName: '',
  });

  const [errors, setErrors] = useState<string[]>([]);

  const handleSubmit = () => {
    const newErrors: string[] = [];

    if (!config.title.trim()) {
      newErrors.push('作品タイトルを入力してください');
    }
    if (!config.authorName.trim()) {
      newErrors.push('作者名を入力してください');
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    onComplete(config);
  };

  return (
    <div className="config-step">
      <form className="config-form">
        {/* Genre Selection */}
        <div className="form-section">
          <h3>ジャンルを選択</h3>
          <div className="options-grid">
            {options.genres.map((genre) => (
              <label key={genre.id} className="option-label">
                <input
                  type="radio"
                  name="genre"
                  value={genre.id}
                  checked={config.genre === genre.id}
                  onChange={(e) => {
                    setConfig({ ...config, genre: e.target.value as MangaGenre });
                  }}
                />
                <span className="option-text">
                  <span className="option-title">{genre.label}</span>
                  <span className="option-desc">{genre.description}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Worldview Selection */}
        <div className="form-section">
          <h3>世界観を選択</h3>
          <div className="options-grid">
            {options.worldviews.map((worldview) => (
              <label key={worldview.id} className="option-label">
                <input
                  type="radio"
                  name="worldview"
                  value={worldview.id}
                  checked={config.worldview === worldview.id}
                  onChange={(e) => {
                    setConfig({
                      ...config,
                      worldview: e.target.value as MangaWorldview,
                    });
                  }}
                />
                <span className="option-text">
                  <span className="option-title">{worldview.label}</span>
                  <span className="option-desc">{worldview.description}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Protagonist Selection */}
        <div className="form-section">
          <h3>主人公のタイプを選択</h3>
          <div className="options-grid">
            {options.protagonists.map((protagonist) => (
              <label key={protagonist.id} className="option-label">
                <input
                  type="radio"
                  name="protagonist"
                  value={protagonist.id}
                  checked={config.protagonist === protagonist.id}
                  onChange={(e) => {
                    setConfig({
                      ...config,
                      protagonist: e.target.value as MangaProtagonist,
                    });
                  }}
                />
                <span className="option-text">
                  <span className="option-title">{protagonist.label}</span>
                  <span className="option-desc">{protagonist.description}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Style Selection */}
        <div className="form-section">
          <h3>作風を選択</h3>
          <div className="options-grid">
            {options.styles.map((style) => (
              <label key={style.id} className="option-label">
                <input
                  type="radio"
                  name="style"
                  value={style.id}
                  checked={config.style === style.id}
                  onChange={(e) => {
                    setConfig({ ...config, style: e.target.value as MangaStyle });
                  }}
                />
                <span className="option-text">
                  <span className="option-title">{style.label}</span>
                  <span className="option-desc">{style.description}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Title & Author */}
        <div className="form-section">
          <h3>作品情報を入力</h3>

          <div className="text-input-group">
            <label htmlFor="title">作品タイトル</label>
            <input
              id="title"
              type="text"
              value={config.title}
              onChange={(e) => setConfig({ ...config, title: e.target.value })}
              placeholder="例: ジャンプサバイバル"
              maxLength={50}
            />
          </div>

          <div className="text-input-group">
            <label htmlFor="authorName">作者名</label>
            <input
              id="authorName"
              type="text"
              value={config.authorName}
              onChange={(e) =>
                setConfig({ ...config, authorName: e.target.value })
              }
              placeholder="例: 漫画太郎"
              maxLength={30}
            />
          </div>
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="errors">
            {errors.map((error, idx) => (
              <p key={idx} className="error-message">
                {error}
              </p>
            ))}
          </div>
        )}

        {/* Submit */}
        <button type="button" className="submit-button" onClick={handleSubmit}>
          次へ: 能力配分
        </button>
      </form>
    </div>
  );
}
