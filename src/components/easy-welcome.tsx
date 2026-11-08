'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight,
  Check,
  HeartHandshake,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Sprout,
} from 'lucide-react';
import { useLanguage } from '@/lib/client/language';
import { workspace } from '@/lib/client/workspace';
import { introVideo } from '@/lib/domain/learning-resources';
import { LearningVideo } from './learning-video';

export function EasyWelcome() {
  const { t } = useLanguage();
  const router = useRouter();
  const [newToAI, setNewToAI] = useState(false);
  function start() {
    workspace.startGuest();
    router.push('/business');
  }
  return (
    <div className="easy-home">
      <section className="hello-hero">
        <div className="hello-copy">
          <p className="easy-eyebrow">
            <span className="yellow-dot" />
            {t('A LITTLE HELP. A LOT MORE POSSIBILITY.', 'UN POCO DE AYUDA. MUCHAS POSIBILIDADES.')}
          </p>
          <h1>
            {t('Hello, business owner.', 'Hola, emprendedor.')}
            <br />
            <span>{t('Let’s make your day easier.', 'Hagamos tu día más fácil.')}</span>
          </h1>
          <p>
            {t(
              'Less time on the busywork. More time for your business, your customers, and you. Find AI tools that make sense for the way you work.',
              'Menos tiempo en tareas repetitivas. Más tiempo para tu negocio, tus clientes y para ti. Encuentra herramientas de IA que se adapten a tu forma de trabajar.',
            )}
          </p>
          <button className="button hello-start" onClick={start}>
            {t('Tell us about your business', 'Cuéntanos sobre tu negocio')}
            <ArrowRight size={20} />
          </button>
          <div className="hello-assurances">
            <span>
              <Check size={16} />
              {t('No account needed', 'Sin crear una cuenta')}
            </span>
            <span>
              <HeartHandshake size={17} />
              {t('You stay in control', 'Tú mantienes el control')}
            </span>
          </div>
        </div>
        <div className="hello-art decorative" aria-hidden="true">
          <div className="hello-orbit" />
          <div className="hello-note note-one">
            <MessageSquareText size={21} />
            <span>{t('“I wish I had more time.”', '«Ojalá tuviera más tiempo».')}</span>
          </div>
          <div className="hello-paper">
            <span className="paper-kicker">
              SABKA AI <Sparkles size={18} />
            </span>
            <h2>{t('A next step that feels like you.', 'Un próximo paso a tu medida.')}</h2>
            <div className="paper-step">
              <span>01</span>
              <div>
                <strong>{t('Your everyday challenge', 'Tu reto cotidiano')}</strong>
                <small>
                  {t('Tell us what takes your time.', 'Cuéntanos qué te quita tiempo.')}
                </small>
              </div>
            </div>
            <div className="paper-step">
              <span>02</span>
              <div>
                <strong>{t('A few thoughtful options', 'Algunas opciones útiles')}</strong>
                <small>
                  {t(
                    'See the cost, the why, the unknowns.',
                    'Conoce el costo, el motivo y las dudas.',
                  )}
                </small>
              </div>
            </div>
            <div className="paper-step">
              <span>03</span>
              <div>
                <strong>{t('Help, when you want it', 'Ayuda cuando la quieras')}</strong>
                <small>
                  {t(
                    'Watch, ask, or explore on your own.',
                    'Mira, pregunta o explora por tu cuenta.',
                  )}
                </small>
              </div>
            </div>
            <div className="paper-human">
              <Sprout size={22} />
              {t('Your business. Your decisions.', 'Tu negocio. Tus decisiones.')}
            </div>
          </div>
          <div className="hello-note note-two">
            <ShieldCheck size={21} />
            {t('A person has the final say.', 'Una persona tiene la última palabra.')}
          </div>
        </div>
      </section>
      <section className="easy-how" aria-label={t('How it works', 'Cómo funciona')}>
        {[
          [
            t('Tell us about your business', 'Cuéntanos sobre tu negocio'),
            t('Your challenge, your goals, your budget.', 'Tu reto, tus metas y tu presupuesto.'),
          ],
          [
            t('See options for your task', 'Explora opciones para tu tarea'),
            t(
              'Clear reasons, real sources, no pressure.',
              'Motivos claros, fuentes reales, sin presión.',
            ),
          ],
          [
            t('Take it at your pace', 'Avanza a tu ritmo'),
            t(
              'Optional videos and help along the way.',
              'Videos y ayuda opcionales durante el proceso.',
            ),
          ],
        ].map(([heading, detail], i) => (
          <article key={i}>
            <span>0{i + 1}</span>
            <div>
              <h2>{heading}</h2>
              <p>{detail}</p>
            </div>
          </article>
        ))}
      </section>
      <section className="ai-first">
        <div className="row-between">
          <div>
            <h2>
              {t(
                'New to AI? You’re in the right place.',
                '¿Es tu primera vez con la IA? Estás en el lugar indicado.',
              )}
            </h2>
            <p>
              {t(
                'Get a simple introduction before you begin. Completely optional.',
                'Descubre una introducción sencilla antes de empezar. Es totalmente opcional.',
              )}
            </p>
          </div>
          <label className="easy-switch">
            <input
              type="checkbox"
              role="switch"
              aria-label={t('New to AI?', '¿Primera vez con la IA?')}
              aria-controls="ai-introduction"
              checked={newToAI}
              onChange={(e) => setNewToAI(e.target.checked)}
            />
            <span aria-hidden="true" />
          </label>
        </div>
        <div id="ai-introduction" className="ai-introduction" hidden={!newToAI}>
          <div>
            <h3>
              {t('Think of AI as a helper, not the boss.', 'Piensa en la IA como un ayudante.')}
            </h3>
            <p>
              {t(
                'It can suggest a reply, organize ideas, or help with a draft. It can also make mistakes. Start small, use sample information, and check its work before sharing.',
                'Puede sugerir una respuesta, organizar ideas o ayudarte con un borrador. También puede equivocarse. Empieza poco a poco, usa datos de ejemplo y revisa su trabajo antes de compartirlo.',
              )}
            </p>
          </div>
          <LearningVideo
            video={introVideo}
            label={t('Watch an introduction', 'Ver una introducción')}
          />
        </div>
      </section>
      <div className="easy-home-links">
        <button
          className="text-button"
          onClick={() => {
            workspace.startDemo('baker');
            router.push('/onboarding');
          }}
        >
          {t('Explore a fictional example', 'Explorar un ejemplo ficticio')}
          <ArrowRight size={16} />
        </button>
        <Link className="quiet-link" href="/discover">
          {t('Just browse the catalog', 'Solo explorar el catálogo')}
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
