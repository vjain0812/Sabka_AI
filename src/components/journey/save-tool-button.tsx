'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { Bookmark, BookmarkCheck, ChevronRight, LockKeyhole } from 'lucide-react';
import { saveTool, useJourney } from '@/lib/client/journey';
import { useLanguage } from '@/lib/client/language';
import type { BusinessBrief } from '@/lib/domain/brief';

/** Save a recommendation to My AI Journey. The first save asks for consent. */
export function SaveToolButton({
  slug,
  name,
  brief,
}: {
  slug: string;
  name: string;
  brief: BusinessBrief;
}) {
  const { t } = useLanguage();
  const journey = useJourney();
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  function ask() {
    setAsking(true);
    dialog.current?.showModal();
  }
  const saved = journey.view?.journey.tools.some((x) => x.slug === slug) ?? false;

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await saveTool(slug, brief);
      dialog.current?.close();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  if (saved)
    return (
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 rounded-full bg-[#111] px-3 py-1.5 text-xs font-bold text-[#ffd200]"
      >
        <BookmarkCheck className="h-3.5 w-3.5" aria-hidden="true" />
        {t('Saved · My AI Journey', 'Guardada · Mi recorrido IA')}
        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    );
  return (
    <>
      <button
        type="button"
        disabled={busy || journey.status === 'loading'}
        // Signed-in owners agreed to storage when creating their account.
        onClick={() => (journey.identity || journey.account ? void save() : ask())}
        className="inline-flex items-center gap-1.5 rounded-full border border-[#111] bg-white px-3 py-1.5 text-xs font-bold text-[#111] hover:bg-[#fff4bf] disabled:opacity-60"
      >
        <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
        {busy ? t('Saving…', 'Guardando…') : t('Save this tool', 'Guardar esta herramienta')}
        <span className="sr-only">: {name}</span>
      </button>
      {error && !asking && (
        <span role="alert" className="text-xs text-[#9a3632]">
          {error}
        </span>
      )}
      <dialog
        ref={dialog}
        onClose={() => setAsking(false)}
        aria-labelledby={`save-${slug}-title`}
        className="m-auto w-[min(480px,calc(100vw-32px))] rounded-[24px] p-0 backdrop:bg-black/50"
      >
        <div className="brand-ui p-6">
          <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#ffd200] text-black">
            <LockKeyhole className="h-5 w-5" aria-hidden="true" />
          </span>
          <h2 id={`save-${slug}-title`} className="mt-4 text-xl font-semibold tracking-[-0.02em]">
            {t('Start My AI Journey?', '¿Empezar Mi recorrido IA?')}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#444]">
            {t(
              'So you can come back tomorrow, we’ll keep your business type, the problem you described, your limits and the tools you save. Your business name is kept only if you typed one.',
              'Para que puedas volver mañana, guardaremos tu tipo de negocio, el problema que describiste, tus límites y las herramientas que guardes. El nombre de tu negocio solo se guarda si lo escribiste.',
            )}
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6 text-[#444]">
            <li>
              {t(
                'No account or email. A private key stays in this browser.',
                'Sin cuenta ni correo. Una clave privada se queda en este navegador.',
              )}
            </li>
            <li>
              {t(
                'Your accessibility answers are not saved.',
                'Tus respuestas de accesibilidad no se guardan.',
              )}
            </li>
            <li>
              {t(
                'You can delete everything at any time from My AI Journey.',
                'Puedes borrarlo todo cuando quieras desde Mi recorrido IA.',
              )}
            </li>
          </ul>
          {error && (
            <p role="alert" className="mt-3 text-sm font-semibold text-[#9a3632]">
              {error}
            </p>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => void save()}
              className="rounded-full bg-[#ffd200] px-5 py-3 text-sm font-bold text-black disabled:opacity-60"
            >
              {busy ? t('Saving…', 'Guardando…') : t('Yes, save it', 'Sí, guardarla')}
            </button>
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              className="rounded-full border border-[#d8d8d8] px-5 py-3 text-sm font-semibold"
            >
              {t('Not now', 'Ahora no')}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
