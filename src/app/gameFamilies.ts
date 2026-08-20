import type { GameDefinition, Language } from './types';

/** Preserve each catalog family as a selectable choice. Some groups are close
 * relatives, but merging them made the library look as if games had vanished. */
export type GameFamilyId = string;

const distinctFamilyNames: Record<string, Record<Language, string>> = {
  'Long-run family': { ja: 'スパイダー・ユーコン系', en: 'Long-run family' },
  'Special layouts': { ja: '特殊配置', en: 'Special layouts' },
  'Special foundations and layouts': {
    ja: '特殊完成札・配置系',
    en: 'Special foundations and layouts',
  },
  'Removal and scoring games': { ja: 'カード除去・得点系', en: 'Removal and scoring games' },
};

export function gameFamilyId(game: GameDefinition): GameFamilyId {
  return game.family.en;
}

export function gameFamilies(games: GameDefinition[], language: Language) {
  const families = new Map<string, string>();
  for (const game of games) {
    const id = gameFamilyId(game);
    if (!families.has(id))
      families.set(id, distinctFamilyNames[id]?.[language] ?? game.family[language]);
  }
  return [...families].map(([id, name]) => ({ id, name }));
}
