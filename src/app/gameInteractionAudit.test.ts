import { describe, expect, it } from 'vitest';
import { GAME_DEFINITIONS } from '../engine';
import type { GameDefinition, GameState, Move } from '../engine';

const definitions = Object.values(GAME_DEFINITIONS) as GameDefinition[];

function firstPlayableState(definition: GameDefinition): GameState | undefined {
  for (let index = 0; index < 100; index += 1) {
    const state = definition.create(`interaction-audit-${definition.id}-${index}`);
    if (definition.legalMoves(state).length) return state;
  }
  return undefined;
}

function playerChoiceIsPreserved(move: Move): boolean {
  // A stock click dispatches a single draw automatically. That is sufficient for
  // solitaire deals, but not for games where the player must choose the target.
  return move.type !== 'draw' || move.from !== 'stock' || move.to === 'waste';
}

describe('game interaction audit', () => {
  it('keeps grid-game placement as a player choice after the stock deal', () => {
    const affected = definitions.flatMap((definition) => {
      const state = firstPlayableState(definition);
      if (!state) return [];
      const layout = state.meta.layout as { type?: string } | undefined;
      if (!/^grid-\d+x\d+$/.test(layout?.type ?? '')) return [];
      return definition
        .legalMoves(state)
        .filter((move) => !playerChoiceIsPreserved(move))
        .map(() => definition.id);
    });

    expect([...new Set(affected)].sort()).toEqual([]);
  });
});
