'use client';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { Language } from './language';

const noop = () => () => {};
const voiceTag = (locale: Language) => (locale === 'es' ? 'es-ES' : 'en-US');

/** Read text aloud with the browser's built-in voices. Nothing leaves the device for this. */
export function useReadAloud(locale: Language) {
  const supported = useSyncExternalStore(
    noop,
    () => typeof window !== 'undefined' && 'speechSynthesis' in window,
    () => false,
  );
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  useEffect(() => () => window.speechSynthesis?.cancel(), []);
  const toggle = useCallback(
    (id: string, text: string) => {
      const synth = window.speechSynthesis;
      synth.cancel();
      if (speakingId === id) {
        setSpeakingId(null);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = voiceTag(locale);
      utterance.rate = 0.95;
      utterance.onend = () => setSpeakingId((cur) => (cur === id ? null : cur));
      utterance.onerror = utterance.onend;
      setSpeakingId(id);
      synth.speak(utterance);
    },
    [locale, speakingId],
  );
  return { supported, speakingId, toggle };
}

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start(): void;
  stop(): void;
};
type RecognitionCtor = new () => Recognition;
function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Speech-to-text via the browser. Some browsers send audio to their maker to transcribe it. */
export function useVoiceInput(locale: Language, onText: (text: string) => void) {
  const supported = useSyncExternalStore(
    noop,
    () => recognitionCtor() !== null,
    () => false,
  );
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<Recognition | null>(null);
  const handler = useRef(onText);
  useEffect(() => {
    handler.current = onText;
  }, [onText]);
  useEffect(() => () => rec.current?.stop(), []);
  const toggle = useCallback(() => {
    if (listening) {
      rec.current?.stop();
      return;
    }
    const Ctor = recognitionCtor();
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = voiceTag(locale);
    r.interimResults = false;
    r.continuous = false;
    r.onresult = (e) => {
      const text = Array.from(e.results)
        .map((res) => res[0]?.transcript ?? '')
        .join(' ')
        .trim();
      if (text) handler.current(text);
    };
    r.onerror = (e) => setError(e.error);
    r.onend = () => setListening(false);
    rec.current = r;
    setError(null);
    setListening(true);
    try {
      r.start();
    } catch {
      setListening(false);
    }
  }, [listening, locale]);
  return { supported, listening, error, toggle };
}
