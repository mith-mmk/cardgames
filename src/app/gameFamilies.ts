import type { GameDefinition, Language } from './types';

export type GameFamilyId = 'klondike' | 'open-cell' | 'long-run' | 'special' | 'removal';

const familyByLabel: Record<string, GameFamilyId> = {
  'Klondike family': 'klondike',
  'Open-cell family': 'open-cell',
  'Spider family': 'long-run',
  'Long-run family': 'long-run',
  'Special foundations': 'special',
  'Special layouts': 'special',
  'Special foundations and layouts': 'special',
  'Removal games': 'removal',
  'Removal and scoring games': 'removal',
};

const familyNames: Record<GameFamilyId, Record<Language, string>> = {
  klondike: { ja: 'クロンダイク系', en: 'Klondike family' },
  'open-cell': { ja: '全面公開・空きセル系', en: 'Open-cell family' },
  'long-run': { ja: 'スパイダー・ユーコン系', en: 'Spider / Yukon family' },
  special: { ja: '特殊完成札・配置系', en: 'Special foundations and layouts' },
  removal: { ja: 'カード除去・得点系', en: 'Removal and scoring games' },
};

export function gameFamilyId(game: GameDefinition): GameFamilyId {
  return familyByLabel[game.family.en] ?? 'special';
}

export function gameFamilyName(family: GameFamilyId, language: Language): string {
  return familyNames[family][language];
}

export function gameFamilies(games: GameDefinition[], language: Language) {
  return Array.from(new Set(games.map(gameFamilyId))).map((id) => ({
    id,
    name: gameFamilyName(id, language),
  }));
}
