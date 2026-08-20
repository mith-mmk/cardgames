import { describe, expect, it } from 'vitest';
import { GameSession } from './core';
import {
  REMOVAL_SCORING_GAMES,
  acesUp,
  accordion,
  blackHole,
  bowlingSolitaire,
  cribbageSquares,
  giza,
  pokerSquares,
  scoreCribbageHand,
  scorePokerHand,
  triPeaks,
  triPeaksExposed,
} from './removalScoringGames';
import type { Card, GameDefinition, GameState, Move } from './types';

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

  it('Tri-Peaks deals three covered peaks, a ten-card base, stock, and waste', () => {
    const state = triPeaks.create('tri-peaks-layout');
    expect(state.piles.waste.cards).toHaveLength(1);
    expect(state.piles.waste.cards[0].faceUp).toBe(true);
    expect(state.piles.stock.cards).toHaveLength(23);
    expect(
      Array.from({ length: 28 }, (_, index) => state.piles[`tri${index}`].cards[0]).filter(
        (card) => card.faceUp,
      ),
    ).toHaveLength(10);
    expect(triPeaksExposed(state, 0)).toBe(false);
    expect(triPeaksExposed(state, 18)).toBe(true);
    expect(
      triPeaks.applyMove(state, {
        type: 'transfer',
        from: 'tri0',
        to: 'waste',
        cardIds: ['missing'],
      }).error,
    ).toBeTruthy();
  });

  it('Tri-Peaks moves only an exposed card adjacent to the waste and reveals new cards', () => {
    const { state, move } = firstMove(triPeaks, 'transfer');
    expect(move).toMatchObject({ type: 'transfer', to: 'waste' });
    const moved = triPeaks.applyMove(state, move).state;
    expect(moved.piles.waste.cards).toHaveLength(2);
    expect(moved.piles[move.from].cards).toHaveLength(0);
  });

  it('Black Hole uses the ace of spades foundation and 17 three-card tableau piles', () => {
    const state = blackHole.create('black-hole-layout');
    expect(state.piles.hole.cards).toHaveLength(1);
    expect(state.piles.hole.cards[0]).toMatchObject({ rank: 1, suit: 'spades', faceUp: true });
    expect(Array.from({ length: 17 }, (_, index) => state.piles[`black${index}`].cards)).toSatisfy(
      (piles: Card[][]) =>
        piles.every((cards) => cards.length === 3 && cards.every((card) => card.faceUp)),
    );
  });

  it('Black Hole only transfers a top card adjacent to the central foundation', () => {
    const { state, move } = firstMove(blackHole, 'transfer');
    expect(move).toMatchObject({ type: 'transfer', to: 'hole' });
    const moved = blackHole.applyMove(state, move).state;
    expect(moved.piles.hole.cards).toHaveLength(2);
    expect(moved.piles[move.from].cards).toHaveLength(2);
    expect(
      blackHole.applyMove(state, {
        type: 'transfer',
        from: 'black0',
        to: 'hole',
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

  it('Poker Squares deals to waste and lets the player choose any empty grid square', () => {
    const state = pokerSquares.create('poker-score');
    const draw = pokerSquares.legalMoves(state)[0];
    expect(draw).toMatchObject({ type: 'draw', from: 'stock', to: 'waste' });
    const dealt = pokerSquares.applyMove(state, draw).state;
    expect(dealt.piles.waste.cards).toHaveLength(1);
    const placements = pokerSquares.legalMoves(dealt).filter((move) => move.type === 'transfer');
    expect(placements).toHaveLength(25);
    const chosen = placements.at(-1);
    expect(chosen).toMatchObject({ from: 'waste', to: 'g24' });
    const placed = pokerSquares.applyMove(dealt, chosen!).state;
    expect(placed.piles.g24.cards).toHaveLength(1);
    expect(placed.piles.waste.cards).toHaveLength(0);
    expect(
      pokerSquares.applyMove(state, {
        type: 'remove',
        from: 'g0',
        to: 'removed',
        cardIds: ['missing'],
      }).error,
    ).toBeTruthy();
  });

  it('scores Poker Squares with the published poker hand schedule', () => {
    const royalFlush: Card[] = [1, 10, 11, 12, 13].map((rank) => ({
      id: `heart-${rank}`,
      rank: rank as Card['rank'],
      suit: 'hearts',
      faceUp: true,
    }));
    expect(scorePokerHand(royalFlush)).toEqual({ label: 'Royal flush', score: 100 });
    const fourOfAKind: Card[] = ['spades', 'hearts', 'diamonds', 'clubs'].map((suit, index) => ({
      id: `nine-${suit}`,
      rank: 9,
      suit: suit as Card['suit'],
      faceUp: Boolean(index),
    }));
    fourOfAKind.push({ id: 'two-spades', rank: 2, suit: 'spades', faceUp: true });
    expect(scorePokerHand(fourOfAKind)).toEqual({ label: 'Four of a kind', score: 50 });
  });

  it('scores Cribbage Squares completed four-card lines', () => {
    const fourFives: Card[] = ['spades', 'hearts', 'diamonds', 'clubs'].map((suit) => ({
      id: `five-${suit}`,
      rank: 5,
      suit: suit as Card['suit'],
      faceUp: true,
    }));
    expect(scoreCribbageHand(fourFives)).toEqual({ label: 'Cribbage hand', score: 20 });
    const state = cribbageSquares.create('cribbage-choice');
    const dealt = cribbageSquares.applyMove(state, cribbageSquares.legalMoves(state)[0]).state;
    expect(
      cribbageSquares.legalMoves(dealt).filter((move) => move.type === 'transfer'),
    ).toHaveLength(16);
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
