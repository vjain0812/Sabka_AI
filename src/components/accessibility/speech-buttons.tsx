'use client';
import { Mic, Square, Volume2 } from 'lucide-react';
import { useLanguage } from '@/lib/client/language';
import { useReadAloud, useVoiceInput } from '@/lib/client/speech';

export function ReadAloudButton({
  id,
  text,
  reader,
  className = '',
}: {
  id: string;
  text: string;
  reader: ReturnType<typeof useReadAloud>;
  className?: string;
}) {
  const { t } = useLanguage();
  if (!reader.supported) return null;
  const on = reader.speakingId === id;
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => reader.toggle(id, text)}
      className={`inline-flex items-center gap-1.5 rounded-full border border-[#d8d8d8] bg-white px-3 py-1.5 text-xs font-bold text-[#111] hover:border-[#111] ${className}`}
    >
      {on ? (
        <Square className="h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      {on ? t('Stop reading', 'Detener lectura') : t('Read aloud', 'Leer en voz alta')}
    </button>
  );
}

/** Mic button that appends what the person says to a text field. Hidden when unsupported. */
export function VoiceInputButton({ onText }: { onText: (text: string) => void }) {
  const { t, locale } = useLanguage();
  const voice = useVoiceInput(locale, onText);
  if (!voice.supported) return null;
  return (
    <div className="voice-input">
      <button
        type="button"
        aria-pressed={voice.listening}
        onClick={voice.toggle}
        className={`button ${voice.listening ? '' : 'button-secondary'}`}
      >
        <Mic size={16} aria-hidden="true" />
        {voice.listening
          ? t('Listening… tap to stop', 'Escuchando… toca para parar')
          : t('Speak instead of typing', 'Habla en vez de escribir')}
      </button>
      <p className="small muted" aria-live="polite">
        {voice.error
          ? voice.error === 'not-allowed'
            ? t(
                'Microphone permission was blocked. You can allow it in your browser settings.',
                'Se bloqueó el permiso del micrófono. Puedes permitirlo en los ajustes del navegador.',
              )
            : t('We couldn’t hear that. Try again.', 'No pudimos oírte. Inténtalo de nuevo.')
          : t(
              'Your browser turns speech into text. Some browsers send the audio to their maker (such as Google or Apple) to do this.',
              'Tu navegador convierte la voz en texto. Algunos navegadores envían el audio a su fabricante (como Google o Apple) para hacerlo.',
            )}
      </p>
    </div>
  );
}
