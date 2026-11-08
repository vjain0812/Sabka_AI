'use client';
import { useId } from 'react';
import { Plus, X } from 'lucide-react';
import { useLanguage } from '@/lib/client/language';
import { categories } from '@/lib/domain/brief';
import {
  connectOutcomes,
  connectTopics,
  containsContactDetails,
  type ConnectOutcome,
  type ConnectTopic,
  type ConnectWin,
} from '@/lib/domain/connect';
import { categoryNameEs } from '@/lib/domain/i18n-es';

export type ToolLite = { slug: string; name: string; website: string };
export type ConnectDraft = {
  displayName: string;
  category: string;
  region: string;
  about: string;
  topics: ConnectTopic[];
  wins: ConnectWin[];
};
export const emptyConnectDraft = (): ConnectDraft => ({
  displayName: '',
  category: '',
  region: '',
  about: '',
  topics: ['what_worked'],
  wins: [],
});

export const inputClass =
  'w-full rounded-xl border border-[#d8d8d8] bg-white px-3.5 py-2.5 text-sm text-[#111] outline-none transition-all placeholder:text-[#8a8a8a] focus:border-[#e21833] focus:ring-4 focus:ring-[#e21833]/10';
const labelClass = 'mb-1.5 block text-sm font-semibold text-[#222]';

/** The fields other members will see. Contact details are blocked here and shared in messages. */
export function ConnectFields({
  value,
  onChange,
  tools,
  showWins = true,
  showCategory = true,
}: {
  value: ConnectDraft;
  onChange: (next: ConnectDraft) => void;
  tools?: ToolLite[];
  showWins?: boolean;
  showCategory?: boolean;
}) {
  const { t, locale } = useLanguage();
  const uid = useId();
  const set = <K extends keyof ConnectDraft>(key: K, v: ConnectDraft[K]) =>
    onChange({ ...value, [key]: v });
  const publicError = (text: string) =>
    containsContactDetails(text)
      ? t(
          'Keep emails, phone numbers and links out of the public profile. Share them in a message once you connect.',
          'No pongas correos, teléfonos ni enlaces en el perfil público. Compártelos en un mensaje cuando ya estén conectados.',
        )
      : null;
  const errors = {
    displayName: publicError(value.displayName),
    region: publicError(value.region),
    about: publicError(value.about),
  };
  const err = (id: string, msg: string | null) =>
    msg ? (
      <p id={id} role="alert" className="mt-1.5 text-xs font-semibold text-[#c41230]">
        {msg}
      </p>
    ) : null;
  function toggleTopic(id: ConnectTopic) {
    const has = value.topics.includes(id);
    if (!has && value.topics.length >= 6) return;
    set('topics', has ? value.topics.filter((x) => x !== id) : [...value.topics, id]);
  }
  const setWin = (i: number, patch: Partial<ConnectWin>) =>
    set(
      'wins',
      value.wins.map((w, k) => (k === i ? { ...w, ...patch } : w)),
    );
  return (
    <div className="brand-ui grid gap-5">
      <div className={showCategory ? 'grid gap-5 sm:grid-cols-2' : ''}>
        <div>
          <label htmlFor={`${uid}-name`} className={labelClass}>
            {t('Name others will see', 'Nombre que verán los demás')}
          </label>
          <input
            id={`${uid}-name`}
            className={inputClass}
            value={value.displayName}
            maxLength={60}
            autoComplete="organization"
            aria-invalid={Boolean(errors.displayName)}
            aria-describedby={`${uid}-name-hint${errors.displayName ? ` ${uid}-name-err` : ''}`}
            placeholder={t('e.g. Maria’s Bakery', 'p. ej. Panadería de María')}
            onChange={(e) => set('displayName', e.target.value)}
          />
          <p id={`${uid}-name-hint`} className="mt-1.5 text-xs text-[#666]">
            {t('Your business name or a nickname.', 'El nombre de tu negocio o un apodo.')}
          </p>
          {err(`${uid}-name-err`, errors.displayName)}
        </div>
        {showCategory && (
          <div>
            <label htmlFor={`${uid}-cat`} className={labelClass}>
              {t('Type of business', 'Tipo de negocio')}
            </label>
            <select
              id={`${uid}-cat`}
              className={inputClass}
              value={value.category}
              onChange={(e) => set('category', e.target.value)}
            >
              <option value="">{t('Choose one', 'Elige uno')}</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {locale === 'es' ? categoryNameEs[c] ?? c : c}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div>
        <label htmlFor={`${uid}-region`} className={labelClass}>
          {t('City or region (optional)', 'Ciudad o región (opcional)')}
        </label>
        <input
          id={`${uid}-region`}
          className={inputClass}
          value={value.region}
          maxLength={60}
          aria-invalid={Boolean(errors.region)}
          aria-describedby={errors.region ? `${uid}-region-err` : undefined}
          placeholder={t('e.g. Austin, TX', 'p. ej. Austin, TX')}
          onChange={(e) => set('region', e.target.value)}
        />
        {err(`${uid}-region-err`, errors.region)}
      </div>
      <div>
        <label htmlFor={`${uid}-about`} className={labelClass}>
          {t('About your business (optional)', 'Sobre tu negocio (opcional)')}
        </label>
        <textarea
          id={`${uid}-about`}
          className={`${inputClass} min-h-[88px] resize-y`}
          value={value.about}
          maxLength={280}
          aria-invalid={Boolean(errors.about)}
          aria-describedby={errors.about ? `${uid}-about-err` : undefined}
          placeholder={t(
            'What you do, and what you’d like to learn from others.',
            'A qué te dedicas y qué te gustaría aprender de otros.',
          )}
          onChange={(e) => set('about', e.target.value)}
        />
        <p className="mt-1 text-right text-[11px] text-[#666]">{value.about.length}/280</p>
        {err(`${uid}-about-err`, errors.about)}
      </div>
      <fieldset>
        <legend className={labelClass}>
          {t('Happy to talk about', 'Me gusta hablar de')}{' '}
          <span className="font-normal text-[#666]">{t('(up to 6)', '(hasta 6)')}</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {connectTopics.map((topic) => {
            const on = value.topics.includes(topic.id);
            return (
              <button
                type="button"
                key={topic.id}
                aria-pressed={on}
                onClick={() => toggleTopic(topic.id)}
                className={`rounded-full border px-3.5 py-2 text-xs font-semibold transition-all ${
                  on
                    ? 'border-[#e21833] bg-[#e21833] text-white'
                    : 'border-[#d5d5d5] bg-white text-[#444] hover:border-[#e21833]'
                }`}
              >
                {topic[locale]}
              </button>
            );
          })}
        </div>
      </fieldset>
      {showWins && tools && (
        <fieldset>
          <legend className={labelClass}>
            {t('What worked (or didn’t) for you', 'Lo que te funcionó (o no)')}{' '}
            <span className="font-normal text-[#666]">
              {t('(optional, up to 3)', '(opcional, hasta 3)')}
            </span>
          </legend>
          <p className="mb-3 text-xs leading-5 text-[#666]">
            {t(
              'Your own experience, shown as “self-reported”. SABKA AI doesn’t verify it. Honest “not for us” notes help others too.',
              'Tu propia experiencia, mostrada como “autodeclarada”. SABKA AI no la verifica. Las notas honestas de “no fue para nosotros” también ayudan.',
            )}
          </p>
          <ul className="grid gap-3">
            {value.wins.map((win, i) => {
              const noteError = publicError(win.note);
              return (
                <li key={i} className="rounded-2xl border border-[#e2e2df] bg-[#fafaf8] p-3">
                  <div className="grid gap-2 sm:grid-cols-[1.2fr_1fr_auto]">
                    <select
                      aria-label={t('Tool', 'Herramienta')}
                      className={inputClass}
                      value={win.toolSlug}
                      onChange={(e) => setWin(i, { toolSlug: e.target.value })}
                    >
                      <option value="">{t('Choose a tool', 'Elige una herramienta')}</option>
                      {tools.map((tool) => (
                        <option key={tool.slug} value={tool.slug}>
                          {tool.name}
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label={t('How it went', 'Cómo te fue')}
                      className={inputClass}
                      value={win.outcome}
                      onChange={(e) => setWin(i, { outcome: e.target.value as ConnectOutcome })}
                    >
                      {connectOutcomes.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o[locale]}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      aria-label={t('Remove this note', 'Quitar esta nota')}
                      onClick={() =>
                        set(
                          'wins',
                          value.wins.filter((_, k) => k !== i),
                        )
                      }
                      className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#d8d8d8] bg-white text-[#555] hover:border-[#e21833]"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                  <input
                    aria-label={t('What happened?', '¿Qué pasó?')}
                    className={`${inputClass} mt-2`}
                    value={win.note}
                    maxLength={160}
                    placeholder={t('One sentence on what happened', 'Una frase sobre lo que pasó')}
                    onChange={(e) => setWin(i, { note: e.target.value })}
                  />
                  {noteError && (
                    <p role="alert" className="mt-1.5 text-xs font-semibold text-[#c41230]">
                      {noteError}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
          {value.wins.length < 3 && (
            <button
              type="button"
              onClick={() =>
                set('wins', [...value.wins, { toolSlug: '', outcome: 'worked', note: '' }])
              }
              className="mt-3 flex items-center gap-1.5 rounded-full border border-dashed border-[#bbb] px-4 py-2 text-xs font-bold text-[#333] hover:border-[#e21833]"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />{' '}
              {t('Add a note', 'Agregar una nota')}
            </button>
          )}
        </fieldset>
      )}
    </div>
  );
}

/** What the server accepts: complete wins only. */
export function draftToInput(draft: ConnectDraft, fallbackCategory = 'Other') {
  return {
    displayName: draft.displayName.trim(),
    category: draft.category || fallbackCategory,
    region: draft.region.trim(),
    about: draft.about.trim(),
    topics: draft.topics,
    wins: draft.wins
      .filter((w) => w.toolSlug && w.note.trim())
      .map((w) => ({ toolSlug: w.toolSlug, outcome: w.outcome, note: w.note.trim() })),
    visible: true,
    consent: true as const,
  };
}
