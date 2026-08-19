import { describe, expect, it } from 'vitest';
import { cloneState, GameSession } from './core';
import { fortyThieves, spiderette, yukon } from './longRunGames';
import { Card, GameDefinition, Move } from './types';

const definitions = [spiderette, yukon, fortyThieves] as const;

function cardsOf(state: ReturnType<GameDefinition['create']>): Card[] {
  return Object.values(state.piles).flatMap((candidate) => candidate.cards);
}

function firstLegal(definition: GameDefinition, state: ReturnType<GameDefinition['create']>): Move {
  const move = definition.legalMoves(state)[0];
  expect(move).toBeDefined();
  return move!;
}

function expectCompleteDeck(
  definition: GameDefinition,
  state: ReturnType<GameDefinition['create']>,
): void {
  const cards = cardsOf(state);
  const expectedCount = definition.decks * 52;
  expect(cards).toHaveLength(expectedCount);
  expect(new Set(cards.map((card) => card.id)).size).toBe(expectedCount);
}

describe('long-run solitaire games', () => {
  it('deals the standard layouts deterministically with every card exactly once', () => {
    const expected = new Map([
      [spiderette.id, 52],
      [yukon.id, 52],
      [fortyThieves.id, 104],
    ]);
    for (const definition of definitions) {
      const first = definition.create('long-run-seed');
      const second = definition.create('long-run-seed');
      const cards = cardsOf(first);
      expect(JSON.stringify(first)).toBe(JSON.stringify(second));
      expect(cards).toHaveLength(expected.get(definition.id)!);
      expect(new Set(cards.map((card) => card.id)).size).toBe(cards.length);
    }
  });

  it('uses the Spiderette 1-to-7 layout and deals one card per column', () => {
    const state = spiderette.create('spiderette-layout');
    expect(Array.from({ length: 7 }, (_, i) => state.piles[`t${i}`].cards.length)).toEqual([
      1, 2, 3, 4, 5, 6, 7,
    ]);
    expect(state.piles.stock.cards).toHaveLength(24);
    for (let i = 0; i < 7; i += 1) {
      const cards = state.piles[`t${i}`].cards;
      expect(cards.at(-1)?.faceUp).toBe(true);
      expect(cards.slice(0, -1).every((card) => !card.faceUp)).toBe(true);
    }
    const draw = spiderette.legalMoves(state).find((move) => move.type === 'draw');
    expect(draw).toMatchObject({ type: 'draw', from: 'stock', to: 'tableau', count: 7 });
    const result = spiderette.applyMove(state, draw!);
    expect(result.error).toBeUndefined();
    expect(result.state.piles.stock.cards).toHaveLength(17);
    expect(cardsOf(result.state)).toHaveLength(52);
  });

  it('uses the Yukon 1/6/7/8/9/10/11 layout with five exposed cards', () => {
    const state = yukon.create('yukon-layout');
    expect(Array.from({ length: 7 }, (_, i) => state.piles[`t${i}`].cards.length)).toEqual([
      1, 6, 7, 8, 9, 10, 11,
    ]);
    for (let i = 0; i < 7; i += 1) {
      const cards = state.piles[`t${i}`].cards;
      expect(cards.slice(-5).every((card) => card.faceUp)).toBe(true);
      expect(cards.slice(0, -5).every((card) => !card.faceUp)).toBe(true);
    }
    expect(Object.values(state.piles).some((candidate) => candidate.kind === 'stock')).toBe(false);
  });

  it('uses the Forty Thieves 40-card tableau and one-pass stock', () => {
    const state = fortyThieves.create('forty-thieves-layout');
    expect(Array.from({ length: 10 }, (_, i) => state.piles[`t${i}`].cards.length)).toEqual(
      Array(10).fill(4),
    );
    expect(state.piles.stock.cards).toHaveLength(64);
    expect(state.piles.waste.cards).toHaveLength(0);
    const draw = fortyThieves.legalMoves(state).find((move) => move.type === 'draw');
    expect(draw).toEqual({ type: 'draw', from: 'stock', to: 'waste', count: 1 });
    const result = fortyThieves.applyMove(state, draw!);
    expect(result.error).toBeUndefined();
    expect(result.state.piles.stock.cards).toHaveLength(63);
    expect(result.state.piles.waste.cards).toHaveLength(1);
  });

  it('rejects illegal moves without mutation and supports undo/retry for every game', () => {
    for (const definition of definitions) {
      const session = new GameSession(definition, `undo-${definition.id}`);
      const before = JSON.stringify(session.state);
      const invalid = session.move({
        type: 'transfer',
        from: 'missing',
        to: 'also-missing',
        cardIds: ['missing'],
      });
      expect(invalid.error).toBeTruthy();
      expect(JSON.stringify(session.state)).toBe(before);

      const move = firstLegal(definition, session.state);
      const moved = session.move(move);
      expect(moved.error).toBeUndefined();
      expect(session.state.moveCount).toBe(1);
      session.undo();
      expect(JSON.stringify(session.state)).toBe(before);
      session.move(move);
      const afterMove = JSON.stringify(session.state);
      session.retry();
      expect(JSON.stringify(session.state)).toBe(before);
      session.move(move);
      expect(JSON.stringify(session.state)).toBe(afterMove);
    }
  });

  it('preserves the complete deck through a deterministic legal play prefix', () => {
    for (const definition of definitions) {
      let state = definition.create(`invariant-${definition.id}`);
      for (let turn = 0; turn < 12; turn += 1) {
        const legal = definition.legalMoves(state);
        if (!legal.length) break;
        const result = definition.applyMove(state, legal[turn % legal.length]);
        expect(result.error).toBeUndefined();
        state = result.state;
        expectCompleteDeck(definition, state);
      }
    }
  });

  it('automatically removes a completed same-suit Spiderette run', () => {
    const state = cloneState(spiderette.create('spiderette-complete-run'));
    const all = cardsOf(state);
    const run = all.filter((card) => card.suit === 'spades').sort((a, b) => b.rank - a.rank);
    const selected = new Set(run.map((card) => card.id));
    for (const pile of Object.values(state.piles))
      pile.cards = pile.cards.filter((card) => !selected.has(card.id));
    state.piles.t0.cards = run.slice(0, 12).map((card) => ({ ...card, faceUp: true }));
    state.piles.t1.cards = [{ ...run[12], faceUp: true }];
    const move: Move = { type: 'transfer', from: 't1', to: 't0', cardIds: [run[12].id] };
    expect(spiderette.applyMove(state, move).state.piles.removed.cards).toHaveLength(13);
  });
});
