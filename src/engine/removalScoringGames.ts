import { ApplyResult, Card, GameDefinition, GameState, Move } from './types';
import { cloneState, draw, makeState, pile, top, transfer } from './core';
import { shuffledDeck } from './random';

const DEFAULT_SEED = 'solitaire-default';
type RemovalMode =
  'sum13' | 'sum10' | 'sum14' | 'same-rank' | 'adjacent' | 'same-or-adjacent' | 'royal';

interface RemovalConfig {
  readonly id: string;
  readonly name: string;
  readonly layout: string;
  readonly tableauCount: number;
  readonly cardsPerTableau: number;
  readonly mode: RemovalMode;
  readonly stock?: boolean;
  readonly singleRanks?: boolean;
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

function activeCards(state: GameState): Array<{ pileId: string; card: Card }> {
  const result: Array<{ pileId: string; card: Card }> = [];
  for (const item of Object.values(state.piles)) {
    if (item.kind !== 'tableau' && item.kind !== 'waste') continue;
    const card = top(item);
    if (card?.faceUp) result.push({ pileId: item.id, card });
  }
  return result;
}

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

function pairMoves(state: GameState, config: RemovalConfig): Move[] {
  return pairMovesFromCards(activeCards(state), config.mode, config.singleRanks);
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

function makePairGame(config: RemovalConfig): GameDefinition {
  const definition: GameDefinition = {
    id: config.id,
    name: config.name,
    decks: 1,
    create(seed = DEFAULT_SEED): GameState {
      return createRemovalState(config, seed);
    },
    legalMoves(state): Move[] {
      const moves = pairMoves(state, config);
      if (config.stock && state.piles.stock.cards.length)
        moves.push({ type: 'draw', from: 'stock', to: 'waste', count: 1 });
      return moves;
    },
    applyMove(state, move): ApplyResult {
      return checked(state, move, definition.legalMoves(state), () => {
        if (move.type === 'draw') return draw(state, 'stock', 'waste');
        if (move.type !== 'remove') return { state, error: 'Only removal is legal' };
        const result = removeByIds(state, move.cardIds);
        if (result.error) return result;
        const next = result.state;
        next.meta.score = Number(next.meta.score ?? 0) + move.cardIds.length;
        if (definition.isWon(next)) next.status = 'won';
        return { state: next };
      });
    },
    isWon(state): boolean {
      return Object.values(state.piles)
        .filter((item) => item.kind === 'tableau' || item.kind === 'waste' || item.kind === 'stock')
        .every((item) => item.cards.length === 0);
    },
    hint(state): Move | undefined {
      return (
        definition.legalMoves(state).find((move) => move.type === 'remove') ??
        definition.legalMoves(state)[0]
      );
    },
  };
  return definition;
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
const blockTen = makePairGame({
  id: 'block-ten',
  name: 'Block Ten',
  layout: 'block-ten',
  tableauCount: 8,
  cardsPerTableau: 6,
  mode: 'sum10',
});
const fourteenOut = makePairGame({
  id: 'fourteen-out',
  name: 'Fourteen Out',
  layout: 'fourteen-out',
  tableauCount: 8,
  cardsPerTableau: 6,
  mode: 'sum14',
});
const nestor = makePairGame({
  id: 'nestor',
  name: 'Nestor',
  layout: 'nestor',
  tableauCount: 8,
  cardsPerTableau: 6,
  mode: 'same-rank',
});

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
        mode: 'same-rank',
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

function makeAdjacentGame(id: string, name: string, layout: string): GameDefinition {
  return makePairGame({
    id,
    name,
    layout,
    tableauCount: 7,
    cardsPerTableau: 7,
    mode: 'adjacent',
    stock: true,
  });
}

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
const royalMarriage = makePairGame({
  id: 'royal-marriage',
  name: 'Royal Marriage',
  layout: 'royal-marriage',
  tableauCount: 8,
  cardsPerTableau: 6,
  mode: 'royal',
});
const gayGordons = makeAdjacentGame('gay-gordons', 'Gay Gordons', 'gay-gordons');
const beehive = makePairGame({
  id: 'beehive',
  name: 'Beehive',
  layout: 'beehive',
  tableauCount: 7,
  cardsPerTableau: 7,
  mode: 'same-rank',
});

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
  if (cards.every((card) => card.suit === cards[0].suit)) score += 4;
  return { label: 'Cribbage hand', score };
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

const cribbageSolitaire: GameDefinition = {
  id: 'cribbage-solitaire',
  name: 'Cribbage Solitaire',
  decks: 1,
  create(seed = DEFAULT_SEED): GameState {
    return createRemovalState(
      {
        id: 'cribbage-solitaire',
        name: 'Cribbage Solitaire',
        layout: 'cribbage-hands',
        tableauCount: 4,
        cardsPerTableau: 13,
        mode: 'same-rank',
      },
      seed,
    );
  },
  legalMoves(state): Move[] {
    return activeCards(state).map(({ pileId, card }) => ({
      type: 'remove',
      from: pileId,
      to: 'removed',
      cardIds: [card.id],
    }));
  },
  applyMove(state, move): ApplyResult {
    return checked(state, move, cribbageSolitaire.legalMoves(state), () => {
      if (move.type !== 'remove') return { state, error: 'Play an exposed card' };
      const result = removeByIds(state, move.cardIds);
      if (result.error) return result;
      const next = result.state;
      next.meta.score = Number(next.meta.score ?? 0) + (move.cardIds.length === 1 ? 1 : 0);
      if (cribbageSolitaire.isWon(next)) next.status = 'won';
      return { state: next };
    });
  },
  isWon: (state) =>
    Object.values(state.piles)
      .filter((item) => item.kind === 'tableau')
      .every((item) => !item.cards.length),
  hint: (state) => cribbageSolitaire.legalMoves(state)[0],
};

const bowlingSolitaire: GameDefinition = {
  id: 'bowling-solitaire',
  name: 'Bowling Solitaire',
  decks: 1,
  create(seed = DEFAULT_SEED): GameState {
    return createRemovalState(
      {
        id: 'bowling-solitaire',
        name: 'Bowling Solitaire',
        layout: 'bowling',
        tableauCount: 10,
        cardsPerTableau: 1,
        mode: 'same-rank',
      },
      seed,
    );
  },
  legalMoves(state): Move[] {
    return activeCards(state).map(({ pileId, card }) => ({
      type: 'remove',
      from: pileId,
      to: 'removed',
      cardIds: [card.id],
    }));
  },
  applyMove(state, move): ApplyResult {
    return checked(state, move, bowlingSolitaire.legalMoves(state), () => {
      if (move.type !== 'remove') return { state, error: 'Knock down an exposed pin' };
      const result = removeByIds(state, move.cardIds);
      if (result.error) return result;
      const next = result.state;
      next.meta.pinsKnocked = Number(next.meta.pinsKnocked ?? 0) + move.cardIds.length;
      next.meta.score = Number(next.meta.score ?? 0) + (10 - next.piles.removed.cards.length);
      if (bowlingSolitaire.isWon(next)) next.status = 'won';
      return { state: next };
    });
  },
  isWon: (state) =>
    Object.values(state.piles)
      .filter((item) => item.kind === 'tableau')
      .every((item) => !item.cards.length),
  hint: (state) => bowlingSolitaire.legalMoves(state)[0],
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
