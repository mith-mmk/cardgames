import { describe, expect, it } from 'vitest';
import { cloneState, GameSession } from './core';
import {
  agnesBernauer,
  canfield,
  kingAlbert,
  RESERVE_KLONDIKE_GAMES,
} from './reserveKlondikeGames';
import { Card, GameDefinition } from './types';

const definitions = [canfield, agnesBernauer, kingAlbert] as const;

function cardsOf(state: ReturnType<GameDefinition['create']>): Card[] {
  return Object.values(state.piles).flatMap((candidate) => candidate.cards);
}

function expectCompleteDeck(state: ReturnType<GameDefinition['create']>): void {
  const cards = cardsOf(state);
  expect(cards).toHaveLength(52);
  expect(new Set(cards.map((card) => card.id)).size).toBe(52);
}

describe('reserve and Klondike-family games', () => {
  it('exports the three independent game definitions', () => {
    expect(Object.keys(RESERVE_KLONDIKE_GAMES)).toEqual([
      'canfield',
      'agnesBernauer',
      'kingAlbert',
    ]);
    expect(definitions.map((definition) => definition.decks)).toEqual([1, 1, 1]);
  });

  it('deals Canfield deterministically with its 13-card reserve and base foundation', () => {
    const first = canfield.create('canfield-layout');
    const second = canfield.create('canfield-layout');
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expectCompleteDeck(first);
    expect(first.piles.reserve.cards).toHaveLength(13);
    expect(first.piles.reserve.cards.slice(0, -1).every((card) => !card.faceUp)).toBe(true);
    expect(first.piles.reserve.cards.at(-1)?.faceUp).toBe(true);
    expect(first.piles.f0.cards).toHaveLength(1);
    expect(first.piles.stock.cards).toHaveLength(34);
    expect(first.meta.baseRank).toBe(first.piles.f0.cards[0].rank);
    expect(['t0', 't1', 't2', 't3'].map((id) => first.piles[id].cards.length)).toEqual([
      1, 1, 1, 1,
    ]);
  });

  it('uses draw-three and unlimited recycle in Canfield without losing cards', () => {
    let state = canfield.create('canfield-stock');
    const draw = canfield.legalMoves(state).find((move) => move.type === 'draw');
    expect(draw).toEqual({
      type: 'draw',
      from: 'stock',
      to: 'waste',
      count: 3,
    });
    state = canfield.applyMove(state, draw!).state;
    expect(state.piles.stock.cards).toHaveLength(31);
    expect(state.piles.waste.cards).toHaveLength(3);
    expect(state.piles.waste.cards.every((card) => card.faceUp)).toBe(true);
    expectCompleteDeck(state);

    while (state.piles.stock.cards.length) {
      const next = canfield.legalMoves(state).find((move) => move.type === 'draw');
      state = canfield.applyMove(state, next!).state;
    }
    const recycle = canfield.legalMoves(state).find((move) => move.type === 'recycle');
    expect(recycle).toEqual({ type: 'recycle', from: 'waste', to: 'stock' });
    state = canfield.applyMove(state, recycle!).state;
    expect(state.piles.stock.cards).toHaveLength(34);
    expect(state.piles.waste.cards).toHaveLength(0);
    expectCompleteDeck(state);
  });

  it('deals Agnes Bernauer as a 1-to-7 open tableau with seven reserve piles', () => {
    const state = agnesBernauer.create('agnes-layout');
    expectCompleteDeck(state);
    expect(
      ['t0', 't1', 't2', 't3', 't4', 't5', 't6'].map((id) => state.piles[id].cards.length),
    ).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(Array.from({ length: 7 }, (_, index) => state.piles[`r${index}`].cards.length)).toEqual(
      Array(7).fill(1),
    );
    expect(
      Object.values(state.piles)
        .filter((pile) => pile.kind === 'tableau')
        .every((pile) => pile.cards.every((card) => card.faceUp)),
    ).toBe(true);
    expect(state.piles.stock.cards).toHaveLength(16);
    expect(state.piles.f0.cards).toHaveLength(1);
    expect(state.meta.baseRank).toBe(state.piles.f0.cards[0].rank);
  });

  it('deals seven stock cards across Agnes reserve piles and leaves two for the final deal', () => {
    let state = agnesBernauer.create('agnes-stock');
    const deal = agnesBernauer.legalMoves(state).find((move) => move.type === 'draw');
    expect(deal).toMatchObject({
      type: 'draw',
      from: 'stock',
      to: 'r0',
      count: 7,
    });
    state = agnesBernauer.applyMove(state, deal!).state;
    expect(state.piles.stock.cards).toHaveLength(9);
    expect(Array.from({ length: 7 }, (_, index) => state.piles[`r${index}`].cards.length)).toEqual(
      Array(7).fill(2),
    );
    const secondDeal = agnesBernauer.legalMoves(state).find((move) => move.type === 'draw');
    state = agnesBernauer.applyMove(state, secondDeal!).state;
    expect(state.piles.stock.cards).toHaveLength(2);
    expect(state.meta.dealCount).toBe(2);
    expectCompleteDeck(state);
  });

  it('deals King Albert into 9-to-1 tableau columns and a seven-card reserve', () => {
    const state = kingAlbert.create('king-albert-layout');
    expectCompleteDeck(state);
    expect(Array.from({ length: 9 }, (_, index) => state.piles[`t${index}`].cards.length)).toEqual([
      9, 8, 7, 6, 5, 4, 3, 2, 1,
    ]);
    expect(state.piles.reserve.cards).toHaveLength(7);
    expect(state.piles.reserve.cards.every((card) => card.faceUp)).toBe(true);
    expect(Object.values(state.piles).filter((pile) => pile.kind === 'stock')).toHaveLength(0);
  });

  it('rejects illegal moves and keeps GameSession undo/retry deterministic', () => {
    for (const definition of definitions) {
      const session = new GameSession(definition, `session-${definition.id}`);
      const before = JSON.stringify(session.state);
      const invalid = session.move({
        type: 'transfer',
        from: 'missing',
        to: 'missing',
        cardIds: ['missing'],
      });
      expect(invalid.error).toBeTruthy();
      expect(JSON.stringify(session.state)).toBe(before);

      let move = definition.legalMoves(session.state)[0];
      if (!move) {
        const prepared = cloneState(session.state);
        prepared.piles.t8.cards = [];
        const card = prepared.piles.reserve.cards[0];
        move = {
          type: 'transfer',
          from: 'reserve',
          to: 't8',
          cardIds: [card.id],
        };
        session.reset(session.state.seed);
        // King Albert's open empty column rule guarantees this fixture is legal.
        expect(definition.legalMoves(prepared)).toContainEqual(move);
        const result = definition.applyMove(prepared, move);
        expect(result.error).toBeUndefined();
      }
      const moved = session.move(move);
      expect(moved.error).toBeUndefined();
      const afterMove = JSON.stringify(session.state);
      session.undo();
      expect(JSON.stringify(session.state)).toBe(before);
      session.move(move);
      expect(JSON.stringify(session.state)).toBe(afterMove);
      session.retry();
      expect(JSON.stringify(session.state)).toBe(before);
    }
  });

  it('recognizes the completed four-foundation win condition for every game', () => {
    for (const definition of definitions) {
      const state = cloneState(definition.create(`win-${definition.id}`));
      const all = cardsOf(state);
      for (const id of ['f0', 'f1', 'f2', 'f3']) state.piles[id].cards = [];
      for (let suitIndex = 0; suitIndex < 4; suitIndex += 1) {
        state.piles[`f${suitIndex}`].cards = all
          .filter((card) => card.suit === ['clubs', 'diamonds', 'hearts', 'spades'][suitIndex])
          .map((card) => ({ ...card, faceUp: true }));
      }
      expect(definition.isWon(state)).toBe(true);
    }
  });
});
