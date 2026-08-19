import { describe, expect, it } from 'vitest';
import { GameSession } from './core';
import {
  REMOVAL_SCORING_GAMES,
  acesUp,
  accordion,
  bowlingSolitaire,
  giza,
  pokerSquares,
  triPeaks,
} from './removalScoringGames';
import type { GameDefinition, GameState, Move } from './types';

const definitions = Object.values(REMOVAL_SCORING_GAMES) as GameDefinition[];
const allCards = (state: GameState) => Object.values(state.piles).flatMap((item) => item.cards);

function firstMove(
  definition: GameDefinition,
  type?: Move['type'],
): { state: GameState; move: Move } {
  for (let index = 0; index < 100; index += 1) {
    const state = definition.create(`removal-test-${definition.id}-${index}`);
    const move = definition.legalMoves(state).find((candidate) => !type || candidate.type === type);
    if (move) return { state, move };
  }
  throw new Error(`No ${type ?? 'legal'} move found for ${definition.id}`);
}

describe('removal and scoring wave', () => {
  it.each(definitions)('$id deals a deterministic complete deck', (definition) => {
    const first = definition.create(`fixed-${definition.id}`);
    expect(JSON.stringify(first)).toBe(JSON.stringify(definition.create(`fixed-${definition.id}`)));
    expect(allCards(first)).toHaveLength(52);
    expect(new Set(allCards(first).map((card) => card.id)).size).toBe(52);
  });

  it('Giza exposes rank-sum removal and rejects an unrelated card pair', () => {
    const { state, move } = firstMove(giza, 'remove');
    expect(move.type).toBe('remove');
    if (move.type !== 'remove') throw new Error('Expected Giza removal');
    expect(move.cardIds.length).toBeGreaterThanOrEqual(1);
    expect(
      giza.applyMove(state, {
        type: 'remove',
        from: move.from,
        to: 'removed',
        cardIds: ['missing'],
      }).error,
    ).toBeTruthy();
    expect(giza.applyMove(state, move).state.piles.removed.cards.length).toBe(move.cardIds.length);
  });

  it('Tri-Peaks offers a draw and an adjacent exposed-card removal', () => {
    const { state, move } = firstMove(triPeaks, 'draw');
    const drawn = triPeaks.applyMove(state, move).state;
    expect(drawn.piles.waste.cards).toHaveLength(1);
    const removal = triPeaks.legalMoves(drawn).find((candidate) => candidate.type === 'remove');
    if (removal) {
      expect(triPeaks.applyMove(drawn, removal).error).toBeUndefined();
    }
    expect(
      triPeaks.applyMove(state, {
        type: 'transfer',
        from: 't0',
        to: 'removed',
        cardIds: ['missing'],
      }).error,
    ).toBeTruthy();
  });

  it('Aces Up discards a lower exposed card when a higher card shares its suit', () => {
    const { state, move } = firstMove(acesUp, 'remove');
    expect(move.type).toBe('remove');
    const result = acesUp.applyMove(state, move);
    expect(result.error).toBeUndefined();
    expect(result.state.meta.score).toBe(1);
  });

  it('Accordion moves a matching card by one or three piles', () => {
    const { state, move } = firstMove(accordion, 'transfer');
    expect(move.type).toBe('transfer');
    expect(accordion.applyMove(state, move).error).toBeUndefined();
    expect(
      accordion.applyMove(state, { type: 'transfer', from: 't51', to: 't0', cardIds: ['missing'] })
        .error,
    ).toBeTruthy();
  });

  it('Poker Squares scores after filling its grid and rejects a non-draw move', () => {
    const state = pokerSquares.create('poker-score');
    let current = state;
    while (pokerSquares.legalMoves(current).length) {
      current = pokerSquares.applyMove(current, pokerSquares.legalMoves(current)[0]).state;
    }
    expect(current.meta.score).toEqual(expect.any(Number));
    expect(pokerSquares.isWon(current)).toBe(true);
    expect(
      pokerSquares.applyMove(state, {
        type: 'remove',
        from: 'g0',
        to: 'removed',
        cardIds: ['missing'],
      }).error,
    ).toBeTruthy();
  });

  it.each(definitions)('$id supports undo and deterministic retry', (definition) => {
    let seed = `session-${definition.id}`;
    for (
      let index = 0;
      index < 100 && !definition.legalMoves(definition.create(seed)).length;
      index += 1
    )
      seed = `session-${definition.id}-${index + 1}`;
    const session = new GameSession(definition, seed);
    const before = JSON.stringify(session.state);
    const move = definition.legalMoves(session.state)[0];
    expect(move).toBeDefined();
    session.move(move!);
    session.undo();
    expect(JSON.stringify(session.state)).toBe(before);
    session.move(move!);
    expect(JSON.stringify(session.state)).not.toBe(before);
    session.retry();
    expect(JSON.stringify(session.state)).toBe(before);
  });

  it('Bowling tracks knocked pins as score state', () => {
    const { state, move } = firstMove(bowlingSolitaire, 'remove');
    const next = bowlingSolitaire.applyMove(state, move).state;
    expect(next.meta.pinsKnocked).toBe(1);
    expect(next.meta.score).toBe(9);
  });
});
