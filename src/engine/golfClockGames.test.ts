import { describe, expect, it } from 'vitest';
import { GameSession } from './core';
import { clock, golf } from './golfClockGames';
import type { GameDefinition, GameState } from './types';

const allCards = (state: GameState) => Object.values(state.piles).flatMap((item) => item.cards);

describe('Golf and Clock', () => {
  it.each([golf, clock] as const)('deals a deterministic complete deck', (definition) => {
    const first = definition.create(`fixed-${definition.id}`);
    expect(JSON.stringify(first)).toBe(JSON.stringify(definition.create(`fixed-${definition.id}`)));
    expect(allCards(first)).toHaveLength(52);
    expect(new Set(allCards(first).map((card) => card.id)).size).toBe(52);
  });

  it('Golf deals seven columns of five and accepts adjacent ranks only', () => {
    const state = golf.create('golf-layout');
    expect(Array.from({ length: 7 }, (_, i) => state.piles[`t${i}`].cards)).toHaveLength(7);
    expect(Array.from({ length: 7 }, (_, i) => state.piles[`t${i}`].cards.length)).toEqual(
      Array(7).fill(5),
    );
    const drawn = golf.applyMove(state, {
      type: 'draw',
      from: 'stock',
      to: 'waste',
      count: 1,
    }).state;
    const waste = drawn.piles.waste.cards.at(-1)!;
    expect(waste).toBeDefined();
    expect(golf.legalMoves(drawn).some((move) => move.type === 'transfer')).toBe(
      Array.from({ length: 7 }, (_, i) => drawn.piles[`t${i}`].cards.at(-1)!).some(
        (card) =>
          Math.abs(card.rank - waste.rank) === 1 ||
          (card.rank === 1 && waste.rank === 13) ||
          (card.rank === 13 && waste.rank === 1),
      ),
    );
    expect(
      golf.applyMove(drawn, { type: 'transfer', from: 't0', to: 'waste', cardIds: ['missing'] })
        .error,
    ).toBeTruthy();
  });

  it('Clock starts with twelve outer piles and a central active pile', () => {
    const state = clock.create('clock-layout');
    expect(Object.keys(state.piles).filter((id) => id.startsWith('clock'))).toHaveLength(13);
    expect(state.meta.activePile).toBe('clock13');
    expect(
      Array.from({ length: 13 }, (_, index) => state.piles[`clock${index + 1}`].cards.length),
    ).toEqual(Array(13).fill(4));
    const move = clock.legalMoves(state)[0];
    expect(move).toBeDefined();
    expect(move?.type).toBe('transfer');
    expect(
      clock.applyMove(state, { type: 'transfer', from: 'wrong', to: 'clock1', cardIds: ['bad'] })
        .error,
    ).toBeTruthy();
    if (!move || move.type !== 'transfer') throw new Error('Clock must expose a transfer move');
    const next = clock.applyMove(state, move).state;
    expect(next.meta.activePile).toBe(move.to);
    expect(next.piles.removed.cards).toHaveLength(1);
    expect(next.piles[move.to].cards.at(-1)?.faceUp).toBe(true);
    const nextMove = clock.legalMoves(next)[0];
    expect(nextMove?.type).toBe('transfer');
    if (nextMove?.type === 'transfer') expect(nextMove.cardIds[0]).not.toBe(move.cardIds[0]);
  });

  it('recognizes a Clock game after every clock pile has been cleared', () => {
    const state = clock.create('clock-win');
    for (let index = 1; index <= 13; index += 1)
      state.piles.removed.cards.push(...state.piles[`clock${index}`].cards.splice(0));
    expect(clock.isWon(state)).toBe(true);
  });

  it.each([golf, clock] as readonly GameDefinition[])(
    'supports undo and deterministic retry (%s)',
    (definition) => {
      const session = new GameSession(definition, `session-${definition.id}`);
      const before = JSON.stringify(session.state);
      const move = definition.legalMoves(session.state)[0];
      expect(move).toBeDefined();
      expect(session.move(move!).error).toBeUndefined();
      session.undo();
      expect(JSON.stringify(session.state)).toBe(before);
      session.move(move!);
      const changed = JSON.stringify(session.state);
      session.retry();
      expect(JSON.stringify(session.state)).toBe(before);
      expect(changed).not.toBe(before);
    },
  );
});
