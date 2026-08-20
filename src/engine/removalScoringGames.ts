import { ApplyResult, Card, GameDefinition, GameState, Move } from './types';
import { cloneState, draw, makeState, pile, top, transfer } from './core';
import { shuffle, shuffledDeck } from './random';

const DEFAULT_SEED = 'solitaire-default';
type RemovalMode =
  'sum13' | 'sum10' | 'sum14' | 'same-rank' | 'adjacent' | 'same-or-adjacent' | 'royal';

interface RemovalConfig {
  readonly id: string;
  readonly name: string;
  readonly layout: string;
  readonly tableauCount: number;
  readonly cardsPerTableau: number;
  readonly stock?: boolean;
}

const sameMove = (a: Move, b: Move): boolean => {
  if (a.type !== b.type || a.from !== b.from || a.to !== b.to) return false;
  if (a.type === 'draw' && b.type === 'draw') return (a.count ?? 1) === (b.count ?? 1);
  if ('cardIds' in a && 'cardIds' in b)
    return JSON.stringify(a.cardIds) === JSON.stringify(b.cardIds);
  return true;
};

const checked = (
  state: GameState,
  move: Move,
  legal: Move[],
  apply: () => ApplyResult,
): ApplyResult =>
  legal.some((candidate) => sameMove(candidate, move)) ? apply() : { state, error: 'Illegal move' };

function matches(mode: RemovalMode, a: Card, b: Card): boolean {
  if (mode === 'same-rank') return a.rank === b.rank;
  if (mode === 'adjacent')
    return (
      Math.abs(a.rank - b.rank) === 1 ||
      (a.rank === 1 && b.rank === 13) ||
      (a.rank === 13 && b.rank === 1)
    );
  if (mode === 'same-or-adjacent') return a.rank === b.rank || Math.abs(a.rank - b.rank) === 1;
  if (mode === 'sum13') return a.rank + b.rank === 13;
  if (mode === 'sum10') return a.rank + b.rank === 10;
  if (mode === 'royal')
    return (
      a.suit === b.suit && ((a.rank === 12 && b.rank === 13) || (a.rank === 13 && b.rank === 12))
    );
  return a.rank + b.rank === 14;
}

function pairMovesFromCards(
  cards: Array<{ pileId: string; card: Card }>,
  mode: RemovalMode,
  singleRanks = false,
): Move[] {
  const moves: Move[] = [];
  for (let i = 0; i < cards.length; i += 1) {
    for (let j = i + 1; j < cards.length; j += 1) {
      if (matches(mode, cards[i].card, cards[j].card))
        moves.push({
          type: 'remove',
          from: cards[i].pileId,
          to: 'removed',
          cardIds: [cards[i].card.id, cards[j].card.id],
        });
    }
    if (singleRanks && cards[i].card.rank === 13)
      moves.push({
        type: 'remove',
        from: cards[i].pileId,
        to: 'removed',
        cardIds: [cards[i].card.id],
      });
  }
  return moves;
}

function removeByIds(state: GameState, ids: string[]): ApplyResult {
  const next = cloneState(state);
  const removed = next.piles.removed;
  if (!removed) return { state, error: 'Removed pile is missing' };
  for (const id of ids) {
    const owner = Object.values(next.piles).find(
      (candidate) =>
        (candidate.kind === 'tableau' ||
          candidate.kind === 'waste' ||
          candidate.kind === 'reserve' ||
          candidate.kind === 'stock') &&
        candidate.cards.some((card) => card.id === id),
    );
    if (!owner) return { state, error: 'Card is not removable' };
    const index = owner.cards.findIndex((card) => card.id === id);
    if (index !== owner.cards.length - 1)
      return { state, error: 'Only exposed cards can be removed' };
    removed.cards.push(...owner.cards.splice(index, 1));
  }
  next.moveCount += 1;
  return { state: next };
}

function createRemovalState(config: RemovalConfig, seed: string): GameState {
  const deck = shuffledDeck(seed);
  const piles = [
    pile('removed', 'removed'),
    ...Array.from({ length: config.tableauCount }, (_, index) => pile(`t${index}`, 'tableau')),
    ...(config.stock || config.tableauCount * config.cardsPerTableau < 52
      ? [pile('stock', 'stock'), pile('waste', 'waste')]
      : []),
  ];
  let cursor = 0;
  for (let column = 0; column < config.tableauCount; column += 1) {
    const target = piles.find((candidate) => candidate.id === `t${column}`)!;
    for (let row = 0; row < config.cardsPerTableau && cursor < deck.length; row += 1) {
      const card = deck[cursor++];
      card.faceUp = true;
      target.cards.push(card);
    }
  }
  if (config.stock || cursor < deck.length) {
    const stock = piles.find((candidate) => candidate.id === 'stock')!;
    deck.slice(cursor).forEach((card) => {
      card.faceUp = false;
      stock.cards.push(card);
    });
  }
  return makeState(config.id, seed, piles, {
    options: { layout: config.layout },
    layout: { type: config.layout, tableauCount: config.tableauCount },
    score: 0,
  });
}

const gizaPyramidIds = Array.from({ length: 28 }, (_, index) => `giza${index}`);
const gizaReserveIds = Array.from({ length: 8 }, (_, index) => `gizaReserve${index}`);

function pyramidExposed(state: GameState, prefix: string, index: number): boolean {
  const row = Math.floor((Math.sqrt(8 * index + 1) - 1) / 2);
  if (row === 6) return true;
  const position = index - (row * (row + 1)) / 2;
  const childBase = ((row + 1) * (row + 2)) / 2;
  return (
    !state.piles[`${prefix}${childBase + position}`]?.cards.length &&
    !state.piles[`${prefix}${childBase + position + 1}`]?.cards.length
  );
}

function gizaExposed(state: GameState, index: number): boolean {
  return pyramidExposed(state, 'giza', index);
}

const giza: GameDefinition = {
  id: 'giza',
  name: 'Giza',
  decks: 1,
  create(seed = DEFAULT_SEED): GameState {
    const deck = shuffledDeck(seed);
    const pyramid = gizaPyramidIds.map((id, index) => {
      const card = deck[index];
      card.faceUp = true;
      return pile(id, 'tableau', [card]);
    });
    const reserve = gizaReserveIds.map((id, index) => {
      const cards = deck.slice(28 + index * 3, 31 + index * 3);
      cards.forEach((card) => {
        card.faceUp = true;
      });
      return pile(id, 'reserve', cards);
    });
    return makeState('giza', seed, [pile('removed', 'removed'), ...reserve, ...pyramid], {
      options: { layout: 'giza' },
      layout: { type: 'giza' },
      score: 0,
    });
  },
  legalMoves(state): Move[] {
    if (state.status !== 'playing') return [];
    const cards = [
      ...gizaPyramidIds.flatMap((id, index) => {
        const card = top(state.piles[id]);
        return card && gizaExposed(state, index) ? [{ pileId: id, card }] : [];
      }),
      ...gizaReserveIds.flatMap((id) => {
        const card = top(state.piles[id]);
        return card ? [{ pileId: id, card }] : [];
      }),
    ];
    return pairMovesFromCards(cards, 'sum13', true);
  },
  applyMove(state, move): ApplyResult {
    return checked(state, move, giza.legalMoves(state), () => {
      if (move.type !== 'remove') return { state, error: 'Only exposed pairs may be discarded' };
      const result = removeByIds(state, move.cardIds);
      if (result.error) return result;
      result.state.meta.score = Number(result.state.meta.score ?? 0) + move.cardIds.length;
      if (giza.isWon(result.state)) result.state.status = 'won';
      else if (!giza.legalMoves(result.state).length) result.state.status = 'lost';
      return result;
    });
  },
  isWon: (state) =>
    [...gizaPyramidIds, ...gizaReserveIds].every((id) => !state.piles[id].cards.length),
  hint: (state) => giza.legalMoves(state)[0],
};
const cheops: GameDefinition = {
  id: 'cheops',
  name: 'Cheops',
  decks: 1,
  create(seed = DEFAULT_SEED): GameState {
    const deck = shuffledDeck(seed);
    const pyramid = Array.from({ length: 28 }, (_, index) => {
      const card = deck[index];
      card.faceUp = true;
      return pile(`p${index}`, 'tableau', [card]);
    });
    const stock = deck.slice(28);
    stock.forEach((card) => {
      card.faceUp = true;
    });
    return makeState(
      'cheops',
      seed,
      [
        pile('removed', 'removed'),
        pile('stock', 'stock', stock),
        pile('waste', 'waste'),
        ...pyramid,
      ],
      {
        options: { layout: 'cheops' },
        layout: { type: 'cheops' },
        score: 0,
      },
    );
  },
  legalMoves(state): Move[] {
    if (state.status !== 'playing') return [];
    const cards = Array.from({ length: 28 }, (_, index) => {
      const card = top(state.piles[`p${index}`]);
      return card && pyramidExposed(state, 'p', index) ? [{ pileId: `p${index}`, card }] : [];
    }).flat();
    const wasteTop = top(state.piles.waste);
    if (wasteTop?.faceUp) cards.push({ pileId: 'waste', card: wasteTop });
    const stockTop = top(state.piles.stock);
    if (stockTop?.faceUp) cards.push({ pileId: 'stock', card: stockTop });
    const moves = pairMovesFromCards(cards, 'same-or-adjacent');
    if (state.piles.stock.cards.length)
      moves.push({ type: 'draw', from: 'stock', to: 'waste', count: 1 });
    return moves;
  },
  applyMove(state, move): ApplyResult {
    return checked(state, move, cheops.legalMoves(state), () => {
      const result =
        move.type === 'draw'
          ? draw(state, 'stock', 'waste')
          : move.type === 'remove'
            ? removeByIds(state, move.cardIds)
            : { state, error: 'Only matching pairs may be discarded' };
      if (result.error) return result;
      result.state.meta.score =
        Number(result.state.meta.score ?? 0) + (move.type === 'remove' ? move.cardIds.length : 0);
      if (cheops.isWon(result.state)) result.state.status = 'won';
      else if (!cheops.legalMoves(result.state).length) result.state.status = 'lost';
      return result;
    });
  },
  isWon: (state) =>
    Object.values(state.piles)
      .filter((item) => item.kind !== 'removed')
      .every((item) => !item.cards.length),
  hint: (state) =>
    cheops.legalMoves(state).find((move) => move.type === 'remove') ?? cheops.legalMoves(state)[0],
};
const blockTenPileIds = Array.from({ length: 9 }, (_, index) => `bt${index}`);
function blockTenPairs(state: GameState): Move[] {
  const cards = blockTenPileIds.flatMap((id) => {
    const card = top(state.piles[id]);
    return card ? [{ pileId: id, card }] : [];
  });
  const moves: Move[] = [];
  for (let index = 0; index < cards.length; index += 1) {
    for (let other = index + 1; other < cards.length; other += 1) {
      const [left, right] = [cards[index].card, cards[other].card];
      const match = left.rank + right.rank === 10 || (left.rank >= 11 && left.rank === right.rank);
      if (match)
        moves.push({
          type: 'remove',
          from: cards[index].pileId,
          to: 'removed',
          cardIds: [left.id, right.id],
        });
    }
  }
  return moves;
}
function refillBlockTen(state: GameState): GameState {
  const next = cloneState(state);
  for (const id of blockTenPileIds) {
    if (next.piles[id].cards.length || !next.piles.stock.cards.length) continue;
    const card = next.piles.stock.cards.pop()!;
    card.faceUp = true;
    next.piles[id].cards.push(card);
  }
  return next;
}
const blockTen: GameDefinition = {
  id: 'block-ten',
  name: 'Block Ten',
  decks: 1,
  create(seed = DEFAULT_SEED): GameState {
    const deck = shuffledDeck(seed);
    const tableaus = blockTenPileIds.map((id, index) => {
      const card = deck[index];
      card.faceUp = true;
      return pile(id, 'tableau', [card]);
    });
    const stock = deck.slice(9);
    stock.forEach((card) => {
      card.faceUp = false;
    });
    const state = makeState(
      'block-ten',
      seed,
      [pile('removed', 'removed'), pile('stock', 'stock', stock), ...tableaus],
      {
        options: { layout: 'block-ten' },
        layout: { type: 'block-ten' },
        score: 0,
      },
    );
    if (!blockTenPairs(state).length) state.status = 'lost';
    return state;
  },
  legalMoves(state): Move[] {
    return state.status === 'playing' ? blockTenPairs(state) : [];
  },
  applyMove(state, move): ApplyResult {
    return checked(state, move, blockTen.legalMoves(state), () => {
      if (move.type !== 'remove') return { state, error: 'Only Block Ten pairs are legal' };
      const result = removeByIds(state, move.cardIds);
      if (result.error) return result;
      const next = refillBlockTen(result.state);
      next.meta.score = next.piles.removed.cards.length;
      if (blockTen.isWon(next)) next.status = 'won';
      else if (!blockTen.legalMoves(next).length) next.status = 'lost';
      return { state: next };
    });
  },
  isWon: (state) => {
    const remaining = blockTenPileIds.flatMap((id) => state.piles[id].cards);
    return (
      !state.piles.stock.cards.length &&
      state.piles.removed.cards.length === 48 &&
      remaining.length === 4 &&
      remaining.every((card) => card.rank === 10)
    );
  },
  hint: (state) => blockTen.legalMoves(state)[0],
};
const fourteenOutPileIds = Array.from({ length: 12 }, (_, index) => `fo${index}`);
const fourteenOut: GameDefinition = {
  id: 'fourteen-out',
  name: 'Fourteen Out',
  decks: 1,
  create(seed = DEFAULT_SEED): GameState {
    const deck = shuffledDeck(seed);
    let cursor = 0;
    const tableaus = fourteenOutPileIds.map((id, index) => {
      const cards = deck.slice(cursor, cursor + (index < 4 ? 5 : 4));
      cursor += cards.length;
      cards.forEach((card) => {
        card.faceUp = true;
      });
      return pile(id, 'tableau', cards);
    });
    return makeState('fourteen-out', seed, [pile('removed', 'removed'), ...tableaus], {
      options: { layout: 'fourteen-out' },
      layout: { type: 'fourteen-out' },
      score: 0,
    });
  },
  legalMoves(state): Move[] {
    if (state.status !== 'playing') return [];
    return pairMovesFromCards(
      fourteenOutPileIds.flatMap((id) => {
        const card = top(state.piles[id]);
        return card ? [{ pileId: id, card }] : [];
      }),
      'sum14',
    );
  },
  applyMove(state, move): ApplyResult {
    return checked(state, move, fourteenOut.legalMoves(state), () => {
      if (move.type !== 'remove')
        return { state, error: 'Only pairs totalling fourteen are legal' };
      const result = removeByIds(state, move.cardIds);
      if (result.error) return result;
      result.state.meta.score = result.state.piles.removed.cards.length;
      if (fourteenOut.isWon(result.state)) result.state.status = 'won';
      else if (!fourteenOut.legalMoves(result.state).length) result.state.status = 'lost';
      return result;
    });
  },
  isWon: (state) => fourteenOutPileIds.every((id) => !state.piles[id].cards.length),
  hint: (state) => fourteenOut.legalMoves(state)[0],
};
const nestorTableauIds = Array.from({ length: 8 }, (_, index) => `nestor${index}`);
const nestorReserveIds = Array.from({ length: 4 }, (_, index) => `nestorReserve${index}`);
const nestor: GameDefinition = {
  id: 'nestor',
  name: 'Nestor',
  decks: 1,
  create(seed = DEFAULT_SEED): GameState {
    const deck = shuffledDeck(seed);
    const columns = nestorTableauIds.map((id) => pile(id, 'tableau'));
    const reserve = nestorReserveIds.map((id) => pile(id, 'reserve'));
    for (let row = 0; row < 6; row += 1)
      for (let column = 0; column < 8; column += 1) {
        const target = columns[column];
        const cardIndex = deck.findIndex(
          (card) => !target.cards.some((existing) => existing.rank === card.rank),
        );
        const [card] = deck.splice(cardIndex, 1);
        card.faceUp = true;
        target.cards.push(card);
      }
    deck.forEach((card, index) => {
      card.faceUp = true;
      reserve[index].cards.push(card);
    });
    return makeState('nestor', seed, [pile('removed', 'removed'), ...reserve, ...columns], {
      options: { layout: 'nestor' },
      layout: { type: 'nestor' },
      score: 0,
    });
  },
  legalMoves(state): Move[] {
    if (state.status !== 'playing') return [];
    return pairMovesFromCards(
      [...nestorTableauIds, ...nestorReserveIds].flatMap((id) => {
        const card = top(state.piles[id]);
        return card ? [{ pileId: id, card }] : [];
      }),
      'same-rank',
    );
  },
  applyMove(state, move): ApplyResult {
    return checked(state, move, nestor.legalMoves(state), () => {
      if (move.type !== 'remove') return { state, error: 'Only matching ranks may be removed' };
      const result = removeByIds(state, move.cardIds);
      if (result.error) return result;
      result.state.meta.score = result.state.piles.removed.cards.length;
      if (nestor.isWon(result.state)) result.state.status = 'won';
      else if (!nestor.legalMoves(result.state).length) result.state.status = 'lost';
      return result;
    });
  },
  isWon: (state) =>
    [...nestorTableauIds, ...nestorReserveIds].every((id) => !state.piles[id].cards.length),
  hint: (state) => nestor.legalMoves(state)[0],
};

const triPeaksChildren: Record<number, number[]> = {
  0: [3, 4],
  1: [5, 6],
  2: [7, 8],
  3: [9, 10],
  4: [10, 11],
  5: [12, 13],
  6: [13, 14],
  7: [15, 16],
  8: [16, 17],
  9: [18, 19],
  10: [19, 20],
  11: [20, 21],
  12: [21, 22],
  13: [22, 23],
  14: [23, 24],
  15: [24, 25],
  16: [25, 26],
  17: [26, 27],
};

export function triPeaksExposed(state: GameState, index: number): boolean {
  const children = triPeaksChildren[index] ?? [];
  return children.every((child) => !state.piles[`tri${child}`]?.cards.length);
}

function revealTriPeaks(state: GameState): void {
  for (let index = 0; index < 28; index += 1) {
    const card = top(state.piles[`tri${index}`]);
    if (card && triPeaksExposed(state, index)) card.faceUp = true;
  }
}

function adjacentTo(card: Card, target: Card): boolean {
  return (
    Math.abs(card.rank - target.rank) === 1 ||
    (card.rank === 1 && target.rank === 13) ||
    (card.rank === 13 && target.rank === 1)
  );
}

const triPeaks: GameDefinition = {
  id: 'tri-peaks',
  name: 'Tri-Peaks',
  decks: 1,
  create(seed = DEFAULT_SEED): GameState {
    const deck = shuffledDeck(seed);
    const tableaus = Array.from({ length: 28 }, (_, index) => {
      const card = deck[index];
      card.faceUp = index >= 18;
      return pile(`tri${index}`, 'tableau', [card]);
    });
    const wasteCard = deck[28];
    wasteCard.faceUp = true;
    const stock = deck.slice(29);
    stock.forEach((card) => {
      card.faceUp = false;
    });
    return makeState(
      'tri-peaks',
      seed,
      [
        pile('removed', 'removed'),
        ...tableaus,
        pile('stock', 'stock', stock),
        pile('waste', 'waste', [wasteCard]),
      ],
      { options: { layout: 'tri-peaks' }, layout: { type: 'tri-peaks' }, score: 0 },
    );
  },
  legalMoves(state): Move[] {
    const waste = top(state.piles.waste);
    const moves: Move[] = [];
    if (waste) {
      for (let index = 0; index < 28; index += 1) {
        const source = state.piles[`tri${index}`];
        const card = top(source);
        if (card && card.faceUp && triPeaksExposed(state, index) && adjacentTo(card, waste))
          moves.push({ type: 'transfer', from: source.id, to: 'waste', cardIds: [card.id] });
      }
    }
    if (state.piles.stock.cards.length)
      moves.push({ type: 'draw', from: 'stock', to: 'waste', count: 1 });
    return moves;
  },
  applyMove(state, move): ApplyResult {
    return checked(state, move, triPeaks.legalMoves(state), () => {
      if (move.type === 'draw') return draw(state, 'stock', 'waste', 1);
      if (move.type !== 'transfer') return { state, error: 'Only adjacent exposed cards may move' };
      const result = transfer(state, move.from, move.to, move.cardIds);
      if (result.error) return result;
      revealTriPeaks(result.state);
      result.state.meta.score = Number(result.state.meta.score ?? 0) + 1;
      if (triPeaks.isWon(result.state)) result.state.status = 'won';
      return result;
    });
  },
  isWon: (state) =>
    Array.from({ length: 28 }, (_, index) => state.piles[`tri${index}`]).every(
      (pile) => !pile.cards.length,
    ),
  hint: (state) =>
    triPeaks.legalMoves(state).find((move) => move.type === 'transfer') ??
    triPeaks.legalMoves(state)[0],
};

const blackHole: GameDefinition = {
  id: 'black-hole',
  name: 'Black Hole',
  decks: 1,
  create(seed = DEFAULT_SEED): GameState {
    const deck = shuffledDeck(seed);
    const holeIndex = deck.findIndex((card) => card.rank === 1 && card.suit === 'spades');
    const [hole] = deck.splice(holeIndex, 1);
    hole.faceUp = true;
    const tableaus = Array.from({ length: 17 }, (_, index) => {
      const cards = deck.slice(index * 3, index * 3 + 3);
      cards.forEach((card) => {
        card.faceUp = true;
      });
      return pile(`black${index}`, 'tableau', cards);
    });
    return makeState(
      'black-hole',
      seed,
      [pile('removed', 'removed'), pile('hole', 'foundation', [hole]), ...tableaus],
      { options: { layout: 'black-hole' }, layout: { type: 'black-hole' }, score: 0 },
    );
  },
  legalMoves(state): Move[] {
    const hole = top(state.piles.hole);
    if (!hole) return [];
    const moves: Move[] = [];
    for (let index = 0; index < 17; index += 1) {
      const source = state.piles[`black${index}`];
      const card = top(source);
      if (card && adjacentTo(card, hole))
        moves.push({ type: 'transfer', from: source.id, to: 'hole', cardIds: [card.id] });
    }
    return moves;
  },
  applyMove(state, move): ApplyResult {
    return checked(state, move, blackHole.legalMoves(state), () => {
      if (move.type !== 'transfer')
        return { state, error: 'Only adjacent cards may enter the Black Hole' };
      const result = transfer(state, move.from, move.to, move.cardIds);
      if (result.error) return result;
      result.state.meta.score = Number(result.state.meta.score ?? 0) + 1;
      if (blackHole.isWon(result.state)) result.state.status = 'won';
      return result;
    });
  },
  isWon: (state) =>
    Array.from({ length: 17 }, (_, index) => state.piles[`black${index}`]).every(
      (pile) => !pile.cards.length,
    ),
  hint: (state) => blackHole.legalMoves(state)[0],
};

const acesUpTableauIds = Array.from({ length: 4 }, (_, index) => `aces${index}`);

function acesUpRank(card: Card): number {
  return card.rank === 1 ? 14 : card.rank;
}

function dealAcesUpRound(state: GameState): ApplyResult {
  const next = cloneState(state);
  const stock = next.piles.stock;
  if (!stock || stock.cards.length < acesUpTableauIds.length)
    return { state, error: 'A complete Aces Up deal is unavailable' };

  for (const pileId of acesUpTableauIds) {
    const target = next.piles[pileId];
    const card = stock.cards.pop();
    if (!target || !card) return { state, error: 'Aces Up tableau is missing' };
    card.faceUp = true;
    target.cards.push(card);
  }
  next.moveCount += 1;
  return { state: next };
}

function finishAcesUp(state: GameState): GameState {
  if (acesUp.isWon(state)) state.status = 'won';
  else if (!state.piles.stock.cards.length && !acesUp.legalMoves(state).length)
    state.status = 'lost';
  return state;
}

const acesUp: GameDefinition = {
  id: 'aces-up',
  name: 'Aces Up',
  decks: 1,
  create(seed = DEFAULT_SEED): GameState {
    const deck = shuffledDeck(seed);
    const tableaus = acesUpTableauIds.map((pileId) => {
      const card = deck.pop()!;
      card.faceUp = true;
      return pile(pileId, 'tableau', [card]);
    });
    deck.forEach((card) => {
      card.faceUp = false;
    });
    return makeState(
      'aces-up',
      seed,
      [pile('removed', 'removed'), pile('stock', 'stock', deck), ...tableaus],
      { options: { layout: 'aces-up' }, layout: { type: 'aces-up', tableauCount: 4 }, score: 0 },
    );
  },
  legalMoves(state): Move[] {
    if (state.status !== 'playing') return [];
    const cards = acesUpTableauIds.flatMap((pileId) => {
      const card = top(state.piles[pileId]);
      return card?.faceUp ? [{ pileId, card }] : [];
    });
    const moves: Move[] = cards.flatMap(({ pileId, card }) => {
      const removals = cards.some(
        (other) =>
          other.pileId !== pileId &&
          other.card.suit === card.suit &&
          acesUpRank(other.card) > acesUpRank(card),
      )
        ? [{ type: 'remove' as const, from: pileId, to: 'removed', cardIds: [card.id] }]
        : [];
      const movesToEmptyPiles = acesUpTableauIds
        .filter((targetId) => targetId !== pileId && !state.piles[targetId].cards.length)
        .map((targetId) => ({
          type: 'transfer' as const,
          from: pileId,
          to: targetId,
          cardIds: [card.id],
        }));
      return [...removals, ...movesToEmptyPiles];
    });
    if (!moves.length && state.piles.stock.cards.length >= acesUpTableauIds.length)
      moves.push({ type: 'draw', from: 'stock', to: 'tableau', count: acesUpTableauIds.length });
    return moves;
  },
  applyMove(state, move): ApplyResult {
    return checked(state, move, acesUp.legalMoves(state), () => {
      if (move.type === 'draw') {
        const result = dealAcesUpRound(state);
        return result.error ? result : { state: finishAcesUp(result.state) };
      }
      if (move.type === 'transfer') {
        const result = transfer(state, move.from, move.to, move.cardIds);
        return result.error ? result : { state: finishAcesUp(result.state) };
      }
      if (move.type !== 'remove') return { state, error: 'Only exposed cards can be discarded' };
      const result = removeByIds(state, move.cardIds);
      if (result.error) return result;
      const next = result.state;
      next.meta.score = Number(next.meta.score ?? 0) + 1;
      return { state: finishAcesUp(next) };
    });
  },
  isWon: (state) =>
    !state.piles.stock.cards.length &&
    acesUpTableauIds.every((pileId) => {
      const cards = state.piles[pileId].cards;
      return cards.length === 1 && cards[0].rank === 1;
    }),
  hint: (state) =>
    acesUp.legalMoves(state).find((move) => move.type === 'remove') ?? acesUp.legalMoves(state)[0],
};

const accordion: GameDefinition = {
  id: 'accordion',
  name: 'Accordion',
  decks: 1,
  create(seed = DEFAULT_SEED): GameState {
    return createRemovalState(
      {
        id: 'accordion',
        name: 'Accordion',
        layout: 'accordion',
        tableauCount: 52,
        cardsPerTableau: 1,
      },
      seed,
    );
  },
  legalMoves(state): Move[] {
    const piles = Object.values(state.piles).filter(
      (item) => item.kind === 'tableau' && item.cards.length,
    );
    const moves: Move[] = [];
    for (let index = 1; index < piles.length; index += 1) {
      const source = top(piles[index]);
      if (!source) continue;
      for (const offset of [1, 3]) {
        const target = piles[index - offset];
        const targetCard = target && top(target);
        if (targetCard && (targetCard.rank === source.rank || targetCard.suit === source.suit))
          moves.push({
            type: 'transfer',
            from: piles[index].id,
            to: target.id,
            cardIds: piles[index].cards.map((card) => card.id),
          });
      }
    }
    return moves;
  },
  applyMove(state, move): ApplyResult {
    return checked(state, move, accordion.legalMoves(state), () => {
      if (move.type !== 'transfer') return { state, error: 'Only accordion moves are legal' };
      const result = transfer(state, move.from, move.to, move.cardIds);
      if (result.error) return result;
      const next = result.state;
      next.meta.score =
        52 -
        Object.values(next.piles).filter((item) => item.kind === 'tableau' && item.cards.length)
          .length;
      if (accordion.isWon(next)) next.status = 'won';
      return { state: next };
    });
  },
  isWon: (state) =>
    Object.values(state.piles).filter((item) => item.kind === 'tableau' && item.cards.length)
      .length === 1,
  hint: (state) => accordion.legalMoves(state)[0],
};

const monteCarloPileIds = Array.from({ length: 25 }, (_, index) => `mc${index}`);

function monteCarloPairs(state: GameState): Move[] {
  const moves: Move[] = [];
  for (let index = 0; index < monteCarloPileIds.length; index += 1) {
    const card = top(state.piles[monteCarloPileIds[index]]);
    if (!card) continue;
    const row = Math.floor(index / 5);
    const column = index % 5;
    for (const rowOffset of [-1, 0, 1]) {
      for (const columnOffset of [-1, 0, 1]) {
        if (rowOffset === 0 && columnOffset === 0) continue;
        const nextRow = row + rowOffset;
        const nextColumn = column + columnOffset;
        if (nextRow < 0 || nextRow >= 5 || nextColumn < 0 || nextColumn >= 5) continue;
        const targetIndex = nextRow * 5 + nextColumn;
        if (targetIndex <= index) continue;
        const target = top(state.piles[monteCarloPileIds[targetIndex]]);
        if (target && target.rank === card.rank)
          moves.push({
            type: 'remove',
            from: monteCarloPileIds[index],
            to: 'removed',
            cardIds: [card.id, target.id],
          });
      }
    }
  }
  return moves;
}

function refillMonteCarlo(state: GameState): GameState {
  const next = cloneState(state);
  const remaining = monteCarloPileIds.flatMap((id) => next.piles[id].cards);
  for (const id of monteCarloPileIds) next.piles[id].cards = [];
  remaining.forEach((card, index) => {
    card.faceUp = true;
    next.piles[monteCarloPileIds[index]].cards.push(card);
  });
  let cursor = remaining.length;
  while (cursor < monteCarloPileIds.length && next.piles.stock.cards.length) {
    const card = next.piles.stock.cards.pop()!;
    card.faceUp = true;
    next.piles[monteCarloPileIds[cursor]].cards.push(card);
    cursor += 1;
  }
  next.moveCount += 1;
  return next;
}

const monteCarlo: GameDefinition = {
  id: 'monte-carlo',
  name: 'Monte Carlo',
  decks: 1,
  create(seed = DEFAULT_SEED): GameState {
    const deck = shuffledDeck(seed);
    const tableaus = monteCarloPileIds.map((id, index) => {
      const card = deck[index];
      card.faceUp = true;
      return pile(id, 'tableau', [card]);
    });
    const stock = deck.slice(25);
    stock.forEach((card) => {
      card.faceUp = false;
    });
    const state = makeState(
      'monte-carlo',
      seed,
      [pile('removed', 'removed'), pile('stock', 'stock', stock), ...tableaus],
      { options: { layout: 'monte-carlo' }, layout: { type: 'monte-carlo', size: 5 }, score: 0 },
    );
    if (!monteCarloPairs(state).length) state.status = 'lost';
    return state;
  },
  legalMoves(state): Move[] {
    if (state.status !== 'playing') return [];
    const pairs = monteCarloPairs(state);
    if (pairs.length) return pairs;
    const activeCount = monteCarloPileIds.filter((id) => state.piles[id].cards.length).length;
    return state.piles.stock.cards.length && activeCount < monteCarloPileIds.length
      ? [{ type: 'draw', from: 'stock', to: 'tableau', count: 1 }]
      : [];
  },
  applyMove(state, move): ApplyResult {
    return checked(state, move, monteCarlo.legalMoves(state), () => {
      const result =
        move.type === 'remove'
          ? removeByIds(state, move.cardIds)
          : move.type === 'draw'
            ? { state: refillMonteCarlo(state) }
            : { state, error: 'Remove adjacent matching pairs or refill the grid' };
      if (result.error) return result;
      const next = result.state;
      next.meta.score = next.piles.removed.cards.length;
      if (monteCarlo.isWon(next)) next.status = 'won';
      else if (!monteCarlo.legalMoves(next).length) next.status = 'lost';
      return { state: next };
    });
  },
  isWon: (state) =>
    !state.piles.stock.cards.length &&
    monteCarloPileIds.every((id) => !state.piles[id].cards.length),
  hint: (state) => monteCarlo.legalMoves(state)[0],
};
const royalMarriagePileIds = Array.from({ length: 52 }, (_, index) => `rm${index}`);
function royalMarriageSequence(state: GameState): Array<{ pileId: string; card: Card }> {
  return royalMarriagePileIds.flatMap((id) => {
    const card = top(state.piles[id]);
    return card ? [{ pileId: id, card }] : [];
  });
}
function royalMarriageMatches(left: Card, right: Card): boolean {
  return left.rank === right.rank || left.suit === right.suit;
}
function royalMarriageMoves(state: GameState): Move[] {
  const cards = royalMarriageSequence(state);
  const moves: Move[] = [];
  for (let index = 1; index < cards.length - 1; index += 1)
    if (royalMarriageMatches(cards[index - 1].card, cards[index + 1].card))
      moves.push({
        type: 'remove',
        from: cards[index].pileId,
        to: 'removed',
        cardIds: [cards[index].card.id],
      });
  for (let index = 1; index < cards.length - 2; index += 1)
    if (royalMarriageMatches(cards[index - 1].card, cards[index + 2].card))
      moves.push({
        type: 'remove',
        from: cards[index].pileId,
        to: 'removed',
        cardIds: [cards[index].card.id, cards[index + 1].card.id],
      });
  return moves;
}
const royalMarriage: GameDefinition = {
  id: 'royal-marriage',
  name: 'Royal Marriage',
  decks: 1,
  create(seed = DEFAULT_SEED): GameState {
    const deck = shuffledDeck(seed);
    const queenIndex = deck.findIndex((card) => card.rank === 12 && card.suit === 'hearts');
    const kingIndex = deck.findIndex((card) => card.rank === 13 && card.suit === 'hearts');
    const [queen] = deck.splice(queenIndex, 1);
    const [king] = deck.splice(kingIndex > queenIndex ? kingIndex - 1 : kingIndex, 1);
    const cards = [queen, ...deck, king];
    cards.forEach((card) => {
      card.faceUp = true;
    });
    const state = makeState(
      'royal-marriage',
      seed,
      [
        pile('removed', 'removed'),
        ...royalMarriagePileIds.map((id, index) => pile(id, 'tableau', [cards[index]])),
      ],
      {
        options: { layout: 'royal-marriage' },
        layout: { type: 'royal-marriage' },
        score: 0,
      },
    );
    if (!royalMarriageMoves(state).length) state.status = 'lost';
    return state;
  },
  legalMoves(state): Move[] {
    return state.status === 'playing' ? royalMarriageMoves(state) : [];
  },
  applyMove(state, move): ApplyResult {
    return checked(state, move, royalMarriage.legalMoves(state), () => {
      if (move.type !== 'remove') return { state, error: 'Only bracketed cards may be removed' };
      const result = removeByIds(state, move.cardIds);
      if (result.error) return result;
      result.state.meta.score = result.state.piles.removed.cards.length;
      if (royalMarriage.isWon(result.state)) result.state.status = 'won';
      else if (!royalMarriage.legalMoves(result.state).length) result.state.status = 'lost';
      return result;
    });
  },
  isWon: (state) => {
    const cards = royalMarriageSequence(state).map((item) => item.card);
    return (
      cards.length === 2 &&
      cards[0].rank === 12 &&
      cards[0].suit === 'hearts' &&
      cards[1].rank === 13 &&
      cards[1].suit === 'hearts'
    );
  },
  hint: (state) => royalMarriage.legalMoves(state)[0],
};
const gayGordonsTableauIds = Array.from({ length: 10 }, (_, index) => `gay${index}`);
function gayGordonsMatches(left: Card, right: Card): boolean {
  if (left.rank <= 10 && right.rank <= 10) return left.rank + right.rank === 11;
  if (left.rank === 11 && right.rank === 11) return true;
  return (
    ((left.rank === 12 && right.rank === 13) || (left.rank === 13 && right.rank === 12)) &&
    left.suit !== right.suit
  );
}
function gayGordonsMoves(state: GameState): Move[] {
  const cards = [...gayGordonsTableauIds, 'gayReserve'].flatMap((id) => {
    const card = top(state.piles[id]);
    return card ? [{ pileId: id, card }] : [];
  });
  const moves: Move[] = [];
  for (let index = 0; index < cards.length; index += 1)
    for (let other = index + 1; other < cards.length; other += 1)
      if (gayGordonsMatches(cards[index].card, cards[other].card))
        moves.push({
          type: 'remove',
          from: cards[index].pileId,
          to: 'removed',
          cardIds: [cards[index].card.id, cards[other].card.id],
        });
  return moves;
}
const gayGordons: GameDefinition = {
  id: 'gay-gordons',
  name: 'Gay Gordons',
  decks: 1,
  create(seed = DEFAULT_SEED): GameState {
    const deck = shuffledDeck(seed);
    const tableaus = gayGordonsTableauIds.map((id, index) => {
      const cards = deck.slice(index * 5, index * 5 + 5);
      cards.forEach((card) => {
        card.faceUp = true;
      });
      return pile(id, 'tableau', cards);
    });
    const reserveCards = deck.slice(50);
    reserveCards.forEach((card) => {
      card.faceUp = true;
    });
    for (const tableau of tableaus) {
      const jacks = tableau.cards
        .map((card, index) => ({ card, index }))
        .filter(({ card }) => card.rank === 11);
      if (jacks.length !== 3) continue;
      const topReserve = reserveCards.length - 1;
      [tableau.cards[jacks[1].index], reserveCards[topReserve]] = [
        reserveCards[topReserve],
        tableau.cards[jacks[1].index],
      ];
      break;
    }
    const state = makeState(
      'gay-gordons',
      seed,
      [pile('removed', 'removed'), pile('gayReserve', 'reserve', reserveCards), ...tableaus],
      {
        options: { layout: 'gay-gordons' },
        layout: { type: 'gay-gordons' },
        score: 0,
      },
    );
    if (!gayGordonsMoves(state).length) state.status = 'lost';
    return state;
  },
  legalMoves(state): Move[] {
    return state.status === 'playing' ? gayGordonsMoves(state) : [];
  },
  applyMove(state, move): ApplyResult {
    return checked(state, move, gayGordons.legalMoves(state), () => {
      if (move.type !== 'remove') return { state, error: 'Only Gay Gordons pairs are legal' };
      const result = removeByIds(state, move.cardIds);
      if (result.error) return result;
      result.state.meta.score = result.state.piles.removed.cards.length;
      if (gayGordons.isWon(result.state)) result.state.status = 'won';
      else if (!gayGordons.legalMoves(result.state).length) result.state.status = 'lost';
      return result;
    });
  },
  isWon: (state) =>
    [...gayGordonsTableauIds, 'gayReserve'].every((id) => !state.piles[id].cards.length),
  hint: (state) => gayGordons.legalMoves(state)[0],
};
const beehiveTableauIds = Array.from({ length: 6 }, (_, index) => `bee${index}`);
function beehiveMoves(state: GameState): Move[] {
  const moves: Move[] = [];
  const sources = [...beehiveTableauIds, 'beehiveReserve', 'waste'].flatMap((id) => {
    const card = top(state.piles[id]);
    return card?.faceUp ? [{ pileId: id, card }] : [];
  });
  for (const source of sources)
    for (const destination of beehiveTableauIds) {
      if (destination === source.pileId) continue;
      const target = state.piles[destination];
      const targetTop = top(target);
      if (
        !target.cards.length ||
        (target.cards.length < 4 && targetTop?.faceUp && targetTop.rank === source.card.rank)
      )
        moves.push({
          type: 'transfer',
          from: source.pileId,
          to: destination,
          cardIds: [source.card.id],
        });
    }
  if (state.piles.stock.cards.length)
    moves.push({
      type: 'draw',
      from: 'stock',
      to: 'waste',
      count: Math.min(3, state.piles.stock.cards.length),
    });
  else if (state.piles.waste.cards.length)
    moves.push({ type: 'recycle', from: 'waste', to: 'stock' });
  return moves;
}
function clearBeehiveGroups(state: GameState): GameState {
  for (const id of beehiveTableauIds) {
    const cards = state.piles[id].cards;
    if (cards.length !== 4 || !cards.every((card) => card.rank === cards[0].rank)) continue;
    state.piles.removed.cards.push(...cards.splice(0));
  }
  return state;
}
const beehive: GameDefinition = {
  id: 'beehive',
  name: 'Beehive',
  decks: 1,
  create(seed = DEFAULT_SEED): GameState {
    const deck = shuffledDeck(seed);
    const reserve = deck.slice(0, 10);
    const tableaus = beehiveTableauIds.map((id, index) => {
      const card = deck[10 + index];
      card.faceUp = true;
      return pile(id, 'tableau', [card]);
    });
    reserve.forEach((card, index) => {
      card.faceUp = index === reserve.length - 1;
    });
    const stock = deck.slice(16);
    stock.forEach((card) => {
      card.faceUp = false;
    });
    return makeState(
      'beehive',
      seed,
      [
        pile('removed', 'removed'),
        pile('stock', 'stock', stock),
        pile('waste', 'waste'),
        pile('beehiveReserve', 'reserve', reserve),
        ...tableaus,
      ],
      {
        options: { layout: 'beehive' },
        layout: { type: 'beehive' },
        score: 0,
      },
    );
  },
  legalMoves(state): Move[] {
    return state.status === 'playing' ? beehiveMoves(state) : [];
  },
  applyMove(state, move): ApplyResult {
    return checked(state, move, beehive.legalMoves(state), () => {
      if (move.type === 'transfer') {
        const result = transfer(state, move.from, move.to, move.cardIds);
        if (result.error) return result;
        const next = clearBeehiveGroups(result.state);
        next.meta.score = next.piles.removed.cards.length;
        if (beehive.isWon(next)) next.status = 'won';
        return { state: next };
      }
      if (move.type === 'draw') return draw(state, 'stock', 'waste', move.count ?? 1);
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
      return { state, error: 'Only Beehive building moves are legal' };
    });
  },
  isWon: (state) => state.piles.removed.cards.length === 52,
  hint: (state) =>
    beehive.legalMoves(state).find((move) => move.type === 'transfer') ??
    beehive.legalMoves(state)[0],
};

interface GridDefinition extends GameDefinition {
  create(seed?: string): GameState;
}

function createGridState(id: string, layout: string, size: number, seed: string): GameState {
  const deck = shuffledDeck(seed);
  const cells = Array.from({ length: size }, (_, index) => pile(`g${index}`, 'tableau'));
  const stock = pile('stock', 'stock', deck);
  stock.cards.forEach((card) => {
    card.faceUp = false;
  });
  return makeState(
    id,
    seed,
    [pile('removed', 'removed'), ...cells, pile('waste', 'waste'), stock],
    {
      options: { layout },
      layout: { type: layout, size },
      score: 0,
      scoreDetails: [],
      phase: 'draw',
    },
  );
}

type ScoreLine = { line: string; label: string; score: number };
type GridScore = { score: number; details: ScoreLine[] };

function gridLines(state: GameState): Array<{ line: string; cards: Card[] }> {
  const size = Object.keys(state.piles).filter((id) => id.startsWith('g')).length;
  const side = Math.sqrt(size);
  const cardAt = (index: number) => top(state.piles[`g${index}`]);
  const lines: Array<{ line: string; cards: Card[] }> = [];
  for (let row = 0; row < side; row += 1) {
    const cards = Array.from({ length: side }, (_, column) => cardAt(row * side + column));
    if (cards.every((card): card is Card => Boolean(card)))
      lines.push({ line: `R${row + 1}`, cards });
  }
  for (let column = 0; column < side; column += 1) {
    const cards = Array.from({ length: side }, (_, row) => cardAt(row * side + column));
    if (cards.every((card): card is Card => Boolean(card)))
      lines.push({ line: `C${column + 1}`, cards });
  }
  return lines;
}

export function scorePokerHand(cards: readonly Card[]): Omit<ScoreLine, 'line'> {
  if (cards.length !== 5) return { label: 'Incomplete', score: 0 };
  const ranks = cards.map((card) => card.rank);
  const counts = [
    ...new Map(ranks.map((rank) => [rank, ranks.filter((item) => item === rank).length])).values(),
  ].sort((left, right) => right - left);
  const unique = [...new Set(ranks)].sort((left, right) => left - right);
  const royal = unique.join(',') === '1,10,11,12,13';
  const straight =
    unique.length === 5 &&
    (royal ||
      unique.every((rank, index) => index === 0 || rank === unique[index - 1] + 1) ||
      unique.join(',') === '1,2,3,4,5');
  const flush = cards.every((card) => card.suit === cards[0].suit);
  if (royal && flush) return { label: 'Royal flush', score: 100 };
  if (straight && flush) return { label: 'Straight flush', score: 75 };
  if (counts[0] === 4) return { label: 'Four of a kind', score: 50 };
  if (counts[0] === 3 && counts[1] === 2) return { label: 'Full house', score: 25 };
  if (flush) return { label: 'Flush', score: 20 };
  if (straight) return { label: 'Straight', score: 15 };
  if (counts[0] === 3) return { label: 'Three of a kind', score: 10 };
  if (counts[0] === 2 && counts[1] === 2) return { label: 'Two pair', score: 5 };
  if (counts[0] === 2) return { label: 'Pair', score: 2 };
  return { label: 'High card', score: 0 };
}

export function scoreCribbageHand(cards: readonly Card[]): Omit<ScoreLine, 'line'> {
  if (cards.length !== 4) return { label: 'Incomplete', score: 0 };
  return {
    label: 'Cribbage hand',
    score: scoreCribbageCards(cards) + (cards.every((card) => card.suit === cards[0].suit) ? 4 : 0),
  };
}

function scoreCribbageCards(cards: readonly Card[]): number {
  let score = 0;
  for (let mask = 1; mask < 1 << cards.length; mask += 1) {
    const total = cards.reduce(
      (sum, card, index) => sum + (mask & (1 << index) ? Math.min(card.rank, 10) : 0),
      0,
    );
    if (total === 15) score += 2;
  }
  const counts = new Map<number, number>();
  cards.forEach((card) => counts.set(card.rank, (counts.get(card.rank) ?? 0) + 1));
  counts.forEach((count) => {
    score += count > 1 ? count * (count - 1) : 0;
  });
  const ranks = [...counts.keys()].sort((left, right) => left - right);
  let runStart = 0;
  while (runStart < ranks.length) {
    let runEnd = runStart;
    while (runEnd + 1 < ranks.length && ranks[runEnd + 1] === ranks[runEnd] + 1) runEnd += 1;
    const length = runEnd - runStart + 1;
    if (length >= 3) {
      const multiplicity = ranks
        .slice(runStart, runEnd + 1)
        .reduce((product, rank) => product * (counts.get(rank) ?? 1), 1);
      score += length * multiplicity;
    }
    runStart = runEnd + 1;
  }
  return score;
}

export function scoreCribbageShow(
  hand: readonly Card[],
  starter: Card,
  crib = false,
): Omit<ScoreLine, 'line'> {
  if (hand.length !== 4) return { label: 'Incomplete', score: 0 };
  const cards = [...hand, starter];
  let score = scoreCribbageCards(cards);
  if (hand.every((card) => card.suit === hand[0].suit))
    score += starter.suit === hand[0].suit ? 5 : crib ? 0 : 4;
  if (hand.some((card) => card.rank === 11 && card.suit === starter.suit)) score += 1;
  return { label: 'Cribbage show', score };
}

function scoreGrid(state: GameState, cribbage: boolean): GridScore {
  const details = gridLines(state).map(({ line, cards }) => ({
    line,
    ...(cribbage ? scoreCribbageHand(cards) : scorePokerHand(cards)),
  }));
  return { score: details.reduce((total, detail) => total + detail.score, 0), details };
}

function makeGridScoringGame(
  id: string,
  name: string,
  layout: string,
  size: number,
  cribbage = false,
): GridDefinition {
  const definition: GridDefinition = {
    id,
    name,
    decks: 1,
    create(seed = DEFAULT_SEED): GameState {
      return createGridState(id, layout, size, seed);
    },
    legalMoves(state): Move[] {
      if (state.piles.waste.cards.length) {
        const card = top(state.piles.waste);
        return card
          ? Object.values(state.piles)
              .filter((item) => item.kind === 'tableau' && item.cards.length === 0)
              .map((item) => ({
                type: 'transfer' as const,
                from: 'waste',
                to: item.id,
                cardIds: [card.id],
              }))
          : [];
      }
      if (!state.piles.stock.cards.length) return [];
      return [{ type: 'draw', from: 'stock', to: 'waste', count: 1 }];
    },
    applyMove(state, move): ApplyResult {
      return checked(state, move, definition.legalMoves(state), () => {
        if (move.type === 'draw') {
          const result = draw(state, 'stock', 'waste', 1);
          if (!result.error) result.state.meta.phase = 'place';
          return result;
        }
        if (move.type !== 'transfer')
          return { state, error: 'Place the drawn card in an empty square' };
        const result = transfer(state, move.from, move.to, move.cardIds);
        if (result.error) return result;
        const next = result.state;
        const scored = scoreGrid(next, cribbage);
        next.meta.score = scored.score;
        next.meta.scoreDetails = scored.details;
        next.meta.phase = definition.isWon(next) ? 'complete' : 'draw';
        if (definition.isWon(next)) next.status = 'won';
        return { state: next };
      });
    },
    isWon: (state) =>
      Object.values(state.piles)
        .filter((item) => item.kind === 'tableau')
        .every((item) => item.cards.length === 1),
    hint: (state) => definition.legalMoves(state)[0],
  };
  return definition;
}

const pokerSquares = makeGridScoringGame('poker-squares', 'Poker Squares', 'grid-5x5', 25);
const cribbageSquares = makeGridScoringGame(
  'cribbage-squares',
  'Cribbage Squares',
  'grid-4x4',
  16,
  true,
);

const cribbageHandIds = Array.from({ length: 12 }, (_, index) => `cribHand${index}`);
const cribbageHandOneIds = cribbageHandIds.slice(0, 6);
const cribbageHandTwoIds = cribbageHandIds.slice(6);
function cribbageDiscardCount(state: GameState, ids: readonly string[]): number {
  return ids.filter((id) => !state.piles[id].cards.length).length;
}
function dealCribbageRound(state: GameState): GameState {
  const next = cloneState(state);
  const cards = next.piles.stock.cards.splice(Math.max(0, next.piles.stock.cards.length - 13), 13);
  cards.forEach((card, index) => {
    card.faceUp = index < 12;
    if (index < 12) next.piles[cribbageHandIds[index]].cards.push(card);
    else next.piles.cribbageStarter.cards.push(card);
  });
  next.meta.phase = 'discard';
  next.meta.round = Number(next.meta.round ?? 0) + 1;
  return next;
}
function completeCribbageRound(state: GameState): GameState {
  const next = cloneState(state);
  const starter = top(next.piles.cribbageStarter);
  if (!starter) return next;
  starter.faceUp = true;
  const handOne = cribbageHandOneIds.flatMap((id) => next.piles[id].cards);
  const handTwo = cribbageHandTwoIds.flatMap((id) => next.piles[id].cards);
  const crib = next.piles.crib.cards;
  const hands = [
    scoreCribbageShow(handOne, starter),
    scoreCribbageShow(handTwo, starter),
    scoreCribbageShow(crib, starter, true),
  ];
  const heels = starter.rank === 11 ? 2 : 0;
  const roundScore = hands.reduce((total, hand) => total + hand.score, heels);
  next.meta.score = Number(next.meta.score ?? 0) + roundScore;
  next.meta.roundScore = roundScore;
  next.meta.scoreDetails = hands.map((hand, index) => ({
    line: ['Hand 1', 'Hand 2', 'Crib'][index],
    ...hand,
  }));
  next.meta.phase = next.piles.stock.cards.length ? 'score' : 'complete';
  if (!next.piles.stock.cards.length) next.status = 'won';
  return next;
}
function archiveCribbageRound(state: GameState): GameState {
  const next = cloneState(state);
  for (const id of [...cribbageHandIds, 'crib', 'cribbageStarter'])
    next.piles.removed.cards.push(...next.piles[id].cards.splice(0));
  return dealCribbageRound(next);
}
const cribbageSolitaire: GameDefinition = {
  id: 'cribbage-solitaire',
  name: 'Cribbage Solitaire',
  decks: 1,
  create(seed = DEFAULT_SEED): GameState {
    const stock = shuffledDeck(seed);
    stock.forEach((card) => {
      card.faceUp = false;
    });
    const state = makeState(
      'cribbage-solitaire',
      seed,
      [
        pile('removed', 'removed'),
        pile('stock', 'stock', stock),
        pile('crib', 'reserve'),
        pile('cribbageStarter', 'foundation'),
        ...cribbageHandIds.map((id) => pile(id, 'tableau')),
      ],
      {
        options: { layout: 'cribbage-solitaire' },
        layout: { type: 'cribbage-solitaire' },
        phase: 'discard',
        round: 0,
        score: 0,
      },
    );
    const dealt = dealCribbageRound(state);
    dealt.moveCount = 0;
    return dealt;
  },
  legalMoves(state): Move[] {
    if (state.status !== 'playing') return [];
    if (state.meta.phase === 'score')
      return [{ type: 'draw', from: 'stock', to: 'cribbageNext', count: 13 }];
    if (state.meta.phase !== 'discard') return [];
    const moves: Move[] = [];
    for (const ids of [cribbageHandOneIds, cribbageHandTwoIds]) {
      if (cribbageDiscardCount(state, ids) >= 2) continue;
      for (const id of ids) {
        const card = top(state.piles[id]);
        if (card) moves.push({ type: 'transfer', from: id, to: 'crib', cardIds: [card.id] });
      }
    }
    return moves;
  },
  applyMove(state, move): ApplyResult {
    return checked(state, move, cribbageSolitaire.legalMoves(state), () => {
      if (move.type === 'draw') {
        const next = archiveCribbageRound(state);
        next.moveCount += 1;
        return { state: next };
      }
      if (move.type !== 'transfer')
        return { state, error: 'Choose two cards from each hand for the crib' };
      const next = cloneState(state);
      const source = next.piles[move.from];
      const cardIndex = source.cards.findIndex((card) => card.id === move.cardIds[0]);
      if (cardIndex < 0) return { state, error: 'Selected card is unavailable' };
      next.piles.crib.cards.push(...source.cards.splice(cardIndex, 1));
      next.moveCount += 1;
      if (
        cribbageDiscardCount(next, cribbageHandOneIds) === 2 &&
        cribbageDiscardCount(next, cribbageHandTwoIds) === 2
      )
        return { state: completeCribbageRound(next) };
      return { state: next };
    });
  },
  isWon: (state) => state.meta.phase === 'complete',
  hint: (state) => cribbageSolitaire.legalMoves(state)[0],
};

const bowlingPinIds = Array.from({ length: 10 }, (_, index) => `bowlPin${index}`);
const bowlingBallIds = Array.from({ length: 3 }, (_, index) => `bowlBall${index}`);
const bowlingCardIds = [...bowlingPinIds, ...bowlingBallIds, 'bowlingActive', 'bowlingUsed'];
const bowlingAdjacency: Record<number, number[]> = {
  0: [1, 4, 5],
  1: [0, 2, 4, 5, 6],
  2: [1, 3, 5, 6],
  3: [2, 6],
  4: [0, 1, 5, 7],
  5: [0, 1, 2, 4, 6, 7, 8],
  6: [1, 2, 3, 5, 8],
  7: [4, 5, 8, 9],
  8: [5, 6, 7, 9],
  9: [7, 8],
};
function bowlingPins(state: GameState): Array<{ pileId: string; card: Card; index: number }> {
  return bowlingPinIds.flatMap((pileId, index) => {
    const card = top(state.piles[pileId]);
    return card ? [{ pileId, card, index }] : [];
  });
}
function connectedBowlingPins(indices: number[]): boolean {
  if (!indices.length) return false;
  const remaining = new Set(indices);
  const seen = new Set<number>([indices[0]]);
  const queue = [indices[0]];
  while (queue.length) {
    const current = queue.shift()!;
    for (const adjacent of bowlingAdjacency[current])
      if (remaining.has(adjacent) && !seen.has(adjacent)) {
        seen.add(adjacent);
        queue.push(adjacent);
      }
  }
  return seen.size === indices.length;
}
function bowlingTargetMatches(ball: Card, pins: Card[]): boolean {
  const total = pins.reduce((sum, pin) => sum + pin.rank, 0);
  return ball.rank === 10 ? total === 10 : total % 10 === ball.rank;
}
function bowlingKnockMoves(state: GameState): Move[] {
  const active = top(state.piles.bowlingActive);
  if (!active) return [];
  const pins = bowlingPins(state);
  const removedIndices = bowlingPinIds
    .map((id, index) => (!state.piles[id].cards.length ? index : -1))
    .filter((index) => index >= 0);
  const firstBallCard = state.meta.bowlingFirstCardPlayed !== true;
  const moves: Move[] = [];
  for (let size = 1; size <= 3; size += 1) {
    const select = (start: number, chosen: (typeof pins)[number][]) => {
      if (chosen.length === size) {
        const indices = chosen.map((pin) => pin.index);
        if (
          !connectedBowlingPins(indices) ||
          !bowlingTargetMatches(
            active,
            chosen.map((pin) => pin.card),
          )
        )
          return;
        if (
          firstBallCard &&
          (indices.some((index) => index < 4) || (indices.length === 1 && indices[0] === 5))
        )
          return;
        if (
          removedIndices.length &&
          !indices.some((index) =>
            bowlingAdjacency[index].some((adjacent) => removedIndices.includes(adjacent)),
          )
        )
          return;
        moves.push({
          type: 'remove',
          from: 'bowlingActive',
          to: 'bowlingUsed',
          cardIds: [active.id, ...chosen.map((pin) => pin.card.id)],
        });
        return;
      }
      for (let index = start; index < pins.length; index += 1)
        select(index + 1, [...chosen, pins[index]]);
    };
    select(0, []);
  }
  return moves;
}
function bowlingFrameCards(state: GameState): Card[] {
  return bowlingCardIds.flatMap((id) => state.piles[id].cards);
}
export function scoreBowlingFrames(
  frames: readonly (readonly number[])[],
  bonus: readonly number[] = [],
): number {
  const rolls = [...frames.flat(), ...bonus];
  let offset = 0;
  let score = 0;
  for (let frame = 0; frame < Math.min(10, frames.length); frame += 1) {
    const current = frames[frame];
    if (current.length === 1 && current[0] === 10) {
      if (rolls.length < offset + 3) break;
      score += 10 + rolls[offset + 1] + rolls[offset + 2];
    } else if (current[0] + current[1] === 10) {
      if (rolls.length < offset + 3) break;
      score += 10 + rolls[offset + 2];
    } else score += current[0] + current[1];
    offset += current.length;
  }
  return score;
}
function setBowlingScore(state: GameState): void {
  const frames = (state.meta.bowlingFrames as number[][] | undefined) ?? [];
  const bonus = (state.meta.bowlingBonusRolls as number[] | undefined) ?? [];
  state.meta.score = scoreBowlingFrames(frames, bonus);
}
function revealBowlingTop(pileId: string, state: GameState): void {
  const card = top(state.piles[pileId]);
  if (card) card.faceUp = true;
}
function setupBowlingRack(state: GameState, frame: number): GameState {
  const next = cloneState(state);
  const cards = bowlingFrameCards(next);
  for (const id of bowlingCardIds) next.piles[id].cards = [];
  const shuffled = shuffle(
    cards,
    `${next.seed}:bowling:${frame}:${Number(next.meta.bowlingRack ?? 0)}`,
  );
  shuffled.slice(0, 10).forEach((card, index) => {
    card.faceUp = true;
    next.piles[bowlingPinIds[index]].cards.push(card);
  });
  let cursor = 10;
  for (const [index, count] of [5, 3, 2].entries()) {
    const cardsForPile = shuffled.slice(cursor, cursor + count);
    cursor += count;
    cardsForPile.forEach((card, cardIndex) => {
      card.faceUp = cardIndex === cardsForPile.length - 1;
      next.piles[bowlingBallIds[index]].cards.push(card);
    });
  }
  next.meta.bowlingRack = Number(next.meta.bowlingRack ?? 0) + 1;
  next.meta.bowlingBall = 1;
  next.meta.bowlingCurrentPins = 0;
  next.meta.bowlingFirstBallPins = 0;
  next.meta.bowlingFirstCardPlayed = false;
  delete next.meta.bowlingActiveFrom;
  return next;
}
function finishBowlingFrame(state: GameState, rolls: number[]): GameState {
  const next = cloneState(state);
  const frames = [...((next.meta.bowlingFrames as number[][] | undefined) ?? []), rolls];
  next.meta.bowlingFrames = frames;
  if (frames.length < 10) {
    const rack = setupBowlingRack(next, frames.length + 1);
    setBowlingScore(rack);
    return rack;
  }
  const last = rolls;
  const bonusNeeded = last[0] === 10 ? 2 : last[0] + last[1] === 10 ? 1 : 0;
  next.meta.bowlingBonusNeeded = bonusNeeded;
  next.meta.bowlingBonusRolls = [];
  if (!bonusNeeded) {
    next.meta.phase = 'complete';
    next.status = 'won';
    setBowlingScore(next);
    return next;
  }
  next.meta.phase = 'bonus';
  const rack = setupBowlingRack(next, 11);
  rack.meta.phase = 'bonus';
  setBowlingScore(rack);
  return rack;
}
function completeBowlingBonus(state: GameState, pins: number): GameState {
  const next = cloneState(state);
  const rolls = [...((next.meta.bowlingBonusRolls as number[] | undefined) ?? []), pins];
  const needed = Number(next.meta.bowlingBonusNeeded ?? 0);
  next.meta.bowlingBonusRolls = rolls;
  if (rolls.length >= needed) {
    next.meta.phase = 'complete';
    next.status = 'won';
    setBowlingScore(next);
    return next;
  }
  const rack = setupBowlingRack(next, 11 + rolls.length);
  rack.meta.phase = 'bonus';
  setBowlingScore(rack);
  return rack;
}
function endBowlingBall(state: GameState): GameState {
  const next = cloneState(state);
  const currentPins = Number(next.meta.bowlingCurrentPins ?? 0);
  if (next.meta.phase === 'bonus') return completeBowlingBonus(next, currentPins);
  const activeFrom = String(next.meta.bowlingActiveFrom ?? '');
  const active = next.piles.bowlingActive.cards.pop();
  if (active) next.piles.bowlingUsed.cards.push(active);
  if (activeFrom) revealBowlingTop(activeFrom, next);
  for (const pileId of bowlingBallIds) {
    if (pileId === activeFrom) continue;
    const discarded = next.piles[pileId].cards.pop();
    if (discarded) next.piles.bowlingUsed.cards.push(discarded);
    revealBowlingTop(pileId, next);
  }
  delete next.meta.bowlingActiveFrom;
  if (Number(next.meta.bowlingBall) === 1) {
    next.meta.bowlingBall = 2;
    next.meta.bowlingFirstBallPins = currentPins;
    next.meta.bowlingCurrentPins = 0;
    next.meta.bowlingFirstCardPlayed = false;
    return next;
  }
  return finishBowlingFrame(next, [Number(next.meta.bowlingFirstBallPins ?? 0), currentPins]);
}
const bowlingSolitaire: GameDefinition = {
  id: 'bowling-solitaire',
  name: 'Bowling Solitaire',
  decks: 1,
  create(seed = DEFAULT_SEED): GameState {
    const deck = shuffledDeck(seed);
    const bowlingCards = deck.filter(
      (card) => (card.suit === 'clubs' || card.suit === 'hearts') && card.rank <= 10,
    );
    const unused = deck.filter((card) => !bowlingCards.includes(card));
    const state = makeState(
      'bowling-solitaire',
      seed,
      [
        pile('removed', 'removed'),
        pile('bowlingUsed', 'removed', bowlingCards),
        pile('bowlingUnused', 'cell', unused),
        pile('bowlingActive', 'cell'),
        ...bowlingPinIds.map((id) => pile(id, 'tableau')),
        ...bowlingBallIds.map((id) => pile(id, 'reserve')),
      ],
      {
        options: { layout: 'bowling' },
        layout: { type: 'bowling' },
        phase: 'play',
        bowlingFrames: [],
        bowlingRack: 0,
        score: 0,
      },
    );
    const rack = setupBowlingRack(state, 1);
    rack.moveCount = 0;
    return rack;
  },
  legalMoves(state): Move[] {
    if (state.status !== 'playing') return [];
    const active = top(state.piles.bowlingActive);
    if (active)
      return [
        ...bowlingKnockMoves(state),
        { type: 'draw', from: 'bowlingControl', to: 'bowlingNextBall', count: 1 },
      ];
    const moves: Move[] = bowlingBallIds.flatMap((pileId) => {
      const card = top(state.piles[pileId]);
      return card?.faceUp
        ? [{ type: 'transfer' as const, from: pileId, to: 'bowlingActive', cardIds: [card.id] }]
        : [];
    });
    moves.push({ type: 'draw', from: 'bowlingControl', to: 'bowlingNextBall', count: 1 });
    return moves;
  },
  applyMove(state, move): ApplyResult {
    return checked(state, move, bowlingSolitaire.legalMoves(state), () => {
      if (move.type === 'transfer') {
        const result = transfer(state, move.from, move.to, move.cardIds);
        if (result.error) return result;
        result.state.meta.bowlingActiveFrom = move.from;
        return result;
      }
      if (move.type === 'draw') {
        const next = endBowlingBall(state);
        next.moveCount += 1;
        return { state: next };
      }
      if (move.type !== 'remove') return { state, error: 'Choose a ball and valid adjacent pins' };
      const next = cloneState(state);
      const activeBall = next.piles.bowlingActive.cards.pop();
      if (!activeBall || activeBall.id !== move.cardIds[0])
        return { state, error: 'Choose an exposed ball card first' };
      next.piles.bowlingUsed.cards.push(activeBall);
      for (const cardId of move.cardIds.slice(1)) {
        const pin = bowlingPinIds.find((id) => top(next.piles[id])?.id === cardId);
        if (!pin) return { state, error: 'Only exposed pins may be knocked down' };
        next.piles.bowlingUsed.cards.push(...next.piles[pin].cards.splice(-1));
      }
      const activeFrom = String(next.meta.bowlingActiveFrom ?? '');
      if (activeFrom) revealBowlingTop(activeFrom, next);
      next.meta.bowlingCurrentPins =
        Number(next.meta.bowlingCurrentPins ?? 0) + move.cardIds.length - 1;
      next.meta.bowlingFirstCardPlayed = true;
      delete next.meta.bowlingActiveFrom;
      next.moveCount += 1;
      if (!bowlingPins(next).length) {
        if (next.meta.phase === 'bonus')
          return { state: completeBowlingBonus(next, Number(next.meta.bowlingCurrentPins ?? 0)) };
        const first = Number(next.meta.bowlingFirstBallPins ?? 0);
        const current = Number(next.meta.bowlingCurrentPins ?? 0);
        return {
          state: finishBowlingFrame(
            next,
            next.meta.bowlingBall === 1 ? [current] : [first, current],
          ),
        };
      }
      return { state: next };
    });
  },
  isWon: (state) => state.meta.phase === 'complete',
  hint: (state) =>
    bowlingSolitaire.legalMoves(state).find((move) => move.type === 'remove') ??
    bowlingSolitaire.legalMoves(state)[0],
};

export {
  giza,
  cheops,
  triPeaks,
  blackHole,
  accordion,
  acesUp,
  monteCarlo,
  blockTen,
  fourteenOut,
  royalMarriage,
  gayGordons,
  beehive,
  nestor,
  pokerSquares,
  cribbageSquares,
  cribbageSolitaire,
  bowlingSolitaire,
};

export const REMOVAL_SCORING_GAMES = {
  giza,
  cheops,
  triPeaks,
  blackHole,
  accordion,
  acesUp,
  monteCarlo,
  blockTen,
  fourteenOut,
  royalMarriage,
  gayGordons,
  beehive,
  nestor,
  pokerSquares,
  cribbageSquares,
  cribbageSolitaire,
  bowlingSolitaire,
} as const;

export type RemovalScoringGameId = keyof typeof REMOVAL_SCORING_GAMES;
