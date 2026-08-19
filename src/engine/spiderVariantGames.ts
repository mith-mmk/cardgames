import { ApplyResult, Card, GameDefinition, GameState, Move } from './types';
import { cloneState, faceUpRun, makeState, pile, top, transfer } from './core';
import { shuffledDeck } from './random';

const DEFAULT_SEED = 'solitaire-default';
const TABLEAU_COUNT = 7;
const BLACK_WIDOW_TABLEAU_COUNT = 10;

type EmptyColumnRule = 'king' | 'any';

function sameMove(a: Move, b: Move): boolean {
  if (a.type !== b.type || a.from !== b.from || a.to !== b.to) return false;
  if (a.type === 'draw' && b.type === 'draw') return (a.count ?? 1) === (b.count ?? 1);
  if (a.type === 'recycle' && b.type === 'recycle') return true;
  if ('cardIds' in a && 'cardIds' in b)
    return JSON.stringify(a.cardIds) === JSON.stringify(b.cardIds);
  return false;
}

function checked(
  state: GameState,
  move: Move,
  legal: Move[],
  operation: () => ApplyResult,
): ApplyResult {
  return legal.some((candidate) => sameMove(candidate, move))
    ? operation()
    : { state, error: 'Illegal move' };
}

function cardIds(move: Move): string[] {
  return 'cardIds' in move ? move.cardIds : [];
}

function markWon(state: GameState, definition: GameDefinition): GameState {
  const next = cloneState(state);
  if (definition.isWon(next)) next.status = 'won';
  return next;
}

function reveal(pileToReveal: { cards: Card[] }): void {
  const card = pileToReveal.cards[pileToReveal.cards.length - 1];
  if (card && !card.faceUp) card.faceUp = true;
}

function tableauIds(count = TABLEAU_COUNT): string[] {
  return Array.from({ length: count }, (_, index) => `t${index}`);
}

function completedRun(cards: Card[]): boolean {
  return (
    cards.length >= 13 &&
    cards[cards.length - 13].rank === 13 &&
    faceUpRun(cards, cards.length - 13, true)
  );
}

function removeCompletedRuns(state: GameState, count: number): void {
  const removed = state.piles.removed;
  for (const id of tableauIds(count)) {
    const tableau = state.piles[id];
    while (completedRun(tableau.cards)) {
      removed.cards.push(...tableau.cards.splice(-13, 13));
      reveal(tableau);
    }
  }
}

function moveSourceRuns(
  state: GameState,
  emptyColumnRule: EmptyColumnRule,
  count: number,
  buildSameSuit: boolean,
  sourceMustBeSequence: boolean,
): Move[] {
  const moves: Move[] = [];
  const tableaus = tableauIds(count).map((id) => state.piles[id]);
  for (const source of tableaus) {
    for (let start = 0; start < source.cards.length; start += 1) {
      const moved = source.cards.slice(start);
      if (!moved.length || !moved[0].faceUp || !moved.every((card) => card.faceUp)) continue;
      if (sourceMustBeSequence && !faceUpRun(source.cards, start, buildSameSuit)) continue;
      const card = moved[0];
      for (const destination of tableaus) {
        if (destination.id === source.id) continue;
        const destinationTop = top(destination);
        const canBuild = destinationTop
          ? destinationTop.rank === card.rank + 1 &&
            (!buildSameSuit || destinationTop.suit === card.suit)
          : emptyColumnRule === 'any' || card.rank === 13;
        if (canBuild)
          moves.push({
            type: 'transfer',
            from: source.id,
            to: destination.id,
            cardIds: moved.map((candidate) => candidate.id),
          });
      }
    }
  }
  return moves;
}

function applyTableauTransfer(
  state: GameState,
  move: Move,
  count: number,
  definition: GameDefinition,
): ApplyResult {
  const result = transfer(state, move.from, move.to, cardIds(move));
  if (result.error) return result;
  reveal(result.state.piles[move.from]);
  removeCompletedRuns(result.state, count);
  return { state: markWon(result.state, definition) };
}

function createScorpionLikeState(
  gameId: string,
  seed: string,
  emptyColumnRule: EmptyColumnRule,
): GameState {
  const deck = shuffledDeck(seed);
  const piles = [
    pile('stock', 'stock'),
    pile('removed', 'removed'),
    ...tableauIds().map((id) => pile(id, 'tableau')),
  ];
  let cardIndex = 0;
  for (const [columnIndex, column] of tableauIds().entries()) {
    const tableau = piles.find((candidate) => candidate.id === column)!;
    for (let row = 0; row < 7; row += 1) {
      const card = deck[cardIndex++];
      card.faceUp = columnIndex < 4 ? row >= 3 : true;
      tableau.cards.push(card);
    }
  }
  deck.slice(cardIndex).forEach((card) => piles[0].cards.push(card));
  return makeState(gameId, seed, piles, { options: { emptyColumnRule } });
}

function scorpionLikeMoves(state: GameState, emptyColumnRule: EmptyColumnRule): Move[] {
  const moves = moveSourceRuns(state, emptyColumnRule, TABLEAU_COUNT, true, false);
  if (state.piles.stock.cards.length)
    moves.push({ type: 'draw', from: 'stock', to: 'tableau', count: 3 });
  return moves;
}

function applyScorpionLikeMove(
  state: GameState,
  move: Move,
  emptyColumnRule: EmptyColumnRule,
  definition: GameDefinition,
): ApplyResult {
  return checked(state, move, scorpionLikeMoves(state, emptyColumnRule), () => {
    if (move.type === 'draw') {
      const next = cloneState(state);
      for (const id of ['t0', 't1', 't2']) {
        const card = next.piles.stock.cards.pop();
        if (card) {
          card.faceUp = true;
          next.piles[id].cards.push(card);
        }
      }
      next.moveCount += 1;
      return { state: markWon(next, definition) };
    }
    return applyTableauTransfer(state, move, TABLEAU_COUNT, definition);
  });
}

/** Scorpion: one deck, seven 7-card tableaus and a one-time three-card reserve. */
export const scorpion: GameDefinition = {
  id: 'scorpion',
  name: 'Scorpion',
  decks: 1,
  create(seed = DEFAULT_SEED): GameState {
    return createScorpionLikeState('scorpion', seed, 'king');
  },
  legalMoves(state) {
    return scorpionLikeMoves(state, 'king');
  },
  applyMove(state, move) {
    return applyScorpionLikeMove(state, move, 'king', scorpion);
  },
  hint: (state) => scorpion.legalMoves(state)[0],
  isWon: (state) => state.piles.removed.cards.length === 52,
};

/** Wasp: Scorpion with any exposed card or group allowed in an empty tableau. */
export const wasp: GameDefinition = {
  id: 'wasp',
  name: 'Wasp',
  decks: 1,
  create(seed = DEFAULT_SEED): GameState {
    return createScorpionLikeState('wasp', seed, 'any');
  },
  legalMoves(state) {
    return scorpionLikeMoves(state, 'any');
  },
  applyMove(state, move) {
    return applyScorpionLikeMove(state, move, 'any', wasp);
  },
  hint: (state) => wasp.legalMoves(state)[0],
  isWon: (state) => state.piles.removed.cards.length === 52,
};

function createBlackWidowState(seed: string): GameState {
  const deck = shuffledDeck(seed, 2);
  const piles = [
    pile('stock', 'stock'),
    pile('removed', 'removed'),
    ...Array.from({ length: 8 }, (_, index) => pile(`f${index}`, 'foundation')),
    ...tableauIds(BLACK_WIDOW_TABLEAU_COUNT).map((id) => pile(id, 'tableau')),
  ];
  let cardIndex = 0;
  const sizes = [6, 6, 6, 6, 5, 5, 5, 5, 5, 5];
  sizes.forEach((size, column) => {
    const tableau = piles.find((candidate) => candidate.id === `t${column}`)!;
    for (let row = 0; row < size; row += 1) {
      const card = deck[cardIndex++];
      card.faceUp = row === size - 1;
      tableau.cards.push(card);
    }
  });
  deck.slice(cardIndex).forEach((card) => piles[0].cards.push(card));
  return makeState('black-widow', seed, piles, { options: {} });
}

function blackWidowMoves(state: GameState): Move[] {
  const moves = moveSourceRuns(state, 'any', BLACK_WIDOW_TABLEAU_COUNT, false, true);
  const tableaus = tableauIds(BLACK_WIDOW_TABLEAU_COUNT).map((id) => state.piles[id]);
  if (state.piles.stock.cards.length && tableaus.every((tableau) => tableau.cards.length > 0))
    moves.push({ type: 'draw', from: 'stock', to: 'tableau', count: 10 });
  return moves;
}

/** Black Widow: two decks, ten tableaus and ten-card stock deals. */
export const blackWidow: GameDefinition = {
  id: 'black-widow',
  name: 'Black Widow',
  decks: 2,
  create(seed = DEFAULT_SEED): GameState {
    return createBlackWidowState(seed);
  },
  legalMoves(state) {
    return blackWidowMoves(state);
  },
  applyMove(state, move) {
    return checked(state, move, blackWidowMoves(state), () => {
      if (move.type === 'draw') {
        const next = cloneState(state);
        for (const id of tableauIds(BLACK_WIDOW_TABLEAU_COUNT)) {
          const card = next.piles.stock.cards.pop();
          if (card) {
            card.faceUp = true;
            next.piles[id].cards.push(card);
          }
        }
        next.moveCount += 1;
        return { state: markWon(next, blackWidow) };
      }
      return applyTableauTransfer(state, move, BLACK_WIDOW_TABLEAU_COUNT, blackWidow);
    });
  },
  hint: (state) => blackWidow.legalMoves(state)[0],
  isWon: (state) => state.piles.removed.cards.length === 104,
};

export const SPIDER_VARIANT_GAME_DEFINITIONS = {
  scorpion,
  wasp,
  blackWidow,
} as const;

export type SpiderVariantGameId = keyof typeof SPIDER_VARIANT_GAME_DEFINITIONS;

export function getSpiderVariantGameDefinition(id: SpiderVariantGameId): GameDefinition {
  return SPIDER_VARIANT_GAME_DEFINITIONS[id];
}
