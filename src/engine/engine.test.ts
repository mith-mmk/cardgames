import { describe, expect, it } from "vitest";
import { createDeck, shuffledDeck } from "./random";
import { cloneState, GameSession } from "./core";
import { calculation, freecell, klondike, pyramid, spider } from "./games";

describe("deterministic card engine", () => {
  it("creates a complete unique deck and repeats a seeded shuffle", () => {
    const a = shuffledDeck("example", 2), b = shuffledDeck("example", 2);
    expect(a.map((c) => c.id)).toEqual(b.map((c) => c.id));
    expect(new Set(a.map((c) => c.id)).size).toBe(104);
    expect(createDeck().length).toBe(52);
  });

  it("deals the expected card count for every first-release game", () => {
    for (const [definition, count] of [[klondike, 52], [freecell, 52], [spider, 104], [calculation, 52], [pyramid, 52]] as const) {
      const cards = Object.values(definition.create("cards").piles).flatMap((p) => p.cards);
      expect(cards).toHaveLength(count);
      expect(new Set(cards.map((card) => card.id)).size).toBe(count);
    }
  });

  it("draws three cards from the Klondike stock by default", () => {
    const state = klondike.create("klondike-draw-three");
    const draw = klondike.legalMoves(state).find((move) => move.type === "draw");
    expect(draw).toMatchObject({ type: "draw", from: "stock", to: "waste", count: 3 });
    const result = klondike.applyMove(state, draw!);
    expect(result.error).toBeUndefined();
    expect(result.state.piles.waste.cards).toHaveLength(3);
  });

  it("offers empty FreeCell destinations and accepts foundation moves from cells", () => {
    const initial = freecell.create("freecell-cells");
    const toCell = freecell.legalMoves(initial).find((move) => move.to === "c0" && move.from.startsWith("t"));
    expect(toCell).toBeDefined();
    const moved = freecell.applyMove(initial, toCell!);
    expect(moved.error).toBeUndefined();
    expect(moved.state.piles.c0.cards).toHaveLength(1);

    const forced = cloneState(initial);
    const source = Object.values(forced.piles).find((p) => p.kind === "tableau" && p.cards.some((card) => card.rank === 1))!;
    const ace = source.cards.find((card) => card.rank === 1)!;
    source.cards = source.cards.filter((card) => card.id !== ace.id);
    forced.piles.c0.cards = [{ ...ace, faceUp: true }];
    expect(freecell.legalMoves(forced)).toContainEqual({ type: "transfer", from: "c0", to: "f0", cardIds: [ace.id] });
  });

  it("starts Calculation foundations at A, 2, 3, 4 with all cards preserved", () => {
    const state = calculation.create("calculation-starters");
    expect([0, 1, 2, 3].map((i) => state.piles[`f${i}`].cards[0].rank)).toEqual([1, 2, 3, 4]);
    expect([0, 1, 2, 3].every((i) => state.piles[`f${i}`].cards[0].faceUp)).toBe(true);
    const cards = Object.values(state.piles).flatMap((p) => p.cards);
    expect(cards).toHaveLength(52);
    expect(new Set(cards.map((card) => card.id)).size).toBe(52);
  });

  it("rejects an invalid move and supports undo/retry", () => {
    const session = new GameSession(klondike, "undo-seed");
    const before = JSON.stringify(session.state);
    const invalid = session.move({ type: "transfer", from: "t0", to: "t1", cardIds: ["missing"] });
    expect(invalid.error).toBeTruthy();
    expect(JSON.stringify(session.state)).toBe(before);
    const draw = session.definition.legalMoves(session.state).find((m) => m.type === "draw");
    expect(draw).toBeDefined();
    session.move(draw!);
    expect(session.state.moveCount).toBe(1);
    session.undo();
    expect(session.state.moveCount).toBe(0);
    const first = JSON.stringify(session.state);
    session.move(draw!);
    session.retry();
    expect(JSON.stringify(session.state)).toBe(first);
  });
});
