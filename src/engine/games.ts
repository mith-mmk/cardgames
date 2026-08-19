import { ApplyResult, Card, GameDefinition, GameState, Move, cardColor } from './types';
import { cloneState, draw, faceUpRun, makeState, pile, top, transfer } from './core';
import { shuffledDeck } from './random';
import { bakersGame, eightOff, seahavenTowers } from './openCellGames';
import {
  congress,
  diplomat,
  fortyAndEight,
  fortyThieves,
  josephine,
  spiderette,
  yukon,
} from './longRunGames';
import { agnesBernauer, canfield, kingAlbert } from './reserveKlondikeGames';
import { auntMary, easthaven, westcliff } from './klondikeVariants';
import { blackWidow, scorpion, wasp } from './spiderVariantGames';
import { clock, golf } from './golfClockGames';
import { KLONDIKE_FAMILY_WAVE_GAMES } from './klondikeFamilyWave';
import { OPEN_CELL_WAVE_GAMES } from './openCellWaveGames';
import { SPIDER_FAMILY_WAVE_GAMES } from './spiderFamilyWave';
import { SPECIAL_GAMES } from './specialGames';

export { bakersGame, eightOff, seahavenTowers } from './openCellGames';
export {
  congress,
  diplomat,
  fortyAndEight,
  fortyThieves,
  josephine,
  spiderette,
  yukon,
} from './longRunGames';
export { agnesBernauer, canfield, kingAlbert } from './reserveKlondikeGames';
export { auntMary, easthaven, westcliff } from './klondikeVariants';
export { blackWidow, scorpion, wasp } from './spiderVariantGames';
export { clock, golf } from './golfClockGames';
export { KLONDIKE_FAMILY_WAVE_GAMES } from './klondikeFamilyWave';
export { OPEN_CELL_WAVE_GAMES } from './openCellWaveGames';
export { SPIDER_FAMILY_WAVE_GAMES } from './spiderFamilyWave';
export { SPECIAL_GAMES } from './specialGames';

const DEFAULT_SEED = 'solitaire-default';
const sameMove = (a: Move, b: Move): boolean => {
  if (a.type !== b.type || a.from !== b.from || a.to !== b.to) return false;
  if (a.type === 'draw' && b.type === 'draw') return (a.count ?? 1) === (b.count ?? 1);
  if (a.type === 'recycle' && b.type === 'recycle') return true;
  if ('cardIds' in a && 'cardIds' in b)
    return JSON.stringify(a.cardIds) === JSON.stringify(b.cardIds);
  return false;
};
const checked = (
  state: GameState,
  move: Move,
  legal: Move[],
  fn: () => ApplyResult,
): ApplyResult => (legal.some((x) => sameMove(x, move)) ? fn() : { state, error: 'Illegal move' });
const moveCardIds = (move: Move): string[] => ('cardIds' in move ? move.cardIds : []);
function mark(state: GameState, won: boolean): GameState {
  const next = cloneState(state);
  if (won) next.status = 'won';
  return next;
}
function reveal(p: { cards: Card[] }): void {
  const card = p.cards[p.cards.length - 1];
  if (card && !card.faceUp) card.faceUp = true;
}
function standardFoundation(state: GameState, from: string, to: string, id: string): boolean {
  const c = top(state.piles[from]),
    f = state.piles[to];
  return Boolean(
    c &&
    c.id === id &&
    f &&
    c.rank === f.cards.length + 1 &&
    (f.cards.length === 0 || f.cards[0].suit === c.suit),
  );
}

export interface KlondikeOptions {
  drawCount?: 1 | 3;
}
export const klondike: GameDefinition<KlondikeOptions> = {
  id: 'klondike',
  name: 'Klondike',
  decks: 1,
  create(seed = DEFAULT_SEED, options: KlondikeOptions = {}): GameState {
    const deck = shuffledDeck(seed),
      piles = [
        pile('stock', 'stock'),
        pile('waste', 'waste'),
        ...[0, 1, 2, 3].map((i) => pile(`f${i}`, 'foundation')),
        ...[0, 1, 2, 3, 4, 5, 6].map((i) => pile(`t${i}`, 'tableau')),
      ];
    let n = 0;
    for (let col = 0; col < 7; col += 1)
      for (let row = 0; row <= col; row += 1) {
        const c = deck[n++];
        c.faceUp = row === col;
        piles.find((p) => p.id === `t${col}`)!.cards.push(c);
      }
    deck.slice(n).forEach((c) => {
      c.faceUp = false;
      piles[0].cards.push(c);
    });
    return makeState('klondike', seed, piles, {
      options: { drawCount: options.drawCount ?? 3 },
    });
  },
  legalMoves(state) {
    const moves: Move[] = [],
      tabs = [0, 1, 2, 3, 4, 5, 6].map((i) => state.piles[`t${i}`]);
    const canTableau = (c: Card, d: Card | undefined) =>
      d ? d.faceUp && d.rank === c.rank + 1 && cardColor(d) !== cardColor(c) : c.rank === 13;
    for (const src of [...tabs, state.piles.waste]) {
      for (let i = src.cards.length - 1; i >= 0; i -= 1) {
        if (!faceUpRun(src.cards, i)) continue;
        const c = src.cards[i];
        for (const dest of tabs)
          if (dest.id !== src.id && canTableau(c, top(dest)))
            moves.push({
              type: 'transfer',
              from: src.id,
              to: dest.id,
              cardIds: src.cards.slice(i).map((x) => x.id),
            });
        if (i === src.cards.length - 1)
          for (const f of [0, 1, 2, 3].map((x) => state.piles[`f${x}`]))
            if (standardFoundation(state, src.id, f.id, c.id))
              moves.push({
                type: 'transfer',
                from: src.id,
                to: f.id,
                cardIds: [c.id],
              });
      }
    }
    const count =
      Number(state.meta.options && (state.meta.options as KlondikeOptions).drawCount) || 1;
    if (state.piles.stock.cards.length)
      moves.push({
        type: 'draw',
        from: 'stock',
        to: 'waste',
        count: Math.min(count, state.piles.stock.cards.length),
      });
    else if (state.piles.waste.cards.length)
      moves.push({ type: 'recycle', from: 'waste', to: 'stock' });
    return moves;
  },
  applyMove(state, move) {
    return checked(state, move, this.legalMoves(state), () => {
      if (move.type === 'draw') return draw(state, 'stock', 'waste', move.count ?? 1);
      if (move.type === 'recycle') {
        const next = cloneState(state);
        const cards = next.piles.waste.cards.splice(0);
        cards.reverse().forEach((c) => {
          c.faceUp = false;
        });
        next.piles.stock.cards.push(...cards);
        next.moveCount += 1;
        return { state: next };
      }
      const result = transfer(state, move.from, move.to, moveCardIds(move));
      if (!result.error && move.from.startsWith('t')) reveal(result.state.piles[move.from]);
      return { state: mark(result.state, this.isWon(result.state)) };
    });
  },
  hint(state) {
    return this.legalMoves(state)[0];
  },
  isWon: (state) => [0, 1, 2, 3].every((i) => state.piles[`f${i}`].cards.length === 13),
};

function validFreeCellRun(cards: Card[], start: number): boolean {
  return faceUpRun(cards, start, true);
}
export const freecell: GameDefinition = {
  id: 'freecell',
  name: 'FreeCell',
  decks: 1,
  create(seed = DEFAULT_SEED): GameState {
    const deck = shuffledDeck(seed);
    const piles = [
      ...[0, 1, 2, 3].map((i) => pile(`f${i}`, 'foundation')),
      ...[0, 1, 2, 3].map((i) => pile(`c${i}`, 'cell')),
      ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => pile(`t${i}`, 'tableau')),
    ];
    deck.forEach((c, i) => {
      c.faceUp = true;
      piles.find((p) => p.id === `t${i % 8}`)!.cards.push(c);
    });
    return makeState('freecell', seed, piles);
  },
  legalMoves(state) {
    const moves: Move[] = [],
      tabs = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => state.piles[`t${i}`]),
      cells = [0, 1, 2, 3].map((i) => state.piles[`c${i}`]);
    const emptyCells = cells.filter((p) => !p.cards.length).length;
    for (const src of [...tabs, ...cells]) {
      const start = src.kind === 'cell' ? src.cards.length - 1 : 0;
      for (let i = src.cards.length - 1; i >= start && i >= 0; i -= 1) {
        if (src.kind === 'tableau' && !validFreeCellRun(src.cards, i)) continue;
        const c = src.cards[i];
        if (i !== src.cards.length - 1 && src.kind === 'cell') continue;
        if (i === src.cards.length - 1)
          for (const cell of cells)
            if (cell.id !== src.id && cell.cards.length === 0)
              moves.push({
                type: 'transfer',
                from: src.id,
                to: cell.id,
                cardIds: [c.id],
              });
        for (const dest of tabs) {
          if (dest.id === src.id) continue;
          const d = top(dest);
          const fits = d ? d.rank === c.rank + 1 && cardColor(d) !== cardColor(c) : true;
          const emptyTabs =
            tabs.filter((p) => !p.cards.length).length - (dest.cards.length ? 0 : 1);
          const capacity = (emptyCells + 1) * 2 ** Math.max(0, emptyTabs);
          if (fits && src.cards.length - i <= capacity)
            moves.push({
              type: 'transfer',
              from: src.id,
              to: dest.id,
              cardIds: src.cards.slice(i).map((x) => x.id),
            });
        }
        if (i === src.cards.length - 1)
          for (const f of [0, 1, 2, 3].map((x) => state.piles[`f${x}`]))
            if (standardFoundation(state, src.id, f.id, c.id))
              moves.push({
                type: 'transfer',
                from: src.id,
                to: f.id,
                cardIds: [c.id],
              });
      }
    }
    return moves;
  },
  applyMove(state, move) {
    return checked(state, move, this.legalMoves(state), () => {
      const result = transfer(state, move.from, move.to, moveCardIds(move));
      return {
        state: mark(result.state, this.isWon(result.state)),
        error: result.error,
      };
    });
  },
  hint(state) {
    return this.legalMoves(state)[0];
  },
  isWon: (state) => [0, 1, 2, 3].every((i) => state.piles[`f${i}`].cards.length === 13),
};

export interface SpiderOptions {
  suits?: 1 | 2 | 4;
}
export const spider: GameDefinition<SpiderOptions> = {
  id: 'spider',
  name: 'Spider',
  decks: 2,
  create(seed = DEFAULT_SEED, options: SpiderOptions = {}): GameState {
    const deck = shuffledDeck(seed, 2),
      piles = [
        pile('stock', 'stock'),
        pile('removed', 'removed'),
        ...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => pile(`t${i}`, 'tableau')),
      ];
    let n = 0;
    for (let col = 0; col < 10; col += 1)
      for (let row = 0; row < (col < 4 ? 6 : 5); row += 1) {
        const c = deck[n++];
        c.faceUp = row === (col < 4 ? 5 : 4);
        piles.find((p) => p.id === `t${col}`)!.cards.push(c);
      }
    deck.slice(n).forEach((c) => piles[0].cards.push(c));
    return makeState('spider', seed, piles, {
      options: { suits: options.suits ?? 4 },
    });
  },
  legalMoves(state) {
    const moves: Move[] = [],
      tabs = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => state.piles[`t${i}`]);
    for (const src of tabs)
      for (let i = 0; i < src.cards.length; i += 1) {
        if (!faceUpRun(src.cards, i, true)) continue;
        const c = src.cards[i];
        for (const dest of tabs)
          if (dest.id !== src.id && (!top(dest) || top(dest)!.rank === c.rank + 1))
            moves.push({
              type: 'transfer',
              from: src.id,
              to: dest.id,
              cardIds: src.cards.slice(i).map((x) => x.id),
            });
      }
    if (state.piles.stock.cards.length && tabs.every((p) => p.cards.length > 0))
      moves.push({ type: 'draw', from: 'stock', to: 'tableau', count: 10 });
    return moves;
  },
  applyMove(state, move) {
    return checked(state, move, this.legalMoves(state), () => {
      if (move.type === 'draw') {
        const next = cloneState(state);
        for (const t of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]) {
          const c = next.piles.stock.cards.pop();
          if (c) {
            c.faceUp = true;
            next.piles[`t${t}`].cards.push(c);
          }
        }
        next.moveCount += 1;
        return { state: next };
      }
      const result = transfer(state, move.from, move.to, moveCardIds(move));
      if (result.error) return result;
      reveal(result.state.piles[move.from]);
      const dest = result.state.piles[move.to];
      if (dest.cards.length >= 13) {
        const run = dest.cards.slice(-13);
        if (run.every((c, i) => c.faceUp && c.suit === run[0].suit && c.rank === 13 - i)) {
          dest.cards.splice(-13, 13);
          result.state.piles.removed.cards.push(...run);
          reveal(dest);
        }
      }
      return { state: mark(result.state, this.isWon(result.state)) };
    });
  },
  hint(state) {
    return this.legalMoves(state)[0];
  },
  isWon: (state) => state.piles.removed.cards.length === 104,
};

function calculationExpected(foundation: Card[], step: number, start: number): number {
  return ((start - 1 + foundation.length * step) % 13) + 1;
}
export const calculation: GameDefinition = {
  id: 'calculation',
  name: 'Calculation',
  decks: 1,
  create(seed = DEFAULT_SEED): GameState {
    const deck = shuffledDeck(seed),
      piles = [
        pile('stock', 'stock'),
        pile('waste', 'waste'),
        ...[0, 1, 2, 3].map((i) => pile(`f${i}`, 'foundation')),
        ...[0, 1, 2, 3].map((i) => pile(`t${i}`, 'tableau')),
      ],
      starterRanks = [1, 2, 3, 4];
    starterRanks.forEach((rank, foundationIndex) => {
      const i = deck.findIndex((c) => c.rank === rank),
        starter = deck.splice(i, 1)[0];
      starter.faceUp = true;
      piles.find((p) => p.id === `f${foundationIndex}`)!.cards.push(starter);
    });
    deck.slice(0, 4).forEach((c, i) => {
      c.faceUp = true;
      piles.find((p) => p.id === `t${i}`)!.cards.push(c);
    });
    deck.slice(4).forEach((c) => piles[0].cards.push(c));
    return makeState('calculation', seed, piles, {
      steps: [1, 2, 3, 4],
      starts: starterRanks,
    });
  },
  legalMoves(state) {
    const moves: Move[] = [],
      sources = [state.piles.waste, ...[0, 1, 2, 3].map((i) => state.piles[`t${i}`])],
      steps = (state.meta.steps as number[]) ?? [1, 2, 3, 4],
      starts = (state.meta.starts as number[]) ?? [1, 2, 3, 4];
    for (const src of sources) {
      const c = top(src);
      if (!c) continue;
      for (const f of [0, 1, 2, 3]) {
        const foundation = state.piles[`f${f}`];
        if (c.rank === calculationExpected(foundation.cards, steps[f], starts[f]))
          moves.push({
            type: 'transfer',
            from: src.id,
            to: foundation.id,
            cardIds: [c.id],
          });
      }
      for (const t of [0, 1, 2, 3])
        if (src.id !== `t${t}`)
          moves.push({
            type: 'transfer',
            from: src.id,
            to: `t${t}`,
            cardIds: [c.id],
          });
    }
    if (state.piles.stock.cards.length)
      moves.push({ type: 'draw', from: 'stock', to: 'waste', count: 1 });
    return moves;
  },
  applyMove(state, move) {
    return checked(state, move, this.legalMoves(state), () => {
      const result =
        move.type === 'draw'
          ? draw(state, 'stock', 'waste')
          : transfer(state, move.from, move.to, moveCardIds(move));
      return {
        state: mark(result.state, this.isWon(result.state)),
        error: result.error,
      };
    });
  },
  hint(state) {
    return this.legalMoves(state)[0];
  },
  isWon: (state) => [0, 1, 2, 3].every((i) => state.piles[`f${i}`].cards.length === 13),
};

function pyramidExposed(state: GameState, index: number): boolean {
  const p = state.piles[`p${index}`];
  if (!p?.cards.length) return false;
  const row = Math.floor((Math.sqrt(8 * index + 1) - 1) / 2),
    base = (row * (row + 1)) / 2,
    pos = index - base,
    nextBase = ((row + 1) * (row + 2)) / 2;
  return (
    row === 6 ||
    (!state.piles[`p${nextBase + pos}`].cards.length &&
      !state.piles[`p${nextBase + pos + 1}`].cards.length)
  );
}
function pyramidPileForCard(state: GameState, id: string): string | undefined {
  for (let i = 0; i < 28; i += 1)
    if (state.piles[`p${i}`].cards.some((c) => c.id === id)) return `p${i}`;
  return undefined;
}
export const pyramid: GameDefinition = {
  id: 'pyramid',
  name: 'Pyramid',
  decks: 1,
  create(seed = DEFAULT_SEED): GameState {
    const deck = shuffledDeck(seed),
      piles = [
        pile('stock', 'stock'),
        pile('waste', 'waste'),
        pile('removed', 'removed'),
        ...Array.from({ length: 28 }, (_, i) => pile(`p${i}`, 'tableau')),
      ];
    deck.slice(0, 28).forEach((c, i) => {
      c.faceUp = true;
      piles.find((p) => p.id === `p${i}`)!.cards.push(c);
    });
    deck.slice(28).forEach((c) => piles[0].cards.push(c));
    return makeState('pyramid', seed, piles, { pyramidSize: 28 });
  },
  legalMoves(state) {
    const moves: Move[] = [],
      exposed = Array.from({ length: 28 }, (_, i) => i)
        .filter((i) => pyramidExposed(state, i))
        .map((i) => state.piles[`p${i}`].cards[0]);
    for (let i = 0; i < exposed.length; i += 1) {
      const aPile = pyramidPileForCard(state, exposed[i].id)!;
      if (exposed[i].rank === 13)
        moves.push({
          type: 'remove',
          from: aPile,
          to: 'removed',
          cardIds: [exposed[i].id],
        });
      for (let j = i + 1; j < exposed.length; j += 1)
        if (exposed[i].rank + exposed[j].rank === 13) {
          const b = exposed[j],
            bPile = pyramidPileForCard(state, b.id)!;
          moves.push({
            type: 'remove',
            from: `${aPile},${bPile}`,
            to: 'removed',
            cardIds: [exposed[i].id, b.id],
          });
        }
    }
    const w = top(state.piles.waste);
    if (w) {
      if (w.rank === 13)
        moves.push({
          type: 'remove',
          from: 'waste',
          to: 'removed',
          cardIds: [w.id],
        });
      for (const c of exposed)
        if (w.rank + c.rank === 13)
          moves.push({
            type: 'remove',
            from: `waste,${pyramidPileForCard(state, c.id)!}`,
            to: 'removed',
            cardIds: [w.id, c.id],
          });
    }
    if (state.piles.stock.cards.length)
      moves.push({ type: 'draw', from: 'stock', to: 'waste', count: 1 });
    return moves;
  },
  applyMove(state, move) {
    return checked(state, move, this.legalMoves(state), () => {
      if (move.type === 'draw') return draw(state, 'stock', 'waste');
      const next = cloneState(state);
      const froms = move.from.split(',');
      for (const id of moveCardIds(move))
        for (const from of froms) {
          const i = next.piles[from]?.cards.findIndex((c) => c.id === id) ?? -1;
          if (i >= 0) next.piles.removed.cards.push(...next.piles[from].cards.splice(i, 1));
        }
      next.moveCount += 1;
      return { state: mark(next, this.isWon(next)) };
    });
  },
  hint(state) {
    return this.legalMoves(state)[0];
  },
  isWon: (state) =>
    Array.from({ length: 28 }, (_, i) => state.piles[`p${i}`].cards.length === 0).every(Boolean),
};

export const GAME_DEFINITIONS = {
  klondike,
  freecell,
  spider,
  calculation,
  pyramid,
  'bakers-game': bakersGame,
  'eight-off': eightOff,
  'seahaven-towers': seahavenTowers,
  spiderette,
  yukon,
  'forty-thieves': fortyThieves,
  'forty-and-eight': fortyAndEight,
  josephine,
  congress,
  diplomat,
  canfield,
  'agnes-bernauer': agnesBernauer,
  'king-albert': kingAlbert,
  scorpion,
  wasp,
  'black-widow': blackWidow,
  easthaven,
  westcliff,
  'aunt-mary': auntMary,
  golf,
  clock,
  'agnes-sorel': KLONDIKE_FAMILY_WAVE_GAMES.agnesSorel,
  'australian-patience': KLONDIKE_FAMILY_WAVE_GAMES.australianPatience,
  whitehead: KLONDIKE_FAMILY_WAVE_GAMES.whitehead,
  'thumb-and-pouch': KLONDIKE_FAMILY_WAVE_GAMES.thumbAndPouch,
  'blind-alleys': KLONDIKE_FAMILY_WAVE_GAMES.blindAlleys,
  batsford: KLONDIKE_FAMILY_WAVE_GAMES.batsford,
  harp: KLONDIKE_FAMILY_WAVE_GAMES.harp,
  'lady-jane': KLONDIKE_FAMILY_WAVE_GAMES.ladyJane,
  bureau: KLONDIKE_FAMILY_WAVE_GAMES.bureau,
  athena: KLONDIKE_FAMILY_WAVE_GAMES.athena,
  'pas-seul': KLONDIKE_FAMILY_WAVE_GAMES.pasSeul,
  chameleon: KLONDIKE_FAMILY_WAVE_GAMES.chameleon,
  'superior-canfield': KLONDIKE_FAMILY_WAVE_GAMES.superiorCanfield,
  penguin: OPEN_CELL_WAVE_GAMES.penguin,
  'beleaguered-castle': OPEN_CELL_WAVE_GAMES.beleagueredCastle,
  citadel: OPEN_CELL_WAVE_GAMES.citadel,
  fortress: OPEN_CELL_WAVE_GAMES.fortress,
  chessboard: OPEN_CELL_WAVE_GAMES.chessboard,
  'streets-and-alleys': OPEN_CELL_WAVE_GAMES.streetsAndAlleys,
  'bakers-dozen': OPEN_CELL_WAVE_GAMES.bakersDozen,
  'castles-in-spain': OPEN_CELL_WAVE_GAMES.castlesInSpain,
  bisley: OPEN_CELL_WAVE_GAMES.bisley,
  'flower-garden': OPEN_CELL_WAVE_GAMES.flowerGarden,
  'la-belle-lucie': OPEN_CELL_WAVE_GAMES.laBelleLucie,
  shamrocks: OPEN_CELL_WAVE_GAMES.shamrocks,
  trefoil: OPEN_CELL_WAVE_GAMES.trefoil,
  'bear-river': OPEN_CELL_WAVE_GAMES.bearRiver,
  cruel: OPEN_CELL_WAVE_GAMES.cruel,
  canister: OPEN_CELL_WAVE_GAMES.canister,
  beetle: SPIDER_FAMILY_WAVE_GAMES.beetle,
  'curds-and-whey': SPIDER_FAMILY_WAVE_GAMES.curdsAndWhey,
  'mrs-mop': SPIDER_FAMILY_WAVE_GAMES.mrsMop,
  'russian-solitaire': SPIDER_FAMILY_WAVE_GAMES.russianSolitaire,
  alaska: SPIDER_FAMILY_WAVE_GAMES.alaska,
  brisbane: SPIDER_FAMILY_WAVE_GAMES.brisbane,
  applegate: SPIDER_FAMILY_WAVE_GAMES.applegate,
  'miss-milligan': SPIDER_FAMILY_WAVE_GAMES.missMilligan,
  interchange: SPIDER_FAMILY_WAVE_GAMES.interchange,
  'busy-aces': SPECIAL_GAMES.busyAces,
  deuces: SPECIAL_GAMES.deuces,
  'aces-and-kings': SPECIAL_GAMES.acesAndKings,
  tournament: SPECIAL_GAMES.tournament,
  colorado: SPECIAL_GAMES.colorado,
  crescent: SPECIAL_GAMES.crescent,
  'crazy-quilt': SPECIAL_GAMES.crazyQuilt,
  windmill: SPECIAL_GAMES.windmill,
  sultan: SPECIAL_GAMES.sultan,
  'algerian-patience': SPECIAL_GAMES.algerianPatience,
  indian: SPECIAL_GAMES.indian,
  gypsy: SPECIAL_GAMES.gypsy,
  carthage: SPECIAL_GAMES.carthage,
  carpet: SPECIAL_GAMES.carpet,
  bristol: SPECIAL_GAMES.bristol,
  'sir-tommy': SPECIAL_GAMES.sirTommy,
  'auld-lang-syne': SPECIAL_GAMES.auldLangSyne,
  osmosis: SPECIAL_GAMES.osmosis,
  'four-seasons': SPECIAL_GAMES.fourSeasons,
} as const;
export type GameId = keyof typeof GAME_DEFINITIONS;
export function getGameDefinition(id: GameId): GameDefinition {
  return GAME_DEFINITIONS[id];
}
