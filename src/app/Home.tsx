import { useState } from 'react';
import type { CSSProperties } from 'react';
import { interpolate, text } from './i18n';
import type { GameDefinition, Language } from './types';

export function Home({
  language,
  games,
  favorites,
  current,
  onStart,
  onSettings,
}: {
  language: Language;
  games: GameDefinition[];
  recent: string[];
  favorites: string[];
  current?: string;
  onStart: (id: string, continueGame?: boolean) => void;
  onSettings: () => void;
}) {
  const t = text(language);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const filtered = games.filter(
    (game) =>
      `${game.name.ja} ${game.name.en} ${game.family.ja}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === 'all' || game.family.en === filter),
  );
  return (
    <main className="home">
      <header className="topbar">
        <div className="brand-mark">✦</div>
        <div className="brand">
          <h1>{t.collection}</h1>
          <p>{t.subtitle}</p>
        </div>
        <div className="top-actions">
          <button
            className="lang-button"
            onClick={() => document.dispatchEvent(new CustomEvent('toggle-language'))}
          >
            {t.language}
          </button>
          <button className="icon-button" onClick={onSettings} aria-label={t.settings}>
            ⚙
          </button>
        </div>
      </header>
      <section className="hero">
        <div>
          <p className="eyebrow">{t.dailyEyebrow}</p>
          <h2>{t.dailyTitle}</h2>
          <p>{interpolate(t.dailyDescription, { count: games.length })}</p>
        </div>
        <div className="hero-cards">
          <div className="hero-card h1">♠</div>
          <div className="hero-card h2">♥</div>
          <div className="hero-card h3">♣</div>
        </div>
      </section>
      {current && (
        <button className="continue-card" onClick={() => onStart(current, true)}>
          <span className="continue-icon">↻</span>
          <span>
            <small>{t.continue}</small>
            <strong>{games.find((game) => game.id === current)?.name[language]}</strong>
          </span>
          <b>→</b>
        </button>
      )}
      <section className="library-head">
        <div>
          <p className="eyebrow">{t.libraryEyebrow}</p>
          <h2>{t.allGames}</h2>
        </div>
        <div className="library-tools">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.search}
            aria-label={t.search}
          />
          <select value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="all">{t.allFamilies}</option>
            {Array.from(new Set(games.map((game) => game.family.en))).map((family) => {
              const familyDefinition = games.find((game) => game.family.en === family)?.family;
              return (
                <option key={family} value={family}>
                  {familyDefinition?.[language] ?? family}
                </option>
              );
            })}
          </select>
        </div>
      </section>
      <div className="game-grid">
        {filtered.map((game) => (
          <article
            className="game-tile"
            key={game.id}
            style={{ '--accent': game.accent } as CSSProperties}
            role="button"
            tabIndex={0}
            aria-label={game.name[language]}
            onClick={() => onStart(game.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onStart(game.id);
              }
            }}
          >
            <div className="tile-art">
              <span>{game.name.en.slice(0, 1)}</span>
              <div className="mini-card mini-a" />
              <div className="mini-card mini-b" />
            </div>
            <div className="tile-copy">
              <div className="tile-meta">
                <span>{game.family[language]}</span>
                <span
                  className={`favorite ${favorites.includes(game.id) ? 'active' : ''}`}
                  aria-hidden="true"
                >
                  ♥
                </span>
              </div>
              <h3>{game.name[language]}</h3>
              <p>{game.description[language]}</p>
              <div className="tile-foot">
                <span>
                  {'★'.repeat(game.difficulty)}
                  <em>{'★'.repeat(5 - game.difficulty)}</em>
                </span>
                <span>
                  {game.decks} {t.decks}
                </span>
                <span className="text-button">
                  {t.start} <b>→</b>
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>
      {filtered.length === 0 && <p className="empty-state">{t.noResults}</p>}
      <footer>
        <span>Solitaire Collections · v0.6.4</span>
        <span>{t.offlineByDesign}</span>
      </footer>
    </main>
  );
}
