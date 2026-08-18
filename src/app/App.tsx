import { useCallback, useEffect, useMemo, useState } from 'react';
import { createSession, gameCatalog } from './engineAdapter';
import { GameScreen } from './GameScreen';
import { Home } from './Home';
import { storage } from './persistence';
import { Settings } from './Settings';
import type { GameSession, Language } from './types';
import { fallbackThemes } from './ui';
import type { ThemeManifest } from './ui';

export default function App() {
  const persisted = useMemo(() => storage.get(), []);
  const [language, setLanguage] = useState<Language>(persisted.preferences.language);
  const [preferences, setPreferences] = useState(persisted.preferences);
  const [manifest, setManifest] = useState<ThemeManifest>({ themes: fallbackThemes });
  const [page, setPage] = useState<'home' | 'game'>('home');
  const [activeId, setActiveId] = useState<string>();
  const [session, setSession] = useState<GameSession>();
  const [settings, setSettings] = useState(false);

  const games = useMemo(() => gameCatalog(), []);
  const active = games.find((game) => game.id === activeId);
  const themes = manifest.themes.length ? manifest.themes : fallbackThemes;
  const selectedTheme = themes.find((theme) => theme.id === preferences.theme) ?? themes[0];

  useEffect(() => {
    fetch('/themes/manifest.json')
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((value: ThemeManifest) => {
        if (Array.isArray(value.themes) && value.themes.length) setManifest(value);
      })
      .catch(() => undefined);
  }, []);

  const startGame = useCallback((gameId: string) => {
    setActiveId(gameId);
    setSession(createSession(gameId));
    setPage('game');
  }, []);

  const updatePreferences = useCallback((next: typeof preferences) => {
    setPreferences(next);
    setLanguage(next.language);
    storage.setPreferences(next);
  }, []);

  const toggleLanguage = useCallback(() => {
    setPreferences((current) => {
      const language: Language = current.language === 'ja' ? 'en' : 'ja';
      const next = { ...current, language };
      setLanguage(language);
      storage.setPreferences(next);
      return next;
    });
  }, []);

  useEffect(() => {
    document.addEventListener('toggle-language', toggleLanguage);
    return () => document.removeEventListener('toggle-language', toggleLanguage);
  }, [toggleLanguage]);

  return (
    <div className={`app-shell theme-${preferences.theme}`}>
      <div className="ambient" />
      {page === 'home' ? (
        <Home
          language={language}
          games={games}
          recent={persisted.recent}
          favorites={persisted.favorites}
          current={persisted.current?.gameId}
          onStart={startGame}
          onSettings={() => setSettings(true)}
        />
      ) : active && session ? (
        <GameScreen
          language={language}
          definition={active}
          session={session}
          preferences={preferences}
          theme={selectedTheme}
          onBack={() => setPage('home')}
          onNewGame={() => startGame(active.id)}
          onSettings={() => setSettings(true)}
        />
      ) : null}
      {settings && (
        <Settings
          language={language}
          preferences={preferences}
          themes={themes}
          onChange={updatePreferences}
          onClose={() => setSettings(false)}
        />
      )}
    </div>
  );
}
