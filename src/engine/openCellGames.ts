import { ApplyResult, Card, GameDefinition, GameState, Move } from './types';
import { cloneState, makeState, pile, top, transfer } from './core';
import { shuffledDeck } from './random';

const DEFAULT_SEED = 'solitaire-default';

type EmptyTableauRule = 'any' | 'king';
type MoveCapacityRule = 'bakers' | 'eight-off' | 'single';

interface OpenCellRules {
  id: string;
  name: string;
  tableauCount: number;
  tableauSizes: readonly number[];
  cellCount: number;
  initialCellCards: number;
  emptyTableau: EmptyTableauRule;
  capacity: MoveCapacityRule;
}

const BAKERS_RULES: OpenCellRules = {
  id: 'bakers-game',
  name: "Baker's Game",
  tableauCount: 8,
  tableauSizes: [7, 7, 7, 7, 6, 6, 6, 6],
  cellCount: 4,
  initialCellCards: 0,
  emptyTableau: 'any',
  capacity: 'bakers',
};

const EIGHT_OFF_RULES: OpenCellRules = {
  id: 'eight-off',
  name: 'Eight Off',
  tableauCount: 8,
  tableauSizes: [6, 6, 6, 6, 6, 6, 6, 6],
  cellCount: 8,
  initialCellCards: 4,
  emptyTableau: 'king',
  capacity: 'eight-off',
};

const SEAHAVEN_RULES: OpenCellRules = {
  id: 'seahaven-towers',
  name: 'Seahaven Towers',
  tableauCount: 10,
  tableauSizes: [5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  cellCount: 4,
  initialCellCards: 2,
  emptyTableau: 'king',
  capacity: 'single',
};

function tableauIds(rules: OpenCellRules): string[] {
  return Array.from({ length: rules.tableauCount }, (_, i) => `t${i}`);
}

function cellIds(rules: OpenCellRules): string[] {
  return Array.from({ length: rules.cellCount }, (_, i) => `c${i}`);
}

function foundationIds(): string[] {
  return ['f0', 'f1', 'f2', 'f3'];
}

function createOpenCellState(rules: OpenCellRules, seed: string): GameState {
  const deck = shuffledDeck(seed);
  const piles = [
    ...foundationIds().map((id) => pile(id, 'foundation')),
    ...cellIds(rules).map((id) => pile(id, 'cell')),
    ...tableauIds(rules).map((id) => pile(id, 'tableau')),
  ];
  let index = 0;
  for (const [tableauIndex, tableauId] of tableauIds(rules).entries()) {
    const tableau = piles.find((candidate) => candidate.id === tableauId)!;
    for (let i = 0; i < rules.tableauSizes[tableauIndex]; i += 1) {
      const card = deck[index++];
      card.faceUp = true;
      tableau.cards.push(card);
    }
  }
  for (let i = 0; i < rules.initialCellCards; i += 1) {
    const card = deck[index++];
    card.faceUp = true;
    piles.find((candidate) => candidate.id === `c${i}`)!.cards.push(card);
  }
  return makeState(rules.id, seed, piles);
}

function sameMove(a: Move, b: Move): boolean {
  return (
    a.type === b.type &&
    a.type === 'transfer' &&
    b.type === 'transfer' &&
    a.from === b.from &&
    a.to === b.to &&
    JSON.stringify(a.cardIds) === JSON.stringify(b.cardIds)
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

function isDescendingSameSuit(cards: Card[], start: number): boolean {
  if (start < 0 || start >= cards.length) return false;
  for (let i = start; i < cards.length; i += 1) {
    if (!cards[i].faceUp) return false;
    if (
      i > start &&
      (cards[i - 1].rank !== cards[i].rank + 1 || cards[i - 1].suit !== cards[i].suit)
    )
      return false;
  }
  return true;
}

function foundationCanAccept(foundation: Card[], card: Card): boolean {
  const previous = foundation[foundation.length - 1];
  return previous
    ? previous.suit === card.suit && card.rank === previous.rank + 1
    : card.rank === 1;
}

function movableCapacity(state: GameState, rules: OpenCellRules, destination: string): number {
  const emptyCells = cellIds(rules).filter((id) => state.piles[id].cards.length === 0).length;
  if (rules.capacity === 'single') return 1;
  if (rules.capacity === 'eight-off') return emptyCells + 1;
  const emptyTableaus = tableauIds(rules).filter((id) => state.piles[id].cards.length === 0).length;
  const usableEmptyTableaus = state.piles[destination].cards.length
    ? emptyTableaus
    : emptyTableaus - 1;
  return (emptyCells + 1) * 2 ** Math.max(0, usableEmptyTableaus);
}

function canPlaceOnTableau(
  card: Card,
  destination: Card | undefined,
  rules: OpenCellRules,
): boolean {
  if (!destination) return rules.emptyTableau === 'any' || card.rank === 13;
  return destination.faceUp && destination.suit === card.suit && destination.rank === card.rank + 1;
}

function legalOpenCellMoves(state: GameState, rules: OpenCellRules): Move[] {
  const moves: Move[] = [];
  const tableaus = tableauIds(rules).map((id) => state.piles[id]);
  const cells = cellIds(rules).map((id) => state.piles[id]);
  const foundations = foundationIds().map((id) => state.piles[id]);

  for (const source of [...tableaus, ...cells]) {
    if (!source.cards.length) continue;
    const firstIndex = source.kind === 'cell' ? source.cards.length - 1 : 0;
    for (let start = source.cards.length - 1; start >= firstIndex; start -= 1) {
      if (source.kind === 'tableau' && !isDescendingSameSuit(source.cards, start)) continue;
      const card = source.cards[start];
      const isTopCard = start === source.cards.length - 1;
      if (!isTopCard) {
        for (const destination of tableaus) {
          if (destination.id === source.id || !canPlaceOnTableau(card, top(destination), rules))
            continue;
          const cardIds = source.cards.slice(start).map((candidate) => candidate.id);
          if (cardIds.length <= movableCapacity(state, rules, destination.id))
            moves.push({ type: 'transfer', from: source.id, to: destination.id, cardIds });
        }
        continue;
      }

      for (const cell of cells)
        if (!cell.cards.length && source.kind !== 'cell')
          moves.push({ type: 'transfer', from: source.id, to: cell.id, cardIds: [card.id] });

      for (const destination of tableaus) {
        if (destination.id === source.id || !canPlaceOnTableau(card, top(destination), rules))
          continue;
        if (1 <= movableCapacity(state, rules, destination.id))
          moves.push({ type: 'transfer', from: source.id, to: destination.id, cardIds: [card.id] });
      }

      for (const foundation of foundations)
        if (foundationCanAccept(foundation.cards, card))
          moves.push({ type: 'transfer', from: source.id, to: foundation.id, cardIds: [card.id] });
    }
  }
  return moves;
}

function applyOpenCellMove(state: GameState, move: Move, rules: OpenCellRules): ApplyResult {
  return checked(state, move, legalOpenCellMoves(state, rules), () => {
    if (move.type !== 'transfer') return { state, error: 'Illegal move' };
    const result = transfer(state, move.from, move.to, move.cardIds);
    if (result.error) return result;
    const next = cloneState(result.state);
    if (
      next.piles.f0.cards.length +
        next.piles.f1.cards.length +
        next.piles.f2.cards.length +
        next.piles.f3.cards.length ===
      52
    )
      next.status = 'won';
    return { state: next };
  });
}

function makeOpenCellDefinition(rules: OpenCellRules): GameDefinition {
  return {
    id: rules.id,
    name: rules.name,
    decks: 1,
    create(seed = DEFAULT_SEED): GameState {
      return createOpenCellState(rules, seed);
    },
    legalMoves(state) {
      return legalOpenCellMoves(state, rules);
    },
    applyMove(state, move) {
      return applyOpenCellMove(state, move, rules);
    },
    hint(state) {
      return legalOpenCellMoves(state, rules)[0];
    },
    isWon(state) {
      return foundationIds().every((id) => state.piles[id].cards.length === 13);
    },
  };
}

export const bakersGame = makeOpenCellDefinition(BAKERS_RULES);
export const eightOff = makeOpenCellDefinition(EIGHT_OFF_RULES);
export const seahavenTowers = makeOpenCellDefinition(SEAHAVEN_RULES);

export const OPEN_CELL_GAMES = {
  bakersGame,
  eightOff,
  seahavenTowers,
} as const;
