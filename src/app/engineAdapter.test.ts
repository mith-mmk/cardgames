import { afterEach, describe, expect, it } from 'vitest';
import * as Engine from '../engine';
import { createSession } from './engineAdapter';

const asRecord = (value: unknown): Record<string, unknown> => value as Record<string, unknown>;
const idsOf = (move: Record<string, unknown>): string[] =>
  Array.isArray(move.cardIds) ? (move.cardIds as string[]) : [];

describe('engine adapter interaction contracts', () => {
  afterEach(() => {
    delete (Engine.GAME_DEFINITIONS as Record<string, unknown>)['adapter-test'];
    delete (Engine.GAME_DEFINITIONS as Record<string, unknown>)['adapter-selection'];
  });

  it('only moves a selected card when it is the first card of a legal run', () => {
    const definition = {
      id: 'adapter-selection',
      name: 'Adapter selection',
      decks: 1,
      create: () => ({
        gameId: 'adapter-selection',
        seed: 'test',
        moveCount: 0,
        status: 'playing',
        meta: {},
        piles: {
          t0: {
            id: 't0',
            kind: 'tableau',
            cards: [
              { id: 'a', suit: 'clubs', rank: 2, faceUp: true },
              { id: 'b', suit: 'hearts', rank: 1, faceUp: true },
            ],
          },
          t1: { id: 't1', kind: 'tableau', cards: [] },
        },
      }),
      legalMoves: (state: any) =>
        state.piles.t0.cards.length
          ? [{ type: 'transfer', from: 't0', to: 't1', cardIds: ['a', 'b'] }]
          : [],
      applyMove: (state: any) => ({
        state: {
          ...structuredClone(state),
          moveCount: state.moveCount + 1,
          piles: {
            ...state.piles,
            t0: { ...state.piles.t0, cards: [] },
            t1: {
              ...state.piles.t1,
              cards: [...state.piles.t1.cards, ...state.piles.t0.cards],
            },
          },
        },
      }),
      isWon: () => false,
    };
    (Engine.GAME_DEFINITIONS as Record<string, unknown>)['adapter-selection'] = definition;
    const session = createSession('adapter-selection', 'test');
    expect(session.move('t0', 'b', 't1')).toBe(false);
    expect(session.move('t0', 'a', 't1')).toBe(true);
  });

  it('autoMove executes foundation transfers and Pyramid single-King removals', () => {
    let foundationCase:
      | {
          session: ReturnType<typeof createSession>;
          move: Record<string, unknown>;
        }
      | undefined;
    for (let i = 0; i < 100 && !foundationCase; i += 1) {
      const session = createSession('calculation', `adapter-foundation-${i}`);
      const move = session
        .legalMoves()
        .map(asRecord)
        .find(
          (candidate) =>
            candidate.type === 'transfer' &&
            idsOf(candidate).length === 1 &&
            String(candidate.to).startsWith('f'),
        );
      if (move) foundationCase = { session, move };
    }
    expect(foundationCase).toBeDefined();
    const foundationBefore = foundationCase!.session.getSnapshot().moves;
    const foundationMove = foundationCase!.move;
    expect(
      foundationCase!.session.autoMove(String(foundationMove.from), idsOf(foundationMove)[0]),
    ).toBe(true);
    expect(foundationCase!.session.getSnapshot().moves).toBe(foundationBefore + 1);

    let pyramidCase:
      | {
          session: ReturnType<typeof createSession>;
          move: Record<string, unknown>;
        }
      | undefined;
    for (let i = 0; i < 100 && !pyramidCase; i += 1) {
      const session = createSession('pyramid', `adapter-king-${i}`);
      const snapshot = session.getSnapshot();
      const move = session
        .legalMoves()
        .map(asRecord)
        .find(
          (candidate) =>
            candidate.type === 'remove' &&
            idsOf(candidate).length === 1 &&
            snapshot.piles.some((pile) =>
              pile.cards.some((card) => card.id === idsOf(candidate)[0] && card.rank === 13),
            ),
        );
      if (move) pyramidCase = { session, move };
    }
    expect(pyramidCase).toBeDefined();
    const kingMove = pyramidCase!.move;
    expect(pyramidCase!.session.autoMove(String(kingMove.from), idsOf(kingMove)[0])).toBe(true);
  });

  it('autoComplete is atomic and one undo restores the pre-complete position', () => {
    const definition = {
      id: 'adapter-test',
      name: 'Adapter test',
      decks: 1,
      create: () => ({
        gameId: 'adapter-test',
        seed: 'test',
        moveCount: 0,
        status: 'playing',
        meta: {},
        piles: {
          f0: {
            id: 'f0',
            kind: 'foundation',
            cards: [{ id: 'a', suit: 'clubs', rank: 1, faceUp: true }],
          },
          t0: {
            id: 't0',
            kind: 'tableau',
            cards: [{ id: 'b', suit: 'clubs', rank: 2, faceUp: true }],
          },
        },
      }),
      legalMoves: (state: any) =>
        state.piles.t0.cards.length
          ? [{ type: 'transfer', from: 't0', to: 'f0', cardIds: ['b'] }]
          : [],
      applyMove: (state: any) => ({
        state: {
          ...structuredClone(state),
          moveCount: state.moveCount + 1,
          status: 'won',
          piles: {
            ...state.piles,
            t0: { ...state.piles.t0, cards: [] },
            f0: {
              ...state.piles.f0,
              cards: [...state.piles.f0.cards, { id: 'b', suit: 'clubs', rank: 2, faceUp: true }],
            },
          },
        },
      }),
      isWon: (state: any) => state.piles.f0.cards.length === 2,
    };
    (Engine.GAME_DEFINITIONS as Record<string, unknown>)['adapter-test'] = definition;
    const session = createSession('adapter-test', 'test');
    const before = session.getSnapshot();
    expect(session.autoComplete()).toBe(true);
    expect(session.getSnapshot().won).toBe(true);
    expect(session.undo()).toBe(true);
    expect(session.getSnapshot().moves).toBe(before.moves);
    expect(session.getSnapshot().piles).toEqual(before.piles);
  });
});
