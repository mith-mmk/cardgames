import { describe, expect, it } from 'vitest';
import { cloneState, GameSession } from './core';
import type { GameDefinition, GameState, Move } from './types';
import {
  OPEN_CELL_WAVE_GAMES,
  bakersDozen,
  cruel,
  flowerGarden,
  laBelleLucie,
  penguin,
} from './openCellWaveGames';

const definitions = Object.values(OPEN_CELL_WAVE_GAMES) as GameDefinition[];

function cardsOf(state: GameState) {
  return Object.values(state.piles).flatMap((currentPile) => currentPile.cards);
}

function firstTransfer(definition: GameDefinition, state: GameState): Move {
  const move = definition.legalMoves(state).find((candidate) => candidate.type === 'transfer');
  expect(move).toBeDefined();
  return move!;
}

describe('open-cell/fan wave games', () => {
  it('exports all sixteen stable definitions', () => {
    expect(definitions).toHaveLength(16);
    expect(new Set(definitions.map((definition) => definition.id)).size).toBe(16);
    expect(Object.keys(OPEN_CELL_WAVE_GAMES)).toEqual([
      'penguin',
      'beleagueredCastle',
      'citadel',
      'fortress',
      'chessboard',
      'streetsAndAlleys',
      'bakersDozen',
      'castlesInSpain',
      'bisley',
      'flowerGarden',
      'laBelleLucie',
      'shamrocks',
      'trefoil',
      'bearRiver',
      'cruel',
      'canister',
    ]);
  });

  it.each(definitions)('%s deals a deterministic complete deck', (definition) => {
    const a = definition.create('open-cell-wave-seed');
    const b = definition.create('open-cell-wave-seed');
    const cards = cardsOf(a);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(cards).toHaveLength(52);
    expect(new Set(cards.map((card) => card.id)).size).toBe(52);
    expect(new Set(cards.map((card) => `${card.suit}-${card.rank}`)).size).toBe(52);
  });

  it.each(definitions)('%s has legal moves and protects card invariants', (definition) => {
    const initial = definition.create('wave-moves');
    const move = firstTransfer(definition, initial);
    const result = definition.applyMove(initial, move);
    expect(result.error).toBeUndefined();
    expect(cardsOf(result.state)).toHaveLength(52);
    expect(new Set(cardsOf(result.state).map((card) => card.id)).size).toBe(52);
    const invalid = definition.applyMove(initial, {
      type: 'transfer',
      from: 't0',
      to: 't1',
      cardIds: ['missing-card'],
    });
    expect(invalid.error).toBe('Illegal move');
    expect(JSON.stringify(invalid.state)).toBe(JSON.stringify(initial));
  });

  it('uses open cells for single-card parking and keeps fan moves single-card', () => {
    const state = cloneState(penguin.create('cell-rule'));
    const source = state.piles.t0.cards[state.piles.t0.cards.length - 1];
    state.piles.t0.cards = [source];
    state.piles.t1.cards = [];
    state.piles.c0.cards = [];
    const cellMove = penguin.legalMoves(state).find((move) => move.to === 'c0');
    expect(cellMove).toEqual({ type: 'transfer', from: 't0', to: 'c0', cardIds: [source.id] });

    const fan = cloneState(laBelleLucie.create('fan-rule'));
    const fanSource = fan.piles.t0.cards;
    fan.piles.t1.cards = [];
    const moves = laBelleLucie.legalMoves(fan).filter((move) => move.from === 't0');
    expect(moves.every((move) => move.type !== 'transfer' || move.cardIds.length === 1)).toBe(true);
    expect(fanSource.length).toBe(3);
  });

  it('supports Flower Garden reserves and the Cruel/La Belle Lucie redeal cycle', () => {
    const flower = flowerGarden.create('garden-layout');
    const reserves = Object.keys(flower.piles).filter((id) => id.startsWith('r'));
    expect(reserves).toHaveLength(16);
    expect(reserves.reduce((total, id) => total + flower.piles[id].cards.length, 0)).toBe(16);

    for (const definition of [cruel, laBelleLucie]) {
      const state = definition.create('redeal');
      const draw = definition.legalMoves(state).find((move) => move.type === 'draw');
      expect(draw).toBeDefined();
      let afterDraw = definition.applyMove(state, draw!).state;
      while (afterDraw.piles.stock.cards.length) {
        const nextDraw = definition.legalMoves(afterDraw).find((move) => move.type === 'draw');
        expect(nextDraw).toBeDefined();
        afterDraw = definition.applyMove(afterDraw, nextDraw!).state;
      }
      expect(afterDraw.piles.waste.cards.length).toBeGreaterThan(0);
      const recycle = definition.legalMoves(afterDraw).find((move) => move.type === 'recycle');
      expect(recycle).toBeDefined();
      const afterRecycle = definition.applyMove(afterDraw, recycle!).state;
      expect(afterRecycle.piles.waste.cards).toHaveLength(0);
      expect(afterRecycle.piles.stock.cards).toHaveLength(state.piles.stock.cards.length);
    }
  });

  it.each(definitions)('%s supports deterministic retry and undo', (definition) => {
    const session = new GameSession(definition, 'wave-session');
    const initial = JSON.stringify(session.state);
    const move = firstTransfer(definition, session.state);
    session.move(move);
    expect(session.state.moveCount).toBe(1);
    session.undo();
    expect(JSON.stringify(session.state)).toBe(initial);
    session.move(move);
    session.retry();
    expect(JSON.stringify(session.state)).toBe(initial);
  });

  it("keeps Baker's Dozen as thirteen four-card columns", () => {
    const state = bakersDozen.create('bakers-dozen-layout');
    expect(Array.from({ length: 13 }, (_, index) => state.piles[`t${index}`].cards.length)).toEqual(
      Array(13).fill(4),
    );
  });
});
