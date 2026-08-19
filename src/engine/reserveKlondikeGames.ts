import { ApplyResult, Card, GameDefinition, GameState, Move, cardColor } from './types';
import { cloneState, makeState, pile, top, transfer } from './core';
import { shuffledDeck } from './random';

const DEFAULT_SEED = 'solitaire-default';
const FOUNDATION_IDS = ['f0', 'f1', 'f2', 'f3'] as const;
const TABLEAU_IDS = (count: number): string[] =>
  Array.from({ length: count }, (_, index) => `t${index}`);

function nextRank(rank: number): number {
  return rank === 13 ? 1 : rank + 1;
}

function previousRank(rank: number): number {
  return rank === 1 ? 13 : rank - 1;
}

function moveCardIds(move: Move): string[] {
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

function foundationSuit(state: GameState, id: string): Card['suit'] | undefined {
  return state.piles[id].cards[0]?.suit;
}

function foundationCanAccept(
  state: GameState,
  id: string,
  card: Card,
  baseRank: number,
  aceStart: boolean,
): boolean {
  const foundation = state.piles[id];
  const suit = foundationSuit(state, id);
  if (!foundation.cards.length) {
    if (aceStart && card.rank !== 1) return false;
    if (!aceStart && card.rank !== baseRank) return false;
    return !FOUNDATION_IDS.some(
      (other) => other !== id && foundationSuit(state, other) === card.suit,
    );
  }
  return suit === card.suit && card.rank === nextRank(foundation.cards.at(-1)!.rank);
}

function tableauCanAccept(card: Card, destination: Card | undefined): boolean {
  return destination
    ? destination.faceUp &&
        destination.rank === nextRank(card.rank) &&
        cardColor(destination) !== cardColor(card)
    : true;
}

function descendingAlternate(cards: Card[], start: number): boolean {
  if (start < 0 || start >= cards.length) return false;
  for (let index = start; index < cards.length; index += 1) {
    if (!cards[index].faceUp) return false;
    if (
      index > start &&
      (cards[index - 1].rank !== nextRank(cards[index].rank) ||
        cardColor(cards[index - 1]) === cardColor(cards[index]))
    )
      return false;
  }
  return true;
}

function markWon(state: GameState, definition: GameDefinition): GameState {
  const next = cloneState(state);
  if (definition.isWon(next)) next.status = 'won';
  return next;
}

function removeCard(state: GameState, from: string, to: string, cardId: string): ApplyResult {
  const next = cloneState(state);
  const source = next.piles[from];
  const target = next.piles[to];
  const index = source?.cards.findIndex((card) => card.id === cardId) ?? -1;
  if (!source || !target || index < 0) return { state, error: 'Card is not removable' };
  const [card] = source.cards.splice(index, 1);
  card.faceUp = true;
  target.cards.push(card);
  next.moveCount += 1;
  return { state: next };
}

function foundationMoveCandidates(
  state: GameState,
  sourceId: string,
  card: Card,
  baseRank: number,
  aceStart: boolean,
): Move[] {
  return FOUNDATION_IDS.filter((id) =>
    foundationCanAccept(state, id, card, baseRank, aceStart),
  ).map((id) => ({
    type: 'transfer',
    from: sourceId,
    to: id,
    cardIds: [card.id],
  }));
}

function tableauMoveCandidates(
  state: GameState,
  sourceId: string,
  cardIds: string[],
  emptyRank: number | undefined,
  tableaus: string[],
): Move[] {
  const card = state.piles[sourceId].cards.find((candidate) => candidate.id === cardIds[0]);
  if (!card) return [];
  return tableaus
    .filter((id) => {
      if (id === sourceId) return false;
      const destination = top(state.piles[id]);
      return destination
        ? tableauCanAccept(card, destination)
        : emptyRank === undefined || card.rank === emptyRank;
    })
    .map((id) => ({ type: 'transfer', from: sourceId, to: id, cardIds }));
}

export interface CanfieldOptions {
  drawCount?: 1 | 3;
}

function canfieldFoundationMoves(state: GameState, sourceId: string, card: Card): Move[] {
  return foundationMoveCandidates(state, sourceId, card, Number(state.meta.baseRank), false);
}

function canfieldLegalMoves(state: GameState): Move[] {
  const moves: Move[] = [];
  const tableaus = TABLEAU_IDS(4);
  const reserve = state.piles.reserve;
  const reserveCard = top(reserve);
  if (reserveCard) {
    moves.push(...canfieldFoundationMoves(state, 'reserve', reserveCard));
    moves.push(...tableauMoveCandidates(state, 'reserve', [reserveCard.id], undefined, tableaus));
  }
  for (const sourceId of [...tableaus, 'waste']) {
    const source = state.piles[sourceId];
    if (!source.cards.length) continue;
    for (let start = source.cards.length - 1; start >= 0; start -= 1) {
      if (sourceId === 'waste' && start !== source.cards.length - 1) continue;
      if (sourceId.startsWith('t') && !descendingAlternate(source.cards, start)) continue;
      const card = source.cards[start];
      const cardIds = source.cards.slice(start).map((candidate) => candidate.id);
      moves.push(
        ...tableauMoveCandidates(state, sourceId, cardIds, undefined, tableaus).filter(
          (candidate) => !reserveCard || state.piles[candidate.to].cards.length > 0,
        ),
      );
      if (cardIds.length === 1) moves.push(...canfieldFoundationMoves(state, sourceId, card));
    }
  }
  if (state.piles.stock.cards.length) {
    const options = (state.meta.options ?? {}) as CanfieldOptions;
    const count = Math.min(options.drawCount ?? 3, state.piles.stock.cards.length);
    moves.push({ type: 'draw', from: 'stock', to: 'waste', count });
  } else if (state.piles.waste.cards.length) {
    moves.push({ type: 'recycle', from: 'waste', to: 'stock' });
  }
  return moves;
}

export const canfield: GameDefinition<CanfieldOptions> = {
  id: 'canfield',
  name: 'Canfield',
  decks: 1,
  create(seed = DEFAULT_SEED, options: CanfieldOptions = {}): GameState {
    const deck = shuffledDeck(seed);
    const piles = [
      pile('stock', 'stock'),
      pile('waste', 'waste'),
      pile('reserve', 'reserve'),
      ...FOUNDATION_IDS.map((id) => pile(id, 'foundation')),
      ...TABLEAU_IDS(4).map((id) => pile(id, 'tableau')),
    ];
    const reserve = piles.find((candidate) => candidate.id === 'reserve')!;
    deck.slice(0, 13).forEach((card) => reserve.cards.push(card));
    reserve.cards.at(-1)!.faceUp = true;
    const base = deck[13];
    base.faceUp = true;
    piles.find((candidate) => candidate.id === 'f0')!.cards.push(base);
    deck.slice(14, 18).forEach((card, index) => {
      card.faceUp = true;
      piles.find((candidate) => candidate.id === `t${index}`)!.cards.push(card);
    });
    deck
      .slice(18)
      .forEach((card) => piles.find((candidate) => candidate.id === 'stock')!.cards.push(card));
    return makeState('canfield', seed, piles, {
      baseRank: base.rank,
      options: { drawCount: options.drawCount ?? 3 },
    });
  },
  legalMoves: canfieldLegalMoves,
  applyMove(state, move) {
    return checked(state, move, canfieldLegalMoves(state), () => {
      if (move.type === 'draw') {
        const next = cloneState(state);
        const count = move.count ?? 3;
        const stock = next.piles.stock;
        const waste = next.piles.waste;
        const cards = stock.cards.splice(stock.cards.length - count, count);
        cards.forEach((card) => {
          card.faceUp = true;
          waste.cards.push(card);
        });
        next.moveCount += 1;
        return { state: next };
      }
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
      const result = transfer(state, move.from, move.to, moveCardIds(move));
      if (result.error) return result;
      const next = result.state;
      if (move.from === 'reserve') {
        const card = next.piles.reserve.cards.at(-1);
        if (card) card.faceUp = true;
      }
      return { state: markWon(next, canfield) };
    });
  },
  hint: (state) => canfieldLegalMoves(state)[0],
  isWon: (state) => FOUNDATION_IDS.every((id) => state.piles[id].cards.length === 13),
};

function agnesLegalMoves(state: GameState): Move[] {
  const moves: Move[] = [];
  const tableaus = TABLEAU_IDS(7);
  const baseRank = Number(state.meta.baseRank);
  for (const sourceId of tableaus) {
    const source = state.piles[sourceId];
    for (let start = source.cards.length - 1; start >= 0; start -= 1) {
      if (!descendingAlternate(source.cards, start)) continue;
      const card = source.cards[start];
      const ids = source.cards.slice(start).map((candidate) => candidate.id);
      moves.push(...tableauMoveCandidates(state, sourceId, ids, previousRank(baseRank), tableaus));
      if (ids.length === 1)
        moves.push(...foundationMoveCandidates(state, sourceId, card, baseRank, false));
    }
  }
  for (let index = 0; index < 7; index += 1) {
    const sourceId = `r${index}`;
    const card = top(state.piles[sourceId]);
    if (!card) continue;
    moves.push(
      ...tableauMoveCandidates(state, sourceId, [card.id], previousRank(baseRank), tableaus),
    );
    moves.push(...foundationMoveCandidates(state, sourceId, card, baseRank, false));
  }
  if (state.piles.stock.cards.length)
    moves.push({
      type: 'draw',
      from: 'stock',
      to: 'r0',
      count: Math.min(7, state.piles.stock.cards.length),
    });
  return moves;
}

export const agnesBernauer: GameDefinition = {
  id: 'agnes-bernauer',
  name: 'Agnes Bernauer',
  decks: 1,
  create(seed = DEFAULT_SEED): GameState {
    const deck = shuffledDeck(seed);
    const piles = [
      pile('stock', 'stock'),
      ...FOUNDATION_IDS.map((id) => pile(id, 'foundation')),
      ...TABLEAU_IDS(7).map((id) => pile(id, 'tableau')),
      ...Array.from({ length: 7 }, (_, index) => pile(`r${index}`, 'reserve')),
    ];
    let index = 0;
    for (let column = 0; column < 7; column += 1) {
      const tableau = piles.find((candidate) => candidate.id === `t${column}`)!;
      for (let row = 0; row <= column; row += 1) {
        const card = deck[index++];
        card.faceUp = true;
        tableau.cards.push(card);
      }
    }
    const base = deck[index++];
    base.faceUp = true;
    piles.find((candidate) => candidate.id === 'f0')!.cards.push(base);
    for (let reserveIndex = 0; reserveIndex < 7; reserveIndex += 1) {
      const card = deck[index++];
      card.faceUp = true;
      piles.find((candidate) => candidate.id === `r${reserveIndex}`)!.cards.push(card);
    }
    deck
      .slice(index)
      .forEach((card) => piles.find((candidate) => candidate.id === 'stock')!.cards.push(card));
    return makeState('agnes-bernauer', seed, piles, {
      baseRank: base.rank,
      dealCount: 0,
    });
  },
  legalMoves: agnesLegalMoves,
  applyMove(state, move) {
    return checked(state, move, agnesLegalMoves(state), () => {
      if (move.type === 'draw') {
        const next = cloneState(state);
        const count = Math.min(move.count ?? 7, next.piles.stock.cards.length);
        for (let index = 0; index < count; index += 1) {
          const card = next.piles.stock.cards.pop()!;
          card.faceUp = true;
          next.piles[`r${index}`].cards.push(card);
        }
        next.meta.dealCount = Number(next.meta.dealCount ?? 0) + 1;
        next.moveCount += 1;
        return { state: next };
      }
      const result = transfer(state, move.from, move.to, moveCardIds(move));
      if (result.error) return result;
      return { state: markWon(result.state, agnesBernauer) };
    });
  },
  hint: (state) => agnesLegalMoves(state)[0],
  isWon: (state) => FOUNDATION_IDS.every((id) => state.piles[id].cards.length === 13),
};

function kingAlbertLegalMoves(state: GameState): Move[] {
  const moves: Move[] = [];
  const tableaus = TABLEAU_IDS(9);
  for (const sourceId of [...tableaus, 'reserve']) {
    const source = state.piles[sourceId];
    const cards = sourceId === 'reserve' ? source.cards : source.cards.slice(-1);
    for (const card of cards) {
      moves.push(...foundationMoveCandidates(state, sourceId, card, 1, true));
      moves.push(...tableauMoveCandidates(state, sourceId, [card.id], undefined, tableaus));
    }
  }
  return moves;
}

export const kingAlbert: GameDefinition = {
  id: 'king-albert',
  name: 'King Albert',
  decks: 1,
  create(seed = DEFAULT_SEED): GameState {
    const deck = shuffledDeck(seed);
    const piles = [
      pile('reserve', 'reserve'),
      ...FOUNDATION_IDS.map((id) => pile(id, 'foundation')),
      ...TABLEAU_IDS(9).map((id) => pile(id, 'tableau')),
    ];
    let index = 0;
    for (let column = 0; column < 9; column += 1) {
      const tableau = piles.find((candidate) => candidate.id === `t${column}`)!;
      for (let row = 0; row < 9 - column; row += 1) {
        const card = deck[index++];
        card.faceUp = true;
        tableau.cards.push(card);
      }
    }
    deck.slice(index).forEach((card) => {
      card.faceUp = true;
      piles.find((candidate) => candidate.id === 'reserve')!.cards.push(card);
    });
    return makeState('king-albert', seed, piles);
  },
  legalMoves: kingAlbertLegalMoves,
  applyMove(state, move) {
    return checked(state, move, kingAlbertLegalMoves(state), () => {
      const result =
        move.from === 'reserve'
          ? removeCard(state, move.from, move.to, moveCardIds(move)[0])
          : transfer(state, move.from, move.to, moveCardIds(move));
      if (result.error) return result;
      return { state: markWon(result.state, kingAlbert) };
    });
  },
  hint: (state) => kingAlbertLegalMoves(state)[0],
  isWon: (state) => FOUNDATION_IDS.every((id) => state.piles[id].cards.length === 13),
};

export const RESERVE_KLONDIKE_GAMES = {
  canfield,
  agnesBernauer,
  kingAlbert,
} as const;
