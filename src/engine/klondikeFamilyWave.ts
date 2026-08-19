import { ApplyResult, Card, GameDefinition, GameState, Move, cardColor } from './types';
import { cloneState, makeState, pile, top, transfer } from './core';
import { shuffledDeck } from './random';

const FOUNDATION_IDS = ['f0', 'f1', 'f2', 'f3'];

type DealMode = 'waste' | 'tableau';

interface FamilyRules {
  id: string;
  name: string;
  decks: 1 | 2;
  tableauSizes: readonly number[];
  drawCount: number;
  dealMode: DealMode;
  allFaceUp?: boolean;
  sameSuit?: boolean;
  reserveCount?: number;
  wide?: boolean;
}

/**
 * The first expansion wave uses one small, deliberately boring rules kernel.
 * Historical differences between these games are represented by the deal,
 * deck, reserve, and tableau-build settings below; move validation remains
 * here so the UI never needs to know the game name.
 */
const FAMILY_RULES: readonly FamilyRules[] = [
  {
    id: 'agnes-sorel',
    name: 'Agnes Sorel',
    decks: 1,
    tableauSizes: [1, 2, 3, 4, 5, 6, 7],
    drawCount: 3,
    dealMode: 'waste',
  },
  {
    id: 'australian-patience',
    name: 'Australian Patience',
    decks: 1,
    tableauSizes: [1, 2, 3, 4, 5, 6, 7],
    drawCount: 3,
    dealMode: 'waste',
    sameSuit: true,
  },
  {
    id: 'whitehead',
    name: 'Whitehead',
    decks: 1,
    tableauSizes: [4, 4, 4, 4, 4, 4, 4, 4],
    drawCount: 1,
    dealMode: 'waste',
    allFaceUp: true,
    sameSuit: true,
  },
  {
    id: 'thumb-and-pouch',
    name: 'Thumb and Pouch',
    decks: 1,
    tableauSizes: [1, 2, 3, 4, 5, 6, 7],
    drawCount: 3,
    dealMode: 'waste',
    reserveCount: 13,
  },
  {
    id: 'blind-alleys',
    name: 'Blind Alleys',
    decks: 1,
    tableauSizes: [1, 2, 3, 4, 5, 6, 7],
    drawCount: 3,
    dealMode: 'waste',
    reserveCount: 7,
  },
  {
    id: 'batsford',
    name: 'Batsford',
    decks: 2,
    tableauSizes: [1, 2, 3, 4, 5, 6, 7, 8],
    drawCount: 3,
    dealMode: 'waste',
    wide: true,
  },
  {
    id: 'harp',
    name: 'Harp',
    decks: 2,
    tableauSizes: [4, 4, 4, 4, 4, 4, 4, 4],
    drawCount: 1,
    dealMode: 'waste',
    wide: true,
  },
  {
    id: 'lady-jane',
    name: 'Lady Jane',
    decks: 2,
    tableauSizes: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    drawCount: 3,
    dealMode: 'waste',
    wide: true,
  },
  {
    id: 'bureau',
    name: 'Bureau',
    decks: 2,
    tableauSizes: [3, 3, 3, 3, 3, 3, 3, 3],
    drawCount: 3,
    dealMode: 'waste',
    reserveCount: 13,
    wide: true,
  },
  {
    id: 'athena',
    name: 'Athena',
    decks: 2,
    tableauSizes: [4, 4, 4, 4, 4, 4, 4],
    drawCount: 3,
    dealMode: 'waste',
    reserveCount: 7,
    wide: true,
  },
  {
    id: 'pas-seul',
    name: 'Pas Seul',
    decks: 1,
    tableauSizes: [1, 2, 3, 4, 5, 6],
    drawCount: 1,
    dealMode: 'waste',
  },
  {
    id: 'chameleon',
    name: 'Chameleon',
    decks: 2,
    tableauSizes: [1, 2, 3, 4, 5, 6, 7, 8],
    drawCount: 3,
    dealMode: 'waste',
    reserveCount: 12,
    wide: true,
  },
  {
    id: 'superior-canfield',
    name: 'Superior Canfield',
    decks: 1,
    tableauSizes: [1, 1, 1, 1],
    drawCount: 3,
    dealMode: 'waste',
    reserveCount: 13,
  },
];

function cardIds(move: Move): string[] {
  return 'cardIds' in move ? move.cardIds : [];
}

function sameMove(a: Move, b: Move): boolean {
  if (a.type !== b.type || a.from !== b.from || a.to !== b.to) return false;
  if (a.type === 'draw' && b.type === 'draw') return (a.count ?? 1) === (b.count ?? 1);
  if (a.type === 'recycle' && b.type === 'recycle') return true;
  return (
    'cardIds' in a && 'cardIds' in b && JSON.stringify(a.cardIds) === JSON.stringify(b.cardIds)
  );
}

function checked(
  state: GameState,
  move: Move,
  legal: Move[],
  operation: () => ApplyResult,
): ApplyResult {
  return legal.some((candidate) => sameMove(candidate, move))
    ? operation()
    : { state, error: 'Illegal move' };
}

function isDescendingRun(cards: Card[], start: number, sameSuit: boolean): boolean {
  for (let index = start; index < cards.length; index += 1) {
    if (!cards[index].faceUp) return false;
    if (index > start) {
      const previous = cards[index - 1];
      const current = cards[index];
      if (previous.rank !== current.rank + 1) return false;
      if (sameSuit ? previous.suit !== current.suit : cardColor(previous) === cardColor(current))
        return false;
    }
  }
  return true;
}

function foundationCanAccept(state: GameState, foundationId: string, card: Card): boolean {
  const foundation = state.piles[foundationId];
  if (!foundation.cards.length) {
    const sameSuitFoundations = Object.keys(state.piles).filter(
      (id) => state.piles[id].kind === 'foundation' && top(state.piles[id])?.suit === card.suit,
    ).length;
    const copies =
      Object.values(state.piles).filter((candidate) => candidate.kind === 'foundation').length /
      FOUNDATION_IDS.length;
    return card.rank === 1 && sameSuitFoundations < copies;
  }
  const first = foundation.cards[0];
  return first.suit === card.suit && card.rank === foundation.cards.length + 1;
}

function buildDefinition(rules: FamilyRules): GameDefinition {
  const tableauIds = rules.tableauSizes.map((_, index) => `t${index}`);
  const reserve = rules.reserveCount ? 'reserve' : undefined;
  const pilesFor = (): ReturnType<typeof pile>[] => [
    pile('stock', 'stock'),
    pile('waste', 'waste'),
    ...FOUNDATION_IDS.flatMap((id) =>
      Array.from({ length: rules.decks }, (_, copy) => pile(`${id}-${copy}`, 'foundation')),
    ),
    ...tableauIds.map((id) => pile(id, 'tableau')),
    ...(reserve ? [pile(reserve, 'reserve')] : []),
  ];

  const legalMoves = (state: GameState): Move[] => {
    const moves: Move[] = [];
    const tableaus = tableauIds.map((id) => state.piles[id]);
    const canPlace = (card: Card, destination: Card | undefined): boolean =>
      destination
        ? destination.faceUp &&
          destination.rank === card.rank + 1 &&
          (rules.sameSuit
            ? destination.suit === card.suit
            : cardColor(destination) !== cardColor(card))
        : card.rank === 13;
    const foundationIds = Object.keys(state.piles).filter(
      (id) => state.piles[id].kind === 'foundation',
    );
    const sources = [...tableaus, state.piles.waste, ...(reserve ? [state.piles[reserve]] : [])];
    for (const source of sources) {
      if (!source.cards.length) continue;
      const starts =
        source.kind === 'waste' || source.kind === 'reserve'
          ? [source.cards.length - 1]
          : Array.from(
              { length: source.cards.length },
              (_, index) => source.cards.length - 1 - index,
            );
      for (const start of starts) {
        if (
          source.kind === 'tableau' &&
          !isDescendingRun(source.cards, start, Boolean(rules.sameSuit))
        )
          continue;
        const card = source.cards[start];
        const ids = source.cards.slice(start).map((item) => item.id);
        for (const destination of tableaus) {
          if (destination.id !== source.id && canPlace(card, top(destination))) {
            moves.push({ type: 'transfer', from: source.id, to: destination.id, cardIds: ids });
          }
        }
        if (ids.length === 1) {
          for (const foundationId of foundationIds) {
            if (foundationCanAccept(state, foundationId, card))
              moves.push({ type: 'transfer', from: source.id, to: foundationId, cardIds: ids });
          }
        }
      }
    }
    if (state.piles.stock.cards.length) {
      const count = Math.min(rules.drawCount, state.piles.stock.cards.length);
      moves.push({
        type: 'draw',
        from: 'stock',
        to: rules.dealMode === 'tableau' ? tableauIds[0] : 'waste',
        count,
      });
    } else if (state.piles.waste.cards.length) {
      moves.push({ type: 'recycle', from: 'waste', to: 'stock' });
    }
    return moves;
  };

  const definition: GameDefinition = {
    id: rules.id,
    name: rules.name,
    decks: rules.decks,
    create(seed = 'solitaire-default'): GameState {
      const deck = shuffledDeck(seed, rules.decks);
      const piles = pilesFor();
      let cursor = 0;
      rules.tableauSizes.forEach((size, column) => {
        const tableau = piles.find((item) => item.id === `t${column}`)!;
        for (let row = 0; row < size; row += 1) {
          const card = deck[cursor++];
          card.faceUp = Boolean(rules.allFaceUp) || row === size - 1;
          tableau.cards.push(card);
        }
      });
      if (reserve) {
        const reservePile = piles.find((item) => item.id === reserve)!;
        for (let index = 0; index < (rules.reserveCount ?? 0); index += 1) {
          const card = deck[cursor++];
          card.faceUp = index === (rules.reserveCount ?? 0) - 1;
          reservePile.cards.push(card);
        }
      }
      deck
        .slice(cursor)
        .forEach((card) => piles.find((item) => item.id === 'stock')!.cards.push(card));
      return makeState(rules.id, seed, piles, {
        options: { drawCount: rules.drawCount },
        layout: {
          tableauCount: tableauIds.length,
          wide: Boolean(rules.wide),
          reserve: Boolean(reserve),
        },
      });
    },
    legalMoves,
    applyMove(state, move) {
      return checked(state, move, legalMoves(state), () => {
        if (move.type === 'draw') {
          const next = cloneState(state);
          const count = Math.min(move.count ?? rules.drawCount, next.piles.stock.cards.length);
          if (rules.dealMode === 'tableau') {
            for (let index = 0; index < count; index += 1) {
              const card = next.piles.stock.cards.pop();
              if (!card) break;
              card.faceUp = true;
              next.piles[tableauIds[index % tableauIds.length]].cards.push(card);
            }
          } else {
            const cards = next.piles.stock.cards.splice(
              next.piles.stock.cards.length - count,
              count,
            );
            cards.forEach((card) => {
              card.faceUp = true;
              next.piles.waste.cards.push(card);
            });
          }
          next.moveCount += 1;
          return { state: next };
        }
        if (move.type === 'recycle') {
          const next = cloneState(state);
          next.piles.stock.cards.push(
            ...next.piles.waste.cards
              .splice(0)
              .reverse()
              .map((card) => ({ ...card, faceUp: false })),
          );
          next.moveCount += 1;
          return { state: next };
        }
        const result = transfer(state, move.from, move.to, cardIds(move));
        if (result.error) return result;
        const next = result.state;
        if (next.piles[move.from]?.kind === 'tableau') {
          const card = top(next.piles[move.from]);
          if (card) card.faceUp = true;
        }
        if (definition.isWon(next)) next.status = 'won';
        return { state: next };
      });
    },
    isWon: (state) =>
      Object.keys(state.piles)
        .filter((id) => state.piles[id].kind === 'foundation')
        .every((id) => state.piles[id].cards.length === 13),
    hint: (state) => legalMoves(state)[0],
  };
  return definition;
}

export const agnesSorel = buildDefinition(FAMILY_RULES[0]);
export const australianPatience = buildDefinition(FAMILY_RULES[1]);
export const whitehead = buildDefinition(FAMILY_RULES[2]);
export const thumbAndPouch = buildDefinition(FAMILY_RULES[3]);
export const blindAlleys = buildDefinition(FAMILY_RULES[4]);
export const batsford = buildDefinition(FAMILY_RULES[5]);
export const harp = buildDefinition(FAMILY_RULES[6]);
export const ladyJane = buildDefinition(FAMILY_RULES[7]);
export const bureau = buildDefinition(FAMILY_RULES[8]);
export const athena = buildDefinition(FAMILY_RULES[9]);
export const pasSeul = buildDefinition(FAMILY_RULES[10]);
export const chameleon = buildDefinition(FAMILY_RULES[11]);
export const superiorCanfield = buildDefinition(FAMILY_RULES[12]);

export const KLONDIKE_FAMILY_WAVE_GAMES = {
  agnesSorel,
  australianPatience,
  whitehead,
  thumbAndPouch,
  blindAlleys,
  batsford,
  harp,
  ladyJane,
  bureau,
  athena,
  pasSeul,
  chameleon,
  superiorCanfield,
} as const;

export type KlondikeFamilyWaveId = keyof typeof KLONDIKE_FAMILY_WAVE_GAMES;
