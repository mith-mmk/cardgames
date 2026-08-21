import { describe, expect, it } from 'vitest';
import { GAME_DEFINITIONS } from './games';
import { GameSession } from './core';
import type { GameDefinition, GameState, Move } from './types';

const definitions = Object.values(GAME_DEFINITIONS) as GameDefinition[];

const cardsIn = (state: GameState) => Object.values(state.piles).flatMap((pile) => pile.cards);

type PlayableFixture = { seed: string; state: GameState; move: Move };

function firstPlayableState(definition: GameDefinition): PlayableFixture | undefined {
  for (let index = 0; index < 100; index += 1) {
    const seed = `contract-${definition.id}-${index}`;
    const state = definition.create(seed);
    const move = definition.legalMoves(state)[0];
    if (move) return { seed, state, move };
  }
  return undefined;
}

function invalidMove(move: Move): Move {
  if (move.type === 'draw') return { ...move, count: (move.count ?? 1) + 1000 };
  if (move.type === 'recycle') return { ...move, from: '__smoke_invalid_pile__' };
  return { ...move, cardIds: ['__smoke_invalid_card__'] };
}

describe('registered game contracts', () => {
  it('keeps the catalog and engine registry aligned', () => {
    expect(definitions).toHaveLength(100);
    expect(new Set(definitions.map((definition) => definition.id)).size).toBe(100);
  });

  it.each(definitions)('$id deals a deterministic, complete, unique deck', (definition) => {
    const seed = `contract-deal-${definition.id}`;
    const first = definition.create(seed);
    const cards = cardsIn(first);
    expect(JSON.stringify(first)).toBe(JSON.stringify(definition.create(seed)));
    expect(cards).toHaveLength(definition.decks * 52);
    expect(new Set(cards.map((card) => card.id)).size).toBe(cards.length);
  });

  it.each(definitions)('$id exposes and applies at least one legal opening move', (definition) => {
    const fixture = firstPlayableState(definition);
    expect(
      fixture,
      `${definition.id} has no legal opening move in 100 deterministic deals`,
    ).toBeDefined();
    const result = definition.applyMove(fixture!.state, fixture!.move);
    expect(result.error).toBeUndefined();
    expect(result.state.moveCount).toBe(fixture!.state.moveCount + 1);
    expect(cardsIn(result.state)).toHaveLength(definition.decks * 52);
  });

  it.each(definitions)(
    '$id rejects an invalid move and preserves undo, retry, and hint contracts',
    (definition) => {
      const fixture = firstPlayableState(definition);
      expect(fixture).toBeDefined();
      const { seed, state, move } = fixture!;
      const initial = JSON.stringify(state);

      const rejected = definition.applyMove(state, invalidMove(move));
      expect(rejected.error, `${definition.id} accepted an invalid move`).toBeDefined();
      expect(JSON.stringify(rejected.state)).toBe(initial);

      expect(definition.hint, `${definition.id} must provide a hint`).toBeTypeOf('function');
      const hint = definition.hint!(state);
      expect(
        definition
          .legalMoves(state)
          .some((candidate) => JSON.stringify(candidate) === JSON.stringify(hint)),
        `${definition.id} returned a hint that is not legal`,
      ).toBe(true);

      const session = new GameSession(definition, seed);
      expect(session.move(move).error).toBeUndefined();
      expect(JSON.stringify(session.undo())).toBe(initial);
      expect(session.move(move).error).toBeUndefined();
      expect(JSON.stringify(session.retry())).toBe(initial);
    },
  );
});
