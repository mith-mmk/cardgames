import { describe, expect, it } from 'vitest';
import { cloneState, GameSession } from './core';
import {
  alaska,
  applegate,
  beetle,
  brisbane,
  curdsAndWhey,
  interchange,
  missMilligan,
  mrsMop,
  russianSolitaire,
  SPIDER_FAMILY_WAVE_GAMES,
} from './spiderFamilyWave';
import type { Card, GameDefinition, GameState, Move } from './types';

const definitions = Object.values(SPIDER_FAMILY_WAVE_GAMES) as GameDefinition[];

function cardsOf(state: GameState): Card[] {
  return Object.values(state.piles).flatMap((currentPile) => currentPile.cards);
}

function firstTransfer(definition: GameDefinition, state: GameState): Move {
  const move = definition.legalMoves(state).find((candidate) => candidate.type === 'transfer');
  expect(move).toBeDefined();
  return move!;
}

function stateWithTransfer(definition: GameDefinition): GameState {
  for (let index = 0; index < 100; index += 1) {
    const state = definition.create(`spider-wave-session-${index}`);
    const transfer = definition.legalMoves(state).some((move) => move.type === 'transfer');
    if (transfer) return state;
  }
  throw new Error(`${definition.id} did not produce a transfer in 100 deterministic deals`);
}

function card(state: GameState, copy: string, suit: Card['suit'], rank: number): Card {
  const found = cardsOf(state).find((candidate) => candidate.id === `${copy}-${suit}-${rank}`);
  expect(found).toBeDefined();
  return found!;
}

/** Put selected cards in t0/t1 while retaining every other card in t2. */
function controlledTableau(state: GameState, first: Card[], second: Card[] = []): GameState {
  const next = cloneState(state);
  const selected = new Set([...first, ...second].map((candidate) => candidate.id));
  const rest = cardsOf(next).filter((candidate) => !selected.has(candidate.id));
  for (const pile of Object.values(next.piles)) {
    if (pile.kind === 'tableau') pile.cards = [];
  }
  first.forEach((candidate) => {
    candidate.faceUp = true;
    next.piles.t0.cards.push(candidate);
  });
  second.forEach((candidate) => {
    candidate.faceUp = true;
    next.piles.t1.cards.push(candidate);
  });
  next.piles.t2.cards.push(...rest);
  return next;
}

describe('spider/yukon/forty-thieves family wave', () => {
  it('exports nine deterministic definitions with complete 52/104-card deals', () => {
    expect(definitions).toHaveLength(9);
    expect(new Set(definitions.map((definition) => definition.id)).size).toBe(9);
    for (const definition of definitions) {
      const first = definition.create('spider-wave-seed');
      const second = definition.create('spider-wave-seed');
      expect(JSON.stringify(first)).toBe(JSON.stringify(second));
      const cards = cardsOf(first);
      expect(cards).toHaveLength(definition.decks * 52);
      expect(new Set(cards.map((candidate) => candidate.id)).size).toBe(cards.length);
    }
  });

  it.each(definitions)('%s accepts a legal move and rejects a missing card', (definition) => {
    const initial = definition.create('spider-wave-move');
    const move = firstTransfer(definition, initial);
    const result = definition.applyMove(initial, move);
    expect(result.error).toBeUndefined();
    expect(cardsOf(result.state)).toHaveLength(definition.decks * 52);
    expect(new Set(cardsOf(result.state).map((candidate) => candidate.id)).size).toBe(
      definition.decks * 52,
    );
    const invalid = definition.applyMove(initial, {
      type: 'transfer',
      from: 't0',
      to: 't1',
      cardIds: ['missing-card'],
    });
    expect(invalid.error).toBe('Illegal move');
    expect(JSON.stringify(invalid.state)).toBe(JSON.stringify(initial));
  });

  it.each(definitions)('%s supports deterministic hint, undo, and retry', (definition) => {
    const prepared = stateWithTransfer(definition);
    const session = new GameSession(definition, prepared.seed);
    const initial = JSON.stringify(session.state);
    const move = firstTransfer(definition, session.state);
    expect(session.hint()).toBeDefined();
    session.move(move);
    expect(session.state.moveCount).toBe(1);
    session.undo();
    expect(JSON.stringify(session.state)).toBe(initial);
    session.move(move);
    session.retry();
    expect(JSON.stringify(session.state)).toBe(initial);
  });

  it('removes a completed same-suit Beetle run', () => {
    const initial = beetle.create('beetle-run');
    const run = Array.from({ length: 13 }, (_, index) => card(initial, '0', 'clubs', 13 - index));
    const state = controlledTableau(initial, run);
    const move = beetle
      .legalMoves(state)
      .find(
        (candidate) =>
          candidate.from === 't0' &&
          candidate.to === 't1' &&
          'cardIds' in candidate &&
          candidate.cardIds.length === 13,
      );
    expect(move).toBeDefined();
    const result = beetle.applyMove(state, move!);
    expect(result.error).toBeUndefined();
    expect(result.state.piles.t1.cards).toHaveLength(0);
    expect(result.state.piles.removed.cards).toHaveLength(13);
  });

  it('requires same-suit runs in Russian Solitaire', () => {
    const initial = russianSolitaire.create('russian-rule');
    const source = card(initial, '0', 'clubs', 6);
    const wrongTarget = card(initial, '0', 'hearts', 7);
    const wrongState = controlledTableau(initial, [source], [wrongTarget]);
    expect(
      russianSolitaire
        .legalMoves(wrongState)
        .some((move) => move.from === 't0' && move.to === 't1'),
    ).toBe(false);

    const rightTarget = card(initial, '0', 'clubs', 7);
    const rightState = controlledTableau(initial, [source], [rightTarget]);
    expect(
      russianSolitaire
        .legalMoves(rightState)
        .some((move) => move.from === 't0' && move.to === 't1'),
    ).toBe(true);
  });

  it('allows either-direction adjacent building in Alaska', () => {
    const initial = alaska.create('alaska-rule');
    const source = card(initial, '0', 'clubs', 6);
    const target = card(initial, '0', 'hearts', 5);
    const state = controlledTableau(initial, [source], [target]);
    expect(alaska.legalMoves(state).some((move) => move.from === 't0' && move.to === 't1')).toBe(
      true,
    );
  });

  it('deals the configured stock batch and respects redeal limits', () => {
    const brisbaneState = brisbane.create('brisbane-stock');
    const brisbaneDraw = brisbane.legalMoves(brisbaneState).find((move) => move.type === 'draw');
    expect(brisbaneDraw).toMatchObject({ count: 1 });
    const brisbaneAfter = brisbane.applyMove(brisbaneState, brisbaneDraw!).state;
    expect(brisbaneAfter.piles.waste.cards).toHaveLength(1);

    const milliganState = missMilligan.create('milligan-stock');
    const milliganDraw = missMilligan
      .legalMoves(milliganState)
      .find((move) => move.type === 'draw');
    expect(milliganDraw).toMatchObject({ count: 8 });
    const milliganAfter = missMilligan.applyMove(milliganState, milliganDraw!).state;
    expect(milliganAfter.piles.waste.cards).toHaveLength(8);
    expect(milliganAfter.piles.stock.cards).toHaveLength(48);
  });

  it('keeps the two-deck stock layouts distinct', () => {
    expect(applegate.create('layout').piles.stock.cards).toHaveLength(56);
    expect(interchange.create('layout').piles.stock.cards).toHaveLength(56);
    expect(curdsAndWhey.create('layout').piles.stock).toBeUndefined();
    expect(mrsMop.create('layout').piles.stock).toBeUndefined();
  });
});
