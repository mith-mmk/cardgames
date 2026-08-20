import { text } from './i18n';
import type { Language } from './types';

type ScoreLine = { line: string; label: string; score?: number };

function isScoreLine(value: unknown): value is ScoreLine {
  if (!value || typeof value !== 'object') return false;
  const line = value as Record<string, unknown>;
  return (
    typeof line.line === 'string' &&
    typeof line.label === 'string' &&
    (typeof line.score === 'number' || line.score === undefined)
  );
}

function scoreLines(value: unknown): ScoreLine[] {
  return Array.isArray(value) ? value.filter(isScoreLine) : [];
}

function bowlingFrameLines(value: unknown): ScoreLine[] {
  if (!Array.isArray(value)) return [];
  const frames = value.filter(
    (frame): frame is number[] =>
      Array.isArray(frame) && frame.every((roll) => typeof roll === 'number'),
  );
  return frames.map((frame, index) => {
    const following = frames.slice(index + 1).flat();
    const strike = frame.length === 1 && frame[0] === 10;
    const spare = frame.length >= 2 && frame[0] + frame[1] === 10;
    const bonus = strike ? following.slice(0, 2) : spare ? following.slice(0, 1) : [];
    const score =
      index === 9 || (!strike && !spare)
        ? frame.reduce((total, roll) => total + roll, 0)
        : bonus.length === (strike ? 2 : 1)
          ? 10 + bonus.reduce((total, roll) => total + roll, 0)
          : undefined;
    return { line: `F${index + 1}`, label: frame.join(' + '), score };
  });
}

function localizedLine(line: string, t: ReturnType<typeof text>): string {
  const row = line.match(/^R(\d+)$/);
  if (row) return `${t.scoreLabels.row} ${row[1]}`;
  const column = line.match(/^C(\d+)$/);
  if (column) return `${t.scoreLabels.column} ${column[1]}`;
  const frame = line.match(/^F(\d+)$/);
  if (frame) return `${t.frame} ${frame[1]}`;
  const hand = line.match(/^Hand (\d+)$/);
  if (hand) return `${t.scoreLabels.hand} ${hand[1]}`;
  return line === 'Crib' ? t.scoreLabels.crib : line;
}

function localizedLabel(label: string, t: ReturnType<typeof text>): string {
  const labels: Record<string, string> = {
    Incomplete: t.scoreLabels.incomplete,
    'Royal flush': t.scoreLabels.royalFlush,
    'Straight flush': t.scoreLabels.straightFlush,
    'Four of a kind': t.scoreLabels.fourOfAKind,
    'Full house': t.scoreLabels.fullHouse,
    Flush: t.scoreLabels.flush,
    Straight: t.scoreLabels.straight,
    'Three of a kind': t.scoreLabels.threeOfAKind,
    'Two pair': t.scoreLabels.twoPair,
    Pair: t.scoreLabels.pair,
    'High card': t.scoreLabels.highCard,
    'Cribbage hand': t.scoreLabels.cribbageHand,
    'Cribbage show': t.scoreLabels.cribbageShow,
  };
  return labels[label] ?? label;
}

export function ScoreDetails({
  language,
  details,
  bowlingFrames,
}: {
  language: Language;
  details: unknown;
  bowlingFrames: unknown;
}) {
  const t = text(language);
  const lines = scoreLines(details);
  const frames = bowlingFrameLines(bowlingFrames);
  return (
    <details className="score-details">
      <summary>{t.scoreDetails}</summary>
      <ul>
        {!lines.length && !frames.length && (
          <li className="score-details-empty">{t.noScoreDetails}</li>
        )}
        {[...lines, ...frames].map((line) => (
          <li key={line.line}>
            <span>{localizedLine(line.line, t)}</span>
            <span>{localizedLabel(line.label, t)}</span>
            <b>{line.score ?? t.scoreLabels.pending}</b>
          </li>
        ))}
      </ul>
    </details>
  );
}
