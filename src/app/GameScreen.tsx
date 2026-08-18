import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import { CardView } from './CardView';
import { DragGhost } from './DragGhost';
import { text } from './i18n';
import { storage } from './persistence';
import type { Card, GameDefinition, GameSession, Language, Pile } from './types';
import { clock, pileLayout } from './ui';
import type { ThemeAsset } from './ui';

export function GameScreen({
  language,
  definition,
  session,
  preferences,
  theme,
  onBack,
  onNewGame,
  onSettings,
}: {
  language: Language;
  definition: GameDefinition;
  session: GameSession;
  preferences: ReturnType<typeof storage.get>['preferences'];
  theme: ThemeAsset;
  onBack: () => void;
  onNewGame: () => void;
  onSettings: () => void;
}) {
  const t = text(language);
  const [, redraw] = useState(0);
  const [actionStatus, setActionStatus] = useState('');
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [dragGhost, setDragGhost] = useState<{
    pileId: string;
    cards: Card[];
    x: number;
    y: number;
  } | null>(null);
  const pointerDrag = useRef<{
    pileId: string;
    cardId: string;
    startX: number;
    startY: number;
    pointerId: number;
    dragging: boolean;
  } | null>(null);
  const snapshot = session.getSnapshot();
  const piles = snapshot.piles;
  const isPyramid = definition.id === 'pyramid';
  const isPyramidPile = (pile: Pile) => /^p\d+$/.test(pile.id);
  const isPyramidExposed = (pile: Pile) => {
    if (!isPyramid || !isPyramidPile(pile) || !pile.cards.length) return false;
    const index = Number(pile.id.slice(1));
    const row = Math.floor((Math.sqrt(8 * index + 1) - 1) / 2);
    if (row === 6) return true;
    const position = index - (row * (row + 1)) / 2;
    const childBase = ((row + 1) * (row + 2)) / 2;
    return (
      !piles.find((item) => item.id === `p${childBase + position}`)?.cards.length &&
      !piles.find((item) => item.id === `p${childBase + position + 1}`)?.cards.length
    );
  };
  const draggedCardIds = useMemo(
    () => new Set(dragGhost?.cards.map((card) => card.id) ?? []),
    [dragGhost],
  );
  useEffect(() => {
    const timer = window.setInterval(() => {
      session.tick(1);
      redraw((value) => value + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [session]);
  const act = (fn: () => void) => {
    fn();
    redraw((value) => value + 1);
  };
  const legalMoves = () =>
    session.legalMoves() as Array<{
      type?: string;
      from?: string;
      to?: string;
      cardIds?: string[];
    }>;
  const canStartDrag = (pileId: string, cardId: string) =>
    !isPyramid ||
    legalMoves().some(
      (move) => move.type === 'transfer' && move.from === pileId && move.cardIds?.[0] === cardId,
    );
  const pointerDown = (
    pileId: string,
    cardId: string,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    if (!event.isPrimary || event.button !== 0 || pointerDrag.current) return;
    const sourcePile = piles.find((pile) => pile.id === pileId);
    const cardIndex = sourcePile?.cards.findIndex((item) => item.id === cardId) ?? -1;
    const card = cardIndex >= 0 ? sourcePile?.cards[cardIndex] : undefined;
    if (!card?.faceUp || !sourcePile || !canStartDrag(pileId, cardId)) return;
    pointerDrag.current = {
      pileId,
      cardId,
      startX: event.clientX,
      startY: event.clientY,
      pointerId: event.pointerId,
      dragging: false,
    };
    setDragGhost(null);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const pointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const active = pointerDrag.current;
    if (!active || event.pointerId !== active.pointerId) return false;
    if (
      !active.dragging &&
      Math.hypot(event.clientX - active.startX, event.clientY - active.startY) < 8
    )
      return false;
    active.dragging = true;
    const sourcePile = piles.find((pile) => pile.id === active.pileId);
    const cardIndex = sourcePile?.cards.findIndex((item) => item.id === active.cardId) ?? -1;
    if (sourcePile && cardIndex >= 0)
      setDragGhost({
        pileId: active.pileId,
        cards: sourcePile.cards.slice(cardIndex),
        x: event.clientX,
        y: event.clientY,
      });
    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>('[data-pile-id]');
    setDropTarget(target?.dataset.pileId ?? null);
    return true;
  };
  const pointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const active = pointerDrag.current;
    if (!active || event.pointerId !== active.pointerId) return false;
    const wasDragging = active.dragging;
    if (wasDragging) {
      const target = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest<HTMLElement>('[data-pile-id]');
      const destination = target?.dataset.pileId;
      const move = destination
        ? legalMoves().find(
            (item) =>
              item.type === 'transfer' &&
              item.from === active.pileId &&
              item.to === destination &&
              item.cardIds?.[0] === active.cardId,
          )
        : undefined;
      if (move) {
        act(() => session.dispatch(move));
        notify(language === 'ja' ? '移動しました' : 'Moved');
      }
    }
    pointerDrag.current = null;
    setDragGhost(null);
    setDropTarget(null);
    if (event.currentTarget.hasPointerCapture?.(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    return wasDragging;
  };
  const pointerCancel = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const active = pointerDrag.current;
    if (!active || event.pointerId !== active.pointerId) return;
    pointerDrag.current = null;
    setDragGhost(null);
    setDropTarget(null);
    if (event.currentTarget.hasPointerCapture?.(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const legalTargetIds = new Set(
    legalMoves()
      .filter(
        (move) =>
          snapshot.selected &&
          move.type === 'transfer' &&
          move.from === snapshot.selected.pileId &&
          move.cardIds?.[0] === snapshot.selected.cardId &&
          move.to,
      )
      .map((move) => move.to as string),
  );
  const notify = (message: string) => {
    setActionStatus(message);
    window.setTimeout(() => setActionStatus(''), 1800);
  };
  const runAutoMove = (pileId: string, cardId: string) => {
    const autoMove = (
      session as GameSession & {
        autoMove?: (from: string, card: string) => boolean;
      }
    ).autoMove;
    const moved = autoMove?.(pileId, cardId) ?? false;
    notify(
      moved
        ? language === 'ja'
          ? '自動で移動しました'
          : 'Moved automatically'
        : language === 'ja'
          ? '移動できる場所がありません'
          : 'No legal move',
    );
    if (moved) redraw((value) => value + 1);
  };
  const dispatchForSelection = (pile: Pile, cardId?: string) => {
    const selected = snapshot.selected;
    const moves = legalMoves();
    if (isPyramid && isPyramidPile(pile) && cardId && !isPyramidExposed(pile)) return;
    if (isPyramid && cardId) {
      const single = moves.find(
        (move) =>
          move.type === 'remove' && move.cardIds?.length === 1 && move.cardIds.includes(cardId),
      );
      if (single) return act(() => session.dispatch(single));
    }
    if (pile.id === 'stock') {
      const stockMove = moves.find(
        (move) => move.from === 'stock' || (move.type === 'recycle' && move.from === 'waste'),
      );
      if (stockMove) return act(() => session.dispatch(stockMove));
    }
    if (selected && cardId && selected.cardId === cardId) {
      const single = moves.find(
        (move) =>
          move.type === 'remove' && move.cardIds?.length === 1 && move.cardIds.includes(cardId),
      );
      if (single) return act(() => session.dispatch(single));
    }
    if (selected && cardId && selected.cardId !== cardId) {
      const pair = moves.find(
        (move) =>
          move.type === 'remove' &&
          move.cardIds?.includes(selected.cardId) &&
          move.cardIds.includes(cardId),
      );
      if (pair) return act(() => session.dispatch(pair));
    }
    if (selected && selected.pileId !== pile.id) {
      const transfer = moves.find(
        (move) =>
          move.type === 'transfer' &&
          move.from === selected.pileId &&
          move.to === pile.id &&
          move.cardIds?.[0] === selected.cardId,
      );
      if (transfer) return act(() => session.dispatch(transfer));
    }
    if (cardId && pile.cards.find((card) => card.id === cardId)?.faceUp)
      act(() => session.select(pile.id, cardId));
  };
  const onPileKey = (event: ReactKeyboardEvent<HTMLDivElement>, pile: Pile) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      dispatchForSelection(pile);
    }
  };
  return (
    <main
      className={`game-screen game-${definition.id} motion-${preferences.motion} ${preferences.largeCards ? 'large-cards' : ''}`}
    >
      <header className="game-topbar">
        <button className="back-button" onClick={onBack}>
          ← <span>{t.back}</span>
        </button>
        <div className="game-title">
          <span className="game-dot" style={{ background: definition.accent }} />
          <h1>{definition.name[language]}</h1>
          <span className="game-family">{definition.family[language]}</span>
        </div>
        <button className="icon-button" onClick={onSettings} aria-label={t.settings}>
          ⚙
        </button>
      </header>
      <div className={`game-layout game-layout-${definition.id}`}>
        <section className="table-area" aria-label={`${definition.name.en} table`}>
          <div className="table-stats">
            <span>
              {t.moves} <b>{snapshot.moves}</b>
            </span>
            <span>
              {t.time} <b>{clock(snapshot.elapsedSeconds)}</b>
            </span>
          </div>
          <div className="board">
            {piles.map((pile) => (
              <div
                className={`pile dynamic-pile pile-${pile.kind} ${isPyramid && isPyramidPile(pile) && !pile.cards.length ? 'is-empty-pyramid-pile' : ''} ${isPyramid && isPyramidPile(pile) && !isPyramidExposed(pile) ? 'is-covered-pyramid-pile' : ''} ${dropTarget === pile.id ? 'is-drop-target' : ''} ${legalTargetIds.has(pile.id) ? 'is-legal-target' : ''}`}
                data-pile-id={pile.id}
                style={{
                  ...pileLayout(pile, piles),
                  zIndex:
                    isPyramid && isPyramidPile(pile)
                      ? pile.cards.length
                        ? Math.floor((Math.sqrt(8 * Number(pile.id.slice(1)) + 1) - 1) / 2) + 1
                        : 0
                      : undefined,
                }}
                key={pile.id}
                role={
                  isPyramid &&
                  isPyramidPile(pile) &&
                  (!pile.cards.length || !isPyramidExposed(pile))
                    ? undefined
                    : 'button'
                }
                tabIndex={
                  isPyramid &&
                  isPyramidPile(pile) &&
                  (!pile.cards.length || !isPyramidExposed(pile))
                    ? -1
                    : 0
                }
                aria-label={`${pile.kind} ${pile.id}`}
                onKeyDown={(event) => onPileKey(event, pile)}
                onClick={() => dispatchForSelection(pile)}
              >
                <span className="pile-label">
                  {pile.kind === 'foundation' ? '◇' : pile.kind === 'stock' ? '↻' : ''}
                </span>
                {pile.cards.map((card, index) => (
                  <span
                    className="card-slot"
                    style={{
                      top:
                        pile.kind === 'tableau' &&
                        piles.filter((item) => item.kind === 'tableau').length < 20
                          ? `${index * 30}px`
                          : 0,
                      zIndex: index,
                    }}
                    key={card.id}
                  >
                    <CardView
                      card={card}
                      selected={snapshot.selected?.cardId === card.id}
                      dragSource={draggedCardIds.has(card.id)}
                      theme={theme}
                      backIndex={Number(preferences.cardBack) || 0}
                      onClick={() => dispatchForSelection(pile, card.id)}
                      onDoubleClick={() => runAutoMove(pile.id, card.id)}
                      onFaceDownClick={() => dispatchForSelection(pile)}
                      onPointerDown={(event) => pointerDown(pile.id, card.id, event)}
                      onPointerMove={pointerMove}
                      onPointerUp={pointerUp}
                      onPointerCancel={pointerCancel}
                    />
                  </span>
                ))}
              </div>
            ))}
            {dragGhost && (
              <DragGhost
                cards={dragGhost.cards}
                theme={theme}
                backIndex={Number(preferences.cardBack) || 0}
                x={dragGhost.x}
                y={dragGhost.y}
              />
            )}
          </div>
        </section>
        <aside className="game-controls">
          <button className="primary-control" onClick={() => act(() => session.hint())}>
            ✧ <span>{t.hint}</span>
          </button>
          <button
            onClick={() => {
              const completed = session.autoComplete();
              notify(
                completed
                  ? language === 'ja'
                    ? '自動完成しました'
                    : 'Auto-completed'
                  : language === 'ja'
                    ? '自動完成できるカードがありません'
                    : 'Nothing to auto-complete',
              );
              redraw((value) => value + 1);
            }}
          >
            ↥ <span>{t.auto}</span>
          </button>
          <div className="control-rule" />
          <button disabled={!snapshot.canUndo} onClick={() => act(() => session.undo())}>
            ↶ <span>{t.undo}</span>
            <kbd>⌘Z</kbd>
          </button>
          <button onClick={() => act(() => session.retry())}>
            ⟳ <span>{t.retry}</span>
          </button>
          <button onClick={onNewGame}>
            ＋ <span>{t.newGame}</span>
          </button>
          <div className="action-status" aria-live="polite" role="status">
            {actionStatus}
          </div>
          <div className="tip">
            {language === 'ja'
              ? 'カードをタップして選択、移動先をタップ。空の山もキーボードで選べます。'
              : 'Tap a card, then a destination. Empty piles are keyboard accessible.'}
          </div>
        </aside>
      </div>
      {snapshot.won && (
        <div className="win-banner" role="status">
          <span>✦</span>
          <strong>{t.won}</strong>
          <button onClick={onNewGame}>{t.newGame} →</button>
        </div>
      )}
    </main>
  );
}
