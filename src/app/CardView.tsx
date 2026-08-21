import { useEffect, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { interpolate, text } from './i18n';
import type { Card, Language } from './types';
import { rankName, suitSymbol } from './ui';
import type { ThemeAsset } from './ui';

export function CardView({
  card,
  language,
  selected,
  dragSource,
  onClick,
  onDoubleClick,
  onFaceDownClick,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  theme,
  backIndex,
  tabIndex,
}: {
  card: Card;
  language: Language;
  selected: boolean;
  dragSource?: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
  onFaceDownClick?: () => void;
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLButtonElement>) => boolean;
  onPointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => boolean;
  onPointerCancel?: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  theme: ThemeAsset;
  backIndex: number;
  tabIndex?: number;
}) {
  const t = text(language);
  const red = card.suit === 'hearts' || card.suit === 'diamonds';
  const pointerDragging = useRef(false);
  const suppressClick = useRef(false);
  const pointerId = useRef<number | null>(null);
  const normalPointerUp = useRef(false);
  const doubleHandled = useRef(false);
  useEffect(() => {
    const resetInterruptedPointer = () => {
      pointerDragging.current = false;
      suppressClick.current = false;
      pointerId.current = null;
      normalPointerUp.current = false;
    };
    window.addEventListener('blur', resetInterruptedPointer);
    window.addEventListener('pagehide', resetInterruptedPointer);
    const resetWhenHidden = () => {
      if (document.visibilityState !== 'visible') resetInterruptedPointer();
    };
    document.addEventListener('visibilitychange', resetWhenHidden);
    return () => {
      window.removeEventListener('blur', resetInterruptedPointer);
      window.removeEventListener('pagehide', resetInterruptedPointer);
      document.removeEventListener('visibilitychange', resetWhenHidden);
    };
  }, []);
  const handleAutoMove = () => {
    if (pointerDragging.current || doubleHandled.current) return;
    doubleHandled.current = true;
    onDoubleClick();
    window.setTimeout(() => {
      doubleHandled.current = false;
    }, 0);
  };
  return (
    <button
      className={`playing-card ${card.faceUp ? 'face-up' : 'face-down'} ${selected ? 'is-selected' : ''} ${dragSource ? 'is-drag-source' : ''}`}
      data-card-id={card.id}
      data-rank={card.faceUp ? rankName(card.rank) : undefined}
      aria-label={
        card.faceUp
          ? interpolate(t.faceUpCard, { rank: rankName(card.rank), suit: t.suits[card.suit] })
          : t.faceDownCard
      }
      tabIndex={tabIndex}
      onPointerDown={(event) => {
        if (
          pointerId.current !== null &&
          !event.currentTarget.hasPointerCapture?.(pointerId.current)
        )
          pointerId.current = null;
        if (pointerId.current !== null && event.pointerId !== pointerId.current) return;
        pointerDragging.current = false;
        pointerId.current = null;
        normalPointerUp.current = false;
        suppressClick.current = false;
        if (card.faceUp && event.isPrimary && event.button === 0) {
          pointerId.current = event.pointerId;
          event.currentTarget.setPointerCapture?.(event.pointerId);
          onPointerDown(event);
        }
      }}
      onPointerMove={(event) => {
        if (pointerId.current !== null && event.pointerId !== pointerId.current) return;
        if (onPointerMove(event)) {
          pointerDragging.current = true;
          suppressClick.current = true;
        }
      }}
      onPointerUp={(event) => {
        if (pointerId.current !== null && event.pointerId !== pointerId.current) return;
        const didDrag = onPointerUp(event);
        const wasDragging = didDrag || pointerDragging.current;
        if (!card.faceUp && event.isPrimary && event.button === 0) {
          onFaceDownClick?.();
          event.preventDefault();
          suppressClick.current = true;
          normalPointerUp.current = true;
        }
        if (wasDragging) {
          event.preventDefault();
          suppressClick.current = true;
          normalPointerUp.current = true;
        }
        pointerDragging.current = false;
        pointerId.current = null;
      }}
      onPointerCancel={(event) => {
        if (pointerId.current !== null && event.pointerId !== pointerId.current) return;
        onPointerCancel?.(event);
        pointerDragging.current = false;
        pointerId.current = null;
        suppressClick.current = false;
        normalPointerUp.current = false;
      }}
      onLostPointerCapture={(event) => {
        if (pointerId.current !== null && event.pointerId !== pointerId.current) return;
        onPointerCancel?.(event);
        pointerDragging.current = false;
        pointerId.current = null;
        if (!normalPointerUp.current) suppressClick.current = false;
        normalPointerUp.current = false;
      }}
      onClick={(event) => {
        if (suppressClick.current) {
          suppressClick.current = false;
          event.stopPropagation();
          return;
        }
        if (!card.faceUp) {
          event.stopPropagation();
          if (event.detail <= 1) onFaceDownClick?.();
          return;
        }
        event.stopPropagation();
        if (pointerDragging.current) return;
        if (event.detail === 2) handleAutoMove();
        else if (event.detail <= 1) onClick();
      }}
      onDoubleClick={(event) => {
        if (card.faceUp) event.stopPropagation();
        handleAutoMove();
      }}
    >
      {card.faceUp ? (
        <>
          {card.rank < 11 && (
            <>
              <span className={`card-corner card-corner-top ${red ? 'red' : ''}`}>
                {rankName(card.rank)}
                <small>{suitSymbol(card.suit)}</small>
              </span>
              <span className={`card-corner card-corner-bottom ${red ? 'red' : ''}`}>
                {rankName(card.rank)}
                <small>{suitSymbol(card.suit)}</small>
              </span>
            </>
          )}
          {card.rank >= 11 ? (
            <>
              <span className={`court-badge court-badge-top ${red ? 'red' : ''}`}>
                {rankName(card.rank)}
                <small>{suitSymbol(card.suit)}</small>
              </span>
              <img className="court-art" src={theme.courtArtwork} alt="" draggable={false} />
              <span className={`court-badge court-badge-bottom ${red ? 'red' : ''}`}>
                {rankName(card.rank)}
                <small>{suitSymbol(card.suit)}</small>
              </span>
            </>
          ) : (
            <span className={`card-center ${red ? 'red' : ''}`}>{suitSymbol(card.suit)}</span>
          )}
        </>
      ) : (
        <img
          className="card-back"
          src={theme.backs[backIndex] ?? theme.backs[0]}
          alt=""
          draggable={false}
        />
      )}
    </button>
  );
}
