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

interface FortyVariantOptions {
  columns: number;
  cardsPerColumn: number;
  movableRuns: boolean;
  sameSuitTableau: boolean;
  redeals: number;
}

/**
 * Shared engine for the smaller Forty Thieves family variants.  The variants
 * deliberately keep their own definitions/ids while sharing the mechanics so
 * a rules correction cannot make the games drift apart accidentally.
 */
function createFortyVariant(
  id: string,
  name: string,
  options: FortyVariantOptions,
): GameDefinition {
  const foundationIds = Array.from({ length: 8 }, (_, i) => `f${i}`);
  const tableauIds = Array.from({ length: options.columns }, (_, i) => `t${i}`);
  const legalMoves = (state: GameState): Move[] => {
    const moves: Move[] = [];
    const tableaus = tableauIds.map((tableauId) => state.piles[tableauId]);
    for (const source of [...tableaus, state.piles.waste]) {
      const card = top(source);
      if (!card || !card.faceUp) continue;
      const starts =
        options.movableRuns && source.id.startsWith('t')
          ? source.cards
              .map((_, index) => index)
              .filter((index) => faceUpRun(source.cards, index, true))
          : [source.cards.length - 1];
      for (const start of starts) {
        const selected = source.cards.slice(start);
        if (!selected.length || selected.some((candidate) => !candidate.faceUp)) continue;
        const first = selected[0];
        for (const destination of tableaus) {
          if (destination.id === source.id) continue;
          if (descendingTableauMove(first, top(destination), false, options.sameSuitTableau))
            moves.push({
              type: 'transfer',
              from: source.id,
              to: destination.id,
              cardIds: selected.map((candidate) => candidate.id),
            });
        }
        if (selected.length === 1)
          moves.push(...foundationMove(state, source.id, first, foundationIds));
      }
    }
    if (state.piles.stock.cards.length)
      moves.push({ type: 'draw', from: 'stock', to: 'waste', count: 1 });
    else if (state.piles.waste.cards.length && Number(state.meta.redeals ?? 0) < options.redeals)
      moves.push({ type: 'recycle', from: 'waste', to: 'stock' });
    return moves;
  };

  const definition: GameDefinition = {
    id,
    name,
    decks: 2,
    create(seed = DEFAULT_SEED): GameState {
      const deck = shuffledDeck(seed, 2);
      const piles = [
        pile('stock', 'stock'),
        pile('waste', 'waste'),
        ...foundationIds.map((foundationId) => pile(foundationId, 'foundation')),
        ...tableauIds.map((tableauId) => pile(tableauId, 'tableau')),
      ];
      let cardIndex = 0;
      for (let column = 0; column < options.columns; column += 1) {
        const tableau = piles.find((candidate) => candidate.id === `t${column}`)!;
        for (let row = 0; row < options.cardsPerColumn; row += 1) {
          const card = deck[cardIndex++];
          card.faceUp = true;
          tableau.cards.push(card);
        }
      }
      deck.slice(cardIndex).forEach((card) => piles[0].cards.push(card));
      return makeState(id, seed, piles, { redeals: 0 });
    },
    legalMoves,
    applyMove(state, move) {
      return checked(state, move, legalMoves(state), () => {
        if (move.type === 'draw') return draw(state, 'stock', 'waste');
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
        const result = transfer(state, move.from, move.to, moveCardIds(move));
        return result.error
          ? result
          : { state: mark(result.state, definition.isWon(result.state)) };
      });
    },
    hint: (state) => legalMoves(state)[0],
    isWon: (state) =>
      foundationIds.every((foundationId) => state.piles[foundationId].cards.length === 13),
  };
  return definition;
}

/** Forty and Eight: eight five-card piles and one permitted redeal. */
export const fortyAndEight = createFortyVariant('forty-and-eight', 'Forty and Eight', {
  columns: 8,
  cardsPerColumn: 5,
  movableRuns: false,
  sameSuitTableau: true,
  redeals: 1,
});

/** Josephine: Forty Thieves with movable same-suit sequences. */
export const josephine = createFortyVariant('josephine', 'Josephine', {
  columns: 10,
  cardsPerColumn: 4,
  movableRuns: true,
  sameSuitTableau: true,
  redeals: 0,
});

/** Congress: eight one-card piles and unrestricted descending tableau play. */
export const congress = createFortyVariant('congress', 'Congress', {
  columns: 8,
  cardsPerColumn: 1,
  movableRuns: false,
  sameSuitTableau: false,
  redeals: 0,
});

/** Diplomat: eight four-card rows with unrestricted descending tableau play. */
export const diplomat = createFortyVariant('diplomat', 'Diplomat', {
  columns: 8,
  cardsPerColumn: 4,
  movableRuns: false,
  sameSuitTableau: false,
  redeals: 0,
});

export const LONG_RUN_GAME_DEFINITIONS = {
  spiderette,
  yukon,
  fortyThieves,
  fortyAndEight,
  josephine,
  congress,
  diplomat,
} as const;

export type LongRunGameId = keyof typeof LONG_RUN_GAME_DEFINITIONS;

export function getLongRunGameDefinition(id: LongRunGameId): GameDefinition {
  return LONG_RUN_GAME_DEFINITIONS[id];
}
