import { RANKS, SUITS, Card } from "./types";
export function seedToNumber(seed: string): number { let h = 2166136261 >>> 0; for (let i = 0; i < seed.length; i += 1) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export function seededRandom(seed: string): () => number { let value = seedToNumber(seed) || 0x6d2b79f5; return () => { value = Math.imul(value ^ (value >>> 15), value | 1); value ^= value + Math.imul(value ^ (value >>> 7), value | 61); return ((value ^ (value >>> 14)) >>> 0) / 4294967296; }; }
export function createDeck(decks = 1): Card[] { const result: Card[] = []; for (let copy = 0; copy < decks; copy += 1) for (const suit of SUITS) for (const rank of RANKS) result.push({ id: `${copy}-${suit}-${rank}`, suit, rank, faceUp: false }); return result; }
export function shuffle<T>(items: readonly T[], seed: string): T[] { const result = [...items], random = seededRandom(seed); for (let i = result.length - 1; i > 0; i -= 1) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; } return result; }
export function shuffledDeck(seed: string, decks = 1): Card[] { return shuffle(createDeck(decks), seed); }
export function randomSeed(): string { return `${Date.now().toString(36)}-${Math.floor(Math.random() * 0xffffffff).toString(36)}`; }
