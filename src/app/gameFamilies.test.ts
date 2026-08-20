import { describe, expect, it } from 'vitest';
import { gameCatalog } from './engineAdapter';
import { gameFamilies, gameFamilyId } from './gameFamilies';

describe('game family filters', () => {
  it('keeps each catalog classification available in the library filter', () => {
    const catalog = gameCatalog();
    expect(new Set(catalog.map(gameFamilyId)).size).toBe(9);
    expect(gameFamilies(catalog, 'en')).toHaveLength(9);
    expect(gameFamilies(catalog, 'ja')).toHaveLength(9);
  });
});
