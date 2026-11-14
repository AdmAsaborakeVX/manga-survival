import { useMemo } from 'react';
import {
  getRatingLevel,
  getGaugePercentage,
  getAbilityDescription,
  getRatingDescription,
  type AbilityKey,
} from '@/game/ability-rating';
import './AbilityCard.css';

interface AbilityCardProps {
  abilityKey: AbilityKey;
  value: number;
  onChange: (newValue: number) => void;
  maxValue: number;
}

export default function AbilityCard({
  abilityKey,
  value,
  onChange,
  maxValue,
}: AbilityCardProps) {
  const rating = useMemo(() => getRatingLevel(value), [value]);
  const gaugePercentage = useMemo(() => getGaugePercentage(value), [value]);
  const description = useMemo(
    () => getAbilityDescription(abilityKey),
    [abilityKey]
  );
  const ratingDescription = useMemo(
    () => getRatingDescription(abilityKey, value),
    [abilityKey, value]
  );

  return (
    <div className="ability-card">
      <div className="card-header">
        <h3 className="ability-label">{description.label}</h3>
        <div className="value-and-rating">
          <span className="ability-value">{value}</span>
          <span className="rating-badge" style={{ backgroundColor: rating.backgroundColor, color: rating.color }}>
            {rating.rank}
          </span>
        </div>
      </div>

      <div className="gauge-container">
        <div className="gauge-background">
          <div
            className="gauge-fill"
            style={{
              width: `${gaugePercentage * 100}%`,
              backgroundColor: rating.color,
            }}
          />
        </div>
        <span className="gauge-label">{rating.meaning}</span>
      </div>

      <div className="input-control">
        <input
          type="range"
          min="0"
          max={maxValue}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          className="slider"
          style={{
            background: `linear-gradient(to right, ${rating.color} 0%, ${rating.color} ${gaugePercentage * 100}%, #e0e0e0 ${gaugePercentage * 100}%, #e0e0e0 100%)`,
          }}
        />
        <input
          type="number"
          value={value}
          onChange={(e) => {
            const newValue = parseInt(e.target.value, 10);
            if (newValue >= 0 && newValue <= maxValue) {
              onChange(newValue);
            }
          }}
          min="0"
          max={maxValue}
          className="number-input"
        />
      </div>

      <div className="impact-section">
        <p className="impact-title">ゲーム影響</p>
        <p className="impact-description">{description.impact}</p>
      </div>

      <div className="rating-description">
        <p>{ratingDescription}</p>
      </div>
    </div>
  );
}
