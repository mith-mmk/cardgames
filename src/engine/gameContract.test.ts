import { describe, expect, it } from 'vitest';
import { GAME_DEFINITIONS } from './games';
import type { GameDefinition, GameState } from './types';

const definitions = Object.values(GAME_DEFINITIONS) as GameDefinition[];

const cardsIn = (state: GameState) => Object.values(state.piles).flatMap((pile) => pile.cards);

function firstPlayableState(definition: GameDefinition): GameState | undefined {
  for (let index = 0; index < 100; index += 1) {
    const state = definition.create(`contract-${definition.id}-${index}`);
    if (definition.legalMoves(state).length) return state;
  }
  return undefined;
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
    const state = firstPlayableState(definition);
    expect(
      state,
      `${definition.id} has no legal opening move in 100 deterministic deals`,
    ).toBeDefined();
    const move = definition.legalMoves(state!)[0];
    const result = definition.applyMove(state!, move);
    expect(result.error).toBeUndefined();
    expect(result.state.moveCount).toBe(state!.moveCount + 1);
    expect(cardsIn(result.state)).toHaveLength(definition.decks * 52);
  });
});
