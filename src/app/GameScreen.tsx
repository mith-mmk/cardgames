import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import { CardView } from './CardView';
import { ClearEffect } from './ClearEffect';
import { DragGhost } from './DragGhost';
import { GameHelp } from './GameHelp';
import { interpolate, text } from './i18n';
import { storage } from './persistence';
import type { Card, GameDefinition, GameSession, Language, Pile } from './types';
import { clock, isCompactLandscape, pileLayout } from './ui';
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
  const [celebrationDismissed, setCelebrationDismissed] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
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
    captureTarget: HTMLElement;
  } | null>(null);
  const cancelDrag = useCallback(() => {
    const active = pointerDrag.current;
    pointerDrag.current = null;
    if (active?.captureTarget.hasPointerCapture?.(active.pointerId))
      active.captureTarget.releasePointerCapture(active.pointerId);
    setDragGhost(null);
    setDropTarget(null);
  }, []);
  const snapshot = session.getSnapshot();
  const piles = snapshot.piles;
  const gridLayout = snapshot.meta.layout as { type?: unknown; size?: unknown } | undefined;
  const layoutType = String(gridLayout?.type ?? '');
  const gridSize = Number(gridLayout?.size);
  const isGridScoring =
    Number.isInteger(gridSize) &&
    gridSize > 0 &&
    piles.filter((pile) => /^g\d+$/.test(pile.id)).length === gridSize;
  const gridScore = Number(snapshot.meta.score ?? 0);
  const gridPhase = snapshot.meta.phase === 'place' ? t.placeDrawnCard : t.drawNextCard;
  const isTriPeaks = layoutType === 'tri-peaks';
  const isBlackHole = layoutType === 'black-hole';
  const compactLandscape = isCompactLandscape();
  const isWideLayout =
    !piles.some((pile) => /^g\d+$/.test(pile.id)) &&
    !isTriPeaks &&
    !isBlackHole &&
    !['clock', 'spider', 'pyramid', 'giza'].includes(definition.id) &&
    (piles.filter((pile) => pile.kind === 'tableau').length >= 9 ||
      piles.filter((pile) => pile.kind === 'cell' || pile.kind === 'reserve').length > 4);
  const isClock = definition.id === 'clock';
  const isPyramid = definition.id === 'pyramid' || definition.id === 'giza';
  const isDenseBoard =
    piles.filter((pile) => pile.kind === 'tableau').length >= 12 ||
    piles.filter((pile) => ['stock', 'waste', 'cell', 'reserve', 'foundation'].includes(pile.kind))
      .length >= 12;
  const isPyramidPile = (pile: Pile) => /^(p|giza)\d+$/.test(pile.id);
  const isPyramidExposed = (pile: Pile) => {
    if (!isPyramid || !isPyramidPile(pile) || !pile.cards.length) return false;
    const prefix = pile.id.startsWith('giza') ? 'giza' : 'p';
    const index = Number(pile.id.slice(prefix.length));
    const row = Math.floor((Math.sqrt(8 * index + 1) - 1) / 2);
    if (row === 6) return true;
    const position = index - (row * (row + 1)) / 2;
    const childBase = ((row + 1) * (row + 2)) / 2;
    return (
      !piles.find((item) => item.id === `${prefix}${childBase + position}`)?.cards.length &&
      !piles.find((item) => item.id === `${prefix}${childBase + position + 1}`)?.cards.length
    );
  };
  const isTriPeaksPile = (pile: Pile) => /^tri\d+$/.test(pile.id);
  const isTriPeaksExposed = (pile: Pile) => {
    if (!isTriPeaks || !isTriPeaksPile(pile) || !pile.cards.length) return false;
    const index = Number(pile.id.slice(3));
    const children: Record<number, number[]> = {
      0: [3, 4],
      1: [5, 6],
      2: [7, 8],
      3: [9, 10],
      4: [10, 11],
      5: [12, 13],
      6: [13, 14],
      7: [15, 16],
      8: [16, 17],
      9: [18, 19],
      10: [19, 20],
      11: [20, 21],
      12: [21, 22],
      13: [22, 23],
      14: [23, 24],
      15: [24, 25],
      16: [25, 26],
      17: [26, 27],
    };
    return (children[index] ?? []).every(
      (child) => !piles.find((item) => item.id === `tri${child}`)?.cards.length,
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
  useEffect(() => {
    const cancelForInterruption = () => cancelDrag();
    const cancelWhenHidden = () => {
      if (document.visibilityState !== 'visible') cancelDrag();
    };
    window.addEventListener('blur', cancelForInterruption);
    window.addEventListener('pagehide', cancelForInterruption);
    document.addEventListener('visibilitychange', cancelWhenHidden);
    return () => {
      window.removeEventListener('blur', cancelForInterruption);
      window.removeEventListener('pagehide', cancelForInterruption);
      document.removeEventListener('visibilitychange', cancelWhenHidden);
      cancelDrag();
    };
  }, [cancelDrag]);
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
  const transferMovesForCard = (pileId: string, cardId: string) =>
    legalMoves().filter(
      (move) => move.type === 'transfer' && move.from === pileId && move.cardIds?.[0] === cardId,
    );
  const pointerDown = (pileId: string, cardId: string, event: ReactPointerEvent<HTMLElement>) => {
    if (!event.isPrimary || event.button !== 0 || pointerDrag.current) return;
    const sourcePile = piles.find((pile) => pile.id === pileId);
    const cardIndex = sourcePile?.cards.findIndex((item) => item.id === cardId) ?? -1;
    const card = cardIndex >= 0 ? sourcePile?.cards[cardIndex] : undefined;
    if (!card?.faceUp || !sourcePile || !transferMovesForCard(pileId, cardId).length) return;
    pointerDrag.current = {
      pileId,
      cardId,
      startX: event.clientX,
      startY: event.clientY,
      pointerId: event.pointerId,
      dragging: false,
      captureTarget: event.currentTarget,
    };
    setDragGhost(null);
  };
  const pointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const active = pointerDrag.current;
    if (!active || event.pointerId !== active.pointerId) return false;
    if (
      !active.dragging &&
      Math.hypot(event.clientX - active.startX, event.clientY - active.startY) < 8
    )
      return false;
    active.dragging = true;
    const sourcePile = piles.find((pile) => pile.id === active.pileId);
    const moves = transferMovesForCard(active.pileId, active.cardId);
    const cards =
      moves[0]?.cardIds
        ?.map((id) => sourcePile?.cards.find((card) => card.id === id))
        .filter((card): card is Card => Boolean(card)) ?? [];
    if (cards.length)
      setDragGhost({
        pileId: active.pileId,
        cards,
        x: event.clientX,
        y: event.clientY,
      });
    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>('[data-pile-id]');
    const targetId = target?.dataset.pileId;
    setDropTarget(targetId && moves.some((move) => move.to === targetId) ? targetId : null);
    return true;
  };
  const pointerUp = (event: ReactPointerEvent<HTMLElement>) => {
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
        notify(t.moved);
      }
    }
    cancelDrag();
    return wasDragging;
  };
  const pointerCancel = (event: ReactPointerEvent<HTMLElement>) => {
    const active = pointerDrag.current;
    if (!active || event.pointerId !== active.pointerId) return;
    cancelDrag();
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
    notify(moved ? t.movedAutomatically : t.noLegalMove);
    if (moved) redraw((value) => value + 1);
  };
  const showHint = () => {
    const hint = session.hint();
    if (!hint) return notify(t.noLegalMove);
    act(() => session.select(hint.sourcePileId, hint.cardId));
    notify(t.hint);
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
    if ((isTriPeaks || isBlackHole) && cardId) {
      const destination = isTriPeaks ? 'waste' : 'hole';
      const direct = moves.find(
        (move) =>
          move.type === 'transfer' &&
          move.from === pile.id &&
          move.to === destination &&
          move.cardIds?.[0] === cardId,
      );
      if (direct) return act(() => session.dispatch(direct));
    }
    if (pile.kind === 'stock') {
      const stockMove = moves.find(
        (move) =>
          (move.type === 'draw' && move.from === pile.id) ||
          (move.type === 'recycle' && move.to === pile.id),
      );
      if (stockMove) {
        act(() => session.dispatch(stockMove));
        if (isGridScoring && stockMove.type === 'draw' && stockMove.to === 'waste') {
          const drawn = session
            .getSnapshot()
            .piles.find((item) => item.id === 'waste')
            ?.cards.at(-1);
          if (drawn) act(() => session.select('waste', drawn.id));
        }
        return;
      }
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
      className={`game-screen game-${definition.id} motion-${preferences.motion} ${preferences.largeCards ? 'large-cards' : ''} ${compactLandscape ? 'compact-landscape' : ''}`}
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
        <div className="game-top-actions">
          <button className="icon-button" onClick={() => setHelpOpen(true)} aria-label={t.help}>
            ?
          </button>
          <button className="icon-button" onClick={onSettings} aria-label={t.settings}>
            ⚙
          </button>
        </div>
      </header>
      <div
        className={`game-layout game-layout-${definition.id} ${isWideLayout ? 'game-wide-layout' : ''}`}
      >
        <section
          className="table-area"
          aria-label={interpolate(t.tableAria, { game: definition.name[language] })}
        >
          <div className="table-stats">
            <span>
              {t.moves} <b>{snapshot.moves}</b>
            </span>
            <span>
              {t.time} <b>{clock(snapshot.elapsedSeconds)}</b>
            </span>
            {isGridScoring && (
              <span>
                {t.score} <b>{gridScore}</b>
              </span>
            )}
            {isGridScoring && <span className="game-phase">{gridPhase}</span>}
          </div>
          <div
            className={`board ${isDenseBoard ? 'dense-board' : ''} ${isGridScoring ? 'grid-board' : ''} ${isTriPeaks ? 'tri-peaks-board' : ''} ${isBlackHole ? 'black-hole-board' : ''}`}
          >
            {piles.map((pile) => (
              <div
                className={`pile dynamic-pile pile-${pile.kind} ${isPyramid && isPyramidPile(pile) && !pile.cards.length ? 'is-empty-pyramid-pile' : ''} ${isPyramid && isPyramidPile(pile) && !isPyramidExposed(pile) ? 'is-covered-pyramid-pile' : ''} ${isTriPeaks && isTriPeaksPile(pile) && !pile.cards.length ? 'is-empty-tri-peaks-pile' : ''} ${isTriPeaks && isTriPeaksPile(pile) && !isTriPeaksExposed(pile) ? 'is-covered-tri-peaks-pile' : ''} ${dropTarget === pile.id ? 'is-drop-target' : ''} ${legalTargetIds.has(pile.id) ? 'is-legal-target' : ''}`}
                data-pile-id={pile.id}
                style={{
                  ...pileLayout(pile, piles),
                  zIndex:
                    isPyramid && isPyramidPile(pile)
                      ? pile.cards.length
                        ? Math.floor(
                            (Math.sqrt(8 * Number(pile.id.replace(/^giza|^p/, '')) + 1) - 1) / 2,
                          ) + 1
                        : 0
                      : isTriPeaks && isTriPeaksPile(pile)
                        ? Math.floor(Number(pile.id.slice(3)) / 3) + 1
                        : undefined,
                }}
                key={pile.id}
                role={
                  isPyramid &&
                  isPyramidPile(pile) &&
                  (!pile.cards.length || !isPyramidExposed(pile))
                    ? undefined
                    : isTriPeaks &&
                        isTriPeaksPile(pile) &&
                        (!pile.cards.length || !isTriPeaksExposed(pile))
                      ? undefined
                      : 'button'
                }
                tabIndex={
                  isPyramid &&
                  isPyramidPile(pile) &&
                  (!pile.cards.length || !isPyramidExposed(pile))
                    ? -1
                    : isTriPeaks &&
                        isTriPeaksPile(pile) &&
                        (!pile.cards.length || !isTriPeaksExposed(pile))
                      ? -1
                      : 0
                }
                aria-label={interpolate(t.pileAria, { kind: t.pileKinds[pile.kind], id: pile.id })}
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
                        pile.kind === 'reserve' && /^gizaReserve\d+$/.test(pile.id)
                          ? `${index * (compactLandscape ? 14 : 30)}px`
                          : pile.kind === 'tableau' &&
                              piles.filter((item) => item.kind === 'tableau').length < 20 &&
                              !isClock
                            ? `${index * (compactLandscape ? (card.faceUp ? 30 : 16) : 30)}px`
                            : 0,
                      zIndex: index,
                    }}
                    key={card.id}
                  >
                    <CardView
                      card={card}
                      language={language}
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
          <div className="game-control-group game-control-group-primary">
            <button className="game-control primary-control" onClick={showHint}>
              ✧ <span>{t.hint}</span>
            </button>
            <button
              className="game-control"
              onClick={() => {
                const completed = session.autoComplete();
                notify(completed ? t.autoCompleted : t.nothingToAutoComplete);
                redraw((value) => value + 1);
              }}
            >
              ↥ <span>{t.auto}</span>
            </button>
          </div>
          <div className="control-rule" />
          <div className="game-control-group game-control-group-session">
            <button
              className="game-control"
              disabled={!snapshot.canUndo}
              onClick={() => act(() => session.undo())}
            >
              ↶ <span>{t.undo}</span>
              <kbd>⌘Z</kbd>
            </button>
            <button
              className="game-control"
              onClick={() => {
                setCelebrationDismissed(false);
                act(() => session.retry());
              }}
            >
              ⟳ <span>{t.retry}</span>
            </button>
            <button
              className="game-control"
              onClick={() => {
                setCelebrationDismissed(false);
                onNewGame();
              }}
            >
              ＋ <span>{t.newGame}</span>
            </button>
          </div>
          <div className="action-status" aria-live="polite" role="status">
            {actionStatus}
          </div>
          <div className="tip">{t.helpTip}</div>
        </aside>
      </div>
      <ClearEffect
        active={snapshot.won && !celebrationDismissed}
        motion={preferences.motion}
        onSkip={() => setCelebrationDismissed(true)}
        skipLabel={t.skipCelebration}
      />
      {helpOpen && (
        <GameHelp definition={definition} language={language} onClose={() => setHelpOpen(false)} />
      )}
      {snapshot.won && (
        <div className="win-banner" role="status">
          <span>✦</span>
          <strong>{t.won}</strong>
          <button
            onClick={() => {
              setCelebrationDismissed(false);
              onNewGame();
            }}
          >
            {t.newGame} →
          </button>
        </div>
      )}
    </main>
  );
}
