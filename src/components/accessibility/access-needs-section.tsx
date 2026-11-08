'use client';
import { Accessibility, Check } from 'lucide-react';
import { accessNeeds, needCopy, type AccessNeed } from '@/lib/domain/accessibility';
import { setDisplay, useDisplay } from '@/lib/client/display';
import { useLanguage } from '@/lib/client/language';

/** Optional step: what makes apps harder for the owner. Plain words, no medical labels needed. */
export function AccessNeedsSection({
  step,
  value,
  onChange,
}: {
  step: string;
  value: AccessNeed[];
  onChange: (next: AccessNeed[]) => void;
}) {
  const { t, locale } = useLanguage();
  const display = useDisplay();
  const toggle = (need: AccessNeed) =>
    onChange(
      value.includes(need)
        ? value.filter((n) => n !== need)
        : accessNeeds.filter((n) => n === need || value.includes(n)),
    );
  const wantsBigText = value.includes('low_vision') && !display.largeText;
  const wantsReader =
    value.some((n) => ['low_vision', 'blind', 'reading', 'new_to_tech'].includes(n)) &&
    !display.readAloud;
  return (
    <section className="simple-section" aria-labelledby="access-heading">
      <div className="simple-section-heading">
        <span>{step}</span>
        <div>
          <h2 id="access-heading">
            {t('Make it easier for you', 'Hazlo más fácil para ti')}{' '}
            <small className="muted">({t('optional', 'opcional')})</small>
          </h2>
          <p>
            {t(
              'Does anything make apps harder for you? We’ll favour tools that suit you and suggest helpers, many of them free and already on your phone.',
              '¿Algo te hace más difícil usar apps? Priorizaremos herramientas que te convengan y te sugeriremos ayudas, muchas gratis y ya incluidas en tu teléfono.',
            )}
          </p>
        </div>
      </div>
      <fieldset>
        <legend className="sr-only">
          {t('Things that make apps harder', 'Cosas que dificultan usar apps')}
        </legend>
        <div className="access-needs">
          {accessNeeds.map((need) => {
            const copy = needCopy[need];
            const checked = value.includes(need);
            return (
              <label key={need} className={checked ? 'selected' : ''}>
                <input type="checkbox" checked={checked} onChange={() => toggle(need)} />
                <span className="access-check" aria-hidden="true">
                  {checked && <Check size={14} />}
                </span>
                <span>
                  <strong>{locale === 'es' ? copy.es : copy.en}</strong>
                  <span>{locale === 'es' ? copy.hintEs : copy.hintEn}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
      {(wantsBigText || wantsReader) && (
        <div className="access-quick">
          <Accessibility size={18} aria-hidden="true" />
          <span>{t('You can also change this page:', 'También puedes cambiar esta página:')}</span>
          {wantsBigText && (
            <button
              type="button"
              className="button button-secondary"
              onClick={() => setDisplay({ largeText: true })}
            >
              {t('Turn on larger text', 'Activar texto más grande')}
            </button>
          )}
          {wantsReader && (
            <button
              type="button"
              className="button button-secondary"
              onClick={() => setDisplay({ readAloud: true })}
            >
              {t('Add read-aloud buttons', 'Añadir lectura en voz alta')}
            </button>
          )}
        </div>
      )}
      <p className="small muted">
        {t(
          'Private: used only by our matching rules on this request. Never sent to an AI model and never saved on our servers.',
          'Privado: solo lo usan nuestras reglas de búsqueda en esta solicitud. Nunca se envía a un modelo de IA ni se guarda en nuestros servidores.',
        )}
      </p>
    </section>
  );
}
