export type Language = 'ja' | 'en';
export type MotionMode = 'standard' | 'reduced' | 'none';

export type Card = {
  id: string;
  rank: number;
  suit: 'spades' | 'hearts' | 'diamonds' | 'clubs';
  faceUp: boolean;
  label?: string;
};
export type PileKind =
  'stock' | 'waste' | 'tableau' | 'foundation' | 'cell' | 'reserve' | 'removed';
export type Pile = {
  id: string;
  kind: PileKind;
  cards: Card[];
  label?: string;
  x?: number;
  y?: number;
};
export type GameSnapshot = {
  gameId: string;
  seed: string;
  piles: Pile[];
  selected?: { pileId: string; cardId: string };
  moves: number;
  elapsedSeconds: number;
  won: boolean;
  canUndo: boolean;
  meta: Record<string, unknown>;
};
export type GameDefinition = {
  id: string;
  name: { ja: string; en: string };
  family: { ja: string; en: string };
  description: { ja: string; en: string };
  difficulty: 1 | 2 | 3 | 4 | 5;
  decks: 1 | 2;
  accent: string;
};
export type GameSession = {
  getSnapshot(): GameSnapshot;
  move(sourcePileId: string, cardId: string, destinationPileId: string): boolean;
  autoMove(pileId: string, cardId: string): boolean;
  dispatch(move: unknown): boolean;
  legalMoves(): unknown[];
  select(pileId: string, cardId: string): void;
  undo(): boolean;
  retry(): void;
  hint(): { sourcePileId: string; cardId: string; destinationPileId: string } | undefined;
  autoComplete(): boolean;
  tick(seconds: number): void;
};
