'use client';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { MessageCircle, Send, Sparkles, X } from 'lucide-react';
import { useLanguage } from '@/lib/client/language';
import type { CatalogRecord } from '@/lib/domain/catalog-record';
import { answerToolQuestion } from '@/lib/domain/tool-help';
import { toolFacts } from '@/lib/domain/tool-help';

type Message = { question: string; answer: string; url: string | null; ai?: boolean };

export function ToolAssistant({
  record,
  planId,
}: {
  record: CatalogRecord;
  planId?: string | null;
}) {
  const { locale, t } = useLanguage();
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [question, setQuestion] = useState('');
  const [thinking, setThinking] = useState(false);
  const log = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const facts = toolFacts(record, locale);
  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [messages, thinking]);
  function push(message: Message) {
    setMessages((old) => [...old.slice(-9), message]);
  }
  /** Preset questions are answered instantly from sourced facts. */
  function quick(text: string) {
    const result = answerToolQuestion(record, text, locale, planId);
    push({ question: text, answer: result.text, url: result.sourceUrl });
  }
  /** Typed questions go to the grounded guide; rules answer if it is unavailable. */
  async function submit(e: FormEvent) {
    e.preventDefault();
    const text = question.trim().slice(0, 300);
    if (!text || thinking) return;
    setQuestion('');
    setThinking(true);
    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: record.tool.slug, question: text, locale }),
      });
      if (!res.ok) throw new Error('unavailable');
      const data = (await res.json()) as { text: string; sourceUrl: string | null; method: string };
      push({ question: text, answer: data.text, url: data.sourceUrl, ai: data.method === 'ai' });
    } catch {
      const result = answerToolQuestion(record, text, locale, planId);
      push({ question: text, answer: result.text, url: result.sourceUrl });
    } finally {
      setThinking(false);
    }
  }
  return (
    <>
      <button className="button button-secondary" onClick={() => dialog.current?.showModal()}>
        <MessageCircle size={16} />
        {t('Ask about this tool', 'Preguntar sobre la herramienta')}
      </button>
      <dialog ref={dialog} className="tool-chat" aria-labelledby={id}>
        <div className="row-between">
          <div>
            <p className="easy-eyebrow">SABKA AI</p>
            <h2 id={id}>{record.tool.name}</h2>
          </div>
          <button
            className="icon-button"
            aria-label={t('Close assistant', 'Cerrar asistente')}
            onClick={() => dialog.current?.close()}
          >
            <X />
          </button>
        </div>
        <ul className="chat-facts" aria-label={t('Key facts', 'Datos clave')}>
          <li>
            <span>{t('Price', 'Precio')}</span>
            {facts.cost}
          </li>
          <li>
            <span>{t('Setup', 'Preparación')}</span>
            {facts.setup}
          </li>
          <li>
            <span>{t('Customers', 'Clientes')}</span>
            {facts.people}
          </li>
          {facts.trial && (
            <li>
              <span>{t('Trial', 'Prueba')}</span>
              {facts.trial}
            </li>
          )}
        </ul>
        <div
          className="chat-log"
          ref={log}
          role="log"
          aria-live="polite"
          aria-label={t('Conversation', 'Conversación')}
        >
          {messages.length ? (
            messages.map((m, i) => (
              <div key={i}>
                <p className="chat-question">{m.question}</p>
                <div className="chat-answer">
                  {m.ai && (
                    <Sparkles
                      size={14}
                      className="chat-ai"
                      aria-label={t(
                        'AI answer from sourced facts',
                        'Respuesta de IA con datos verificados',
                      )}
                    />
                  )}
                  {m.answer}
                  {m.url && (
                    <a
                      className="quiet-link"
                      href={m.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t('Source', 'Fuente')}
                      <span className="sr-only">
                        {' '}
                        ({t('opens in a new tab', 'se abre en otra pestaña')})
                      </span>
                    </a>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="chat-answer">
              {t(
                `Hi! Ask me anything about ${record.tool.name} — price, setup, free trial or what it does.`,
                `¡Hola! Pregúntame lo que quieras sobre ${record.tool.name}: precio, preparación, prueba o qué hace.`,
              )}
            </p>
          )}
          {thinking && (
            <p className="chat-answer chat-typing" role="status">
              <span />
              <span />
              <span />
              <span className="sr-only">{t('Thinking…', 'Pensando…')}</span>
            </p>
          )}
        </div>
        <div className="chat-prompts">
          {[
            t('What does it cost?', '¿Cuánto cuesta?'),
            t('Is setup easy?', '¿Es fácil empezar?'),
            t('Is there a free trial?', '¿Hay prueba gratis?'),
            t('How many people has it helped?', '¿A cuántas personas ha ayudado?'),
          ].map((q) => (
            <button key={q} className="text-button" onClick={() => quick(q)}>
              {q}
            </button>
          ))}
        </div>
        <form onSubmit={submit} className="chat-input">
          <label className="sr-only" htmlFor={`${id}-question`}>
            {t('Your question', 'Tu pregunta')}
          </label>
          <input
            id={`${id}-question`}
            maxLength={300}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={t('Ask anything about this tool…', 'Pregunta lo que quieras…')}
          />
          <button
            className="button"
            disabled={!question.trim() || thinking}
            aria-label={t('Send question', 'Enviar pregunta')}
          >
            <Send size={18} />
          </button>
        </form>
        <p className="small muted">
          {t(
            'Answers use only this tool’s sourced facts. Typed questions are sent to our AI guide — skip personal details.',
            'Las respuestas usan solo datos verificados de esta herramienta. Las preguntas escritas van a nuestra guía de IA; no incluyas datos personales.',
          )}
        </p>
      </dialog>
    </>
  );
}
