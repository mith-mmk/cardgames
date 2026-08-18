import type { Card } from './types';
import { rankName, suitSymbol } from './ui';
import type { ThemeAsset } from './ui';

export function DragGhost({
  cards,
  theme,
  backIndex,
  x,
  y,
}: {
  cards: Card[];
  theme: ThemeAsset;
  backIndex: number;
  x: number;
  y: number;
}) {
  return (
    <div className="drag-ghost" style={{ left: x, top: y }} aria-hidden="true">
      {cards.map((card, index) => {
        const red = card.suit === 'hearts' || card.suit === 'diamonds';
        return (
          <div
            className={`playing-card drag-ghost-card ${card.faceUp ? 'face-up' : 'face-down'}`}
            style={{ top: `${index * 30}px`, zIndex: index }}
            key={card.id}
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
                    <img className="court-art" src={theme.courtArtwork} alt="" />
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
              <img className="card-back" src={theme.backs[backIndex] ?? theme.backs[0]} alt="" />
            )}
          </div>
        );
      })}
    </div>
  );
}
