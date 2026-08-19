import en from '../locales/en.json';
import ja from '../locales/ja.json';
import type { Language } from './types';

export type Locale = typeof ja;

const locales: Record<Language, Locale> = { ja, en };

/** Return the UI messages for a language. Game catalog data remains in its existing type. */
export const text = (language: Language): Locale => locales[language];

/** Replace named placeholders in a localized message. */
export const interpolate = (message: string, values: Record<string, string | number>): string =>
  message.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? `{${key}}`));
