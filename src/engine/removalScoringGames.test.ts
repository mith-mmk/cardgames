import { describe, expect, it } from 'vitest';
import { GameSession } from './core';
import {
  REMOVAL_SCORING_GAMES,
  acesUp,
  accordion,
  blackHole,
  bowlingSolitaire,
  cheops,
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

  it('Giza deals an open 28-card pyramid plus eight three-card reserve piles', () => {
    const state = giza.create('giza-layout');
    expect(Array.from({ length: 28 }, (_, index) => state.piles[`giza${index}`].cards)).toSatisfy(
      (piles: Card[][]) => piles.every((cards) => cards.length === 1 && cards[0].faceUp),
    );
    expect(
      Array.from({ length: 8 }, (_, index) => state.piles[`gizaReserve${index}`].cards),
    ).toSatisfy((piles: Card[][]) =>
      piles.every((cards) => cards.length === 3 && cards.every((card) => card.faceUp)),
    );
    expect(state.piles.stock).toBeUndefined();
  });

  it('Giza can discard the exposed top card of a reserve pile', () => {
    let caseFound: { state: GameState; move: Move } | undefined;
    for (let index = 0; index < 100 && !caseFound; index += 1) {
      const state = giza.create(`giza-reserve-${index}`);
      const reserveTopIds = new Set(
        Array.from(
          { length: 8 },
          (_, reserve) => state.piles[`gizaReserve${reserve}`].cards.at(-1)?.id,
        ),
      );
      const move = giza
        .legalMoves(state)
        .find(
          (candidate) =>
            candidate.type === 'remove' && candidate.cardIds.some((id) => reserveTopIds.has(id)),
        );
      if (move) caseFound = { state, move };
    }
    expect(caseFound).toBeDefined();
    expect(giza.applyMove(caseFound!.state, caseFound!.move).error).toBeUndefined();
  });

  it('Cheops deals a face-up 28-card pyramid and a face-up 24-card stock', () => {
    const state = cheops.create('cheops-layout');
    expect(Array.from({ length: 28 }, (_, index) => state.piles[`p${index}`].cards)).toSatisfy(
      (piles: Card[][]) => piles.every((cards) => cards.length === 1 && cards[0].faceUp),
    );
    expect(state.piles.stock.cards).toHaveLength(24);
    expect(state.piles.stock.cards.every((card) => card.faceUp)).toBe(true);
    expect(state.piles.waste.cards).toHaveLength(0);
  });

  it('Cheops permits exposed equal or consecutive pairs including the stock, but not A/K', () => {
    const state = cheops.create('cheops-pairs');
    const coveredId = state.piles.p0.cards[0].id;
    expect(
      cheops
        .legalMoves(state)
        .some((move) => move.type === 'remove' && move.cardIds.includes(coveredId)),
    ).toBe(false);

    state.piles.stock.cards = [{ id: 'cheops-stock-4', rank: 4, suit: 'clubs', faceUp: true }];
    state.piles.waste.cards = [{ id: 'cheops-waste-4', rank: 4, suit: 'hearts', faceUp: true }];
    const equalPair = cheops
      .legalMoves(state)
      .find(
        (move) =>
          move.type === 'remove' &&
          move.cardIds.includes('cheops-stock-4') &&
          move.cardIds.includes('cheops-waste-4'),
      );
    expect(equalPair).toBeDefined();
    expect(cheops.applyMove(state, equalPair!).error).toBeUndefined();

    state.piles.stock.cards = [{ id: 'cheops-stock-5', rank: 5, suit: 'clubs', faceUp: true }];
    state.piles.waste.cards = [{ id: 'cheops-waste-4', rank: 4, suit: 'hearts', faceUp: true }];
    expect(
      cheops
        .legalMoves(state)
        .some(
          (move) =>
            move.type === 'remove' &&
            move.cardIds.includes('cheops-stock-5') &&
            move.cardIds.includes('cheops-waste-4'),
        ),
    ).toBe(true);

    state.piles.stock.cards = [{ id: 'cheops-stock-a', rank: 1, suit: 'clubs', faceUp: true }];
    state.piles.waste.cards = [{ id: 'cheops-waste-k', rank: 13, suit: 'hearts', faceUp: true }];
    expect(
      cheops
        .legalMoves(state)
        .some(
          (move) =>
            move.type === 'remove' &&
            move.cardIds.includes('cheops-stock-a') &&
            move.cardIds.includes('cheops-waste-k'),
        ),
    ).toBe(false);
  });

  it('Cheops draws the next face-up stock card to the waste with no redeal', () => {
    const state = cheops.create('cheops-stock');
    const drawMove = cheops.legalMoves(state).find((move) => move.type === 'draw');
    expect(drawMove).toMatchObject({ from: 'stock', to: 'waste', count: 1 });
    const next = cheops.applyMove(state, drawMove!).state;
    expect(next.piles.stock.cards).toHaveLength(23);
    expect(next.piles.waste.cards).toHaveLength(1);
    expect(next.piles.waste.cards[0].faceUp).toBe(true);
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

  it('Aces Up starts with four face-up tableau cards and deals a four-card round', () => {
    const { state, move: deal } = firstMove(acesUp, 'draw');
    expect(state.piles.stock.cards).toHaveLength(48);
    expect(state.piles.waste).toBeUndefined();
    expect(['aces0', 'aces1', 'aces2', 'aces3'].map((id) => state.piles[id].cards)).toSatisfy(
      (piles: Card[][]) => piles.every((cards) => cards.length === 1 && cards[0].faceUp),
    );
    expect(deal).toMatchObject({ from: 'stock', to: 'tableau', count: 4 });
    const dealt = acesUp.applyMove(state, deal!).state;
    expect(dealt.piles.stock.cards).toHaveLength(44);
    expect(['aces0', 'aces1', 'aces2', 'aces3'].map((id) => dealt.piles[id].cards)).toSatisfy(
      (piles: Card[][]) => piles.every((cards) => cards.length === 2 && cards.at(-1)?.faceUp),
    );
  });

  it('Aces Up discards a lower exposed card and moves a top card to an empty tableau', () => {
    const { state, move } = firstMove(acesUp, 'remove');
    expect(move.type).toBe('remove');
    const result = acesUp.applyMove(state, move);
    expect(result.error).toBeUndefined();
    expect(result.state.meta.score).toBe(1);

    const empty = acesUp.create('aces-up-empty-pile');
    empty.piles.aces1.cards = [];
    const transferMove = acesUp
      .legalMoves(empty)
      .find((candidate) => candidate.type === 'transfer' && candidate.to === 'aces1');
    expect(transferMove).toMatchObject({ type: 'transfer', to: 'aces1' });
    const moved = acesUp.applyMove(empty, transferMove!).state;
    expect(moved.piles.aces1.cards).toHaveLength(1);
  });

  it('Aces Up only deals after no tableau action remains and marks an exhausted dead end lost', () => {
    const state = acesUp.create('aces-up-deal-gate');
    state.piles.aces0.cards = [{ id: 'clubs-2', rank: 2, suit: 'clubs', faceUp: true }];
    state.piles.aces1.cards = [{ id: 'hearts-3', rank: 3, suit: 'hearts', faceUp: true }];
    state.piles.aces2.cards = [{ id: 'diamonds-4', rank: 4, suit: 'diamonds', faceUp: true }];
    state.piles.aces3.cards = [{ id: 'spades-5', rank: 5, suit: 'spades', faceUp: true }];
    state.piles.stock.cards = [
      { id: 'clubs-6', rank: 6, suit: 'clubs', faceUp: false },
      { id: 'hearts-7', rank: 7, suit: 'hearts', faceUp: false },
      { id: 'diamonds-8', rank: 8, suit: 'diamonds', faceUp: false },
      { id: 'spades-9', rank: 9, suit: 'spades', faceUp: false },
    ];
    const deal = acesUp.legalMoves(state).find((move) => move.type === 'draw');
    expect(deal).toMatchObject({ type: 'draw', count: 4 });
    const exhausted = acesUp.applyMove(state, deal!).state;
    expect(exhausted.status).toBe('lost');
    expect(acesUp.legalMoves(exhausted)).toEqual([]);

    const { state: withDiscard, move: removal } = firstMove(acesUp, 'remove');
    expect(acesUp.legalMoves(withDiscard).some((move) => move.type === 'draw')).toBe(false);
    expect(removal.type).toBe('remove');
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
