import { describe, expect, it } from 'vitest';
import { interpolate, text } from './i18n';

describe('localized UI messages', () => {
  it('provides the same message keys in Japanese and English', () => {
    expect(Object.keys(text('ja')).sort()).toEqual(Object.keys(text('en')).sort());
  });

  it('interpolates dynamic UI values without changing the source message', () => {
    expect(interpolate(text('ja').dailyDescription, { count: 18 })).toContain('18');
    expect(interpolate(text('en').tableAria, { game: 'Klondike' })).toBe('Klondike table');
  });

  it('localizes accessible card and pile labels', () => {
    expect(text('ja').faceDownCard).not.toBe(text('en').faceDownCard);
    expect(text('ja').suits.hearts).toBe('ハート');
    expect(text('en').pileKinds.foundation).toBe('foundation');
  });

  it('provides localized how-to-play instructions for every implemented game', () => {
    const japaneseHelp = text('ja').gameHelp;
    const englishHelp = text('en').gameHelp;
    expect(Object.keys(japaneseHelp).sort()).toEqual(Object.keys(englishHelp).sort());
    expect(Object.keys(japaneseHelp)).toHaveLength(26);
    for (const rules of Object.values(japaneseHelp)) {
      expect(rules.goal).not.toHaveLength(0);
      expect(rules.steps.length).toBeGreaterThanOrEqual(3);
    }
  });
});
