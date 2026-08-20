import type { CSSProperties } from 'react';
import type { Pile } from './types';

export type ThemeAsset = {
  id: string;
  name: { ja: string; en: string };
  courtArtwork: string;
  backs: string[];
  color?: string;
};

export type ThemeManifest = { themes: ThemeAsset[] };

export const fallbackThemes: ThemeAsset[] = [
  {
    id: 'classic',
    name: { ja: 'クラシック', en: 'Classic' },
    courtArtwork: '/themes/classic/court-queen.png',
    backs: ['/themes/classic/back-01.svg', '/themes/classic/back-02.svg'],
    color: '#f8f0df',
  },
  {
    id: 'anime',
    name: { ja: 'アニメ調', en: 'Anime' },
    courtArtwork: '/themes/anime/court-queen.png',
    backs: ['/themes/anime/back-01.svg', '/themes/anime/back-02.svg'],
    color: '#e9d5bb',
  },
  {
    id: 'wa',
    name: { ja: '和風', en: 'Wa' },
    courtArtwork: '/themes/wa/court-queen.png',
    backs: ['/themes/wa/back-01.svg', '/themes/wa/back-02.svg'],
    color: '#f7d6df',
  },
  {
    id: 'friendly',
    name: { ja: 'デフォルメ', en: 'Friendly' },
    courtArtwork: '/themes/friendly/court-queen.png',
    backs: ['/themes/friendly/back-01.svg', '/themes/friendly/back-02.svg'],
    color: '#cbe9e7',
  },
  {
    id: 'maid-san',
    name: { ja: 'メイドさん', en: 'Maid-san' },
    courtArtwork: '/themes/maid-san/court-queen.png',
    backs: ['/themes/maid-san/back-01.svg', '/themes/maid-san/back-02.svg'],
    color: '#d7c2f3',
  },
];

const suits: Record<string, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

export const suitSymbol = (suit: string) => suits[suit] ?? '';

export const rankName = (rank: number) =>
  rank === 1 ? 'A' : rank === 11 ? 'J' : rank === 12 ? 'Q' : rank === 13 ? 'K' : String(rank);

export const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0')}`;

export const isCompactLandscape = () =>
  typeof window !== 'undefined' &&
  window.innerWidth > window.innerHeight &&
  window.innerHeight <= 900 &&
  window.matchMedia?.('(pointer: coarse)').matches;

export function pileLayout(pile: Pile, piles: Pile[]): CSSProperties {
  const gap = isCompactLandscape()
    ? Math.max(40, Math.min(78, Math.round(window.innerWidth / 13)))
    : typeof window !== 'undefined' && window.innerWidth <= 560
      ? 64
      : 108;
  const topPiles = piles.filter((item) =>
    ['stock', 'waste', 'cell', 'reserve'].includes(item.kind),
  );
  const foundations = piles.filter((item) => item.kind === 'foundation');
  const tableaux = piles.filter((item) => item.kind === 'tableau');
  const compact = isCompactLandscape();
  const dense = tableaux.length >= 12 || topPiles.length + foundations.length >= 12;
  const topColumns = dense ? (compact ? 10 : 8) : Number.MAX_SAFE_INTEGER;
  const topRowGap = compact ? 70 : 135;
  const topIndex = (candidate: Pile) =>
    [...topPiles, ...foundations, ...piles.filter((item) => item.kind === 'removed')].indexOf(
      candidate,
    );
  const topPosition = (index: number): CSSProperties => ({
    left: `${(index % topColumns) * gap}px`,
    top: `${Math.floor(index / topColumns) * topRowGap}px`,
    right: 'auto',
  });

  const blackHolePiles = tableaux.filter((item) => /^black\d+$/.test(item.id));
  if (blackHolePiles.length === 17) {
    if (pile.id === 'hole')
      return {
        left: 'calc(50% - var(--card-w) / 2)',
        top: 'calc(50% - var(--card-h) / 2)',
        right: 'auto',
      };
    if (/^black\d+$/.test(pile.id)) {
      const index = Number(pile.id.slice(5));
      const angle = (Math.PI * 2 * index) / blackHolePiles.length - Math.PI / 2;
      return {
        left: `calc(50% - var(--card-w) / 2 + ${Math.cos(angle) * 40}%)`,
        top: `calc(50% - var(--card-h) / 2 + ${Math.sin(angle) * 35}%)`,
        right: 'auto',
      };
    }
  }

  if (['stock', 'waste', 'cell', 'reserve'].includes(pile.kind)) {
    return topPosition(topIndex(pile));
  }
  if (pile.kind === 'foundation') {
    return topPosition(topIndex(pile));
  }
  if (pile.kind === 'removed') {
    return topPosition(topIndex(pile));
  }

  const clockPiles = tableaux.filter((item) => /^clock\d+$/.test(item.id));
  if (clockPiles.length === 13 && /^clock\d+$/.test(pile.id)) {
    const index = Number(pile.id.slice(5)) - 1;
    if (index === 12)
      return {
        left: 'calc(50% - var(--card-w) / 2)',
        top: 'calc(50% - var(--card-h) / 2)',
        right: 'auto',
      };
    const positions = [
      [0, -34],
      [12.5, -29.5],
      [21.7, -17],
      [25, 0],
      [21.7, 17],
      [12.5, 29.5],
      [0, 34],
      [-12.5, 29.5],
      [-21.7, 17],
      [-25, 0],
      [-21.7, -17],
      [-12.5, -29.5],
    ];
    const [x, y] = positions[index];
    return {
      left: `calc(50% + ${x}% - var(--card-w) / 2)`,
      top: `calc(50% + ${y}% - var(--card-h) / 2)`,
      right: 'auto',
    };
  }

  const isPyramid = tableaux.length >= 20 && tableaux.every((item) => /^p\d+$/.test(item.id));
  if (isPyramid) {
    const index = Math.max(0, Number(pile.id.slice(1)));
    const row = Math.floor((Math.sqrt(8 * index + 1) - 1) / 2);
    const position = index - (row * (row + 1)) / 2;
    return {
      left: `calc(50% - var(--card-w) / 2 + ${(position - row / 2) * 54}px)`,
      top: `${170 + row * 43}px`,
      right: 'auto',
    };
  }

  const accordionPiles = tableaux.filter((item) => /^t\d+$/.test(item.id));
  if (accordionPiles.length === 52) {
    if (!pile.cards.length) return { display: 'none' };
    const activePiles = accordionPiles.filter((item) => item.cards.length);
    const index = activePiles.indexOf(pile);
    const columns = compact ? 8 : 13;
    const accordionGap = compact ? Math.max(48, Math.round(window.innerWidth / 9)) : 96;
    return {
      left: `${(index % columns) * accordionGap}px`,
      top: `${14 + Math.floor(index / columns) * (compact ? 82 : 138)}px`,
      right: 'auto',
    };
  }

  const gizaPyramid = tableaux.filter((item) => /^giza\d+$/.test(item.id));
  if (gizaPyramid.length === 28) {
    if (/^gizaReserve\d+$/.test(pile.id)) {
      const index = Number(pile.id.slice(11));
      const reserveGap = compact ? Math.max(48, Math.round(window.innerWidth / 9)) : 108;
      return { left: `${index * reserveGap}px`, top: '0px', right: 'auto' };
    }
    if (/^giza\d+$/.test(pile.id)) {
      const index = Number(pile.id.slice(4));
      const row = Math.floor((Math.sqrt(8 * index + 1) - 1) / 2);
      const position = index - (row * (row + 1)) / 2;
      return {
        left: `calc(50% - var(--card-w) / 2 + ${(position - row / 2) * (compact ? 42 : 54)}px)`,
        top: `${(compact ? 104 : 210) + row * (compact ? 30 : 43)}px`,
        right: 'auto',
      };
    }
  }

  const triPeaks = tableaux.filter((item) => /^tri\d+$/.test(item.id));
  if (triPeaks.length === 28 && /^tri\d+$/.test(pile.id)) {
    const index = Number(pile.id.slice(3));
    const row = index < 3 ? 0 : index < 9 ? 1 : index < 18 ? 2 : 3;
    const columns =
      row === 0
        ? [1, 4, 7]
        : row === 1
          ? [0.5, 1.5, 3.5, 4.5, 6.5, 7.5]
          : row === 2
            ? [0, 1, 2, 3, 4, 5, 6, 7, 8]
            : Array.from({ length: 10 }, (_, column) => column);
    const start = row === 0 ? 0 : row === 1 ? 3 : row === 2 ? 9 : 18;
    const column = columns[index - start];
    const triGap = compact ? Math.max(38, Math.round(window.innerWidth / 13)) : 62;
    return {
      left: `calc(50% - var(--card-w) / 2 + ${(column - 4.5) * triGap}px)`,
      top: `${(compact ? 54 : 86) + row * (compact ? 40 : 62)}px`,
      right: 'auto',
    };
  }

  const gridPiles = tableaux.filter((item) => /^g\d+$/.test(item.id));
  const gridSide = Math.sqrt(gridPiles.length);
  if (Number.isInteger(gridSide) && gridPiles.length && /^g\d+$/.test(pile.id)) {
    const index = Number(pile.id.slice(1));
    const row = Math.floor(index / gridSide);
    const column = index % gridSide;
    const gridGap = compact ? Math.max(48, Math.round(window.innerWidth / (gridSide + 2))) : 108;
    return {
      left: `calc(50% - var(--card-w) / 2 + ${(column - (gridSide - 1) / 2) * gridGap}px)`,
      top: `${(compact ? 64 : 142) + row * (compact ? 58 : 132)}px`,
      right: 'auto',
    };
  }

  const acesUpPiles = tableaux.filter((item) => /^aces\d+$/.test(item.id));
  if (acesUpPiles.length === 4 && /^aces\d+$/.test(pile.id)) {
    const index = Number(pile.id.slice(4));
    const acesUpGap = compact ? Math.max(48, Math.round(window.innerWidth / 6)) : 108;
    return {
      left: `calc(50% - var(--card-w) / 2 + ${(index - 1.5) * acesUpGap}px)`,
      top: `${compact ? 54 : 180}px`,
      right: 'auto',
    };
  }

  const columns = tableaux
    .map((item) => item.id)
    .sort(
      (left, right) => Number(left.match(/\d+$/)?.[0] ?? 0) - Number(right.match(/\d+$/)?.[0] ?? 0),
    );
  const columnIndex = columns.indexOf(pile.id);
  const tableauColumns = dense ? (compact ? 8 : 8) : Number.MAX_SAFE_INTEGER;
  const topRows = dense ? Math.ceil((topPiles.length + foundations.length) / topColumns) : 0;
  const tableauTop = dense ? topRows * topRowGap + (compact ? 8 : 24) : 180;
  return {
    left: `${(columnIndex % tableauColumns) * gap}px`,
    top: `${tableauTop + Math.floor(columnIndex / tableauColumns) * (compact ? 112 : 170)}px`,
    right: 'auto',
  };
}
