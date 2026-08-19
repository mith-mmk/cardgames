import type { CSSProperties } from 'react';
import { interpolate, text } from './i18n';
import { ModalDialog } from './ModalDialog';
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
  return (
    <ModalDialog
      className="settings-modal"
      closeLabel={t.close}
      onClose={onClose}
      title={t.settings}
      titleId="settings-title"
    >
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
    </ModalDialog>
  );
}
