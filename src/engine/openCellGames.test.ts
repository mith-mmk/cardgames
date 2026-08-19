import { describe, expect, it } from 'vitest';
import { cloneState, GameSession } from './core';
import { bakersGame, eightOff, OPEN_CELL_GAMES, seahavenTowers } from './openCellGames';
import type { GameDefinition, GameState, Move } from './types';

const definitions = [bakersGame, eightOff, seahavenTowers] as const;

function cardsOf(state: GameState) {
  return Object.values(state.piles).flatMap((pile) => pile.cards);
}

function firstTransfer(definition: GameDefinition, state: GameState): Move {
  const move = definition.legalMoves(state).find((candidate) => candidate.type === 'transfer');
  expect(move).toBeDefined();
  return move!;
}

describe('open-cell solitaire games', () => {
  it('exports the three definitions with stable identifiers', () => {
    expect(Object.keys(OPEN_CELL_GAMES)).toEqual(['bakersGame', 'eightOff', 'seahavenTowers']);
    expect(definitions.map((definition) => definition.id)).toEqual([
      'bakers-game',
      'eight-off',
      'seahaven-towers',
    ]);
  });

  it('deals a deterministic, complete 52-card deck for every game', () => {
    for (const definition of definitions) {
      const a = definition.create('open-cell-seed');
      const b = definition.create('open-cell-seed');
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
      const cards = cardsOf(a);
      expect(cards).toHaveLength(52);
      expect(new Set(cards.map((card) => card.id)).size).toBe(52);
      expect(cards.every((card) => card.faceUp)).toBe(true);
    }
  });

  it('uses the standard layouts', () => {
    const baker = bakersGame.create('layout');
    expect(Array.from({ length: 8 }, (_, i) => baker.piles[`t${i}`].cards.length)).toEqual([
      7, 7, 7, 7, 6, 6, 6, 6,
    ]);
    expect(Array.from({ length: 4 }, (_, i) => baker.piles[`c${i}`].cards.length)).toEqual([
      0, 0, 0, 0,
    ]);

    const eight = eightOff.create('layout');
    expect(Array.from({ length: 8 }, (_, i) => eight.piles[`t${i}`].cards.length)).toEqual(
      Array(8).fill(6),
    );
    expect(Array.from({ length: 8 }, (_, i) => eight.piles[`c${i}`].cards.length)).toEqual([
      1, 1, 1, 1, 0, 0, 0, 0,
    ]);

    const seahaven = seahavenTowers.create('layout');
    expect(Array.from({ length: 10 }, (_, i) => seahaven.piles[`t${i}`].cards.length)).toEqual(
      Array(10).fill(5),
    );
    expect(Array.from({ length: 4 }, (_, i) => seahaven.piles[`c${i}`].cards.length)).toEqual([
      1, 1, 0, 0,
    ]);
  });

  it('accepts legal moves, rejects invalid moves, and preserves the 52-card invariant', () => {
    for (const definition of definitions) {
      const initial = definition.create('moves');
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
    }
  });

  it('enforces same-suit descending tableau construction', () => {
    const state = cloneState(bakersGame.create('construction'));
    const allCards = cardsOf(state);
    const king = allCards.find((card) => card.rank === 13)!;
    const sameSuit = allCards.find((card) => card.suit === king.suit && card.rank === 12)!;
    const otherSuit = allCards.find((card) => card.suit !== king.suit && card.rank === 12)!;
    for (const pile of Object.values(state.piles)) pile.cards = [];
    state.piles.t1.cards.push(king);
    state.piles.t2.cards.push(sameSuit);
    state.piles.t3.cards.push(otherSuit);
    expect(bakersGame.legalMoves(state)).toContainEqual({
      type: 'transfer',
      from: 't2',
      to: 't1',
      cardIds: [sameSuit.id],
    });
    expect(bakersGame.legalMoves(state)).not.toContainEqual({
      type: 'transfer',
      from: 't3',
      to: 't1',
      cardIds: [otherSuit.id],
    });
  });

  it('keeps the variant-specific empty-column and run rules', () => {
    const eight = cloneState(eightOff.create('variant-rules'));
    const eightCards = cardsOf(eight);
    const eightKing = eightCards.find((card) => card.rank === 13)!;
    const eightQueen = eightCards.find((card) => card.rank === 12)!;
    for (const pile of Object.values(eight.piles)) pile.cards = [];
    eight.piles.t0.cards = [eightQueen];
    expect(eightOff.legalMoves(eight)).not.toContainEqual({
      type: 'transfer',
      from: 't0',
      to: 't1',
      cardIds: [eightQueen.id],
    });
    eight.piles.t0.cards = [eightKing];
    expect(eightOff.legalMoves(eight)).toContainEqual({
      type: 'transfer',
      from: 't0',
      to: 't1',
      cardIds: [eightKing.id],
    });

    const seahaven = cloneState(seahavenTowers.create('variant-rules'));
    const seahavenCards = cardsOf(seahaven);
    const queen = seahavenCards.find((card) => card.rank === 12)!;
    const jack = seahavenCards.find((card) => card.suit === queen.suit && card.rank === 11)!;
    const king = seahavenCards.find((card) => card.suit === queen.suit && card.rank === 13)!;
    for (const pile of Object.values(seahaven.piles)) pile.cards = [];
    seahaven.piles.t0.cards = [queen, jack];
    seahaven.piles.t1.cards = [king];
    expect(seahavenTowers.legalMoves(seahaven)).not.toContainEqual({
      type: 'transfer',
      from: 't0',
      to: 't1',
      cardIds: [queen.id, jack.id],
    });
  });

  it('supports GameSession undo and retry for each definition', () => {
    for (const definition of definitions) {
      const session = new GameSession(definition, 'session-seed');
      const initial = JSON.stringify(session.state);
      const move = firstTransfer(definition, session.state);
      session.move(move);
      expect(session.state.moveCount).toBe(1);
      session.undo();
      expect(JSON.stringify(session.state)).toBe(initial);
      session.move(move);
      session.retry();
      expect(JSON.stringify(session.state)).toBe(initial);
    }
  });
});
