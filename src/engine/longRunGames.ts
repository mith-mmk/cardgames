import { ApplyResult, Card, GameDefinition, GameState, Move, cardColor } from './types';
import { cloneState, draw, faceUpRun, makeState, pile, top, transfer } from './core';
import { shuffledDeck } from './random';

const DEFAULT_SEED = 'solitaire-default';

function sameMove(a: Move, b: Move): boolean {
  if (a.type !== b.type || a.from !== b.from || a.to !== b.to) return false;
  if (a.type === 'draw' && b.type === 'draw') return (a.count ?? 1) === (b.count ?? 1);
  if (a.type === 'recycle' && b.type === 'recycle') return true;
  if ('cardIds' in a && 'cardIds' in b)
    return JSON.stringify(a.cardIds) === JSON.stringify(b.cardIds);
  return false;
}

function checked(state: GameState, move: Move, legal: Move[], fn: () => ApplyResult): ApplyResult {
  return legal.some((candidate) => sameMove(candidate, move))
    ? fn()
    : { state, error: 'Illegal move' };
}

function moveCardIds(move: Move): string[] {
  return 'cardIds' in move ? move.cardIds : [];
}

function mark(state: GameState, won: boolean): GameState {
  const next = cloneState(state);
  if (won) next.status = 'won';
  return next;
}

function reveal(pileToReveal: { cards: Card[] }): void {
  const card = pileToReveal.cards[pileToReveal.cards.length - 1];
  if (card && !card.faceUp) card.faceUp = true;
}

function foundationMove(
  state: GameState,
  from: string,
  card: Card | undefined,
  foundationIds: string[],
): Move[] {
  if (!card || !card.faceUp) return [];
  return foundationIds
    .filter((id) => {
      const foundation = state.piles[id];
      const foundationTop = top(foundation);
      return foundationTop
        ? foundationTop.suit === card.suit && card.rank === foundationTop.rank + 1
        : card.rank === 1;
    })
    .map((to) => ({ type: 'transfer', from, to, cardIds: [card.id] }));
}

function descendingTableauMove(
  src: Card,
  dest: Card | undefined,
  alternatingColors: boolean,
  sameSuit: boolean,
): boolean {
  if (!dest) return true;
  return (
    dest.rank === src.rank + 1 &&
    (sameSuit
      ? dest.suit === src.suit
      : alternatingColors
        ? cardColor(dest) !== cardColor(src)
        : true)
  );
}

function completedSpideretteRun(cards: Card[]): boolean {
  return (
    cards.length >= 13 &&
    faceUpRun(cards, cards.length - 13, true) &&
    cards[cards.length - 13].rank === 13
  );
}

/** Spiderette: one deck, seven tableau piles, no redeal. */
export const spiderette: GameDefinition = {
  id: 'spiderette',
  name: 'Spiderette',
  decks: 1,
  create(seed = DEFAULT_SEED): GameState {
    const deck = shuffledDeck(seed);
    const piles = [
      pile('stock', 'stock'),
      pile('removed', 'removed'),
      ...Array.from({ length: 7 }, (_, i) => pile(`t${i}`, 'tableau')),
    ];
    let cardIndex = 0;
    for (let column = 0; column < 7; column += 1) {
      const tableau = piles.find((candidate) => candidate.id === `t${column}`)!;
      for (let row = 0; row <= column; row += 1) {
        const card = deck[cardIndex++];
        card.faceUp = row === column;
        tableau.cards.push(card);
      }
    }
    deck.slice(cardIndex).forEach((card) => piles[0].cards.push(card));
    return makeState('spiderette', seed, piles);
  },
  legalMoves(state) {
    const moves: Move[] = [];
    const tableaus = Array.from({ length: 7 }, (_, i) => state.piles[`t${i}`]);
    for (const source of tableaus) {
      for (let start = 0; start < source.cards.length; start += 1) {
        if (!faceUpRun(source.cards, start, true)) continue;
        const card = source.cards[start];
        for (const destination of tableaus) {
          if (destination.id === source.id) continue;
          if (descendingTableauMove(card, top(destination), false, false))
            moves.push({
              type: 'transfer',
              from: source.id,
              to: destination.id,
              cardIds: source.cards.slice(start).map((candidate) => candidate.id),
            });
        }
      }
    }
    if (state.piles.stock.cards.length && tableaus.every((tableau) => tableau.cards.length > 0))
      moves.push({
        type: 'draw',
        from: 'stock',
        to: 'tableau',
        count: Math.min(7, state.piles.stock.cards.length),
      });
    return moves;
  },
  applyMove(state, move) {
    return checked(state, move, this.legalMoves(state), () => {
      if (move.type === 'draw') {
        const next = cloneState(state);
        const count = Math.min(7, next.piles.stock.cards.length);
        for (let i = 0; i < count; i += 1) {
          const card = next.piles.stock.cards.pop()!;
          card.faceUp = true;
          next.piles[`t${i}`].cards.push(card);
        }
        next.moveCount += 1;
        return { state: next };
      }
      const result = transfer(state, move.from, move.to, moveCardIds(move));
      if (result.error) return result;
      reveal(result.state.piles[move.from]);
      const destination = result.state.piles[move.to];
      if (completedSpideretteRun(destination.cards)) {
        const completed = destination.cards.splice(-13, 13);
        result.state.piles.removed.cards.push(...completed);
        reveal(destination);
      }
      return { state: mark(result.state, this.isWon(result.state)) };
    });
  },
  hint: (state) => spiderette.legalMoves(state)[0],
  isWon: (state) => state.piles.removed.cards.length === 52,
};

const yukonLengths = [1, 6, 7, 8, 9, 10, 11] as const;

/** Yukon: no stock; any exposed face-up suffix may be moved. */
export const yukon: GameDefinition = {
  id: 'yukon',
  name: 'Yukon',
  decks: 1,
  create(seed = DEFAULT_SEED): GameState {
    const deck = shuffledDeck(seed);
    const piles = [
      ...Array.from({ length: 4 }, (_, i) => pile(`f${i}`, 'foundation')),
      ...Array.from({ length: 7 }, (_, i) => pile(`t${i}`, 'tableau')),
    ];
    let cardIndex = 0;
    yukonLengths.forEach((length, column) => {
      const tableau = piles.find((candidate) => candidate.id === `t${column}`)!;
      for (let row = 0; row < length; row += 1) {
        const card = deck[cardIndex++];
        card.faceUp = row >= length - 5;
        tableau.cards.push(card);
      }
    });
    return makeState('yukon', seed, piles);
  },
  legalMoves(state) {
    const moves: Move[] = [];
    const tableaus = Array.from({ length: 7 }, (_, i) => state.piles[`t${i}`]);
    for (const source of tableaus) {
      for (let start = 0; start < source.cards.length; start += 1) {
        const card = source.cards[start];
        if (!card.faceUp || !source.cards.slice(start).every((candidate) => candidate.faceUp))
          continue;
        for (const destination of tableaus) {
          if (destination.id === source.id) continue;
          if (descendingTableauMove(card, top(destination), true, false))
            moves.push({
              type: 'transfer',
              from: source.id,
              to: destination.id,
              cardIds: source.cards.slice(start).map((candidate) => candidate.id),
            });
        }
      }
      moves.push(...foundationMove(state, source.id, top(source), ['f0', 'f1', 'f2', 'f3']));
    }
    return moves;
  },
  applyMove(state, move) {
    return checked(state, move, this.legalMoves(state), () => {
      const result = transfer(state, move.from, move.to, moveCardIds(move));
      if (result.error) return result;
      if (move.from.startsWith('t')) reveal(result.state.piles[move.from]);
      return { state: mark(result.state, this.isWon(result.state)) };
    });
  },
  hint: (state) => yukon.legalMoves(state)[0],
  isWon: (state) => [0, 1, 2, 3].every((i) => state.piles[`f${i}`].cards.length === 13),
};

const fortyThievesFoundations = Array.from({ length: 8 }, (_, i) => `f${i}`);

/** Forty Thieves: two decks, strict one-card tableau moves, one stock pass. */
export const fortyThieves: GameDefinition = {
  id: 'forty-thieves',
  name: 'Forty Thieves',
  decks: 2,
  create(seed = DEFAULT_SEED): GameState {
    const deck = shuffledDeck(seed, 2);
    const piles = [
      pile('stock', 'stock'),
      pile('waste', 'waste'),
      ...fortyThievesFoundations.map((id) => pile(id, 'foundation')),
      ...Array.from({ length: 10 }, (_, i) => pile(`t${i}`, 'tableau')),
    ];
    deck.slice(0, 40).forEach((card, index) => {
      card.faceUp = true;
      piles.find((candidate) => candidate.id === `t${index % 10}`)!.cards.push(card);
    });
    deck.slice(40).forEach((card) => piles[0].cards.push(card));
    return makeState('forty-thieves', seed, piles);
  },
  legalMoves(state) {
    const moves: Move[] = [];
    const tableaus = Array.from({ length: 10 }, (_, i) => state.piles[`t${i}`]);
    const sources = [...tableaus, state.piles.waste];
    for (const source of sources) {
      const card = top(source);
      if (!card) continue;
      for (const destination of tableaus) {
        if (destination.id === source.id) continue;
        if (descendingTableauMove(card, top(destination), false, true))
          moves.push({ type: 'transfer', from: source.id, to: destination.id, cardIds: [card.id] });
      }
      moves.push(...foundationMove(state, source.id, card, fortyThievesFoundations));
    }
    if (state.piles.stock.cards.length)
      moves.push({ type: 'draw', from: 'stock', to: 'waste', count: 1 });
    return moves;
  },
  applyMove(state, move) {
    return checked(state, move, this.legalMoves(state), () => {
      const result =
        move.type === 'draw'
          ? draw(state, 'stock', 'waste')
          : transfer(state, move.from, move.to, moveCardIds(move));
      return {
        state: mark(result.state, this.isWon(result.state)),
        error: result.error,
      };
    });
  },
  hint: (state) => fortyThieves.legalMoves(state)[0],
  isWon: (state) => fortyThievesFoundations.every((id) => state.piles[id].cards.length === 13),
};

export const LONG_RUN_GAME_DEFINITIONS = {
  spiderette,
  yukon,
  fortyThieves,
} as const;

export type LongRunGameId = keyof typeof LONG_RUN_GAME_DEFINITIONS;

export function getLongRunGameDefinition(id: LongRunGameId): GameDefinition {
  return LONG_RUN_GAME_DEFINITIONS[id];
}
