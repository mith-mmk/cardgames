import { ApplyResult, Card, GameDefinition, GameState, Move, cardColor } from './types';
import { cloneState, draw, makeState, pile, top, transfer } from './core';
import { shuffledDeck } from './random';

const DEFAULT_SEED = 'solitaire-default';

type BuildRule = 'same-suit' | 'alternate-color' | 'any-adjacent';

interface SpiderFamilyRules {
  id: string;
  name: string;
  decks: 1 | 2;
  tableauSizes: readonly number[];
  build: BuildRule;
  moveRuns: boolean;
  stockDeal?: number;
  redeals?: number;
  removeRuns?: boolean;
  foundationCount?: number;
  emptyColumn: 'any' | 'king';
  special?: string;
}

/*
 * These definitions intentionally describe the physical deal and the move
 * kernel as data.  The renderer can therefore use the same layout contract
 * for all nine games while each game keeps its own stable id and deal.
 */
const RULES: readonly SpiderFamilyRules[] = [
  {
    id: 'beetle',
    name: 'Beetle',
    decks: 2,
    tableauSizes: [11, 11, 11, 11, 10, 10, 10, 10, 10, 10],
    build: 'same-suit',
    moveRuns: true,
    removeRuns: true,
    emptyColumn: 'any',
    special: 'all cards are dealt face up into ten columns',
  },
  {
    id: 'curds-and-whey',
    name: 'Curds and Whey',
    decks: 2,
    tableauSizes: [...Array(8).fill(9), ...Array(4).fill(8)],
    build: 'same-suit',
    moveRuns: true,
    removeRuns: true,
    emptyColumn: 'any',
    special: 'twelve fully exposed eight-card piles',
  },
  {
    id: 'mrs-mop',
    name: 'Mrs Mop',
    decks: 2,
    tableauSizes: Array(13).fill(8),
    build: 'same-suit',
    moveRuns: true,
    removeRuns: true,
    emptyColumn: 'any',
    special: 'thirteen fully exposed eight-card piles',
  },
  {
    id: 'russian-solitaire',
    name: 'Russian Solitaire',
    decks: 1,
    tableauSizes: [1, 6, 7, 8, 9, 10, 11],
    build: 'same-suit',
    moveRuns: true,
    foundationCount: 4,
    emptyColumn: 'king',
    special: 'Yukon-style deal with same-suit tableau building',
  },
  {
    id: 'alaska',
    name: 'Alaska',
    decks: 1,
    tableauSizes: [1, 6, 7, 8, 9, 10, 11],
    build: 'any-adjacent',
    moveRuns: true,
    foundationCount: 4,
    emptyColumn: 'king',
    special: 'Yukon-style deal with either-direction adjacent building',
  },
  {
    id: 'brisbane',
    name: 'Brisbane',
    decks: 1,
    tableauSizes: Array(7).fill(5),
    build: 'alternate-color',
    moveRuns: true,
    stockDeal: 1,
    redeals: 1,
    foundationCount: 4,
    emptyColumn: 'king',
    special: 'seven five-card columns with a one-card stock',
  },
  {
    id: 'applegate',
    name: 'Applegate',
    decks: 2,
    tableauSizes: Array(8).fill(6),
    build: 'same-suit',
    moveRuns: true,
    stockDeal: 8,
    redeals: 1,
    removeRuns: true,
    emptyColumn: 'any',
    special: 'eight-card additions from the stock',
  },
  {
    id: 'miss-milligan',
    name: 'Miss Milligan',
    decks: 2,
    tableauSizes: Array(8).fill(6),
    build: 'alternate-color',
    moveRuns: true,
    stockDeal: 8,
    redeals: 3,
    foundationCount: 8,
    emptyColumn: 'king',
    special: 'eight-card tableau deal on each stock turn',
  },
  {
    id: 'interchange',
    name: 'Interchange',
    decks: 2,
    tableauSizes: Array(8).fill(6),
    build: 'same-suit',
    moveRuns: false,
    stockDeal: 8,
    redeals: 0,
    foundationCount: 8,
    emptyColumn: 'any',
    special: 'single-card same-suit play with eight-card deals',
  },
] as const;

function tableauIds(rules: SpiderFamilyRules): string[] {
  return rules.tableauSizes.map((_, index) => `t${index}`);
}

function foundationIds(rules: SpiderFamilyRules): string[] {
  return Array.from({ length: rules.foundationCount ?? 0 }, (_, index) => `f${index}`);
}

function cardIds(move: Move): string[] {
  return 'cardIds' in move ? move.cardIds : [];
}

function sameMove(a: Move, b: Move): boolean {
  if (a.type !== b.type || a.from !== b.from || a.to !== b.to) return false;
  if (a.type === 'draw' && b.type === 'draw') return (a.count ?? 1) === (b.count ?? 1);
  if (a.type === 'recycle' && b.type === 'recycle') return true;
  return (
    'cardIds' in a && 'cardIds' in b && JSON.stringify(a.cardIds) === JSON.stringify(b.cardIds)
  );
}

function canBuild(
  card: Card,
  destination: Card | undefined,
  rule: BuildRule,
  empty: 'any' | 'king',
) {
  if (!destination) return empty === 'any' || card.rank === 13;
  if (rule === 'same-suit')
    return destination.rank === card.rank + 1 && destination.suit === card.suit;
  if (rule === 'alternate-color')
    return destination.rank === card.rank + 1 && cardColor(destination) !== cardColor(card);
  return Math.abs(destination.rank - card.rank) === 1;
}

function validRun(cards: readonly Card[], start: number, rule: BuildRule): boolean {
  if (start < 0 || start >= cards.length || !cards[start].faceUp) return false;
  for (let index = start + 1; index < cards.length; index += 1) {
    const previous = cards[index - 1];
    const current = cards[index];
    if (!current.faceUp) return false;
    if (rule === 'same-suit') {
      if (previous.rank !== current.rank + 1 || previous.suit !== current.suit) return false;
    } else if (rule === 'alternate-color') {
      if (previous.rank !== current.rank + 1 || cardColor(previous) === cardColor(current))
        return false;
    } else if (Math.abs(previous.rank - current.rank) !== 1) {
      return false;
    }
  }
  return true;
}

function foundationAccepts(foundation: readonly Card[], card: Card): boolean {
  return (
    card.rank === foundation.length + 1 && (!foundation.length || foundation[0].suit === card.suit)
  );
}

function isCompleteRun(cards: readonly Card[]): boolean {
  return (
    cards.length >= 13 &&
    cards
      .slice(-13)
      .every(
        (card, index, run) => card.faceUp && card.suit === run[0].suit && card.rank === 13 - index,
      )
  );
}

function createState(rules: SpiderFamilyRules, seed: string): GameState {
  const deck = shuffledDeck(seed, rules.decks);
  const tableaus = tableauIds(rules);
  const foundations = foundationIds(rules);
  const hasStock = rules.stockDeal !== undefined;
  const piles = [
    ...(hasStock ? [pile('stock', 'stock'), pile('waste', 'waste')] : []),
    pile('removed', 'removed'),
    ...foundations.map((id) => pile(id, 'foundation')),
    ...tableaus.map((id) => pile(id, 'tableau')),
  ];
  let cursor = 0;
  for (const [column, count] of rules.tableauSizes.entries()) {
    const target = piles.find((candidate) => candidate.id === tableaus[column])!;
    for (let row = 0; row < count && cursor < deck.length; row += 1) {
      const card = deck[cursor++];
      card.faceUp = true;
      target.cards.push(card);
    }
  }
  if (hasStock) {
    for (; cursor < deck.length; cursor += 1) {
      const card = deck[cursor];
      card.faceUp = false;
      piles.find((candidate) => candidate.id === 'stock')!.cards.push(card);
    }
  } else if (cursor !== deck.length) {
    // The no-stock layouts intentionally deal every card; this guard keeps a
    // future layout typo visible while preserving the complete-card invariant.
    throw new Error(`${rules.id} deal does not consume the deck`);
  }
  return makeState(rules.id, seed, piles, { options: rules, redeals: 0 });
}

function legalMovesFor(state: GameState, rules: SpiderFamilyRules): Move[] {
  const moves: Move[] = [];
  const tableaus = tableauIds(rules).map((id) => state.piles[id]);
  const foundations = foundationIds(rules);
  for (const source of tableaus) {
    if (!source.cards.length) continue;
    const first = rules.moveRuns ? 0 : source.cards.length - 1;
    for (let start = source.cards.length - 1; start >= first; start -= 1) {
      if (rules.moveRuns && !validRun(source.cards, start, rules.build)) continue;
      const card = source.cards[start];
      const selected = source.cards.slice(start);
      for (const target of tableaus) {
        if (target.id === source.id || !canBuild(card, top(target), rules.build, rules.emptyColumn))
          continue;
        moves.push({
          type: 'transfer',
          from: source.id,
          to: target.id,
          cardIds: selected.map((item) => item.id),
        });
      }
      if (selected.length === 1) {
        for (const foundation of foundations) {
          if (foundationAccepts(state.piles[foundation].cards, card))
            moves.push({ type: 'transfer', from: source.id, to: foundation, cardIds: [card.id] });
        }
      }
    }
  }
  if (state.piles.waste?.cards.length) {
    const source = state.piles.waste;
    const card = top(source)!;
    for (const target of tableaus) {
      if (canBuild(card, top(target), rules.build, rules.emptyColumn))
        moves.push({ type: 'transfer', from: source.id, to: target.id, cardIds: [card.id] });
    }
    for (const foundation of foundations) {
      if (foundationAccepts(state.piles[foundation].cards, card))
        moves.push({ type: 'transfer', from: source.id, to: foundation, cardIds: [card.id] });
    }
  }
  if (state.piles.stock?.cards.length)
    moves.push({
      type: 'draw',
      from: 'stock',
      to: 'waste',
      count: Math.min(rules.stockDeal ?? 1, state.piles.stock.cards.length),
    });
  else if (
    state.piles.waste?.cards.length &&
    Number(state.meta.redeals ?? 0) < (rules.redeals ?? 0)
  )
    moves.push({ type: 'recycle', from: 'waste', to: 'stock' });
  return moves;
}

function complete(state: GameState, rules: SpiderFamilyRules): boolean {
  const foundations = foundationIds(rules);
  if (foundations.length) return foundations.every((id) => state.piles[id].cards.length === 13);
  return state.piles.removed.cards.length === rules.decks * 52;
}

function applyMoveFor(state: GameState, move: Move, rules: SpiderFamilyRules): ApplyResult {
  const legal = legalMovesFor(state, rules);
  if (!legal.some((candidate) => sameMove(candidate, move)))
    return { state, error: 'Illegal move' };
  if (move.type === 'draw')
    return draw(state, 'stock', 'waste', move.count ?? rules.stockDeal ?? 1);
  if (move.type === 'recycle') {
    const next = cloneState(state);
    const cards = next.piles.waste.cards.splice(0).reverse();
    cards.forEach((card) => {
      card.faceUp = false;
      next.piles.stock.cards.push(card);
    });
    next.meta.redeals = Number(next.meta.redeals ?? 0) + 1;
    next.moveCount += 1;
    return { state: next };
  }
  const result = transfer(state, move.from, move.to, cardIds(move));
  if (result.error) return result;
  const next = result.state;
  if (move.from.startsWith('t')) {
    const previous = next.piles[move.from].cards.at(-1);
    if (previous) previous.faceUp = true;
  }
  if (rules.removeRuns && move.to.startsWith('t') && isCompleteRun(next.piles[move.to].cards)) {
    const removed = next.piles[move.to].cards.splice(-13, 13);
    next.piles.removed.cards.push(...removed);
  }
  if (complete(next, rules)) next.status = 'won';
  return { state: next };
}

function createDefinition(rules: SpiderFamilyRules): GameDefinition {
  return {
    id: rules.id,
    name: rules.name,
    decks: rules.decks,
    create(seed = DEFAULT_SEED) {
      return createState(rules, seed);
    },
    legalMoves(state) {
      return legalMovesFor(state, rules);
    },
    applyMove(state, move) {
      return applyMoveFor(state, move, rules);
    },
    hint(state) {
      return legalMovesFor(state, rules)[0];
    },
    isWon(state) {
      return complete(state, rules);
    },
  };
}

export const beetle = createDefinition(RULES[0]);
export const curdsAndWhey = createDefinition(RULES[1]);
export const mrsMop = createDefinition(RULES[2]);
export const russianSolitaire = createDefinition(RULES[3]);
export const alaska = createDefinition(RULES[4]);
export const brisbane = createDefinition(RULES[5]);
export const applegate = createDefinition(RULES[6]);
export const missMilligan = createDefinition(RULES[7]);
export const interchange = createDefinition(RULES[8]);

export const SPIDER_FAMILY_WAVE_GAMES = {
  beetle,
  curdsAndWhey,
  mrsMop,
  russianSolitaire,
  alaska,
  brisbane,
  applegate,
  missMilligan,
  interchange,
} as const;

export type SpiderFamilyWaveGameId = keyof typeof SPIDER_FAMILY_WAVE_GAMES;

export function getSpiderFamilyWaveGameDefinition(id: SpiderFamilyWaveGameId): GameDefinition {
  return SPIDER_FAMILY_WAVE_GAMES[id];
}
