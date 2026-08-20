import { describe, expect, it } from 'vitest';
import { GameSession } from './core';
import {
  REMOVAL_SCORING_GAMES,
  acesUp,
  accordion,
  blackHole,
  beehive,
  blockTen,
  bowlingSolitaire,
  cheops,
  cribbageSolitaire,
  cribbageSquares,
  fourteenOut,
  gayGordons,
  giza,
  monteCarlo,
  nestor,
  pokerSquares,
  royalMarriage,
  scoreCribbageHand,
  scoreCribbageShow,
  scoreBowlingFrames,
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

  it('Accordion moves the entire matching source pile and closes its gap', () => {
    const state = accordion.create('accordion-whole-pile');
    for (let index = 0; index < 52; index += 1) state.piles[`t${index}`].cards = [];
    state.piles.t0.cards = [{ id: 'accordion-target', rank: 7, suit: 'clubs', faceUp: true }];
    state.piles.t1.cards = [
      { id: 'accordion-bottom', rank: 2, suit: 'hearts', faceUp: true },
      { id: 'accordion-top', rank: 7, suit: 'spades', faceUp: true },
    ];
    const move = accordion.legalMoves(state).find((candidate) => candidate.from === 't1');
    expect(move).toMatchObject({
      type: 'transfer',
      from: 't1',
      to: 't0',
      cardIds: ['accordion-bottom', 'accordion-top'],
    });
    const next = accordion.applyMove(state, move!).state;
    expect(next.piles.t1.cards).toHaveLength(0);
    expect(next.piles.t0.cards.map((card) => card.id)).toEqual([
      'accordion-target',
      'accordion-bottom',
      'accordion-top',
    ]);
  });

  it('Monte Carlo deals an open five-by-five grid and only removes touching ranks', () => {
    const state = monteCarlo.create('monte-carlo-layout');
    expect(Array.from({ length: 25 }, (_, index) => state.piles[`mc${index}`].cards)).toSatisfy(
      (piles: Card[][]) =>
        piles.every((cards) => cards.length === 1 && cards.every((card) => card.faceUp)),
    );
    expect(state.piles.stock.cards).toHaveLength(27);
    expect(state.piles.stock.cards.every((card) => !card.faceUp)).toBe(true);

    for (let index = 0; index < 25; index += 1) state.piles[`mc${index}`].cards = [];
    state.status = 'playing';
    state.piles.mc0.cards = [{ id: 'mc-a', rank: 7, suit: 'clubs', faceUp: true }];
    state.piles.mc1.cards = [{ id: 'mc-b', rank: 7, suit: 'hearts', faceUp: true }];
    state.piles.mc4.cards = [{ id: 'mc-far', rank: 7, suit: 'spades', faceUp: true }];
    const pair = monteCarlo
      .legalMoves(state)
      .find((move) => move.type === 'remove' && move.cardIds.includes('mc-a'));
    if (pair?.type !== 'remove') throw new Error('Expected an adjacent Monte Carlo pair');
    expect(pair).toMatchObject({ cardIds: ['mc-a', 'mc-b'] });
    expect(pair.cardIds).not.toContain('mc-far');
  });

  it('Monte Carlo compacts empty cells and refills the grid only after no pairs remain', () => {
    const state = monteCarlo.create('monte-carlo-refill');
    for (let index = 0; index < 25; index += 1) state.piles[`mc${index}`].cards = [];
    state.status = 'playing';
    state.piles.mc0.cards = [{ id: 'mc-first', rank: 2, suit: 'clubs', faceUp: true }];
    state.piles.mc2.cards = [{ id: 'mc-second', rank: 4, suit: 'hearts', faceUp: true }];
    state.piles.stock.cards = [{ id: 'mc-stock', rank: 6, suit: 'spades', faceUp: false }];
    const refill = monteCarlo.legalMoves(state).find((move) => move.type === 'draw');
    expect(refill).toMatchObject({ from: 'stock', to: 'tableau' });
    const next = monteCarlo.applyMove(state, refill!).state;
    expect(next.piles.mc0.cards[0].id).toBe('mc-first');
    expect(next.piles.mc1.cards[0].id).toBe('mc-second');
    expect(next.piles.mc2.cards[0]).toMatchObject({ id: 'mc-stock', faceUp: true });
    expect(next.piles.stock.cards).toHaveLength(0);
  });

  it('Fourteen Out deals four five-card and eight four-card face-up columns', () => {
    const state = fourteenOut.create('fourteen-out-layout');
    expect(Array.from({ length: 12 }, (_, index) => state.piles[`fo${index}`].cards)).toSatisfy(
      (piles: Card[][]) =>
        piles.every(
          (cards, index) =>
            cards.length === (index < 4 ? 5 : 4) && cards.every((card) => card.faceUp),
        ),
    );
    expect(state.piles.stock).toBeUndefined();
  });

  it('Fourteen Out removes only exposed cards from distinct columns that total fourteen', () => {
    const state = fourteenOut.create('fourteen-out-pair');
    for (let index = 0; index < 12; index += 1) state.piles[`fo${index}`].cards = [];
    state.status = 'playing';
    state.piles.fo0.cards = [{ id: 'fo-king', rank: 13, suit: 'clubs', faceUp: true }];
    state.piles.fo1.cards = [{ id: 'fo-ace', rank: 1, suit: 'hearts', faceUp: true }];
    const pair = fourteenOut.legalMoves(state)[0];
    expect(pair).toMatchObject({ type: 'remove', cardIds: ['fo-king', 'fo-ace'] });
    expect(fourteenOut.applyMove(state, pair).state.piles.removed.cards).toHaveLength(2);
  });

  it('Block Ten refills its nine cells and never removes a ten', () => {
    const state = blockTen.create('block-ten-pair');
    for (let index = 0; index < 9; index += 1) state.piles[`bt${index}`].cards = [];
    state.status = 'playing';
    state.piles.bt0.cards = [{ id: 'bt-nine', rank: 9, suit: 'clubs', faceUp: true }];
    state.piles.bt1.cards = [{ id: 'bt-ace', rank: 1, suit: 'hearts', faceUp: true }];
    state.piles.stock.cards = [
      { id: 'bt-fill-left', rank: 2, suit: 'spades', faceUp: false },
      { id: 'bt-fill-right', rank: 3, suit: 'diamonds', faceUp: false },
    ];
    const pair = blockTen.legalMoves(state)[0];
    const next = blockTen.applyMove(state, pair).state;
    expect(next.piles.bt0.cards[0]).toMatchObject({ id: 'bt-fill-right', faceUp: true });
    expect(next.piles.bt1.cards[0]).toMatchObject({ id: 'bt-fill-left', faceUp: true });
    state.piles.bt0.cards = [{ id: 'bt-ten-a', rank: 10, suit: 'clubs', faceUp: true }];
    state.piles.bt1.cards = [{ id: 'bt-ten-b', rank: 10, suit: 'hearts', faceUp: true }];
    expect(blockTen.legalMoves(state)).toEqual([]);
  });

  it('Block Ten wins after removing 48 cards and leaving its four tens', () => {
    const state = blockTen.create('block-ten-win');
    for (const id of Array.from({ length: 9 }, (_, index) => `bt${index}`)) {
      state.piles[id].cards = [];
    }
    state.piles.stock.cards = [];
    state.piles.removed.cards = Array.from({ length: 48 }, (_, index) => ({
      id: `removed-${index}`,
      rank: ((index % 9) + 1) as Card['rank'],
      suit: 'clubs',
      faceUp: true,
    }));
    for (let index = 0; index < 4; index += 1) {
      state.piles[`bt${index}`].cards = [
        { id: `ten-${index}`, rank: 10, suit: 'clubs', faceUp: true },
      ];
    }
    expect(blockTen.isWon(state)).toBe(true);
    state.piles.bt4.cards = [{ id: 'not-a-ten', rank: 9, suit: 'hearts', faceUp: true }];
    expect(blockTen.isWon(state)).toBe(false);
  });

  it('Nestor deals eight duplicate-free open columns plus four playable reserves', () => {
    const state = nestor.create('nestor-layout');
    expect(Array.from({ length: 8 }, (_, index) => state.piles[`nestor${index}`].cards)).toSatisfy(
      (piles: Card[][]) =>
        piles.every(
          (cards) =>
            cards.length === 6 &&
            cards.every((card) => card.faceUp) &&
            new Set(cards.map((card) => card.rank)).size === 6,
        ),
    );
    expect(
      Array.from({ length: 4 }, (_, index) => state.piles[`nestorReserve${index}`].cards),
    ).toSatisfy((piles: Card[][]) => piles.every((cards) => cards.length === 1 && cards[0].faceUp));

    for (let index = 0; index < 8; index += 1) state.piles[`nestor${index}`].cards = [];
    for (let index = 0; index < 4; index += 1) state.piles[`nestorReserve${index}`].cards = [];
    state.status = 'playing';
    state.piles.nestor0.cards = [{ id: 'nestor-queen', rank: 12, suit: 'clubs', faceUp: true }];
    state.piles.nestorReserve0.cards = [
      { id: 'nestor-reserve-queen', rank: 12, suit: 'hearts', faceUp: true },
    ];
    const pair = nestor.legalMoves(state)[0];
    expect(pair).toMatchObject({
      type: 'remove',
      cardIds: ['nestor-queen', 'nestor-reserve-queen'],
    });
    expect(nestor.applyMove(state, pair).state.piles.removed.cards).toHaveLength(2);
  });

  it('Royal Marriage fixes the heart court pair and removes only bracketed interiors', () => {
    const state = royalMarriage.create('royal-marriage-layout');
    expect(state.piles.rm0.cards[0]).toMatchObject({ rank: 12, suit: 'hearts', faceUp: true });
    expect(state.piles.rm51.cards[0]).toMatchObject({ rank: 13, suit: 'hearts', faceUp: true });
    for (let index = 0; index < 52; index += 1) state.piles[`rm${index}`].cards = [];
    state.status = 'playing';
    state.piles.rm0.cards = [{ id: 'rm-left', rank: 5, suit: 'clubs', faceUp: true }];
    state.piles.rm1.cards = [{ id: 'rm-single', rank: 7, suit: 'hearts', faceUp: true }];
    state.piles.rm2.cards = [{ id: 'rm-right', rank: 5, suit: 'spades', faceUp: true }];
    const single = royalMarriage.legalMoves(state)[0];
    expect(single).toMatchObject({ type: 'remove', cardIds: ['rm-single'] });
    expect(royalMarriage.applyMove(state, single).state.piles.removed.cards).toHaveLength(1);

    state.piles.rm0.cards = [{ id: 'rm-pair-left', rank: 4, suit: 'diamonds', faceUp: true }];
    state.piles.rm1.cards = [{ id: 'rm-pair-a', rank: 8, suit: 'clubs', faceUp: true }];
    state.piles.rm2.cards = [{ id: 'rm-pair-b', rank: 9, suit: 'hearts', faceUp: true }];
    state.piles.rm3.cards = [{ id: 'rm-pair-right', rank: 11, suit: 'diamonds', faceUp: true }];
    const pair = royalMarriage
      .legalMoves(state)
      .find((move) => move.type === 'remove' && move.cardIds.length === 2);
    expect(pair).toMatchObject({ cardIds: ['rm-pair-a', 'rm-pair-b'] });
    expect(royalMarriage.applyMove(state, pair!).state.piles.removed.cards).toHaveLength(2);
  });

  it('Gay Gordons uses ten five-card columns, a two-card reserve, and its three pair types', () => {
    const state = gayGordons.create('gay-gordons-layout');
    expect(Array.from({ length: 10 }, (_, index) => state.piles[`gay${index}`].cards)).toSatisfy(
      (piles: Card[][]) =>
        piles.every((cards) => cards.length === 5 && cards.every((card) => card.faceUp)),
    );
    expect(state.piles.gayReserve.cards).toHaveLength(2);
    for (let index = 0; index < 10; index += 1) state.piles[`gay${index}`].cards = [];
    state.piles.gayReserve.cards = [];
    state.status = 'playing';
    state.piles.gay0.cards = [{ id: 'gay-ace', rank: 1, suit: 'clubs', faceUp: true }];
    state.piles.gay1.cards = [{ id: 'gay-ten', rank: 10, suit: 'hearts', faceUp: true }];
    state.piles.gay2.cards = [{ id: 'gay-jack-a', rank: 11, suit: 'spades', faceUp: true }];
    state.piles.gay3.cards = [{ id: 'gay-jack-b', rank: 11, suit: 'diamonds', faceUp: true }];
    state.piles.gay4.cards = [{ id: 'gay-king', rank: 13, suit: 'clubs', faceUp: true }];
    state.piles.gayReserve.cards = [{ id: 'gay-queen', rank: 12, suit: 'hearts', faceUp: true }];
    const moves = gayGordons.legalMoves(state);
    expect(moves).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ cardIds: ['gay-ace', 'gay-ten'] }),
        expect.objectContaining({ cardIds: ['gay-jack-a', 'gay-jack-b'] }),
        expect.objectContaining({ cardIds: ['gay-king', 'gay-queen'] }),
      ]),
    );
    state.piles.gayReserve.cards = [
      { id: 'gay-same-suit-queen', rank: 12, suit: 'clubs', faceUp: true },
    ];
    expect(
      gayGordons
        .legalMoves(state)
        .some((move) => move.type === 'remove' && move.cardIds.includes('gay-same-suit-queen')),
    ).toBe(false);
  });

  it('Beehive builds four equal ranks, draws three cards, and recycles the waste', () => {
    const state = beehive.create('beehive-layout');
    expect(state.piles.beehiveReserve.cards).toHaveLength(10);
    expect(state.piles.beehiveReserve.cards.slice(0, -1).every((card) => !card.faceUp)).toBe(true);
    expect(state.piles.beehiveReserve.cards.at(-1)?.faceUp).toBe(true);
    expect(Array.from({ length: 6 }, (_, index) => state.piles[`bee${index}`].cards)).toSatisfy(
      (piles: Card[][]) => piles.every((cards) => cards.length === 1 && cards[0].faceUp),
    );
    expect(state.piles.stock.cards).toHaveLength(36);

    for (let index = 0; index < 6; index += 1) state.piles[`bee${index}`].cards = [];
    state.piles.beehiveReserve.cards = [];
    state.piles.waste.cards = [];
    state.status = 'playing';
    state.piles.bee0.cards = [
      { id: 'bee-five-a', rank: 5, suit: 'clubs', faceUp: true },
      { id: 'bee-five-b', rank: 5, suit: 'hearts', faceUp: true },
      { id: 'bee-five-c', rank: 5, suit: 'spades', faceUp: true },
    ];
    state.piles.bee1.cards = [{ id: 'bee-five-d', rank: 5, suit: 'diamonds', faceUp: true }];
    const build = beehive
      .legalMoves(state)
      .find((move) => move.type === 'transfer' && move.from === 'bee1' && move.to === 'bee0');
    const completed = beehive.applyMove(state, build!).state;
    expect(completed.piles.bee0.cards).toHaveLength(0);
    expect(completed.piles.removed.cards).toHaveLength(4);

    const drawState = beehive.create('beehive-draw');
    const drawMove = beehive.legalMoves(drawState).find((move) => move.type === 'draw');
    const drawn = beehive.applyMove(drawState, drawMove!).state;
    expect(drawn.piles.waste.cards).toHaveLength(3);
    drawn.piles.stock.cards = [];
    const recycle = beehive.legalMoves(drawn).find((move) => move.type === 'recycle');
    const recycled = beehive.applyMove(drawn, recycle!).state;
    expect(recycled.piles.stock.cards).toHaveLength(3);
    expect(recycled.piles.stock.cards.every((card) => !card.faceUp)).toBe(true);
  });

  it('Cribbage Solitaire scores two chosen hands and a crib over four thirteen-card sets', () => {
    const state = cribbageSolitaire.create('cribbage-solitaire-round');
    expect(state.piles.stock.cards).toHaveLength(39);
    expect(
      Array.from({ length: 12 }, (_, index) => state.piles[`cribHand${index}`].cards),
    ).toSatisfy((piles: Card[][]) => piles.every((cards) => cards.length === 1 && cards[0].faceUp));
    expect(state.piles.cribbageStarter.cards[0]).toMatchObject({ faceUp: false });
    let next = state;
    for (const source of ['cribHand0', 'cribHand1', 'cribHand6', 'cribHand7']) {
      const move = cribbageSolitaire
        .legalMoves(next)
        .find((candidate) => candidate.type === 'transfer' && candidate.from === source);
      next = cribbageSolitaire.applyMove(next, move!).state;
    }
    expect(next.meta.phase).toBe('score');
    expect(next.piles.crib.cards).toHaveLength(4);
    expect(next.piles.cribbageStarter.cards[0]).toMatchObject({ faceUp: true });
    expect(Number(next.meta.score)).toBeGreaterThanOrEqual(0);
    const nextRound = cribbageSolitaire.legalMoves(next)[0];
    const secondRound = cribbageSolitaire.applyMove(next, nextRound).state;
    expect(secondRound.meta.phase).toBe('discard');
    expect(secondRound.meta.round).toBe(2);
    expect(secondRound.piles.removed.cards).toHaveLength(13);

    const runAndFlush: Card[] = [1, 2, 3, 4].map((rank) => ({
      id: `crib-run-${rank}`,
      rank: rank as Card['rank'],
      suit: 'hearts',
      faceUp: true,
    }));
    expect(
      scoreCribbageShow(runAndFlush, {
        id: 'crib-run-5',
        rank: 5,
        suit: 'hearts',
        faceUp: true,
      }),
    ).toEqual({ label: 'Cribbage show', score: 12 });
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

  it('Bowling uses a 20-card pin-and-ball rack and records a legal knock', () => {
    const state = bowlingSolitaire.create('bowling-layout');
    expect(
      Array.from({ length: 10 }, (_, index) => state.piles[`bowlPin${index}`].cards),
    ).toSatisfy((piles: Card[][]) => piles.every((cards) => cards.length === 1 && cards[0].faceUp));
    expect([0, 1, 2].map((index) => state.piles[`bowlBall${index}`].cards.length)).toEqual([
      5, 3, 2,
    ]);
    expect(state.piles.bowlingUnused.cards).toHaveLength(32);

    for (let index = 0; index < 10; index += 1) state.piles[`bowlPin${index}`].cards = [];
    state.piles.bowlPin0.cards = [{ id: 'bowl-pin-nine', rank: 9, suit: 'hearts', faceUp: true }];
    state.piles.bowlPin7.cards = [{ id: 'bowl-pin-one', rank: 1, suit: 'clubs', faceUp: true }];
    state.piles.bowlPin8.cards = [{ id: 'bowl-pin-three', rank: 3, suit: 'hearts', faceUp: true }];
    state.piles.bowlBall0.cards = [{ id: 'bowl-ball-four', rank: 4, suit: 'clubs', faceUp: true }];
    state.piles.bowlBall1.cards = [];
    state.piles.bowlBall2.cards = [];
    state.status = 'playing';
    state.meta.bowlingFirstCardPlayed = false;
    const chooseBall = bowlingSolitaire
      .legalMoves(state)
      .find((move) => move.type === 'transfer' && move.from === 'bowlBall0');
    const selected = bowlingSolitaire.applyMove(state, chooseBall!).state;
    const knock = bowlingSolitaire
      .legalMoves(selected)
      .find((move) => move.type === 'remove' && move.cardIds.length === 3);
    expect(knock).toMatchObject({ cardIds: ['bowl-ball-four', 'bowl-pin-one', 'bowl-pin-three'] });
    const next = bowlingSolitaire.applyMove(selected, knock!).state;
    expect(next.piles.bowlPin7.cards).toHaveLength(0);
    expect(next.piles.bowlPin8.cards).toHaveLength(0);
    expect(next.meta.bowlingCurrentPins).toBe(2);
    expect(next.meta.bowlingFirstCardPlayed).toBe(true);
  });

  it('scores Bowling frames with standard strike and spare bonuses', () => {
    expect(
      scoreBowlingFrames(
        Array.from({ length: 10 }, () => [10]),
        [10, 10],
      ),
    ).toBe(300);
    expect(
      scoreBowlingFrames([
        [8, 2],
        [10],
        [10],
        [6, 3],
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
      ]),
    ).toBe(74);
  });
});
