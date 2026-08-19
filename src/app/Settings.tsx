import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { interpolate, text } from './i18n';
import { storage } from './persistence';
import type { Language, MotionMode } from './types';
import type { ThemeAsset } from './ui';

export function Settings({
  preferences,
  language,
  themes,
  onChange,
  onClose,
}: {
  preferences: ReturnType<typeof storage.get>['preferences'];
  language: Language;
  themes: ThemeAsset[];
  onChange: (next: ReturnType<typeof storage.get>['preferences']) => void;
  onClose: () => void;
}) {
  const t = text(language);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    restoreRef.current = document.activeElement as HTMLElement;
    closeRef.current?.focus();
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button,select,input,[tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hasAttribute('disabled'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      restoreRef.current?.focus();
    };
  }, [onClose]);
  return (
    <div
      className="modal-scrim"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="settings-modal"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        <div className="modal-head">
          <h2 id="settings-title">{t.settings}</h2>
          <button ref={closeRef} className="icon-button" onClick={onClose} aria-label={t.close}>
            ×
          </button>
        </div>
        <label>
          {t.theme}
          <div className="theme-picker">
            {themes.map((theme) => (
              <button
                key={theme.id}
                className={`theme-swatch ${preferences.theme === theme.id ? 'active' : ''}`}
                style={{ '--swatch': theme.color ?? '#c3e86a' } as CSSProperties}
                onClick={() => onChange({ ...preferences, theme: theme.id })}
              >
                <span />
                {theme.name[language]}
              </button>
            ))}
          </div>
        </label>
        <label>
          {t.cardBack}
          <div className="back-picker">
            {(themes.find((theme) => theme.id === preferences.theme)?.backs ?? []).map(
              (url, index) => (
                <button
                  key={url}
                  className={Number(preferences.cardBack) === index ? 'active' : ''}
                  onClick={() => onChange({ ...preferences, cardBack: String(index) })}
                >
                  <img
                    src={url}
                    alt={interpolate(t.cardBackAlt, { name: t.cardBack, number: index + 1 })}
                  />
                </button>
              ),
            )}
          </div>
        </label>
        <label>
          {t.motion}
          <select
            value={preferences.motion}
            onChange={(event) =>
              onChange({
                ...preferences,
                motion: event.target.value as MotionMode,
              })
            }
          >
            <option value="standard">{t.standard}</option>
            <option value="reduced">{t.reduced}</option>
            <option value="none">{t.none}</option>
          </select>
        </label>
      </section>
    </div>
  );
}
