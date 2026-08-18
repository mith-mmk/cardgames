export type Suit = "clubs" | "diamonds" | "hearts" | "spades";
export const SUITS: readonly Suit[] = ["clubs", "diamonds", "hearts", "spades"];
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;
export const RANKS: readonly Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
export interface Card { readonly id: string; readonly suit: Suit; readonly rank: Rank; faceUp: boolean }
export type PileKind = "stock" | "waste" | "tableau" | "foundation" | "cell" | "reserve" | "removed";
export interface Pile { id: string; kind: PileKind; cards: Card[] }
export type GameStatus = "playing" | "won" | "lost";
export interface GameState { gameId: string; seed: string; piles: Record<string, Pile>; moveCount: number; status: GameStatus; meta: Record<string, unknown> }
export type Move =
  | { type: "transfer"; from: string; to: string; cardIds: string[] }
  | { type: "draw"; from: string; to: string; count?: number }
  | { type: "recycle"; from: string; to: string }
  | { type: "remove"; from: string; to: string; cardIds: string[] };
export interface ApplyResult { state: GameState; error?: string }
export interface GameDefinition<O = unknown> { readonly id: string; readonly name: string; readonly decks: number; create(seed?: string, options?: O): GameState; legalMoves(state: GameState): Move[]; applyMove(state: GameState, move: Move): ApplyResult; isWon(state: GameState): boolean; hint?(state: GameState): Move | undefined }
export const cardColor = (card: Card): "red" | "black" => card.suit === "diamonds" || card.suit === "hearts" ? "red" : "black";
export const cardLabel = (card: Card): string => `${["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"][card.rank]}${card.suit[0].toUpperCase()}`;
