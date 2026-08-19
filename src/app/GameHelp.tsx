import { interpolate, text } from './i18n';
import { ModalDialog } from './ModalDialog';
import { EXPANSION_CATALOG } from './expansionCatalog';
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
  const fallbackRules =
    language === 'ja'
      ? {
          goal: definition.description.ja,
          steps: [
            '表向きで動かせるカードと、移動先の候補を確認します。',
            '完成札へ送れるカードを優先して、場札と予備札を整理します。',
            '山札や再配札がある場合は、次の手を残せる順序で使います。',
          ],
        }
      : {
          goal: definition.description.en,
          steps: [
            'Check the exposed cards and their legal destinations.',
            'Prioritize foundation moves while organizing tableau and reserve cards.',
            'Use the stock or redeal only when it preserves future options.',
          ],
        };
  const expansionRules =
    EXPANSION_CATALOG[definition.id as keyof typeof EXPANSION_CATALOG]?.help[language];
  const rules =
    t.gameHelp[definition.id as keyof typeof t.gameHelp] ?? expansionRules ?? fallbackRules;
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
