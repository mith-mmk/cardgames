import { describe, expect, it } from 'vitest';
import { cloneState, GameSession } from './core';
import type { GameDefinition, GameState, Move } from './types';
import {
  SPECIAL_GAMES,
  acesAndKings,
  crescent,
  crazyQuilt,
  deuces,
  fourSeasons,
  osmosis,
  sultan,
} from './specialGames';

const definitions = Object.values(SPECIAL_GAMES) as GameDefinition[];

function cardsOf(state: GameState) {
  return Object.values(state.piles).flatMap((currentPile) => currentPile.cards);
}

function firstTransfer(definition: GameDefinition, state: GameState): Move {
  const move = definition.legalMoves(state).find((candidate) => candidate.type === 'transfer');
  expect(move).toBeDefined();
  return move!;
}

describe('special layout wave', () => {
  it('exports the nineteen stable definitions', () => {
    expect(definitions).toHaveLength(19);
    expect(new Set(definitions.map((definition) => definition.id)).size).toBe(19);
  });

  it.each(definitions)('%s deals a deterministic complete deck', (definition) => {
    const a = definition.create('special-layout-seed');
    const b = definition.create('special-layout-seed');
    const cards = cardsOf(a);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(cards).toHaveLength(definition.decks * 52);
    expect(new Set(cards.map((card) => card.id)).size).toBe(definition.decks * 52);
  });

  it.each(definitions)('%s accepts a legal move and rejects a forged move', (definition) => {
    const initial = definition.create('special-moves');
    const move = firstTransfer(definition, initial);
    const result = definition.applyMove(initial, move);
    expect(result.error).toBeUndefined();
    expect(cardsOf(result.state)).toHaveLength(definition.decks * 52);
    const invalid = definition.applyMove(initial, {
      type: 'transfer',
      from: 't0',
      to: 't1',
      cardIds: ['missing-card'],
    });
    expect(invalid.error).toBe('Illegal move');
    expect(JSON.stringify(invalid.state)).toBe(JSON.stringify(initial));
  });

  it.each(definitions)('%s supports hint, undo, and deterministic retry', (definition) => {
    const session = new GameSession(definition, 'special-session');
    const initial = JSON.stringify(session.state);
    expect(session.hint()).toBeDefined();
    session.move(firstTransfer(definition, session.state));
    session.undo();
    expect(JSON.stringify(session.state)).toBe(initial);
    session.move(firstTransfer(definition, session.state));
    session.retry();
    expect(JSON.stringify(session.state)).toBe(initial);
  });

  it('retains the distinctive layouts in metadata', () => {
    expect(sultan.create().meta.layout).toMatchObject({ type: 'sultan', reserveCount: 8 });
    expect(crazyQuilt.create().meta.layout).toMatchObject({ type: 'grid', tableauCount: 13 });
    expect(fourSeasons.create().meta.layout).toMatchObject({ type: 'cross', reserveCount: 4 });
    expect(crescent.create().meta.layout).toMatchObject({ type: 'crescent' });
  });

  it('uses two-direction foundations for Aces and Kings', () => {
    const state = cloneState(acesAndKings.create('foundation-rules'));
    state.piles.t0.cards = [state.piles.t0.cards.at(-1)!];
    state.piles.t1.cards = [state.piles.t1.cards.at(-1)!];
    state.piles.t0.cards = [{ ...state.piles.t0.cards[0], rank: 1 }];
    state.piles.t1.cards = [{ ...state.piles.t1.cards[0], rank: 13 }];
    state.piles.f0.cards = [];
    state.piles.f4.cards = [];
    expect(acesAndKings.legalMoves(state)).toEqual(
      expect.arrayContaining([
        { type: 'transfer', from: 't0', to: 'f0', cardIds: [state.piles.t0.cards[0].id] },
        { type: 'transfer', from: 't1', to: 'f4', cardIds: [state.piles.t1.cards[0].id] },
      ]),
    );
  });

  it('starts Deuces foundations at rank two and exposes Osmosis metadata', () => {
    const deucesState = cloneState(deuces.create('deuces-rules'));
    const card = deucesState.piles.t0.cards.at(-1)!;
    deucesState.piles.t0.cards = [{ ...card, rank: 2 }];
    deucesState.piles.f0.cards = [];
    expect(deuces.legalMoves(deucesState)).toEqual(
      expect.arrayContaining([{ type: 'transfer', from: 't0', to: 'f0', cardIds: [card.id] }]),
    );
    expect(osmosis.create().meta.options).toMatchObject({ foundationRule: 'osmosis' });
  });
});
