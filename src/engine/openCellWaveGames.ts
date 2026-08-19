import { ApplyResult, Card, GameDefinition, GameState, Move } from './types';
import { cloneState, makeState, pile, top, transfer } from './core';
import { shuffledDeck } from './random';

const DEFAULT_SEED = 'solitaire-default';
const FOUNDATION_IDS = ['f0', 'f1', 'f2', 'f3'] as const;

type Layout = 'columns' | 'fans';
type BuildRule = 'same-suit' | 'alternate-color' | 'any';

interface WaveRules {
  id: string;
  name: string;
  layout: Layout;
  tableauSizes: readonly number[];
  cellCount?: number;
  reserveCount?: number;
  build: BuildRule;
  moveRuns: boolean;
  emptyColumn: 'any' | 'king';
  recycle?: boolean;
}

/*
 * The rules below describe the physical deal and the common mechanics of the
 * open-cell/fan family.  Individual games intentionally remain data: this
 * keeps the renderer independent of the game name and gives every definition
 * the same deterministic, testable GameDefinition contract.
 */
const RULES: readonly WaveRules[] = [
  {
    id: 'penguin',
    name: 'Penguin',
    layout: 'columns',
    tableauSizes: [7, 7, 7, 7, 6, 6, 5, 5],
    cellCount: 2,
    build: 'same-suit',
    moveRuns: true,
    emptyColumn: 'any',
  },
  {
    id: 'beleaguered-castle',
    name: 'Beleaguered Castle',
    layout: 'columns',
    tableauSizes: Array(8).fill(6),
    cellCount: 4,
    build: 'alternate-color',
    moveRuns: false,
    emptyColumn: 'any',
  },
  {
    id: 'citadel',
    name: 'Citadel',
    layout: 'columns',
    tableauSizes: Array(8).fill(6),
    cellCount: 4,
    build: 'alternate-color',
    moveRuns: false,
    emptyColumn: 'any',
  },
  {
    id: 'fortress',
    name: 'Fortress',
    layout: 'columns',
    tableauSizes: [7, 7, 7, 7, 6, 6, 6, 6],
    build: 'alternate-color',
    moveRuns: true,
    emptyColumn: 'any',
  },
  {
    id: 'chessboard',
    name: 'Chessboard',
    layout: 'columns',
    tableauSizes: Array(8).fill(6),
    cellCount: 4,
    build: 'same-suit',
    moveRuns: true,
    emptyColumn: 'king',
  },
  {
    id: 'streets-and-alleys',
    name: 'Streets and Alleys',
    layout: 'columns',
    tableauSizes: [7, 7, 7, 7, 6, 6, 6, 6],
    build: 'same-suit',
    moveRuns: true,
    emptyColumn: 'any',
  },
  {
    id: 'bakers-dozen',
    name: "Baker's Dozen",
    layout: 'columns',
    tableauSizes: Array(13).fill(4),
    build: 'alternate-color',
    moveRuns: false,
    emptyColumn: 'any',
  },
  {
    id: 'castles-in-spain',
    name: 'Castles in Spain',
    layout: 'columns',
    tableauSizes: [7, 7, 7, 7, 6, 6, 6, 6],
    cellCount: 4,
    build: 'alternate-color',
    moveRuns: false,
    emptyColumn: 'king',
  },
  {
    id: 'bisley',
    name: 'Bisley',
    layout: 'columns',
    tableauSizes: [7, 7, 7, 7, 6, 6, 6, 6],
    build: 'same-suit',
    moveRuns: false,
    emptyColumn: 'any',
  },
  {
    id: 'flower-garden',
    name: 'Flower Garden',
    layout: 'fans',
    tableauSizes: Array(6).fill(6),
    reserveCount: 16,
    build: 'alternate-color',
    moveRuns: false,
    emptyColumn: 'any',
  },
  {
    id: 'la-belle-lucie',
    name: 'La Belle Lucie',
    layout: 'fans',
    tableauSizes: Array(16).fill(3),
    reserveCount: 1,
    build: 'alternate-color',
    moveRuns: false,
    emptyColumn: 'any',
    recycle: true,
  },
  {
    id: 'shamrocks',
    name: 'Shamrocks',
    layout: 'fans',
    tableauSizes: Array(16).fill(3),
    reserveCount: 1,
    build: 'same-suit',
    moveRuns: false,
    emptyColumn: 'any',
    recycle: true,
  },
  {
    id: 'trefoil',
    name: 'Trefoil',
    layout: 'fans',
    tableauSizes: Array(16).fill(3),
    reserveCount: 4,
    build: 'same-suit',
    moveRuns: false,
    emptyColumn: 'any',
  },
  {
    id: 'bear-river',
    name: 'Bear River',
    layout: 'columns',
    tableauSizes: [7, 7, 7, 7, 6, 6, 5, 5],
    cellCount: 2,
    build: 'alternate-color',
    moveRuns: true,
    emptyColumn: 'king',
  },
  {
    id: 'cruel',
    name: 'Cruel',
    layout: 'columns',
    tableauSizes: Array(12).fill(4),
    reserveCount: 1,
    build: 'same-suit',
    moveRuns: false,
    emptyColumn: 'any',
    recycle: true,
  },
  {
    id: 'canister',
    name: 'Canister',
    layout: 'columns',
    tableauSizes: [5, 5, 5, 5, 5, 5, 5, 5, 4, 4],
    reserveCount: 2,
    build: 'alternate-color',
    moveRuns: true,
    emptyColumn: 'king',
    recycle: true,
  },
];

function ids(prefix: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => `${prefix}${index}`);
}

function tableauIds(rules: WaveRules): string[] {
  return ids('t', rules.tableauSizes.length);
}

function cellIds(rules: WaveRules): string[] {
  return ids('c', rules.cellCount ?? 0);
}

function reserveIds(rules: WaveRules): string[] {
  return ids('r', rules.reserveCount ?? 0);
}

function canBuild(card: Card, target: Card | undefined, rules: WaveRules): boolean {
  if (!target) return rules.emptyColumn === 'any' || card.rank === 13;
  if (rules.build === 'any') return target.rank === card.rank + 1;
  if (rules.build === 'same-suit')
    return target.rank === card.rank + 1 && target.suit === card.suit;
  const targetRed = target.suit === 'diamonds' || target.suit === 'hearts';
  const cardRed = card.suit === 'diamonds' || card.suit === 'hearts';
  return target.rank === card.rank + 1 && targetRed !== cardRed;
}

function isRun(cards: readonly Card[], start: number, rules: WaveRules): boolean {
  if (!rules.moveRuns && start !== cards.length - 1) return false;
  for (let index = start; index < cards.length; index += 1) {
    const card = cards[index];
    if (!card.faceUp) return false;
    if (index > start && !canBuild(card, cards[index - 1], rules)) return false;
  }
  return true;
}

function foundationAccepts(foundation: readonly Card[], card: Card): boolean {
  const expected = foundation.length + 1;
  return card.rank === expected && (!foundation.length || foundation[0].suit === card.suit);
}

function sameMove(a: Move, b: Move): boolean {
  if (a.type !== b.type || a.from !== b.from || a.to !== b.to) return false;
  if (a.type === 'draw' && b.type === 'draw') return (a.count ?? 1) === (b.count ?? 1);
  if (a.type === 'recycle' && b.type === 'recycle') return true;
  return (
    a.type === 'transfer' &&
    b.type === 'transfer' &&
    JSON.stringify(a.cardIds) === JSON.stringify(b.cardIds)
  );
}

function createState(rules: WaveRules, seed: string): GameState {
  const deck = shuffledDeck(seed);
  const tableaus = tableauIds(rules);
  const cells = cellIds(rules);
  const reserves = reserveIds(rules);
  const piles = [
    ...FOUNDATION_IDS.map((id) => pile(id, 'foundation')),
    ...tableaus.map((id) => pile(id, 'tableau')),
    ...cells.map((id) => pile(id, 'cell')),
    ...reserves.map((id) => pile(id, 'reserve')),
    ...(rules.recycle ? [pile('stock', 'stock'), pile('waste', 'waste')] : []),
  ];
  let cursor = 0;
  for (const [column, count] of rules.tableauSizes.entries()) {
    const target = piles.find((candidate) => candidate.id === tableaus[column])!;
    for (let index = 0; index < count; index += 1) {
      const card = deck[cursor++];
      card.faceUp = true;
      target.cards.push(card);
    }
  }
  for (const id of [...cells, ...reserves]) {
    if (cursor >= deck.length) break;
    const card = deck[cursor++];
    card.faceUp = true;
    piles.find((candidate) => candidate.id === id)!.cards.push(card);
  }
  if (rules.recycle) {
    const stock = piles.find((candidate) => candidate.id === 'stock')!;
    while (cursor < deck.length) stock.cards.push({ ...deck[cursor++], faceUp: false });
  }
  return makeState(rules.id, seed, piles, { options: rules });
}

function legalMovesFor(state: GameState, rules: WaveRules): Move[] {
  const moves: Move[] = [];
  const tableaus = tableauIds(rules).map((id) => state.piles[id]);
  const cells = cellIds(rules).map((id) => state.piles[id]);
  const reserves = reserveIds(rules).map((id) => state.piles[id]);
  const sources = [...tableaus, ...cells, ...reserves];
  for (const source of sources) {
    if (!source.cards.length) continue;
    const first = source.kind === 'tableau' && rules.moveRuns ? 0 : source.cards.length - 1;
    for (let start = source.cards.length - 1; start >= first; start -= 1) {
      if (source.kind === 'tableau' && !isRun(source.cards, start, rules)) continue;
      const card = source.cards[start];
      const idsToMove = source.cards.slice(start).map((item) => item.id);
      for (const target of tableaus) {
        if (target.id === source.id || !canBuild(card, top(target), rules)) continue;
        moves.push({ type: 'transfer', from: source.id, to: target.id, cardIds: idsToMove });
      }
      if (idsToMove.length === 1) {
        for (const cell of cells) {
          if (!cell.cards.length && source.kind !== 'cell')
            moves.push({ type: 'transfer', from: source.id, to: cell.id, cardIds: idsToMove });
        }
        for (const foundation of FOUNDATION_IDS) {
          if (foundationAccepts(state.piles[foundation].cards, card))
            moves.push({ type: 'transfer', from: source.id, to: foundation, cardIds: idsToMove });
        }
      }
    }
  }
  if (rules.recycle && state.piles.stock.cards.length)
    moves.push({ type: 'draw', from: 'stock', to: 'waste', count: 1 });
  else if (rules.recycle && state.piles.waste.cards.length)
    moves.push({ type: 'recycle', from: 'waste', to: 'stock' });
  return moves;
}

function applyWaveMove(state: GameState, move: Move, rules: WaveRules): ApplyResult {
  const legal = legalMovesFor(state, rules);
  return legal.some((candidate) => sameMove(candidate, move))
    ? applyWaveMoveUnchecked(state, move)
    : { state, error: 'Illegal move' };
}

function applyWaveMoveUnchecked(state: GameState, move: Move): ApplyResult {
  if (move.type === 'transfer') {
    const result = transfer(state, move.from, move.to, move.cardIds);
    if (result.error) return result;
    const next = result.state;
    if (FOUNDATION_IDS.every((id) => next.piles[id].cards.length === 13)) next.status = 'won';
    return { state: next };
  }
  if (move.type === 'draw') {
    const next = cloneState(state);
    const card = next.piles.stock.cards.pop();
    if (!card) return { state, error: 'Cannot draw' };
    card.faceUp = true;
    next.piles.waste.cards.push(card);
    next.moveCount += 1;
    return { state: next };
  }
  if (move.type === 'recycle') {
    const next = cloneState(state);
    const waste = next.piles.waste.cards.splice(0);
    waste.reverse().forEach((card) => {
      card.faceUp = false;
      next.piles.stock.cards.push(card);
    });
    next.moveCount += 1;
    return { state: next };
  }
  return { state, error: 'Illegal move' };
}

function makeDefinition(rules: WaveRules): GameDefinition {
  return {
    id: rules.id,
    name: rules.name,
    decks: 1,
    create(seed = DEFAULT_SEED) {
      return createState(rules, seed);
    },
    legalMoves(state) {
      return legalMovesFor(state, rules);
    },
    applyMove(state, move) {
      return applyWaveMove(state, move, rules);
    },
    hint(state) {
      return legalMovesFor(state, rules)[0];
    },
    isWon(state) {
      return FOUNDATION_IDS.every((id) => state.piles[id].cards.length === 13);
    },
  };
}

export const penguin = makeDefinition(RULES[0]);
export const beleagueredCastle = makeDefinition(RULES[1]);
export const citadel = makeDefinition(RULES[2]);
export const fortress = makeDefinition(RULES[3]);
export const chessboard = makeDefinition(RULES[4]);
export const streetsAndAlleys = makeDefinition(RULES[5]);
export const bakersDozen = makeDefinition(RULES[6]);
export const castlesInSpain = makeDefinition(RULES[7]);
export const bisley = makeDefinition(RULES[8]);
export const flowerGarden = makeDefinition(RULES[9]);
export const laBelleLucie = makeDefinition(RULES[10]);
export const shamrocks = makeDefinition(RULES[11]);
export const trefoil = makeDefinition(RULES[12]);
export const bearRiver = makeDefinition(RULES[13]);
export const cruel = makeDefinition(RULES[14]);
export const canister = makeDefinition(RULES[15]);

export const OPEN_CELL_WAVE_GAMES = {
  penguin,
  beleagueredCastle,
  citadel,
  fortress,
  chessboard,
  streetsAndAlleys,
  bakersDozen,
  castlesInSpain,
  bisley,
  flowerGarden,
  laBelleLucie,
  shamrocks,
  trefoil,
  bearRiver,
  cruel,
  canister,
} as const;

export type OpenCellWaveGameId = keyof typeof OPEN_CELL_WAVE_GAMES;
