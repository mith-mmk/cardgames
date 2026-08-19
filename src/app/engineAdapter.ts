import * as Engine from '../engine';
import type { Card, GameDefinition, GameSession, GameSnapshot, Pile, PileKind } from './types';
type UnknownRecord = Record<string, unknown>;
const runtime = Engine as unknown as UnknownRecord;

const fallbackGames: GameDefinition[] = [
  {
    id: 'klondike',
    name: { ja: 'クロンダイク', en: 'Klondike' },
    family: { ja: 'クロンダイク系', en: 'Klondike family' },
    description: {
      ja: '山札から場札を組み替え、4つの完成札を作ります。',
      en: 'Build four foundations while revealing and arranging the tableau.',
    },
    difficulty: 3,
    decks: 1,
    accent: '#f2b84b',
  },
  {
    id: 'freecell',
    name: { ja: 'フリーセル', en: 'FreeCell' },
    family: { ja: '空きセル系', en: 'Open-cell family' },
    description: {
      ja: 'すべて表向きのカードを空きセルを使って整理します。',
      en: 'Arrange every face-up card using the open cells.',
    },
    difficulty: 4,
    decks: 1,
    accent: '#6bd4bb',
  },
  {
    id: 'spider',
    name: { ja: 'スパイダー', en: 'Spider' },
    family: { ja: 'スパイダー系', en: 'Spider family' },
    description: {
      ja: '同じスートの長い列を作り、完成した列を取り除きます。',
      en: 'Build long same-suit runs and remove completed sequences.',
    },
    difficulty: 4,
    decks: 2,
    accent: '#c79cff',
  },
  {
    id: 'calculation',
    name: { ja: 'カルキュレーション', en: 'Calculation' },
    family: { ja: '特殊完成札', en: 'Special foundations' },
    description: {
      ja: 'スートごとに異なる刻みの数列を完成させます。',
      en: 'Complete foundations with their own arithmetic progressions.',
    },
    difficulty: 5,
    decks: 1,
    accent: '#f98f8f',
  },
  {
    id: 'pyramid',
    name: { ja: 'ピラミッド', en: 'Pyramid' },
    family: { ja: 'カード除去系', en: 'Removal games' },
    description: {
      ja: '合計13になる2枚を選び、ピラミッドを崩します。',
      en: 'Pair cards that total thirteen to clear the pyramid.',
    },
    difficulty: 2,
    decks: 1,
    accent: '#73a8ff',
  },
  {
    id: 'bakers-game',
    name: { ja: 'ベーカーズ・ゲーム', en: "Baker's Game" },
    family: { ja: '空きセル系', en: 'Open-cell family' },
    description: {
      ja: '同一スートで降順に並べ、4つの空きセルを活用します。',
      en: 'Build same-suit descending runs with four free cells.',
    },
    difficulty: 4,
    decks: 1,
    accent: '#54b7a9',
  },
  {
    id: 'eight-off',
    name: { ja: 'エイト・オフ', en: 'Eight Off' },
    family: { ja: '空きセル系', en: 'Open-cell family' },
    description: {
      ja: '8つの予備セルを使い、同一スートの列を完成させます。',
      en: 'Use eight reserve cells to build same-suit foundations.',
    },
    difficulty: 4,
    decks: 1,
    accent: '#49a6e8',
  },
  {
    id: 'seahaven-towers',
    name: { ja: 'シーヘイブン・タワーズ', en: 'Seahaven Towers' },
    family: { ja: '空きセル系', en: 'Open-cell family' },
    description: {
      ja: '王だけを空列へ置ける、10列の空きセルゲームです。',
      en: 'A ten-column open-cell game where only Kings fill empty columns.',
    },
    difficulty: 5,
    decks: 1,
    accent: '#6885e8',
  },
  {
    id: 'spiderette',
    name: { ja: 'スパイダレット', en: 'Spiderette' },
    family: { ja: 'スパイダー系', en: 'Spider family' },
    description: {
      ja: '1組のカードで、同一スートのKからAまでの列を取り除きます。',
      en: 'Clear same-suit King-to-Ace runs with a single deck.',
    },
    difficulty: 3,
    decks: 1,
    accent: '#ad7fe5',
  },
  {
    id: 'yukon',
    name: { ja: 'ユーコン', en: 'Yukon' },
    family: { ja: 'スパイダー系', en: 'Long-run family' },
    description: {
      ja: '不整列の表向きカードを含む列ごと、場札間を移動できます。',
      en: 'Move any face-up suffix, including unordered cards, between tableau columns.',
    },
    difficulty: 4,
    decks: 1,
    accent: '#c790dc',
  },
  {
    id: 'forty-thieves',
    name: { ja: 'フォーティ・シーブズ', en: 'Forty Thieves' },
    family: { ja: 'スパイダー系', en: 'Long-run family' },
    description: {
      ja: '2組・10列で、同一スートの降順列と8組の完成札を作ります。',
      en: 'Build same-suit runs across ten columns and eight foundations.',
    },
    difficulty: 5,
    decks: 2,
    accent: '#e38b79',
  },
  {
    id: 'forty-and-eight',
    name: { ja: 'フォーティ・アンド・エイト', en: 'Forty and Eight' },
    family: { ja: 'スパイダー系', en: 'Long-run family' },
    description: {
      ja: '8列の同一スート降順と、1回の再配札を使うフォーティ・シーブズ派生です。',
      en: 'An eight-column Forty Thieves variant with one permitted redeal.',
    },
    difficulty: 4,
    decks: 2,
    accent: '#dc9278',
  },
  {
    id: 'josephine',
    name: { ja: 'ジョセフィン', en: 'Josephine' },
    family: { ja: 'スパイダー系', en: 'Long-run family' },
    description: {
      ja: '同一スートで整えた複数枚の列をまとめて動かせます。',
      en: 'Move properly ordered same-suit sequences as a group.',
    },
    difficulty: 5,
    decks: 2,
    accent: '#c77f9e',
  },
  {
    id: 'congress',
    name: { ja: 'コングレス', en: 'Congress' },
    family: { ja: 'スパイダー系', en: 'Long-run family' },
    description: {
      ja: '8列で、スートを問わない降順の場札と8つの完成札を作ります。',
      en: 'Build unrestricted descending columns and eight foundations.',
    },
    difficulty: 4,
    decks: 2,
    accent: '#c49573',
  },
  {
    id: 'diplomat',
    name: { ja: 'ディプロマット', en: 'Diplomat' },
    family: { ja: 'スパイダー系', en: 'Long-run family' },
    description: {
      ja: '8列の表向きカードを整理し、1回限りの山札から完成札へ送ります。',
      en: 'Arrange eight face-up rows and play through a single-pass stock.',
    },
    difficulty: 4,
    decks: 2,
    accent: '#b88865',
  },
  {
    id: 'canfield',
    name: { ja: 'キャンフィールド', en: 'Canfield' },
    family: { ja: 'クロンダイク系', en: 'Klondike family' },
    description: {
      ja: '13枚の予備札と循環する完成札を使う、コンパクトなゲームです。',
      en: 'Use a 13-card reserve and cyclic foundations in this compact game.',
    },
    difficulty: 4,
    decks: 1,
    accent: '#d89d56',
  },
  {
    id: 'agnes-bernauer',
    name: { ja: 'アグネス・ベルナウアー', en: 'Agnes Bernauer' },
    family: { ja: 'クロンダイク系', en: 'Klondike family' },
    description: {
      ja: '7つの予備札を使い、交互色の降順列を作ります。',
      en: 'Use seven reserve cards to build alternating-color descending runs.',
    },
    difficulty: 4,
    decks: 1,
    accent: '#d47892',
  },
  {
    id: 'king-albert',
    name: { ja: 'キング・アルバート', en: 'King Albert' },
    family: { ja: 'クロンダイク系', en: 'Klondike family' },
    description: {
      ja: '9列と予備札を使い、全表向きのカードを整理します。',
      en: 'Arrange a fully face-up deal across nine columns and a reserve.',
    },
    difficulty: 5,
    decks: 1,
    accent: '#ba8a44',
  },
  {
    id: 'easthaven',
    name: { ja: 'イーストヘイブン', en: 'Easthaven' },
    family: { ja: 'クロンダイク系', en: 'Klondike family' },
    description: {
      ja: 'クロンダイク型の7列に、山札から各列へ一斉配札します。',
      en: 'A seven-column Klondike layout with tableau-wide stock deals.',
    },
    difficulty: 4,
    decks: 1,
    accent: '#c98d4d',
  },
  {
    id: 'westcliff',
    name: { ja: 'ウェストクリフ', en: 'Westcliff' },
    family: { ja: 'クロンダイク系', en: 'Klondike family' },
    description: {
      ja: '7列に3枚ずつ配り、山札を3枚ずつめくるクロンダイク派生です。',
      en: 'A seven-column variant with three-card rows and draw-three stock.',
    },
    difficulty: 4,
    decks: 1,
    accent: '#b77a56',
  },
  {
    id: 'aunt-mary',
    name: { ja: 'アント・メアリー', en: 'Aunt Mary' },
    family: { ja: 'クロンダイク系', en: 'Klondike family' },
    description: {
      ja: '7列の表向きの予備カードへ山札から一斉に配り、場を整理します。',
      en: 'Deal stock cards across seven face-up tableau reserves to clear the board.',
    },
    difficulty: 3,
    decks: 1,
    accent: '#d59a69',
  },
  {
    id: 'scorpion',
    name: { ja: 'スコーピオン', en: 'Scorpion' },
    family: { ja: 'スパイダー系', en: 'Spider family' },
    description: {
      ja: '同一スートのKからAまでを完成させ、列を取り除きます。',
      en: 'Build and remove same-suit King-to-Ace sequences.',
    },
    difficulty: 4,
    decks: 1,
    accent: '#a86b8a',
  },
  {
    id: 'wasp',
    name: { ja: 'ワスプ', en: 'Wasp' },
    family: { ja: 'スパイダー系', en: 'Spider family' },
    description: {
      ja: 'スコーピオン型の列を作り、空列にも移動できる派生です。',
      en: 'A Scorpion-style game with additional empty-column flexibility.',
    },
    difficulty: 4,
    decks: 1,
    accent: '#d0a151',
  },
  {
    id: 'black-widow',
    name: { ja: 'ブラック・ウィドウ', en: 'Black Widow' },
    family: { ja: 'スパイダー系', en: 'Spider family' },
    description: {
      ja: '2組のカードで、同一スートの完成列を8組取り除きます。',
      en: 'Clear eight same-suit complete runs across two decks.',
    },
    difficulty: 5,
    decks: 2,
    accent: '#994f59',
  },
];
export function gameCatalog(): GameDefinition[] {
  const candidate = runtime.gameCatalog ?? runtime.GAME_DEFINITIONS ?? runtime.games;
  if (candidate && typeof candidate === 'object' && !Array.isArray(candidate))
    return Object.values(candidate as Record<string, UnknownRecord>).map((item) => ({
      id: String(item.id),
      name: { ja: String(item.name), en: String(item.name) },
      family: fallbackGames.find((game) => game.id === item.id)?.family ?? {
        ja: 'ソリティア',
        en: 'Solitaire',
      },
      description: fallbackGames.find((game) => game.id === item.id)?.description ?? {
        ja: '',
        en: '',
      },
      difficulty: fallbackGames.find((game) => game.id === item.id)?.difficulty ?? 3,
      decks: Number(item.decks) === 2 ? 2 : 1,
      accent: fallbackGames.find((game) => game.id === item.id)?.accent ?? '#c3e86a',
    }));
  return Array.isArray(candidate) ? (candidate as GameDefinition[]) : fallbackGames;
}
function seededRandom(seed: string) {
  let value = 0;
  for (const char of seed) value = (value * 31 + char.charCodeAt(0)) >>> 0;
  return () => (value = (value * 1664525 + 1013904223) >>> 0) / 0x100000000;
}
function moveCardIds(move: UnknownRecord): string[] {
  return Array.isArray(move.cardIds)
    ? move.cardIds.filter((id): id is string => typeof id === 'string')
    : [];
}
function pileKind(state: UnknownRecord, pileId: string): string | undefined {
  const piles = state.piles as Record<string, UnknownRecord> | undefined;
  return typeof piles?.[pileId]?.kind === 'string' ? String(piles[pileId].kind) : undefined;
}
function cardInState(state: UnknownRecord, cardId: string): UnknownRecord | undefined {
  const piles = state.piles as Record<string, UnknownRecord> | undefined;
  for (const pile of Object.values(piles ?? {})) {
    const cards = pile.cards as UnknownRecord[] | undefined;
    const card = cards?.find((item) => item.id === cardId);
    if (card) return card;
  }
  return undefined;
}
function isAutoMoveCandidate(state: UnknownRecord, move: UnknownRecord, cardId?: string): boolean {
  const ids = moveCardIds(move);
  if (!ids.length || (cardId !== undefined && ids[0] !== cardId)) return false;
  if (move.type === 'transfer') return pileKind(state, String(move.to)) === 'foundation';
  if (
    move.type === 'remove' &&
    ids.length === 1 &&
    (move.to === 'removed' || pileKind(state, String(move.to)) === 'removed')
  )
    return cardInState(state, ids[0])?.rank === 13;
  return false;
}
type RawEngineSession = {
  state: UnknownRecord;
  move(move: UnknownRecord): { error?: unknown };
  moveBatch?(moves: UnknownRecord[]): { error?: unknown };
  undo(): UnknownRecord;
  retry(): UnknownRecord;
  hint?(): UnknownRecord | undefined;
};
function planAutoComplete(
  definition: UnknownRecord,
  raw: RawEngineSession,
): UnknownRecord[] | undefined {
  let preview = structuredClone(raw.state) as UnknownRecord;
  const planned: UnknownRecord[] = [];
  const visited = new Set<string>();
  const piles = preview.piles as Record<string, UnknownRecord> | undefined;
  const totalCards = Object.values(piles ?? {}).reduce(
    (total, item) => total + ((item.cards as unknown[]) ?? []).length,
    0,
  );
  const maxSteps = Math.max(1, totalCards + 1);
  const isWon = definition.isWon as ((state: UnknownRecord) => boolean) | undefined;
  if (isWon?.call(definition, preview)) return [];
  for (let step = 0; step < maxSteps; step += 1) {
    const signature = JSON.stringify(preview.piles);
    if (visited.has(signature)) return undefined;
    visited.add(signature);
    if (isWon?.call(definition, preview)) return planned;
    const legalMoves = definition.legalMoves as
      ((state: UnknownRecord) => UnknownRecord[]) | undefined;
    const applyMove = definition.applyMove as
      | ((state: UnknownRecord, move: UnknownRecord) => { state: UnknownRecord; error?: unknown })
      | undefined;
    if (!legalMoves || !applyMove) return undefined;
    const nextMove = legalMoves
      .call(definition, preview)
      .find((move) => isAutoMoveCandidate(preview, move));
    if (!nextMove) return undefined;
    const result = applyMove.call(definition, preview, nextMove);
    if (result.error) return undefined;
    planned.push(nextMove);
    preview = result.state;
  }
  return isWon?.call(definition, preview) ? planned : undefined;
}
function executeAutoComplete(definition: UnknownRecord, raw: RawEngineSession): boolean {
  const planned = planAutoComplete(definition, raw);
  if (!planned) return false;
  if (!planned.length) return true;
  if (raw.moveBatch) return !raw.moveBatch(planned).error;
  let applied = 0;
  for (const move of planned) {
    if (raw.move(move).error) {
      while (applied > 0) {
        raw.undo();
        applied -= 1;
      }
      return false;
    }
    applied += 1;
  }
  return true;
}
function createFallbackSession(definition: GameDefinition, seed: string): GameSession {
  const random = seededRandom(seed);
  const suits: Card['suit'][] = ['spades', 'hearts', 'diamonds', 'clubs'];
  const cards: Card[] = Array.from({ length: definition.decks * 52 }, (_, index) => ({
    id: `${index}`,
    rank: (index % 13) + 1,
    suit: suits[Math.floor(index / 13) % 4],
    faceUp: false,
  }));
  for (let index = cards.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [cards[index], cards[swap]] = [cards[swap], cards[index]];
  }
  const pile = (id: string, kind: PileKind, pileCards: Card[]): Pile => ({
    id,
    kind,
    cards: pileCards,
  });
  const stock = cards.slice(28);
  const tableau: Pile[] = Array.from({ length: 7 }, (_, column) =>
    pile(
      `tableau-${column}`,
      'tableau',
      cards
        .slice((column * (column + 1)) / 2, ((column + 1) * (column + 2)) / 2)
        .map((card, index, array) => ({
          ...card,
          faceUp: index === array.length - 1,
        })),
    ),
  );
  const piles: Pile[] = [
    pile('stock', 'stock', stock),
    pile('waste', 'waste', []),
    ...tableau,
    ...suits.map((_, index) => pile(`foundation-${index}`, 'foundation', [])),
  ];
  let snapshot: GameSnapshot = {
    gameId: definition.id,
    seed,
    piles,
    moves: 0,
    elapsedSeconds: 0,
    won: false,
    canUndo: false,
  };
  const history: GameSnapshot[] = [];
  const transfer = (source: string, cardId: string, destination: string) => {
    const sourcePile = snapshot.piles.find((p) => p.id === source);
    const target = snapshot.piles.find((p) => p.id === destination);
    const index = sourcePile?.cards.findIndex((card) => card.id === cardId) ?? -1;
    if (!sourcePile || !target || index < 0 || source === destination) return false;
    history.push(structuredClone(snapshot));
    const card = sourcePile.cards[index];
    snapshot = {
      ...snapshot,
      piles: snapshot.piles.map((p) =>
        p.id === source
          ? { ...p, cards: p.cards.filter((_, i) => i !== index) }
          : p.id === destination
            ? { ...p, cards: [...p.cards, { ...card, faceUp: true }] }
            : p,
      ),
      selected: undefined,
      moves: snapshot.moves + 1,
      canUndo: true,
    };
    return true;
  };
  const legalMoves = () => {
    const moves: UnknownRecord[] = [];
    const foundations = snapshot.piles.filter((p) => p.kind === 'foundation');
    for (const source of snapshot.piles.filter((p) =>
      ['tableau', 'waste', 'cell', 'reserve'].includes(p.kind),
    )) {
      const card = source.cards[source.cards.length - 1];
      if (!card) continue;
      for (const foundation of foundations) {
        const top = foundation.cards[foundation.cards.length - 1];
        if (card.rank === foundation.cards.length + 1 && (!top || top.suit === card.suit))
          moves.push({
            type: 'transfer',
            from: source.id,
            to: foundation.id,
            cardIds: [card.id],
          });
      }
    }
    return moves;
  };
  const autoMove = (pileId: string, cardId: string) => {
    const move = legalMoves().find(
      (candidate) => candidate.from === pileId && moveCardIds(candidate)[0] === cardId,
    );
    const ids = move ? moveCardIds(move) : [];
    return Boolean(move && ids[0] && transfer(String(move.from), ids[0], String(move.to)));
  };
  const autoComplete = () => {
    const before = structuredClone(snapshot);
    const historyLength = history.length;
    const limit = cards.length + 1;
    for (
      let i = 0;
      i < limit &&
      snapshot.piles.filter((p) => p.kind === 'foundation').some((p) => p.cards.length < 13);
      i += 1
    ) {
      const move = legalMoves()[0];
      const ids = move ? moveCardIds(move) : [];
      if (!move || !ids[0] || !transfer(String(move.from), ids[0], String(move.to))) {
        snapshot = before;
        history.splice(historyLength);
        return false;
      }
    }
    const won = snapshot.piles
      .filter((p) => p.kind === 'foundation')
      .every((p) => p.cards.length === 13);
    if (!won) {
      snapshot = before;
      history.splice(historyLength);
    }
    return won;
  };
  return {
    getSnapshot: () => snapshot,
    select: (pileId, cardId) => {
      snapshot = { ...snapshot, selected: { pileId, cardId } };
    },
    move: transfer,
    autoMove,
    dispatch: (move) => {
      const item = move as {
        type?: string;
        from?: string;
        to?: string;
        cardIds?: string[];
      };
      return (
        item.type === 'transfer' &&
        Boolean(item.from && item.to && item.cardIds?.[0]) &&
        transfer(item.from!, item.cardIds![0], item.to!)
      );
    },
    legalMoves,
    undo: () => {
      const previous = history.pop();
      if (!previous) return false;
      snapshot = { ...previous, canUndo: history.length > 0 };
      return true;
    },
    retry: () => {
      const fresh = createFallbackSession(definition, seed);
      snapshot = fresh.getSnapshot();
      history.length = 0;
    },
    hint: () => {
      const source = snapshot.piles.find((p) => p.cards.length > 0 && p.kind !== 'foundation');
      const target = snapshot.piles.find((p) => p.kind === 'foundation');
      const card = source?.cards[source.cards.length - 1];
      return source && target && card
        ? {
            sourcePileId: source.id,
            cardId: card.id,
            destinationPileId: target.id,
          }
        : undefined;
    },
    autoComplete,
    tick: (seconds) => {
      snapshot = {
        ...snapshot,
        elapsedSeconds: snapshot.elapsedSeconds + seconds,
      };
    },
  };
}
export function createSession(gameId: string, seed = `${Date.now()}`): GameSession {
  const factory = runtime.createGameSession ?? runtime.createSession ?? runtime.createGame;
  if (typeof factory === 'function') {
    const raw = (factory as (id: string, value: string) => UnknownRecord)(gameId, seed);
    if (raw && typeof raw.getSnapshot === 'function') return raw as unknown as GameSession;
  }
  const definitions = runtime.GAME_DEFINITIONS as Record<string, UnknownRecord> | undefined;
  const Session = runtime.GameSession as
    (new (definition: UnknownRecord, value: string) => UnknownRecord) | undefined;
  const definition = definitions?.[gameId];
  if (definition && Session) {
    const raw = new Session(definition, seed) as unknown as RawEngineSession;
    let elapsedSeconds = 0;
    let selected: { pileId: string; cardId: string } | undefined;
    const snapshot = (): GameSnapshot => {
      const state = raw.state;
      const record = state.piles as Record<string, Pile>;
      return {
        gameId: String(state.gameId),
        seed: String(state.seed),
        piles: Object.values(record),
        selected,
        moves: Number(state.moveCount) || 0,
        elapsedSeconds,
        won: state.status === 'won',
        canUndo: true,
      };
    };
    const legalMoves = () =>
      (definition.legalMoves as (value: UnknownRecord) => UnknownRecord[]).call(
        definition,
        raw.state,
      );
    return {
      getSnapshot: snapshot,
      select: (pileId, cardId) => {
        selected = { pileId, cardId };
      },
      move: (source, cardId, destination) => {
        const legal = legalMoves().find(
          (move) =>
            move.type === 'transfer' &&
            move.from === source &&
            move.to === destination &&
            moveCardIds(move)[0] === cardId,
        );
        if (!legal) return false;
        const result = raw.move(legal);
        selected = undefined;
        return !result.error;
      },
      autoMove: (pileId, cardId) => {
        const move = legalMoves().find(
          (candidate) =>
            candidate.from === pileId && isAutoMoveCandidate(raw.state, candidate, cardId),
        );
        if (!move) return false;
        const result = raw.move(move);
        selected = undefined;
        return !result.error;
      },
      dispatch: (move) => {
        const result = raw.move(move as UnknownRecord);
        selected = undefined;
        return !result.error;
      },
      legalMoves,
      undo: () => {
        raw.undo();
        selected = undefined;
        return true;
      },
      retry: () => {
        raw.retry();
        selected = undefined;
      },
      hint: () => {
        const move = raw.hint?.();
        return move && move.type === 'transfer'
          ? {
              sourcePileId: String(move.from),
              cardId: String(moveCardIds(move)[0]),
              destinationPileId: String(move.to),
            }
          : undefined;
      },
      autoComplete: () => {
        const completed = executeAutoComplete(definition, raw);
        selected = undefined;
        return completed;
      },
      tick: (seconds) => {
        elapsedSeconds += seconds;
      },
    };
  }
  return createFallbackSession(
    gameCatalog().find((game) => game.id === gameId) ?? fallbackGames[0],
    seed,
  );
}
