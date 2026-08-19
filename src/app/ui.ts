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

export function pileLayout(pile: Pile, piles: Pile[]): CSSProperties {
  const gap = typeof window !== 'undefined' && window.innerWidth <= 560 ? 64 : 108;
  const topPiles = piles.filter((item) =>
    ['stock', 'waste', 'cell', 'reserve'].includes(item.kind),
  );
  const foundations = piles.filter((item) => item.kind === 'foundation');
  const tableaux = piles.filter((item) => item.kind === 'tableau');

  if (['stock', 'waste', 'cell', 'reserve'].includes(pile.kind)) {
    return { left: `${topPiles.indexOf(pile) * gap}px`, top: '0px', right: 'auto' };
  }
  if (pile.kind === 'foundation') {
    return {
      left: `${(topPiles.length + foundations.indexOf(pile)) * gap}px`,
      top: '0px',
      right: 'auto',
    };
  }
  if (pile.kind === 'removed') {
    return { left: `${(topPiles.length + foundations.length) * gap}px`, top: '0px', right: 'auto' };
  }

  const clockPiles = tableaux.filter((item) => /^clock\d+$/.test(item.id));
  if (clockPiles.length === 13 && /^clock\d+$/.test(pile.id)) {
    const index = Number(pile.id.slice(5)) - 1;
    if (index === 12) return { left: 'calc(50% - var(--card-w) / 2)', top: '220px', right: 'auto' };
    const positions = [
      [0, -190], [95, -165], [165, -95], [190, 0], [165, 95], [95, 165],
      [0, 190], [-95, 165], [-165, 95], [-190, 0], [-165, -95], [-95, -165],
    ];
    const [x, y] = positions[index];
    return {
      left: `calc(50% - var(--card-w) / 2 + ${x}px)`,
      top: `${220 + y}px`,
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

  const columns = tableaux
    .map((item) => item.id)
    .sort(
      (left, right) => Number(left.match(/\d+$/)?.[0] ?? 0) - Number(right.match(/\d+$/)?.[0] ?? 0),
    );
  return { left: `${columns.indexOf(pile.id) * gap}px`, top: '180px', right: 'auto' };
}
