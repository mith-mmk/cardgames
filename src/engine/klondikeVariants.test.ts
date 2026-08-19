import { describe, expect, it } from 'vitest';
import { GameSession } from './core';
import { auntMary, easthaven, westcliff } from './klondikeVariants';
import type { GameDefinition, GameState } from './types';

const definitions = [easthaven, westcliff, auntMary] as const;

function allCards(state: GameState) {
  return Object.values(state.piles).flatMap((pile) => pile.cards);
}

describe('Klondike-family variants', () => {
  it.each(definitions)('%s is deterministic and preserves a complete deck', (definition) => {
    const first = definition.create(`fixed-${definition.id}`);
    const second = definition.create(`fixed-${definition.id}`);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(allCards(first)).toHaveLength(52);
    expect(new Set(allCards(first).map((card) => card.id)).size).toBe(52);
  });

  it('uses the documented layouts and stock actions', () => {
    const east = easthaven.create('layout-east');
    expect(Array.from({ length: 7 }, (_, index) => east.piles[`t${index}`].cards.length)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(east.piles.stock.cards).toHaveLength(24);
    const eastDeal = easthaven.legalMoves(east).find((move) => move.type === 'draw');
    expect(eastDeal).toMatchObject({ type: 'draw', from: 'stock', to: 't0', count: 7 });
    const eastAfter = easthaven.applyMove(east, eastDeal!).state;
    expect(eastAfter.piles.stock.cards).toHaveLength(17);

    for (const definition of [westcliff, auntMary]) {
      const state = definition.create(`layout-${definition.id}`);
      expect(Array.from({ length: 7 }, (_, index) => state.piles[`t${index}`].cards.length)).toEqual(Array(7).fill(3));
      const deal = definition.legalMoves(state).find((move) => move.type === 'draw');
      expect(deal?.type).toBe('draw');
      const after = definition.applyMove(state, deal!).state;
      expect(allCards(after)).toHaveLength(52);
    }
    const westDeal = westcliff.legalMoves(westcliff.create('west-stock')).find((move) => move.type === 'draw');
    expect(westDeal).toMatchObject({ count: 3, to: 'waste' });
  });

  it('rejects an illegal move and supports deterministic undo/retry', () => {
    for (const definition of definitions as readonly GameDefinition[]) {
      const session = new GameSession(definition, `session-${definition.id}`);
      const before = JSON.stringify(session.state);
      expect(session.move({ type: 'transfer', from: 'missing', to: 'missing', cardIds: ['missing'] }).error).toBeTruthy();
      expect(JSON.stringify(session.state)).toBe(before);
      const legal = definition.legalMoves(session.state)[0];
      expect(legal).toBeDefined();
      session.move(legal!);
      const changed = JSON.stringify(session.state);
      session.undo();
      expect(JSON.stringify(session.state)).toBe(before);
      session.move(legal!);
      expect(JSON.stringify(session.state)).toBe(changed);
      session.retry();
      expect(JSON.stringify(session.state)).toBe(before);
    }
  });
});
