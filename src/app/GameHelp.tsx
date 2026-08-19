import { interpolate, text } from './i18n';
import { ModalDialog } from './ModalDialog';
import type { GameDefinition, Language } from './types';

export function GameHelp({
  definition,
  language,
  onClose,
}: {
  definition: GameDefinition;
  language: Language;
  onClose: () => void;
}) {
  const t = text(language);
  const rules = t.gameHelp[definition.id as keyof typeof t.gameHelp] ?? t.gameHelp.klondike;
  return (
    <ModalDialog
      className="game-help-modal"
      closeLabel={t.close}
      onClose={onClose}
      title={interpolate(t.helpGameTitle, { game: definition.name[language] })}
      titleId="game-help-title"
    >
      <section className="help-section">
        <h3>{t.helpGoal}</h3>
        <p>{rules.goal}</p>
      </section>
      <section className="help-section">
        <h3>{t.helpRules}</h3>
        <ol>
          {rules.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>
      <section className="help-section help-controls-section">
        <h3>{t.helpControls}</h3>
        <ul>
          {t.helpControlsItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </ModalDialog>
  );
}
