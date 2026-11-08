'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { Accessibility } from 'lucide-react';
import { setDisplay, useDisplay, type Display } from '@/lib/client/display';
import { useLanguage } from '@/lib/client/language';

/** Header menu for display preferences. Saved on this device only. */
export function DisplayMenu() {
  const { t } = useLanguage();
  const display = useDisplay();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        button.current?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);
  const options: [keyof Display, string, string][] = [
    [
      'largeText',
      t('Larger text', 'Texto más grande'),
      t('Makes everything bigger.', 'Agranda todo.'),
    ],
    [
      'highContrast',
      t('Stronger contrast', 'Más contraste'),
      t('Darker text and clearer outlines.', 'Texto más oscuro y bordes más claros.'),
    ],
    [
      'calmMotion',
      t('Less motion', 'Menos movimiento'),
      t('Stops animations.', 'Detiene las animaciones.'),
    ],
    [
      'readAloud',
      t('Read-aloud buttons', 'Botones de lectura en voz alta'),
      t('Adds “Read aloud” to your results.', 'Añade “Leer en voz alta” a tus resultados.'),
    ],
  ];
  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold text-white/85 hover:text-white"
      >
        <Accessibility className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">{t('Accessibility', 'Accesibilidad')}</span>
        <span className="sr-only sm:hidden">{t('Accessibility', 'Accesibilidad')}</span>
      </button>
      {open && (
        <div
          id={panelId}
          role="group"
          aria-label={t('Display settings', 'Ajustes de pantalla')}
          className="absolute right-0 top-[calc(100%+10px)] z-50 w-[min(320px,calc(100vw-32px))] rounded-2xl border border-[#e2e2df] bg-white p-4 text-[#111] shadow-[0_18px_48px_rgba(0,0,0,.25)]"
        >
          <p className="mb-3 text-sm font-bold">
            {t('Make SABKA easier to use', 'Haz SABKA más fácil de usar')}
          </p>
          <ul className="space-y-1">
            {options.map(([key, label, hint]) => (
              <li key={key}>
                <button
                  type="button"
                  role="switch"
                  aria-checked={display[key]}
                  onClick={() => setDisplay({ [key]: !display[key] })}
                  className="flex w-full items-center justify-between gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-[#f6f6f3]"
                >
                  <span>
                    <span className="block text-sm font-semibold">{label}</span>
                    <span className="block text-xs text-[#555]">{hint}</span>
                  </span>
                  <span
                    aria-hidden="true"
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                      display[key] ? 'bg-[#111]' : 'bg-[#ccc]'
                    }`}
                  >
                    <span
                      className={`absolute top-1 h-4 w-4 rounded-full bg-[#ffd200] transition-all ${
                        display[key] ? 'left-6' : 'left-1'
                      }`}
                    />
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-[#555]">
            {t('Saved on this device only.', 'Se guarda solo en este dispositivo.')}
          </p>
        </div>
      )}
    </div>
  );
}
