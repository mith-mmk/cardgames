import { ApplyResult, Card, GameDefinition, GameState, Move, cardColor } from './types';
import { cloneState, makeState, pile, top, transfer } from './core';
import { shuffledDeck } from './random';

const FOUNDATION_IDS = ['f0', 'f1', 'f2', 'f3'];
const TABLEAU_IDS = Array.from({ length: 7 }, (_, index) => `t${index}`);

type VariantRules = {
  id: string;
  name: string;
  initialSizes: number[];
  dealMode: 'tableau' | 'waste';
  wasteDraw?: number;
};

const variants: VariantRules[] = [
  { id: 'easthaven', name: 'Easthaven', initialSizes: [1, 2, 3, 4, 5, 6, 7], dealMode: 'tableau' },
  {
    id: 'westcliff',
    name: 'Westcliff',
    initialSizes: [3, 3, 3, 3, 3, 3, 3],
    dealMode: 'waste',
    wasteDraw: 3,
  },
  { id: 'aunt-mary', name: 'Aunt Mary', initialSizes: [3, 3, 3, 3, 3, 3, 3], dealMode: 'tableau' },
];

function sameMove(a: Move, b: Move): boolean {
  if (a.type !== b.type || a.from !== b.from || a.to !== b.to) return false;
  if (a.type === 'draw' && b.type === 'draw') return (a.count ?? 1) === (b.count ?? 1);
  if (a.type === 'recycle' && b.type === 'recycle') return true;
  return (
    'cardIds' in a && 'cardIds' in b && JSON.stringify(a.cardIds) === JSON.stringify(b.cardIds)
  );
}

function checked(state: GameState, move: Move, legal: Move[], fn: () => ApplyResult): ApplyResult {
  return legal.some((candidate) => sameMove(candidate, move))
    ? fn()
    : { state, error: 'Illegal move' };
}

function runIsLegal(cards: Card[], start: number): boolean {
  for (let index = start; index < cards.length; index += 1) {
    if (!cards[index].faceUp) return false;
    if (
      index > start &&
      (cards[index - 1].rank !== cards[index].rank + 1 ||
        cardColor(cards[index - 1]) === cardColor(cards[index]))
    )
      return false;
  }
  return true;
}

function definitionFor(rules: VariantRules): GameDefinition {
  const legalMoves = (state: GameState): Move[] => {
    const moves: Move[] = [];
    const tableaus = TABLEAU_IDS.map((id) => state.piles[id]);
    const canPlace = (card: Card, destination: Card | undefined): boolean =>
      destination
        ? destination.faceUp &&
          destination.rank === card.rank + 1 &&
          cardColor(destination) !== cardColor(card)
        : card.rank === 13;
    for (const source of [...tableaus, state.piles.waste]) {
      for (let start = source.cards.length - 1; start >= 0; start -= 1) {
        if (!runIsLegal(source.cards, start)) continue;
        const card = source.cards[start];
        for (const destination of tableaus) {
          if (destination.id !== source.id && canPlace(card, top(destination))) {
            moves.push({
              type: 'transfer',
              from: source.id,
              to: destination.id,
              cardIds: source.cards.slice(start).map((item) => item.id),
            });
          }
        }
        if (start === source.cards.length - 1) {
          for (const foundation of FOUNDATION_IDS) {
            const pileState = state.piles[foundation];
            if (
              card.rank === pileState.cards.length + 1 &&
              (!pileState.cards.length || pileState.cards[0].suit === card.suit)
            ) {
              moves.push({ type: 'transfer', from: source.id, to: foundation, cardIds: [card.id] });
            }
          }
        }
      }
    }
    if (state.piles.stock.cards.length) {
      moves.push({
        type: 'draw',
        from: 'stock',
        to: rules.dealMode === 'waste' ? 'waste' : 't0',
        count:
          rules.dealMode === 'waste'
            ? Math.min(rules.wasteDraw ?? 1, state.piles.stock.cards.length)
            : Math.min(7, state.piles.stock.cards.length),
      });
    } else if (rules.dealMode === 'waste' && state.piles.waste.cards.length) {
      moves.push({ type: 'recycle', from: 'waste', to: 'stock' });
    }
    return moves;
  };
  const definition: GameDefinition = {
    id: rules.id,
    name: rules.name,
    decks: 1,
    create(seed = 'solitaire-default'): GameState {
      const deck = shuffledDeck(seed);
      const piles = [
        pile('stock', 'stock'),
        pile('waste', 'waste'),
        ...FOUNDATION_IDS.map((id) => pile(id, 'foundation')),
        ...TABLEAU_IDS.map((id) => pile(id, 'tableau')),
      ];
      let cursor = 0;
      rules.initialSizes.forEach((size, column) => {
        const target = piles.find((item) => item.id === `t${column}`)!;
        for (let row = 0; row < size; row += 1) {
          const card = deck[cursor++];
          card.faceUp = row === size - 1;
          target.cards.push(card);
        }
      });
      deck
        .slice(cursor)
        .forEach((card) => piles.find((item) => item.id === 'stock')!.cards.push(card));
      return makeState(rules.id, seed, piles, { options: { dealMode: rules.dealMode } });
    },
    legalMoves,
    applyMove(state, move) {
      return checked(state, move, legalMoves(state), () => {
        if (move.type === 'draw') {
          const next = cloneState(state);
          if (rules.dealMode === 'waste') {
            const count = move.count ?? 1;
            const cards = next.piles.stock.cards.splice(
              next.piles.stock.cards.length - count,
              count,
            );
            cards.forEach((card) => {
              card.faceUp = true;
              next.piles.waste.cards.push(card);
            });
          } else {
            for (const id of TABLEAU_IDS) {
              const card = next.piles.stock.cards.pop();
              if (!card) break;
              card.faceUp = true;
              next.piles[id].cards.push(card);
            }
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
        const result = transfer(state, move.from, move.to, 'cardIds' in move ? move.cardIds : []);
        if (result.error) return result;
        const next = result.state;
        if (move.from.startsWith('t')) {
          const card = next.piles[move.from].cards.at(-1);
          if (card) card.faceUp = true;
        }
        if (definition.isWon(next)) next.status = 'won';
        return { state: next };
      });
    },
    isWon: (state) => FOUNDATION_IDS.every((id) => state.piles[id].cards.length === 13),
    hint: (state) => legalMoves(state)[0],
  };
  return definition;
}

export const easthaven = definitionFor(variants[0]);
export const westcliff = definitionFor(variants[1]);
export const auntMary = definitionFor(variants[2]);
export const KLONDIKE_VARIANT_GAMES = { easthaven, westcliff, auntMary } as const;
