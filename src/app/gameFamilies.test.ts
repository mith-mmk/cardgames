import { describe, expect, it } from 'vitest';
import { gameCatalog } from './engineAdapter';
import { gameFamilies, gameFamilyId } from './gameFamilies';

describe('game family filters', () => {
  it('normalizes base and expansion labels into five visible families', () => {
    const catalog = gameCatalog();
    expect(new Set(catalog.map(gameFamilyId))).toEqual(
      new Set(['klondike', 'open-cell', 'long-run', 'special', 'removal']),
    );
    expect(gameFamilies(catalog, 'en')).toHaveLength(5);
    expect(gameFamilies(catalog, 'ja')).toHaveLength(5);
  });
});
