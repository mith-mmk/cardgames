import { describe, expect, it } from 'vitest';
import { GameSession } from './core';
import type { GameDefinition, GameState } from './types';
import {
  agnesSorel,
  athena,
  australianPatience,
  batsford,
  blindAlleys,
  bureau,
  chameleon,
  harp,
  ladyJane,
  pasSeul,
  superiorCanfield,
  thumbAndPouch,
  whitehead,
} from './klondikeFamilyWave';

const definitions = [
  agnesSorel,
  australianPatience,
  whitehead,
  thumbAndPouch,
  blindAlleys,
  batsford,
  harp,
  ladyJane,
  bureau,
  athena,
  pasSeul,
  chameleon,
  superiorCanfield,
] as const;

function allCards(state: GameState) {
  return Object.values(state.piles).flatMap((candidate) => candidate.cards);
}

describe('Klondike/Canfield family wave', () => {
  it.each(definitions)('%s deals a deterministic complete deck', (definition) => {
    const first = definition.create(`wave-${definition.id}`);
    const second = definition.create(`wave-${definition.id}`);
    const cards = allCards(first);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(cards).toHaveLength(52 * definition.decks);
    expect(new Set(cards.map((card) => card.id)).size).toBe(cards.length);
    expect(cards.filter((card) => card.faceUp).length).toBeGreaterThan(0);
    expect(first.status).toBe('playing');
  });

  it('keeps the published family layouts and deck counts', () => {
    expect(agnesSorel.create('layout').piles.stock.cards).toHaveLength(24);
    expect(whitehead.create('layout').piles.stock.cards).toHaveLength(20);
    expect(whitehead.create('layout').piles.t0.cards.every((card) => card.faceUp)).toBe(true);
    expect(thumbAndPouch.create('layout').piles.reserve.cards).toHaveLength(13);
    expect(batsford.decks).toBe(2);
    expect(ladyJane.decks).toBe(2);
    expect(chameleon.create('layout').piles.reserve.cards).toHaveLength(12);
  });

  it.each(definitions)('%s rejects invalid moves and supports undo/retry', (definition) => {
    const session = new GameSession(definition as GameDefinition, `session-${definition.id}`);
    const before = JSON.stringify(session.state);
    expect(
      session.move({ type: 'transfer', from: 'missing', to: 'missing', cardIds: ['missing'] })
        .error,
    ).toBeTruthy();
    expect(JSON.stringify(session.state)).toBe(before);
    const legal = definition.legalMoves(session.state)[0];
    expect(legal).toBeDefined();
    const moved = session.move(legal!);
    expect(moved.error).toBeUndefined();
    const afterMove = JSON.stringify(session.state);
    expect(afterMove).not.toBe(before);
    session.undo();
    expect(JSON.stringify(session.state)).toBe(before);
    session.move(legal!);
    expect(JSON.stringify(session.state)).toBe(afterMove);
    session.retry();
    expect(JSON.stringify(session.state)).toBe(before);
  });

  it('exposes a legal hint and recognizes a fully completed foundation set', () => {
    for (const definition of definitions) {
      const state = definition.create(`hint-${definition.id}`);
      expect(definition.hint?.(state)).toEqual(definition.legalMoves(state)[0]);
      for (const pile of Object.values(state.piles)) pile.cards.length = 0;
      for (const pile of Object.values(state.piles).filter(
        (candidate) => candidate.kind === 'foundation',
      )) {
        for (let rank = 1; rank <= 13; rank += 1) {
          pile.cards.push({
            id: `${pile.id}-${rank}`,
            suit: 'clubs',
            rank: rank as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13,
            faceUp: true,
          });
        }
      }
      expect(definition.isWon(state)).toBe(true);
    }
  });
});
