'use client';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { CatalogRecord } from '@/lib/domain/catalog-record';
import { toolFacts } from '@/lib/domain/tool-help';
import { workspace } from '@/lib/client/workspace';
import { findToolsTarget } from '@/lib/client/has-business';
import { detectIntents } from '@/lib/domain/intents';
import { useLanguage } from '@/lib/client/language';
import { scenarioCopy } from '@/lib/domain/scenarios';
import { spanishToolSummary } from '@/lib/domain/tool-translations';
import { needLabelEs } from '@/lib/domain/i18n-es';
import logoManifest from '@/lib/domain/logo-manifest.json';
import { scenarios } from '@/lib/domain/scenarios';
import { ScenarioIcon } from './site/scenario-icon';

type IconName =
  | 'arrow'
  | 'bookmark'
  | 'check'
  | 'chevron'
  | 'clock'
  | 'grid'
  | 'menu'
  | 'search'
  | 'sparkles'
  | 'stack'
  | 'trend'
  | 'users'
  | 'wand'
  | 'x';

function Icon({ name, className = 'h-5 w-5' }: { name: IconName; className?: string }) {
  const paths: Record<IconName, React.ReactNode> = {
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),
    bookmark: <path d="M6 4.7A1.7 1.7 0 0 1 7.7 3h8.6A1.7 1.7 0 0 1 18 4.7V21l-6-3.7L6 21Z" />,
    check: <path d="m5 12 4.2 4.2L19 6.5" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    menu: (
      <>
        <path d="M4 7h16M4 12h16M4 17h16" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    sparkles: (
      <>
        <path d="m12 3 .9 2.6a5 5 0 0 0 3.1 3.1l2.6.9-2.6.9a5 5 0 0 0-3.1 3.1l-.9 2.6-.9-2.6A5 5 0 0 0 8 10.5l-2.6-.9L8 8.7a5 5 0 0 0 3.1-3.1Z" />
        <path d="m18.5 15 .4 1.1a2.3 2.3 0 0 0 1.4 1.4l1.1.4-1.1.4a2.3 2.3 0 0 0-1.4 1.4l-.4 1.1-.4-1.1a2.3 2.3 0 0 0-1.4-1.4l-1.1-.4 1.1-.4a2.3 2.3 0 0 0 1.4-1.4Z" />
      </>
    ),
    stack: (
      <>
        <path d="m12 3 9 5-9 5-9-5Z" />
        <path d="m3 12 9 5 9-5M3 16l9 5 9-5" />
      </>
    ),
    trend: (
      <>
        <path d="M4 18 10 12l4 4 6-8" />
        <path d="M15 8h5v5" />
      </>
    ),
    users: (
      <>
        <path d="M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20" />
        <circle cx="9.5" cy="7.5" r="3.5" />
        <path d="M16 4.5a3.5 3.5 0 0 1 0 6.8M21 20v-1.5a4 4 0 0 0-3-3.9" />
      </>
    ),
    wand: (
      <>
        <path d="m15 4 5 5L9 20l-5-5Z" />
        <path d="m13 6 5 5M6 3v3M4.5 4.5h3M19 16v4M17 18h4" />
      </>
    ),
    x: <path d="M6 6l12 12M18 6 6 18" />,
  };

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

const examples = [
  [
    'Customers call all day asking if their order is ready…',
    'Los clientes llaman todo el día para preguntar si su pedido está listo…',
  ],
  [
    'Students forget classes and cancel at the last minute…',
    'Los alumnos olvidan las clases y cancelan a última hora…',
  ],
  [
    'I miss calls while I’m on a job and lose the lead…',
    'Pierdo llamadas mientras estoy en un trabajo y se me va el cliente…',
  ],
  [
    'I spend my evenings answering the same WhatsApp questions…',
    'Paso las tardes respondiendo las mismas preguntas por WhatsApp…',
  ],
  [
    'I never know when to water or spot crop disease too late…',
    'Nunca sé cuándo regar y detecto tarde las enfermedades del cultivo…',
  ],
] as const;
const painPoints = [
  { id: 'admin', en: 'Repetitive admin', es: 'Tareas administrativas repetitivas' },
  { id: 'leads', en: 'Lead follow-up', es: 'Seguimiento de clientes' },
  { id: 'content', en: 'Content creation', es: 'Creación de contenido' },
  { id: 'support', en: 'Customer support', es: 'Atención al cliente' },
  { id: 'handoffs', en: 'Team handoffs', es: 'Traspasos en el equipo' },
] as const;

const ecosystem = [
  { name: 'Slack', domain: 'slack.com' },
  { name: 'HubSpot', domain: 'hubspot.com' },
  { name: 'Notion', domain: 'notion.so' },
  { name: 'Zapier', domain: 'zapier.com' },
  { name: 'Canva', domain: 'canva.com' },
  { name: 'Mailchimp', domain: 'mailchimp.com' },
  { name: 'Square', domain: 'squareup.com' },
  { name: 'Shopify', domain: 'shopify.com' },
  { name: 'QuickBooks', domain: 'quickbooks.intuit.com' },
  { name: 'Xero', domain: 'xero.com' },
  { name: 'Wix', domain: 'wix.com' },
  { name: 'Trello', domain: 'trello.com' },
  { name: 'Zoom', domain: 'zoom.com' },
  { name: 'ChatGPT', domain: 'chatgpt.com' },
];
/** One marquee "set" is wider than any screen; two identical sets loop seamlessly at -50%. */
const marqueeSet = [...ecosystem, ...ecosystem];

const selfHosted = logoManifest as Record<string, string>;
function logoUrl(domain: string) {
  if (selfHosted[domain]) return selfHosted[domain];
  if (
    ![
      'slack.com',
      'hubspot.com',
      'notion.so',
      'zapier.com',
      'canva.com',
      'mailchimp.com',
      'tidio.com',
      'grammarly.com',
      'buffer.com',
      'reclaim.ai',
    ].includes(domain)
  )
    return '/template/logos/tool.svg';
  return `/template/logos/${domain.replace(/[^a-z0-9.-]/gi, '')}.png`; // Original template logos, self-hosted.
}

function ToolLogo({
  domain,
  name,
  className = 'h-8 w-8',
}: {
  domain: string;
  name: string;
  className?: string;
}) {
  return (
    <Image
      src={logoUrl(domain)}
      alt={`${name} logo`}
      width={128}
      height={128}
      unoptimized
      className={`${className} object-contain`}
    />
  );
}

export default function FigmaTemplate({ records }: { records: CatalogRecord[] }) {
  const router = useRouter();
  const { t, locale } = useLanguage();
  const tools = useMemo(() => {
    const preferred = ['grammarly', 'buffer-ai-assistant', 'reclaim-ai'];
    const chosen = preferred
      .map((slug) => records.find((r) => r.tool.slug === slug))
      .filter((r): r is CatalogRecord => Boolean(r));
    for (const record of records)
      if (chosen.length < 3 && !chosen.some((r) => r.tool.id === record.tool.id))
        chosen.push(record);
    return chosen.map((record) => {
      const facts = toolFacts(record, locale);
      return {
        name: record.tool.name,
        category: record.tool.categories[0] ?? 'AI software',
        domain: new URL(record.tool.website).hostname.replace(/^www\./, ''),
        slug: record.tool.slug,
        match: null,
        summary: (locale === 'es' && spanishToolSummary(record.tool.slug)) || record.tool.summary,
        reason: t(
          'Published documentation relates this product to a supported task. Complete your brief to check cost, approval and compatibility.',
          'La documentación publicada relaciona este producto con una tarea compatible. Completa tu información para revisar costo, aprobación y compatibilidad.',
        ),
        time: t('Not verified', 'Sin verificar'),
        setup: facts.setup,
        price: facts.cost,
        tags: record.tool.jobs.map(
          (job) =>
            ({
              customer_reply_drafting: t('Reply drafting', 'Redacción de respuestas'),
              marketing_content: 'Marketing',
              appointment_organization: t('Scheduling', 'Citas'),
            })[job],
        ),
        sourceCount: record.sources.length,
      };
    });
  }, [records, locale, t]);
  const [selected, setSelected] = useState<string[]>([]);
  const [problem, setProblem] = useState('');
  // Tapped chips count as part of the description, so they shape the recommendations too.
  const description = [
    problem.trim(),
    ...selected.map((id) => {
      const point = painPoints.find((p) => p.id === id)!;
      return locale === 'es' ? point.es : point.en;
    }),
  ]
    .filter(Boolean)
    .join('. ');
  const heard = useMemo(() => detectIntents(description, 4), [description]);
  const [example, setExample] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setExample((n) => (n + 1) % examples.length), 3200);
    return () => clearInterval(id);
  }, []);
  // Arriving from "Find tools" on another page (/#finder): bring the problem box into view.
  useEffect(() => {
    if (location.hash !== '#finder') return;
    const id = setTimeout(
      () => document.getElementById('finder')?.scrollIntoView({ behavior: 'smooth' }),
      100,
    );
    return () => clearTimeout(id);
  }, []);
  const [saved, setSaved] = useState<string[]>([]);
  const showResults = true;
  const analyzing = false;

  function togglePain(point: string) {
    setSelected((current) =>
      current.includes(point) ? current.filter((item) => item !== point) : [...current, point],
    );
  }

  function continueBrief() {
    workspace.startGuest();
    if (description) {
      const brief = workspace.getBrief();
      if (brief) {
        const job = selected.includes('content')
          ? 'marketing_content'
          : selected.some((p) => p === 'leads' || p === 'support')
          ? 'customer_reply_drafting'
          : '';
        workspace.update({
          ...brief,
          need: { ...brief.need, problem: description.slice(0, 600), job },
        });
      }
    }
    router.push('/business');
  }
  function findTools(event: FormEvent) {
    event.preventDefault();
    continueBrief();
  }

  /** First-time visitors describe their business first; known businesses go straight to the problem. */
  async function scrollToFinder() {
    if ((await findToolsTarget()) === 'business') {
      workspace.startGuest();
      router.push('/business');
      return;
    }
    document.getElementById('finder')?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <div className="figma-template min-h-screen bg-[#f7f7f5] text-[#111111]">
      <div>
        <section className="hero-grid relative overflow-hidden bg-[#090909] text-white">
          <div className="pointer-events-none absolute -left-40 top-20 h-[460px] w-[460px] rounded-full bg-[#e21833]/40 blur-[100px]" />
          <div className="pointer-events-none absolute -right-24 top-0 h-[520px] w-[520px] rounded-full bg-[#e21833]/15 blur-[110px]" />
          <div className="mx-auto grid max-w-[1240px] gap-14 px-5 pb-28 pt-16 lg:grid-cols-[.92fr_1.08fr] lg:px-8 lg:pb-36 lg:pt-24">
            <div className="relative z-10 flex flex-col justify-center">
              <div className="mb-7 flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/[.06] px-3 py-1.5 text-xs font-semibold text-white/75 backdrop-blur">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ffd200] opacity-60" />
                  <span className="relative h-2 w-2 rounded-full bg-[#ffd200]" />
                </span>
                {t(
                  'AI tool intelligence for small teams',
                  'Inteligencia de herramientas de IA para pequeños equipos',
                )}
              </div>
              <h1 className="max-w-[680px] text-[50px] font-semibold leading-[.98] tracking-[-0.06em] sm:text-[68px] lg:text-[78px]">
                {t('Your smartest', 'Tu próxima')}
                <br />
                {t('next tool,', 'mejor herramienta,')}{' '}
                <span className="bg-gradient-to-r from-[#ffd200] via-[#ffdf43] to-white bg-clip-text text-transparent">
                  {t('found.', 'encontrada.')}
                </span>
              </h1>
              <p className="mt-7 max-w-[560px] text-lg leading-8 text-white/60">
                {t(
                  'Tell us what slows you down. Get AI tools that fit your business, budget and way of working.',
                  'Cuéntanos qué te frena. Recibe herramientas de IA que se ajustan a tu negocio, tu presupuesto y tu forma de trabajar.',
                )}
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-6">
                <button
                  onClick={() => void scrollToFinder()}
                  className="group flex items-center gap-3 rounded-full bg-[#ffd200] py-3.5 pl-6 pr-4 font-bold text-[#000000] shadow-[0_10px_30px_rgba(255,210,0,.18)] transition-all hover:-translate-y-0.5 hover:bg-white"
                >
                  {t('Find my AI stack', 'Encontrar mis herramientas')}
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#000000] text-[#ffd200] transition-transform group-hover:translate-x-0.5">
                    <Icon name="arrow" className="h-4 w-4" />
                  </span>
                </button>
                <div className="flex items-center gap-3 text-sm text-white/50">
                  <span className="flex -space-x-2">
                    {['01', '02', '03'].map((initials, index) => (
                      <span
                        key={initials}
                        className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#090909] text-[9px] font-bold text-white ${
                          ['bg-[#e21833]', 'bg-black', 'bg-[#b81228]'][index]
                        }`}
                      >
                        {initials}
                      </span>
                    ))}
                  </span>
                  <span>
                    <strong className="text-white">1600+</strong>{' '}
                    {t('supported business tasks', 'tareas de negocio compatibles')}
                  </span>
                </div>
              </div>
            </div>

            <div className="relative z-10 hidden min-h-[530px] items-center justify-center lg:flex">
              <div className="workflow-orbit absolute h-[470px] w-[470px] rounded-full border border-white/10" />
              <div className="workflow-orbit absolute h-[340px] w-[340px] rounded-full border border-dashed border-white/10" />
              <div className="relative w-[410px] rotate-[2deg] rounded-[26px] border border-white/15 bg-[#171717]/80 p-3 shadow-[0_40px_100px_rgba(0,0,0,.35)] backdrop-blur-xl">
                <div className="rounded-[19px] border border-white/10 bg-[#fafafa] p-5 text-[#111111]">
                  <div className="flex items-center justify-between border-b border-[#e8e8e8] pb-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#757575]">
                        {t('Workflow intelligence', 'Inteligencia de flujos')}
                      </p>
                      <p className="mt-1 text-sm font-semibold">
                        {t('Client onboarding flow', 'Flujo de alta de clientes')}
                      </p>
                    </div>
                    <span className="rounded-full bg-[#ffd200] px-2.5 py-1 text-[10px] font-bold text-[#000000]">
                      {t('Illustrative example', 'Ejemplo ilustrativo')}
                    </span>
                  </div>
                  <div className="space-y-3 py-5">
                    {[
                      [
                        '1',
                        t('New lead received', 'Llega un cliente potencial'),
                        'hubspot.com',
                        'HubSpot',
                        '2 min',
                      ],
                      [
                        '2',
                        t('Create client workspace', 'Crear espacio del cliente'),
                        'notion.so',
                        'Notion',
                        '12 min',
                      ],
                      [
                        '3',
                        t('Send welcome sequence', 'Enviar secuencia de bienvenida'),
                        'mailchimp.com',
                        'Mailchimp',
                        '18 min',
                      ],
                    ].map(([step, title, domain, app, time]) => (
                      <div
                        key={step}
                        className="flex items-center gap-3 rounded-xl border border-[#e6e6e6] bg-white p-3 shadow-[0_5px_16px_rgba(0,0,0,.05)]"
                      >
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#f1f1f1] text-[10px] font-bold text-[#666666]">
                          {step}
                        </span>
                        <ToolLogo domain={domain} name={app} className="h-7 w-7 rounded-md" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold">{title}</p>
                          <p className="mt-0.5 text-[10px] text-[#898989]">{app}</p>
                        </div>
                        <span className="text-[10px] font-semibold text-[#7b7b7b]">{time}</span>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-[#111111] p-4 text-white">
                      <p className="text-[10px] text-white/55">
                        {t('Example time saved', 'Tiempo ahorrado (ejemplo)')}
                      </p>
                      <p className="mt-1 text-2xl font-semibold tracking-[-.05em]">
                        {t('7.5 hrs', '7,5 h')}
                      </p>
                      <p className="mt-1 text-[10px] text-[#ffd200]">
                        {t('fictional example', 'ejemplo ficticio')}
                      </p>
                    </div>
                    <div className="rounded-xl bg-[#fff4bf] p-4">
                      <p className="text-[10px] text-[#696969]">
                        {t('Illustrative score', 'Puntaje ilustrativo')}
                      </p>
                      <p className="mt-1 text-2xl font-semibold tracking-[-.05em]">84%</p>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
                        <div className="h-full w-[84%] rounded-full bg-[#e21833]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {[
                ['slack.com', 'Slack', '-left-4 top-12'],
                ['zapier.com', 'Zapier', '-right-2 top-20'],
                ['canva.com', 'Canva', '-left-8 bottom-16'],
                ['tidio.com', 'Tidio', 'right-0 bottom-8'],
              ].map(([domain, name, position], index) => (
                <div
                  key={name}
                  className={`float-node absolute ${position} flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white shadow-[0_15px_35px_rgba(0,0,0,.25)]`}
                  style={{ animationDelay: `${index * -1.2}s` }}
                >
                  <ToolLogo domain={domain} name={name} className="h-8 w-8" />
                </div>
              ))}
            </div>
          </div>

          <div
            id="finder"
            className="relative z-10 mx-auto -mt-16 max-w-[1060px] scroll-mt-28 px-5 pb-16 lg:px-8"
          >
            <form
              onSubmit={findTools}
              className="rounded-[28px] border border-white/50 bg-white p-3 text-[#111111] shadow-[0_35px_90px_rgba(0,0,0,.28)] sm:p-4"
            >
              <div className="rounded-[20px] bg-[#f4f4f2] p-5 sm:p-6">
                <div className="mb-5 flex items-start justify-between">
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-[.14em] text-[#707070]">
                      {t('Your workflow check-up', 'Revisión de tu flujo de trabajo')}
                    </p>
                    <h2 className="text-2xl font-semibold tracking-[-0.035em] sm:text-[28px]">
                      {t(
                        'Show us where your workflow gets stuck.',
                        'Muéstranos dónde se atasca tu trabajo.',
                      )}
                    </h2>
                  </div>
                  <span className="hidden h-10 w-10 items-center justify-center rounded-xl bg-[#ffe24d] text-[#000000] sm:flex">
                    <Icon name="wand" />
                  </span>
                </div>

                <label htmlFor="problem" className="mb-2.5 block text-sm font-semibold">
                  {t('Describe your biggest bottleneck', 'Describe tu mayor obstáculo')}
                </label>
                <div className="relative">
                  <textarea
                    id="problem"
                    value={problem}
                    maxLength={300}
                    onChange={(event) => setProblem(event.target.value)}
                    placeholder={examples[example][locale === 'es' ? 1 : 0]}
                    className="min-h-[96px] w-full resize-none rounded-2xl border border-[#d8d8d8] bg-white px-4 py-4 pr-24 text-[15px] leading-6 text-[#181818] outline-none transition-all placeholder:text-[#989898] focus:border-[#e21833] focus:ring-4 focus:ring-[#e21833]/10"
                  />
                  <span className="absolute bottom-3 right-3 text-[11px] text-[#9a9a9a]">
                    {problem.length}/300
                  </span>
                </div>
                <div className="mt-3 flex min-h-7 flex-wrap items-center gap-2" aria-live="polite">
                  {heard.length > 0 && (
                    <>
                      <span className="text-xs font-semibold text-[#5f5f5f]">
                        {t('We hear:', 'Entendemos:')}
                      </span>
                      {heard.map((h) => (
                        <span
                          key={h.id}
                          className="rise rounded-full bg-[#111] px-3 py-1 text-xs font-semibold text-[#ffd200]"
                        >
                          {locale === 'es' ? needLabelEs[h.label] ?? h.label : h.label}
                        </span>
                      ))}
                    </>
                  )}
                </div>

                <p className="mb-3 mt-3 text-sm font-semibold">
                  {t('Or tap what fits:', 'O elige lo que encaje:')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {painPoints.map((point) => {
                    const active = selected.includes(point.id);
                    return (
                      <button
                        type="button"
                        key={point.id}
                        onClick={() => togglePain(point.id)}
                        className={`rounded-full border px-3.5 py-2 text-xs font-semibold transition-all ${
                          active
                            ? 'border-[#e21833] bg-[#e21833] text-white'
                            : 'border-[#d5d5d5] bg-white text-[#5b5b5b] hover:border-[#e21833]'
                        }`}
                      >
                        {active && <Icon name="check" className="mr-1.5 inline h-3.5 w-3.5" />}
                        {locale === 'es' ? point.es : point.en}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-4 px-3 pb-2 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex items-center gap-2 text-xs text-[#707070]">
                  <Icon name="sparkles" className="h-4 w-4 text-[#e21833]" />
                  {t(
                    'No account needed. Start with your business.',
                    'Sin cuenta. Empieza con tu negocio.',
                  )}
                </p>
                <button
                  disabled={analyzing}
                  className="flex min-w-[180px] items-center justify-center gap-2 rounded-full bg-[#ffd200] px-5 py-3 text-sm font-bold text-[#000000] transition-all hover:bg-[#ffdc33] disabled:opacity-70"
                >
                  {analyzing
                    ? t('Matching tools…', 'Buscando herramientas…')
                    : t('Show my matches', 'Ver mis opciones')}
                  {!analyzing && <Icon name="arrow" className="h-4 w-4" />}
                </button>
              </div>
            </form>
          </div>
        </section>

        <section className="overflow-hidden border-b border-[#e2e2e2] bg-white py-7">
          <p className="mb-6 text-center text-[10px] font-bold uppercase tracking-[.2em] text-[#898989]">
            {t('Software you may already use', 'Programas que quizá ya usas')}
          </p>
          <div className="logo-marquee flex min-w-max items-center">
            {[...marqueeSet, ...marqueeSet].map((app, index) => (
              <div
                key={`${app.name}-${index}`}
                aria-hidden={index >= marqueeSet.length ? true : undefined}
                className="flex shrink-0 items-center gap-2.5 pr-12 opacity-60 grayscale transition-all hover:opacity-100 hover:grayscale-0"
              >
                <ToolLogo domain={app.domain} name={app.name} className="h-7 w-7" />
                <span className="text-sm font-bold text-[#2d2d2d]">{app.name}</span>
              </div>
            ))}
          </div>
        </section>

        <section id="how" className="border-y border-[#e2e2e2] bg-white">
          <div className="mx-auto grid max-w-[1240px] divide-y divide-[#e7e7e7] px-5 sm:grid-cols-3 sm:divide-x sm:divide-y-0 lg:px-8">
            {[
              [
                '01',
                t('Share the friction', 'Cuéntanos qué te frena'),
                t(
                  'Tell us where work gets slow, repetitive, or expensive.',
                  'Dinos dónde el trabajo se vuelve lento, repetitivo o caro.',
                ),
              ],
              [
                '02',
                t('Get a practical match', 'Recibe una opción práctica'),
                t(
                  'Check task relevance, evidence, price, and setup requirements.',
                  'Revisa la relación con tu tarea, la evidencia, el precio y lo que requiere la puesta en marcha.',
                ),
              ],
              [
                '03',
                t('Build your better flow', 'Arma tu mejor flujo'),
                t(
                  'Keep your decisions human and start with a small next step.',
                  'Mantén las decisiones en manos de personas y empieza con un paso pequeño.',
                ),
              ],
            ].map(([number, title, copy]) => (
              <div key={number} className="py-8 sm:px-7 sm:py-9 first:pl-0 last:pr-0">
                <div className="mb-5 flex items-center gap-3">
                  <span className="text-xs font-bold text-[#e21833]">{number}</span>
                  <span className="h-px w-8 bg-[#d2d2d2]" />
                </div>
                <h3 className="mb-2 font-semibold tracking-[-0.02em]">{title}</h3>
                <p className="text-sm leading-6 text-[#6a6a6a]">{copy}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="workflows" className="relative overflow-hidden bg-[#090909] py-20 text-white">
          <div className="pointer-events-none absolute -right-32 top-10 h-[420px] w-[420px] rounded-full bg-[#e21833]/25 blur-[110px]" />
          <div className="relative mx-auto max-w-[1240px] px-5 lg:px-8">
            <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-[.14em] text-[#ffd200]">
                  {t('Start from a business like yours', 'Empieza con un negocio como el tuyo')}
                </p>
                <h2 className="max-w-2xl text-3xl font-semibold tracking-[-0.045em] sm:text-[42px] sm:leading-[1.05]">
                  {t(
                    'Six everyday workflows. One problem each. Tools that fit together.',
                    'Seis flujos de todos los días. Un problema cada uno. Herramientas que encajan entre sí.',
                  )}
                </h2>
              </div>
              <Link
                href="/workflows"
                className="group flex w-fit items-center gap-2 rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white/85 transition-colors hover:border-[#ffd200] hover:text-white"
              >
                {t('See all workflows', 'Ver todos los flujos')}
                <Icon
                  name="arrow"
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {scenarios.map((scenario, index) => {
                const copy = scenarioCopy(scenario, locale);
                return (
                  <Link
                    key={scenario.slug}
                    href={`/workflows/${scenario.slug}`}
                    className="rise group relative flex flex-col overflow-hidden rounded-[22px] border border-white/10 bg-white/[.04] p-5 backdrop-blur transition-all hover:-translate-y-1 hover:border-[#ffd200]/60 hover:bg-white/[.07]"
                    style={{ animationDelay: `${index * 60}ms` }}
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <span
                        className="flex h-11 w-11 items-center justify-center rounded-[14px] text-black"
                        style={{ background: scenario.accent }}
                      >
                        <ScenarioIcon name={scenario.icon} className="h-5 w-5" />
                      </span>
                      <span className="text-[11px] font-bold text-white/35">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                    </div>
                    <h3 className="font-semibold tracking-[-0.02em]">{copy.profession}</h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/55">
                      {copy.problem}
                    </p>
                    <p className="mt-4 text-xs font-semibold text-white/40">
                      {scenario.tools.length} {t('tools', 'herramientas')} · {scenario.steps.length}{' '}
                      {t('steps', 'pasos')}
                    </p>
                    <span className="mt-4 flex items-center gap-1.5 text-xs font-bold text-[#ffd200]">
                      {t('See the workflow', 'Ver el flujo')}
                      <Icon
                        name="chevron"
                        className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1"
                      />
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {showResults && (
          <section
            id="matches"
            className="relative scroll-mt-24 overflow-hidden bg-[#f3f3f1] py-24"
          >
            <div className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-white/70 blur-[100px]" />
            <div className="mx-auto max-w-[1240px] px-5 lg:px-8">
              <div className="mb-9 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-[#e21833]">
                    <Icon name="sparkles" className="h-4 w-4" />
                    {t('From the stack', 'Del catálogo')}
                  </div>
                  <h2 className="text-3xl font-semibold tracking-[-0.045em] sm:text-[42px]">
                    {t('Tools owners start with', 'Herramientas con las que empiezan los dueños')}
                  </h2>
                  <p className="mt-3 max-w-2xl text-[#666666]">
                    {records.length}{' '}
                    {t(
                      'source-checked tools. Your picks depend on your words, budget and business.',
                      'herramientas con fuentes verificadas. Tus opciones dependen de tus palabras, tu presupuesto y tu negocio.',
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-[#d9d9d9] bg-white px-4 py-2.5 text-xs font-semibold text-[#5d5d5d]">
                  <span className="h-2 w-2 rounded-full bg-[#e21833]" />
                  {records.length} {t('tools in the stack', 'herramientas en el catálogo')}
                </div>
              </div>

              <div className="relative z-10 grid gap-5 lg:grid-cols-3">
                {tools.map((tool, index) => {
                  const isSaved = saved.includes(tool.name);
                  return (
                    <article
                      key={tool.name}
                      className={`group relative flex flex-col overflow-hidden rounded-[26px] border bg-white p-5 shadow-[0_12px_35px_rgba(0,0,0,.07)] transition-all hover:-translate-y-2 hover:shadow-[0_25px_55px_rgba(226,24,51,.12)] ${
                        index === 0
                          ? 'border-[#e21833] ring-4 ring-[#ffd200]/20'
                          : 'border-[#dddddd]'
                      }`}
                    >
                      <div className="pointer-events-none absolute -right-16 -top-20 h-40 w-40 rounded-full bg-[#ffd200]/20 blur-2xl" />
                      <div className="mb-5 flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <span className="flex h-14 w-14 items-center justify-center rounded-[16px] border border-[#e5e5e5] bg-white shadow-[0_7px_18px_rgba(0,0,0,.10)]">
                            <ToolLogo
                              domain={tool.domain}
                              name={tool.name}
                              className="h-9 w-9 rounded-lg"
                            />
                          </span>
                          <div>
                            <h3 className="font-semibold tracking-[-0.025em]">{tool.name}</h3>
                            <p className="mt-0.5 text-xs text-[#7a7a7a]">{tool.category}</p>
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            setSaved((current) =>
                              isSaved
                                ? current.filter((item) => item !== tool.name)
                                : [...current, tool.name],
                            )
                          }
                          className={`rounded-full border p-2.5 transition-colors ${
                            isSaved
                              ? 'border-[#000000] bg-[#000000] text-white'
                              : 'border-[#dedede] text-[#747474] hover:border-[#e21833]'
                          }`}
                          aria-label={`${isSaved ? t('Remove', 'Quitar') : t('Save', 'Guardar')} ${
                            tool.name
                          }`}
                          aria-pressed={isSaved}
                          title={t('Bookmark for this page', 'Marcar en esta página')}
                        >
                          <Icon
                            name="bookmark"
                            className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`}
                          />
                        </button>
                      </div>

                      <div className="mb-5 flex items-center justify-between rounded-xl bg-gradient-to-r from-[#fff9dc] to-[#ffffff] px-3.5 py-3">
                        <span className="text-xs font-semibold text-[#686868]">
                          {t('Fit verification', 'Verificación de ajuste')}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="h-1.5 w-16 overflow-hidden rounded-full bg-[#dedede]">
                            <span
                              className="block h-full rounded-full bg-[#e21833]"
                              style={{ width: '0%' }}
                            />
                          </span>
                          <strong className="text-sm text-[#e21833]">
                            {t('Not checked', 'Sin revisar')}
                          </strong>
                        </div>
                      </div>

                      <p className="min-h-[72px] text-[15px] leading-6 text-[#555555]">
                        {tool.summary}
                      </p>

                      <div className="my-5 rounded-xl border border-[#e5e5e5] p-3.5">
                        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-[#e21833]">
                          {t('Why it’s here', 'Por qué aparece')}
                        </p>
                        <p className="text-xs leading-5 text-[#606060]">{tool.reason}</p>
                      </div>

                      <div className="grid grid-cols-3 gap-2 border-y border-[#e8e8e8] py-4">
                        {[
                          [
                            <Icon key="helped" name="clock" className="h-3.5 w-3.5" />,
                            t('Helped', 'Ayudó'),
                            tool.time,
                          ],
                          [
                            <Icon key="setup" name="wand" className="h-3.5 w-3.5" />,
                            t('Setup', 'Preparación'),
                            tool.setup,
                          ],
                          [
                            <Icon key="price" name="trend" className="h-3.5 w-3.5" />,
                            t('Price', 'Precio'),
                            tool.price,
                          ],
                        ].map(([icon, label, value]) => (
                          <div
                            key={String(label)}
                            className="border-r border-[#e8e8e8] px-1 last:border-0"
                          >
                            <div className="mb-1 flex items-center gap-1 text-[10px] text-[#868686]">
                              {icon}
                              {label}
                            </div>
                            <div className="text-[11px] font-bold text-[#2d2d2d]">{value}</div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex gap-1">
                          {tool.tags.slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="rounded-md bg-[#f3f3f3] px-2 py-1 text-[10px] font-semibold text-[#6e6e6e]"
                            >
                              {tag}
                            </span>
                          ))}
                          <span className="rounded-md bg-[#f3f3f3] px-2 py-1 text-[10px] font-semibold text-[#6e6e6e]">
                            {tool.sourceCount} {t('sources', 'fuentes')}
                          </span>
                        </div>
                        <button
                          onClick={() => router.push(`/tools/${tool.slug}`)}
                          className="flex items-center gap-1.5 text-xs font-bold text-[#e21833] transition-gap hover:gap-2.5"
                        >
                          {t('View evidence', 'Ver evidencia')}{' '}
                          <Icon name="chevron" className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {index === 0 && (
                        <span className="absolute right-5 top-3 rounded-full bg-[#ffd200] px-3 py-1 text-[10px] font-bold uppercase tracking-[.08em] text-[#000000] shadow-sm">
                          {t('Published reference', 'Referencia publicada')}
                        </span>
                      )}
                    </article>
                  );
                })}
              </div>

              <div className="mt-7 flex flex-col items-center justify-between gap-5 rounded-[20px] bg-[#000000] px-6 py-5 text-white sm:flex-row sm:px-8">
                <div className="flex items-center gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-[#ffd200]">
                    <Icon name="stack" />
                  </span>
                  <div>
                    <p className="font-semibold">
                      {t('Get picks for your business', 'Recibe opciones para tu negocio')}
                    </p>
                    <p className="mt-1 text-xs text-white/65">
                      {t('About a minute. No account.', 'Cerca de un minuto. Sin cuenta.')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={continueBrief}
                  className="flex shrink-0 items-center gap-2 rounded-full bg-white px-5 py-3 text-xs font-bold text-[#000000]"
                >
                  {t('Build my business brief', 'Armar mi información de negocio')}{' '}
                  <Icon name="arrow" className="h-4 w-4" />
                </button>
              </div>
            </div>
          </section>
        )}

        <section className="bg-[#000000] px-5 py-20 text-center text-white">
          <div className="mx-auto max-w-2xl">
            <Icon name="sparkles" className="mx-auto mb-6 h-8 w-8 text-[#ffd200]" />
            <h2 className="text-3xl font-semibold tracking-[-0.045em] sm:text-5xl">
              {t(
                'Your next step starts with one bottleneck.',
                'Tu próximo paso empieza con un solo obstáculo.',
              )}
            </h2>
            <p className="mx-auto mt-5 max-w-lg leading-7 text-white/65">
              {t(
                'We’ll find the simplest tool to remove it.',
                'Encontraremos la herramienta más sencilla para quitarlo.',
              )}
            </p>
            <button
              onClick={() => void scrollToFinder()}
              className="mt-8 rounded-full bg-[#ffd200] px-7 py-3.5 text-sm font-bold text-[#000000] transition-transform hover:-translate-y-0.5"
            >
              {t('Find my first tool', 'Encontrar mi primera herramienta')}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
