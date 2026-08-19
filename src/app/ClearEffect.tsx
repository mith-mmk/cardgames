import type { CSSProperties } from 'react';
import type { MotionMode } from './types';

const CONFETTI_COLORS = ['#c3e86a', '#f7d276', '#f29b9b', '#9cd8d0', '#d8b7f5'];

type ConfettiStyle = CSSProperties & {
  '--x': string;
  '--y': string;
  '--rotation': string;
  '--delay': string;
  '--color': string;
};

export type ClearEffectProps = {
  active: boolean;
  motion?: MotionMode;
  onSkip?: () => void;
  skipLabel?: string;
};

/** A decorative, dismissible celebration layer shown after a game is cleared. */
export function ClearEffect({
  active,
  motion = 'standard',
  onSkip,
  skipLabel = 'Skip celebration',
}: ClearEffectProps) {
  if (!active) return null;

  return (
    <div className={`clear-effect motion-${motion}`}>
      <div className="clear-effect__glow" aria-hidden="true" />
      <div className="clear-effect__burst" aria-hidden="true">
        {Array.from({ length: 12 }, (_, index) => (
          <i key={index} style={{ '--angle': `${index * 30}deg` } as CSSProperties} />
        ))}
      </div>
      <div className="clear-effect__cards" aria-hidden="true">
        <i className="clear-effect__card clear-effect__card--one" />
        <i className="clear-effect__card clear-effect__card--two" />
        <i className="clear-effect__card clear-effect__card--three" />
      </div>
      <div className="clear-effect__confetti" aria-hidden="true">
        {Array.from({ length: 30 }, (_, index) => {
          const x = ((index * 47) % 100) - 50;
          const y = 38 + ((index * 29) % 55);
          const style: ConfettiStyle = {
            '--x': `${x}vw`,
            '--y': `${y}vh`,
            '--rotation': `${(index * 67) % 360}deg`,
            '--delay': `${(index % 10) * 45}ms`,
            '--color': CONFETTI_COLORS[index % CONFETTI_COLORS.length],
          };
          return <i key={index} style={style} />;
        })}
      </div>
      {onSkip && (
        <button
          className="clear-effect__skip"
          type="button"
          aria-label={skipLabel}
          onClick={onSkip}
        >
          ×
        </button>
      )}
    </div>
  );
}
