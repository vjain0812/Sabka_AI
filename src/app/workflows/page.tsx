import Link from 'next/link';
import { ArrowRight, ChevronRight, HeartHandshake, ShieldCheck, Workflow } from 'lucide-react';
import { scenarioNames, scenarios } from '@/lib/domain/scenarios';
import { scenariosEs } from '@/lib/domain/scenarios-es';
import { T } from '@/components/site/t';
import { scenarioToolViews } from '@/lib/server/scenario-tools';
import { ScenarioIcon } from '@/components/site/scenario-icon';
import { ToolMark } from '@/components/site/tool-mark';

export const metadata = { title: 'Workflows' };
export const dynamic = 'force-dynamic';

export default async function WorkflowsPage() {
  const { views } = await scenarioToolViews(scenarios);
  const toolCount = new Set(scenarios.flatMap((s) => s.tools.map((t) => t.slug))).size;
  return (
    <div className="brand-ui bg-[#f7f7f5] text-[#111]">
      <section className="hero-grid relative overflow-hidden bg-[#090909] text-white">
        <div className="pointer-events-none absolute -left-40 top-10 h-[460px] w-[460px] rounded-full bg-[#e21833]/35 blur-[100px]" />
        <div className="pointer-events-none absolute -right-24 -top-10 h-[420px] w-[420px] rounded-full bg-[#ffd200]/10 blur-[110px]" />
        <div className="relative mx-auto max-w-[1240px] px-5 pb-28 pt-16 lg:px-8 lg:pt-20">
          <div className="rise mb-7 flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/[.06] px-3 py-1.5 text-xs font-semibold text-white/75">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ffd200] opacity-60" />
              <span className="relative h-2 w-2 rounded-full bg-[#ffd200]" />
            </span>
            <T en="Workflow library" es="Biblioteca de flujos" />
          </div>
          <h1 className="rise max-w-[820px] text-[44px] font-semibold leading-[.98] tracking-[-0.06em] sm:text-[64px]">
            <T en="Pick a business like yours." es="Elige un negocio como el tuyo." />{' '}
            <span className="bg-gradient-to-r from-[#ffd200] via-[#ffdf43] to-white bg-clip-text text-transparent">
              <T en="See the workflow." es="Mira el flujo." />
            </span>
          </h1>
          <p className="rise mt-6 max-w-[620px] text-lg leading-8 text-white/60">
            <T
              en="Each workflow starts with one everyday problem, shows where AI could help step by step, and keeps the decisions that matter with you."
              es="Cada flujo parte de un problema cotidiano, muestra paso a paso dónde puede ayudar la IA y deja contigo las decisiones importantes."
            />
          </p>
          <dl className="rise mt-10 grid max-w-[560px] grid-cols-3 gap-3">
            {[
              [String(scenarios.length), 'workflows', 'flujos'],
              [String(toolCount), 'source-checked tools', 'herramientas verificadas'],
              ['0', 'accounts needed', 'cuentas necesarias'],
            ].map(([value, label, es]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/[.04] p-4">
                <dt className="sr-only">
                  <T en={label} es={es} />
                </dt>
                <dd>
                  <span className="block text-3xl font-semibold tracking-[-0.05em]">{value}</span>
                  <span className="mt-1 block text-xs text-white/50">
                    <T en={label} es={es} />
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-16 max-w-[1240px] px-5 pb-20 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-2">
          {scenarios.map((scenario, index) => {
            const es = scenariosEs[scenario.slug];
            const names = scenarioNames(scenario, 'es');
            return (
              <article
                key={scenario.slug}
                className="rise group relative flex flex-col overflow-hidden rounded-[26px] border border-[#dddddd] bg-white p-6 shadow-[0_12px_35px_rgba(0,0,0,.07)] transition-all hover:-translate-y-1.5 hover:shadow-[0_25px_55px_rgba(226,24,51,.12)]"
                style={{ animationDelay: `${index * 70}ms` }}
              >
                <div className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-[#ffd200]/20 blur-2xl transition-opacity group-hover:opacity-100" />
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-14 w-14 items-center justify-center rounded-[16px] text-black shadow-[0_7px_18px_rgba(0,0,0,.12)]"
                      style={{ background: scenario.accent }}
                    >
                      <ScenarioIcon name={scenario.icon} className="h-6 w-6" />
                    </span>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#c41230]">
                        <T en="Workflow" es="Flujo" /> {String(index + 1).padStart(2, '0')}
                      </p>
                      <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em]">
                        <Link
                          href={`/workflows/${scenario.slug}`}
                          className="after:absolute after:inset-0 after:z-10 after:rounded-[26px] after:content-['']"
                        >
                          <T en={scenario.profession} es={names.profession} />
                        </Link>
                      </h2>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                      scenario.job ? 'bg-[#fff4bf] text-[#3d3200]' : 'bg-[#f1f1f1] text-[#555]'
                    }`}
                  >
                    {scenario.job ? (
                      <T en="Personal matching available" es="Recomendación personal disponible" />
                    ) : (
                      <T en="Library shortlist" es="Lista del catálogo" />
                    )}
                  </span>
                </div>

                <p className="relative mt-5 text-[15px] leading-6 text-[#555]">
                  <T en={scenario.problem} es={es.problem} />
                </p>

                <ol className="relative mt-6 flex items-center gap-1.5">
                  {scenario.steps.map((step, i) => (
                    <li key={step.title} className="flex flex-1 items-center gap-1.5">
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                          step.human ? 'bg-[#ffd200] text-black' : 'bg-[#111] text-white'
                        }`}
                      >
                        {step.human ? (
                          <HeartHandshake className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : (
                          i + 1
                        )}
                        <span className="sr-only">
                          <T en={step.title} es={es.steps[i].title} />
                        </span>
                      </span>
                      {i < scenario.steps.length - 1 && (
                        <span
                          className="flow-line h-[2px] flex-1 rounded-full"
                          aria-hidden="true"
                        />
                      )}
                    </li>
                  ))}
                </ol>

                <ul className="relative mt-6 grid gap-2.5 border-t border-[#ececec] pt-5 sm:grid-cols-3">
                  {views[scenario.slug].map((tool, ti) => (
                    <li key={tool.slug} className="flex items-center gap-2.5">
                      <ToolMark name={tool.name} website={tool.website} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">{tool.name}</span>
                        <span className="block truncate text-[11px] text-[#666]">
                          <T en={tool.role} es={es.roles[ti]} />
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>

                <span className="relative mt-6 flex items-center gap-1.5 text-xs font-bold text-[#c41230] transition-all group-hover:gap-2.5">
                  <T en="Open the workflow" es="Abrir el flujo" />{' '}
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </article>
            );
          })}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            [
              Workflow,
              ['A shortlist, not a verdict', 'Una lista de partida, no un veredicto'],
              [
                'Workflows show how tools could fit together. Your own budget, setup time and boundaries decide what passes.',
                'Los flujos muestran cómo podrían encajar las herramientas. Tu presupuesto, tu tiempo y tus límites deciden cuáles pasan.',
              ],
            ],
            [
              ShieldCheck,
              ['Every fact has a source', 'Cada dato tiene su fuente'],
              [
                'Tool descriptions come from official pages with a checked date. Unknown prices stay unknown.',
                'Las descripciones vienen de páginas oficiales con fecha de revisión. Los precios desconocidos siguen siendo desconocidos.',
              ],
            ],
            [
              HeartHandshake,
              ['You stay in charge', 'Tú tienes el control'],
              [
                'Each workflow names what stays human and includes a no-new-tool option.',
                'Cada flujo indica qué sigue en manos de personas e incluye una opción sin herramienta nueva.',
              ],
            ],
          ].map(([IconComponent, title, copy]) => {
            const I = IconComponent as typeof Workflow;
            const tt = title as string[];
            const cc = copy as string[];
            return (
              <div key={tt[0]} className="rounded-[22px] border border-[#e2e2df] bg-white p-5">
                <I className="h-5 w-5 text-[#c41230]" aria-hidden="true" />
                <h2 className="mt-3 font-semibold tracking-[-0.02em]">
                  <T en={tt[0]} es={tt[1]} />
                </h2>
                <p className="mt-1.5 text-sm leading-6 text-[#666]">
                  <T en={cc[0]} es={cc[1]} />
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-5 rounded-[22px] bg-black px-6 py-6 text-white sm:flex-row sm:px-8">
          <div>
            <p className="font-semibold">
              <T en="Don’t see your business?" es="¿No ves tu negocio?" />
            </p>
            <p className="mt-1 text-sm text-white/65">
              <T
                en="Any small business is welcome. Describe your bottleneck and we’ll be clear about what we can match today."
                es="Todo pequeño negocio es bienvenido. Describe tu obstáculo y te diremos con claridad qué podemos recomendarte hoy."
              />
            </p>
          </div>
          <Link
            href="/business"
            className="flex shrink-0 items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-black transition-colors hover:bg-[#ffd200]"
          >
            <T en="Start my own brief" es="Empezar mi propia información" />{' '}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}
