import { describe, expect, it } from 'vitest';
import { GameDefinition, GameState, Move } from './types';
import { createDeck } from './random';
import { GameSession, makeState, pile } from './core';
import {
  blackWidow,
  getSpiderVariantGameDefinition,
  scorpion,
  SPIDER_VARIANT_GAME_DEFINITIONS,
  wasp,
} from './spiderVariantGames';

const variantDefinitions = [scorpion, wasp, blackWidow];

function allCards(state: GameState) {
  return Object.values(state.piles).flatMap((candidate) => candidate.cards);
}

function customState(
  definition: GameDefinition,
  tableauCards: Record<string, ReturnType<typeof createDeck>[number][]>,
): GameState {
  const count = definition === blackWidow ? 10 : 7;
  return makeState(definition.id, 'custom', [
    pile('stock', 'stock'),
    pile('removed', 'removed'),
    ...Array.from({ length: definition === blackWidow ? 8 : 0 }, (_, index) =>
      pile(`f${index}`, 'foundation'),
    ),
    ...Array.from({ length: count }, (_, index) =>
      pile(`t${index}`, 'tableau', tableauCards[`t${index}`] ?? []),
    ),
  ]);
}

function cards(suit: 'clubs' | 'diamonds' | 'hearts' | 'spades', ranks: number[]) {
  return ranks.map((rank) => {
    const card = createDeck().find(
      (candidate) => candidate.suit === suit && candidate.rank === rank,
    )!;
    card.faceUp = true;
    return card;
  });
}

describe('Spider-family variants', () => {
  it('exports all three definitions and keeps seeded deals deterministic', () => {
    expect(Object.keys(SPIDER_VARIANT_GAME_DEFINITIONS)).toEqual([
      'scorpion',
      'wasp',
      'blackWidow',
    ]);
    expect(getSpiderVariantGameDefinition('scorpion')).toBe(scorpion);
    expect(getSpiderVariantGameDefinition('wasp')).toBe(wasp);
    expect(getSpiderVariantGameDefinition('blackWidow')).toBe(blackWidow);
    for (const definition of variantDefinitions)
      expect(definition.create('fixed-seed')).toEqual(definition.create('fixed-seed'));
  });

  it.each([scorpion, wasp])('deals the standard %s 7x7 plus 3 reserve layout', (definition) => {
    const state = definition.create('layout-seed');
    const tableauIds = Array.from({ length: 7 }, (_, index) => `t${index}`);
    expect(tableauIds.map((id) => state.piles[id].cards.length)).toEqual([7, 7, 7, 7, 7, 7, 7]);
    expect(state.piles.stock.cards).toHaveLength(3);
    expect(state.piles.removed.cards).toHaveLength(0);
    for (const id of tableauIds) {
      const cardsInPile = state.piles[id].cards;
      expect(cardsInPile.filter((card) => card.faceUp)).toHaveLength(
        id === 't0' || id === 't1' || id === 't2' || id === 't3' ? 4 : 7,
      );
    }
    expect(allCards(state)).toHaveLength(52);
    expect(new Set(allCards(state).map((card) => card.id)).size).toBe(52);
  });

  it('deals Black Widow with two decks, 54-card tableau, and 50-card stock', () => {
    const state = blackWidow.create('layout-seed');
    expect(Array.from({ length: 10 }, (_, index) => state.piles[`t${index}`].cards.length)).toEqual(
      [6, 6, 6, 6, 5, 5, 5, 5, 5, 5],
    );
    expect(state.piles.stock.cards).toHaveLength(50);
    for (let index = 0; index < 10; index += 1)
      expect(state.piles[`t${index}`].cards.filter((card) => card.faceUp)).toHaveLength(1);
    expect(allCards(state)).toHaveLength(104);
    expect(new Set(allCards(state).map((card) => card.id)).size).toBe(104);
  });

  it('deals Scorpion reserve cards to the three leftmost columns exactly once', () => {
    const state = scorpion.create('reserve-seed');
    const move =
      state.piles.stock.cards.length === 3
        ? scorpion.legalMoves(state).find((candidate) => candidate.type === 'draw')!
        : undefined;
    expect(move).toEqual({
      type: 'draw',
      from: 'stock',
      to: 'tableau',
      count: 3,
    });
    const result = scorpion.applyMove(state, move!);
    expect(result.error).toBeUndefined();
    expect(result.state.piles.stock.cards).toHaveLength(0);
    expect(result.state.piles.t0.cards).toHaveLength(8);
    expect(result.state.piles.t1.cards).toHaveLength(8);
    expect(result.state.piles.t2.cards).toHaveLength(8);
    expect(result.state.piles.t0.cards.slice(-1)[0].faceUp).toBe(true);
    expect(scorpion.legalMoves(result.state).some((candidate) => candidate.type === 'draw')).toBe(
      false,
    );
  });

  it('enforces same-suit builds and Scorpion-only King empty columns', () => {
    const state = customState(scorpion, {
      t0: cards('hearts', [7]),
      t1: cards('spades', [8]),
    });
    expect(scorpion.legalMoves(state)).not.toContainEqual({
      type: 'transfer',
      from: 't0',
      to: 't1',
      cardIds: [state.piles.t0.cards[0].id],
    });
    expect(scorpion.legalMoves(state)).not.toContainEqual({
      type: 'transfer',
      from: 't0',
      to: 't2',
      cardIds: [state.piles.t0.cards[0].id],
    });
    const kingState = customState(scorpion, { t0: cards('hearts', [13]) });
    expect(scorpion.legalMoves(kingState)).toContainEqual({
      type: 'transfer',
      from: 't0',
      to: 't1',
      cardIds: [kingState.piles.t0.cards[0].id],
    });
  });

  it('allows any exposed card to fill an empty Wasp column', () => {
    const state = customState(wasp, { t0: cards('hearts', [7]) });
    const move: Move = {
      type: 'transfer',
      from: 't0',
      to: 't1',
      cardIds: [state.piles.t0.cards[0].id],
    };
    expect(wasp.legalMoves(state)).toContainEqual(move);
    expect(wasp.applyMove(state, move).error).toBeUndefined();
  });

  it('removes completed Scorpion and Wasp same-suit King-to-Ace runs and detects a win', () => {
    for (const definition of [scorpion, wasp]) {
      const state = customState(definition, {
        t0: cards('clubs', [1]),
        t1: cards('clubs', [13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2]),
      });
      const used = new Set(
        [state.piles.t0.cards, state.piles.t1.cards].flat().map((card) => card.id),
      );
      state.piles.removed.cards = createDeck()
        .filter((card) => !used.has(card.id))
        .slice(0, 39)
        .map((card) => ({ ...card, faceUp: true }));
      const move: Move = {
        type: 'transfer',
        from: 't0',
        to: 't1',
        cardIds: [state.piles.t0.cards[0].id],
      };
      const result = definition.applyMove(state, move);
      expect(result.error).toBeUndefined();
      expect(result.state.piles.removed.cards).toHaveLength(52);
      expect(result.state.piles.t1.cards).toHaveLength(0);
      expect(definition.isWon(result.state)).toBe(true);
      expect(result.state.status).toBe('won');
    }
  });

  it('requires a valid descending group for Black Widow but permits mixed suits', () => {
    const state = customState(blackWidow, {
      t0: cards('hearts', [8, 7]).concat(cards('spades', [6])),
      t1: cards('clubs', [9]),
    });
    const valid: Move = {
      type: 'transfer',
      from: 't0',
      to: 't1',
      cardIds: state.piles.t0.cards.map((card) => card.id),
    };
    expect(blackWidow.legalMoves(state)).toContainEqual(valid);
    const invalid: Move = {
      ...valid,
      cardIds: [state.piles.t0.cards[0].id, state.piles.t0.cards[2].id],
    };
    expect(blackWidow.applyMove(state, invalid).error).toBe('Illegal move');
  });

  it('deals Black Widow stock to all ten non-empty tableaus and prevents a blocked deal', () => {
    const state = blackWidow.create('draw-seed');
    const drawMove = blackWidow.legalMoves(state).find((candidate) => candidate.type === 'draw')!;
    const result = blackWidow.applyMove(state, drawMove);
    expect(result.error).toBeUndefined();
    expect(result.state.piles.stock.cards).toHaveLength(40);
    expect(result.state.piles.t0.cards).toHaveLength(7);
    const blocked = customState(blackWidow, {});
    blocked.piles.t0.cards = [];
    expect(blackWidow.legalMoves(blocked).some((candidate) => candidate.type === 'draw')).toBe(
      false,
    );
  });

  it.each(variantDefinitions)(
    '%s supports invalid moves, Undo, and Retry deterministically',
    (definition) => {
      const session = new GameSession(definition, 'session-seed');
      const initial = JSON.stringify(session.state);
      const invalid: Move = {
        type: 'transfer',
        from: 't0',
        to: 't1',
        cardIds: ['missing-card'],
      };
      expect(session.move(invalid).error).toBe('Illegal move');
      const drawMove = definition
        .legalMoves(session.state)
        .find((candidate) => candidate.type === 'draw')!;
      expect(session.move(drawMove).error).toBeUndefined();
      expect(session.state.moveCount).toBe(1);
      expect(JSON.stringify(session.undo())).toBe(initial);
      expect(session.move(drawMove).error).toBeUndefined();
      expect(JSON.stringify(session.retry())).toBe(initial);
    },
  );
});
