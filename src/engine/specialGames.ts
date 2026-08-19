import { ApplyResult, Card, GameDefinition, GameState, Move, cardColor } from './types';
import { cloneState, draw, makeState, pile, top, transfer } from './core';
import { shuffledDeck } from './random';

type FoundationRule = 'standard' | 'deuces' | 'descending' | 'calculation' | 'osmosis';
type TableauBuild = 'alternate' | 'same-suit' | 'any';

interface SpecialRules {
  readonly id: string;
  readonly name: string;
  readonly decks: 1 | 2;
  readonly layout: string;
  readonly tableauSizes: readonly number[];
  readonly foundationCount: number;
  readonly foundationRule: FoundationRule;
  readonly build: TableauBuild;
  readonly reserveCount?: number;
  readonly allFaceUp?: boolean;
  readonly stock?: boolean;
  readonly moveRuns?: boolean;
}

const DEFAULT_SEED = 'solitaire-default';

const RULES: readonly SpecialRules[] = [
  { id: 'busy-aces', name: 'Busy Aces', decks: 1, layout: 'busy-aces', tableauSizes: Array(8).fill(4), foundationCount: 4, foundationRule: 'standard', build: 'alternate', stock: true },
  { id: 'deuces', name: 'Deuces', decks: 1, layout: 'deuces', tableauSizes: Array(7).fill(4), foundationCount: 4, foundationRule: 'deuces', build: 'alternate', stock: true },
  { id: 'aces-and-kings', name: 'Aces and Kings', decks: 1, layout: 'aces-and-kings', tableauSizes: Array(8).fill(4), foundationCount: 8, foundationRule: 'descending', build: 'alternate', stock: true },
  { id: 'tournament', name: 'Tournament', decks: 2, layout: 'tournament', tableauSizes: Array(8).fill(5), foundationCount: 8, foundationRule: 'standard', build: 'same-suit', stock: true },
  { id: 'colorado', name: 'Colorado', decks: 1, layout: 'colorado', tableauSizes: [1, 2, 3, 4, 5, 6, 7], foundationCount: 4, foundationRule: 'standard', build: 'alternate', stock: true },
  { id: 'crescent', name: 'Crescent', decks: 2, layout: 'crescent', tableauSizes: Array(16).fill(4), foundationCount: 8, foundationRule: 'standard', build: 'same-suit', stock: true, moveRuns: false },
  { id: 'crazy-quilt', name: 'Crazy Quilt', decks: 2, layout: 'grid', tableauSizes: Array(13).fill(8), foundationCount: 8, foundationRule: 'standard', build: 'alternate', allFaceUp: true, moveRuns: false },
  { id: 'windmill', name: 'Windmill', decks: 2, layout: 'windmill', tableauSizes: Array(8).fill(4), foundationCount: 8, foundationRule: 'standard', build: 'same-suit', stock: true, moveRuns: false },
  { id: 'sultan', name: 'Sultan', decks: 2, layout: 'sultan', tableauSizes: Array(8).fill(4), foundationCount: 8, foundationRule: 'descending', build: 'alternate', reserveCount: 8, stock: true, moveRuns: false },
  { id: 'algerian-patience', name: 'Algerian Patience', decks: 2, layout: 'algerian', tableauSizes: Array(8).fill(4), foundationCount: 8, foundationRule: 'descending', build: 'alternate', reserveCount: 8, stock: true, moveRuns: true },
  { id: 'indian', name: 'Indian', decks: 2, layout: 'indian', tableauSizes: Array(10).fill(4), foundationCount: 8, foundationRule: 'standard', build: 'alternate', stock: true, moveRuns: true },
  { id: 'gypsy', name: 'Gypsy', decks: 2, layout: 'gypsy', tableauSizes: Array(8).fill(4), foundationCount: 8, foundationRule: 'standard', build: 'alternate', stock: true, moveRuns: true },
  { id: 'carthage', name: 'Carthage', decks: 1, layout: 'carthage', tableauSizes: Array(8).fill(4), foundationCount: 4, foundationRule: 'standard', build: 'alternate', stock: true, moveRuns: false },
  { id: 'carpet', name: 'Carpet', decks: 1, layout: 'carpet', tableauSizes: Array(10).fill(4), foundationCount: 4, foundationRule: 'standard', build: 'alternate', reserveCount: 8, stock: true, moveRuns: false },
  { id: 'bristol', name: 'Bristol', decks: 1, layout: 'bristol', tableauSizes: Array(8).fill(4), foundationCount: 4, foundationRule: 'standard', build: 'any', stock: true, moveRuns: false },
  { id: 'sir-tommy', name: 'Sir Tommy', decks: 1, layout: 'sir-tommy', tableauSizes: Array(7).fill(4), foundationCount: 4, foundationRule: 'standard', build: 'any', stock: true, moveRuns: false },
  { id: 'auld-lang-syne', name: 'Auld Lang Syne', decks: 1, layout: 'auld-lang-syne', tableauSizes: Array(4).fill(4), foundationCount: 4, foundationRule: 'standard', build: 'same-suit', stock: true, moveRuns: false },
  { id: 'osmosis', name: 'Osmosis', decks: 1, layout: 'osmosis', tableauSizes: Array(7).fill(4), foundationCount: 4, foundationRule: 'osmosis', build: 'alternate', stock: true, moveRuns: false },
  { id: 'four-seasons', name: 'Four Seasons', decks: 1, layout: 'cross', tableauSizes: Array(12).fill(3), foundationCount: 4, foundationRule: 'standard', build: 'alternate', reserveCount: 4, stock: true, moveRuns: false },
];

function sameMove(a: Move, b: Move): boolean {
  if (a.type !== b.type || a.from !== b.from || a.to !== b.to) return false;
  if (a.type === 'draw' && b.type === 'draw') return (a.count ?? 1) === (b.count ?? 1);
  if (a.type === 'recycle' && b.type === 'recycle') return true;
  if ('cardIds' in a && 'cardIds' in b) return JSON.stringify(a.cardIds) === JSON.stringify(b.cardIds);
  return false;
}

function foundationExpected(rule: FoundationRule, foundationIndex: number, length: number): number {
  if (rule === 'deuces') return ((length + 1) % 13) + 1;
  if (rule === 'descending') return foundationIndex < 4 ? length + 1 : 13 - length;
  if (rule === 'calculation') return ((length * (foundationIndex + 1)) % 13) + 1;
  return length + 1;
}

function foundationAccepts(state: GameState, rules: SpecialRules, id: string, card: Card): boolean {
  const foundation = state.piles[id];
  const index = Number(id.slice(1));
  if (!foundation) return false;
  if (rules.foundationRule === 'osmosis' && index > 0) {
    const base = top(state.piles.f0);
    return Boolean(base && card.rank === base.rank && foundation.cards.length < 13);
  }
  const expected = foundationExpected(rules.foundationRule, index, foundation.cards.length);
  if (card.rank !== expected) return false;
  if (!foundation.cards.length) {
    const sameSuit = Object.values(state.piles).filter(
      (candidate) => candidate.kind === 'foundation' && top(candidate)?.suit === card.suit,
    ).length;
    return sameSuit < rules.decks;
  }
  return top(foundation)?.suit === card.suit;
}

function canBuild(card: Card, target: Card | undefined, build: TableauBuild): boolean {
  if (!target) return card.rank === 13;
  if (target.rank !== card.rank + 1) return false;
  if (build === 'same-suit') return target.suit === card.suit;
  if (build === 'alternate') return cardColor(target) !== cardColor(card);
  return true;
}

function runIsValid(cards: readonly Card[], start: number, rules: SpecialRules): boolean {
  if (!rules.moveRuns && start !== cards.length - 1) return false;
  for (let index = start; index < cards.length; index += 1) {
    if (!cards[index].faceUp) return false;
    if (index > start && !canBuild(cards[index], cards[index - 1], rules.build)) return false;
  }
  return true;
}

function createState(rules: SpecialRules, seed: string): GameState {
  const deck = shuffledDeck(seed, rules.decks);
  const foundationIds = Array.from({ length: rules.foundationCount }, (_, index) => `f${index}`);
  const tableauIds = rules.tableauSizes.map((_, index) => `t${index}`);
  const reserveIds = Array.from({ length: rules.reserveCount ?? 0 }, (_, index) => `r${index}`);
  const piles = [
    ...foundationIds.map((id) => pile(id, 'foundation')),
    ...tableauIds.map((id) => pile(id, 'tableau')),
    ...reserveIds.map((id) => pile(id, 'reserve')),
    ...(rules.stock ? [pile('stock', 'stock'), pile('waste', 'waste')] : []),
    ...(rules.id === 'osmosis' ? [pile('removed', 'removed')] : []),
  ];
  let cursor = 0;
  rules.tableauSizes.forEach((size, tableauIndex) => {
    const target = piles.find((candidate) => candidate.id === `t${tableauIndex}`)!;
    for (let row = 0; row < size; row += 1) {
      const card = deck[cursor++];
      card.faceUp = Boolean(rules.allFaceUp) || row === size - 1;
      target.cards.push(card);
    }
  });
  reserveIds.forEach((id) => {
    const card = deck[cursor++];
    if (card) {
      card.faceUp = true;
      piles.find((candidate) => candidate.id === id)!.cards.push(card);
    }
  });
  if (rules.stock) {
    const stock = piles.find((candidate) => candidate.id === 'stock')!;
    deck.slice(cursor).forEach((card) => {
      card.faceUp = false;
      stock.cards.push(card);
    });
  }
  return makeState(rules.id, seed, piles, {
    options: { layout: rules.layout, tableauSizes: rules.tableauSizes, foundationRule: rules.foundationRule },
    layout: { type: rules.layout, tableauCount: tableauIds.length, foundationCount: rules.foundationCount, reserveCount: reserveIds.length, wide: rules.decks === 2 },
  });
}

function legalMovesFor(state: GameState, rules: SpecialRules): Move[] {
  const moves: Move[] = [];
  const tableaus = rules.tableauSizes.map((_, index) => state.piles[`t${index}`]);
  const reserves = Array.from({ length: rules.reserveCount ?? 0 }, (_, index) => state.piles[`r${index}`]);
  const sources = [...tableaus, ...reserves, ...(state.piles.waste ? [state.piles.waste] : [])];
  for (const source of sources) {
    if (!source.cards.length) continue;
    const first = source.kind === 'tableau' && rules.moveRuns ? 0 : source.cards.length - 1;
    for (let start = source.cards.length - 1; start >= first; start -= 1) {
      if (source.kind === 'tableau' && !runIsValid(source.cards, start, rules)) continue;
      const card = source.cards[start];
      const ids = source.cards.slice(start).map((item) => item.id);
      for (const destination of tableaus) {
        if (destination.id !== source.id && canBuild(card, top(destination), rules.build))
          moves.push({ type: 'transfer', from: source.id, to: destination.id, cardIds: ids });
      }
      if (ids.length === 1) {
        for (let index = 0; index < rules.foundationCount; index += 1) {
          const foundationId = `f${index}`;
          if (foundationAccepts(state, rules, foundationId, card))
            moves.push({ type: 'transfer', from: source.id, to: foundationId, cardIds: ids });
        }
      }
    }
  }
  if (rules.stock && state.piles.stock.cards.length)
    moves.push({ type: 'draw', from: 'stock', to: 'waste', count: 1 });
  else if (rules.stock && state.piles.waste.cards.length)
    moves.push({ type: 'recycle', from: 'waste', to: 'stock' });
  return moves;
}

function makeDefinition(rules: SpecialRules): GameDefinition {
  const definition: GameDefinition = {
    id: rules.id,
    name: rules.name,
    decks: rules.decks,
    create(seed = DEFAULT_SEED): GameState {
      return createState(rules, seed);
    },
    legalMoves(state): Move[] {
      return legalMovesFor(state, rules);
    },
    applyMove(state, move): ApplyResult {
      if (!legalMovesFor(state, rules).some((candidate) => sameMove(candidate, move)))
        return { state, error: 'Illegal move' };
      if (move.type === 'draw') return draw(state, 'stock', 'waste', move.count ?? 1);
      if (move.type === 'recycle') {
        const next = cloneState(state);
        const cards = next.piles.waste.cards.splice(0).reverse();
        cards.forEach((card) => {
          card.faceUp = false;
          next.piles.stock.cards.push(card);
        });
        next.moveCount += 1;
        return { state: next };
      }
      const result = transfer(state, move.from, move.to, 'cardIds' in move ? move.cardIds : []);
      if (result.error) return result;
      const next = result.state;
      if (next.piles[move.from]?.kind === 'tableau' || next.piles[move.from]?.kind === 'reserve') {
        const source = next.piles[move.from];
        const exposed = source.cards[source.cards.length - 1];
        if (exposed) exposed.faceUp = true;
      }
      if (definition.isWon(next)) next.status = 'won';
      return { state: next };
    },
    isWon(state): boolean {
      return Array.from({ length: rules.foundationCount }, (_, index) => state.piles[`f${index}`].cards.length).every((length) => length === 13);
    },
    hint(state): Move | undefined {
      return legalMovesFor(state, rules)[0];
    },
  };
  return definition;
}

export const busyAces = makeDefinition(RULES[0]);
export const deuces = makeDefinition(RULES[1]);
export const acesAndKings = makeDefinition(RULES[2]);
export const tournament = makeDefinition(RULES[3]);
export const colorado = makeDefinition(RULES[4]);
export const crescent = makeDefinition(RULES[5]);
export const crazyQuilt = makeDefinition(RULES[6]);
export const windmill = makeDefinition(RULES[7]);
export const sultan = makeDefinition(RULES[8]);
export const algerianPatience = makeDefinition(RULES[9]);
export const indian = makeDefinition(RULES[10]);
export const gypsy = makeDefinition(RULES[11]);
export const carthage = makeDefinition(RULES[12]);
export const carpet = makeDefinition(RULES[13]);
export const bristol = makeDefinition(RULES[14]);
export const sirTommy = makeDefinition(RULES[15]);
export const auldLangSyne = makeDefinition(RULES[16]);
export const osmosis = makeDefinition(RULES[17]);
export const fourSeasons = makeDefinition(RULES[18]);

export const SPECIAL_GAMES = {
  busyAces,
  deuces,
  acesAndKings,
  tournament,
  colorado,
  crescent,
  crazyQuilt,
  windmill,
  sultan,
  algerianPatience,
  indian,
  gypsy,
  carthage,
  carpet,
  bristol,
  sirTommy,
  auldLangSyne,
  osmosis,
  fourSeasons,
} as const;

export type SpecialGameId = keyof typeof SPECIAL_GAMES;
