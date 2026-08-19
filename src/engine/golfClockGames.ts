import { ApplyResult, GameDefinition, GameState, Move } from './types';
import { cloneState, draw, makeState, pile, top, transfer } from './core';
import { shuffledDeck } from './random';

const DEFAULT_SEED = 'solitaire-default';
const checked = (state: GameState, move: Move, legal: Move[], apply: () => ApplyResult): ApplyResult =>
  legal.some((candidate) => JSON.stringify(candidate) === JSON.stringify(move))
    ? apply()
    : { state, error: 'Illegal move' };

function adjacent(a: number, b: number): boolean {
  return Math.abs(a - b) === 1 || (a === 1 && b === 13) || (a === 13 && b === 1);
}

/** Golf: clear the seven exposed tableau rows by building a one-card waste run. */
export const golf: GameDefinition = {
  id: 'golf',
  name: 'Golf',
  decks: 1,
  create(seed = DEFAULT_SEED): GameState {
    const deck = shuffledDeck(seed);
    const piles = [pile('stock', 'stock'), pile('waste', 'waste'), pile('removed', 'removed'),
      ...Array.from({ length: 7 }, (_, i) => pile(`t${i}`, 'tableau'))];
    deck.slice(0, 35).forEach((card, index) => {
      card.faceUp = true;
      piles.find((item) => item.id === `t${index % 7}`)!.cards.push(card);
    });
    deck.slice(35).forEach((card) => piles[0].cards.push(card));
    return makeState('golf', seed, piles);
  },
  legalMoves(state) {
    const moves: Move[] = [];
    const waste = top(state.piles.waste);
    if (waste) {
      for (let i = 0; i < 7; i += 1) {
        const source = state.piles[`t${i}`];
        const card = top(source);
        if (card && adjacent(card.rank, waste.rank))
          moves.push({ type: 'transfer', from: source.id, to: 'waste', cardIds: [card.id] });
      }
    }
    if (state.piles.stock.cards.length)
      moves.push({ type: 'draw', from: 'stock', to: 'waste', count: 1 });
    return moves;
  },
  applyMove(state, move) {
    return checked(state, move, this.legalMoves(state), () => {
      if (move.type === 'draw') return draw(state, 'stock', 'waste');
      if (move.type !== 'transfer') return { state, error: 'Only tableau cards can be played' };
      const result = transfer(state, move.from, 'waste', move.cardIds);
      if (result.error) return result;
      const next = cloneState(result.state);
      if (this.isWon(next)) next.status = 'won';
      return { state: next };
    });
  },
  hint: (state) => golf.legalMoves(state).find((move) => move.type === 'transfer') ?? golf.legalMoves(state)[0],
  isWon: (state) => Array.from({ length: 7 }, (_, i) => state.piles[`t${i}`].cards.length === 0).every(Boolean),
};

/** Clock: twelve numbered piles plus the centre (13); the exposed card selects the next pile. */
export const clock: GameDefinition = {
  id: 'clock',
  name: 'Clock',
  decks: 1,
  create(seed = DEFAULT_SEED): GameState {
    const deck = shuffledDeck(seed);
    const piles = [
      pile('removed', 'removed'),
      ...Array.from({ length: 13 }, (_, i) => pile(`clock${i + 1}`, 'tableau')),
    ];
    deck.forEach((card, index) => {
      const target = piles[index % 13 + 1];
      target.cards.push(card);
    });
    top(piles[13])!.faceUp = true;
    return makeState('clock', seed, piles, { activePile: 'clock13' });
  },
  legalMoves(state) {
    const activeId = String(state.meta.activePile ?? 'clock13');
    const source = state.piles[activeId];
    const card = source && top(source);
    if (!card || !card.faceUp) return [];
    return [{ type: 'transfer', from: activeId, to: `clock${card.rank}`, cardIds: [card.id] }];
  },
  applyMove(state, move) {
    return checked(state, move, this.legalMoves(state), () => {
      if (move.type !== 'transfer') return { state, error: 'Only card placement is legal' };
      const next = cloneState(state);
      const source = next.piles[move.from];
      const target = next.piles[move.to];
      if (!source || !target || top(source)?.id !== move.cardIds[0]) return { state, error: 'Card is not exposed' };
      const card = source.cards.pop()!;
      card.faceUp = true;
      next.piles.removed.cards.push(card);
      const newTop = top(target);
      if (newTop) newTop.faceUp = true;
      next.meta.activePile = target.id;
      next.moveCount += 1;
      if (this.isWon(next)) next.status = 'won';
      else if (!newTop) next.status = 'lost';
      return { state: next };
    });
  },
  hint: (state) => clock.legalMoves(state)[0],
  isWon: (state) =>
    Array.from({ length: 13 }, (_, index) => state.piles[`clock${index + 1}`].cards.length === 0).every(
      Boolean,
    ),
};
