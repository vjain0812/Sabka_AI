import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  ExternalLink,
  HeartHandshake,
  Info,
  NotebookPen,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { jobs } from '@/lib/domain/brief';
import { scenarioBySlug, scenarioNames, scenarios } from '@/lib/domain/scenarios';
import { scenariosEs } from '@/lib/domain/scenarios-es';
import { jobEs, priceLabelEs } from '@/lib/domain/i18n-es';
import { spanishToolSummary } from '@/lib/domain/tool-translations';
import { T } from '@/components/site/t';
import { scenarioToolViews } from '@/lib/server/scenario-tools';
import { ScenarioIcon } from '@/components/site/scenario-icon';
import { ToolMark } from '@/components/site/tool-mark';
import { UseScenarioButton } from '@/components/site/use-scenario-button';

export const dynamic = 'force-dynamic';
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const scenario = scenarioBySlug(slug);
  return { title: scenario ? `${scenario.profession} workflow` : 'Workflow not found' };
}

export default async function ScenarioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const scenario = scenarioBySlug(slug);
  if (!scenario) notFound();
  const { views } = await scenarioToolViews([scenario]);
  const tools = views[scenario.slug];
  const toolFor = (toolSlug?: string) => tools.find((t) => t.slug === toolSlug);
  const others = scenarios.filter((s) => s.slug !== scenario.slug);
  const es = scenariosEs[scenario.slug];
  const names = scenarioNames(scenario, 'es');
  return (
    <div className="brand-ui bg-[#f7f7f5] text-[#111]">
      {/* ---------- Hero ---------- */}
      <section className="hero-grid relative overflow-hidden bg-[#090909] text-white">
        <div className="pointer-events-none absolute -left-40 top-16 h-[460px] w-[460px] rounded-full bg-[#e21833]/35 blur-[100px]" />
        <div className="pointer-events-none absolute -right-28 -top-8 h-[440px] w-[440px] rounded-full bg-[#ffd200]/10 blur-[110px]" />
        <div className="relative mx-auto grid max-w-[1240px] grid-cols-1 gap-12 px-5 pb-28 pt-10 lg:grid-cols-[1.1fr_.9fr] lg:px-8 lg:pt-14">
          <div>
            <Link
              href="/workflows"
              className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-white/60 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />{' '}
              <T en="All workflows" es="Todos los flujos" />
            </Link>
            <div className="rise mb-6 flex items-center gap-3">
              <span
                className="flex h-14 w-14 items-center justify-center rounded-[16px] text-black shadow-[0_10px_30px_rgba(0,0,0,.35)]"
                style={{ background: scenario.accent }}
              >
                <ScenarioIcon name={scenario.icon} className="h-7 w-7" />
              </span>
              <span className="rounded-full border border-white/15 bg-white/[.06] px-3 py-1.5 text-xs font-semibold text-white/75">
                <T en={`${scenario.shortName} workflow`} es={`Flujo: ${names.shortName}`} />
              </span>
            </div>
            <h1 className="rise text-[42px] font-semibold leading-[1] tracking-[-0.06em] sm:text-[60px]">
              <T en={scenario.profession} es={names.profession} />
            </h1>
            <blockquote className="rise mt-6 max-w-[620px] border-l-2 border-[#ffd200] pl-5 text-lg leading-8 text-white/70">
              <T en={scenario.problem} es={es.problem} />
            </blockquote>
            <ul className="rise mt-7 flex flex-wrap gap-2">
              {scenario.pains.map((pain, pi) => (
                <li
                  key={pain}
                  className="rounded-full border border-white/15 bg-white/[.05] px-3.5 py-1.5 text-xs font-semibold text-white/80"
                >
                  <T en={pain} es={es.pains[pi]} />
                </li>
              ))}
            </ul>
            <div className="rise mt-9 flex flex-wrap items-center gap-4">
              <UseScenarioButton slug={scenario.slug} />
              <a
                href="#workflow"
                className="rounded-full px-4 py-3 text-sm font-semibold text-white/70 hover:text-white"
              >
                <T en="See the steps ↓" es="Ver los pasos ↓" />
              </a>
            </div>
          </div>

          {/* Coverage card */}
          <div className="rise relative self-end">
            <div className="rotate-[1.5deg] rounded-[26px] border border-white/15 bg-[#171717]/80 p-3 shadow-[0_40px_100px_rgba(0,0,0,.35)] backdrop-blur-xl">
              <div className="rounded-[19px] bg-[#fafafa] p-5 text-[#111]">
                <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#5f5f5f]">
                  <T en="Tools in this workflow" es="Herramientas de este flujo" />
                </p>
                <ul className="mt-4 space-y-3">
                  {tools.map((tool, i) => (
                    <li
                      key={tool.slug}
                      className="rise flex items-center gap-3 rounded-xl border border-[#e6e6e6] bg-white p-3 shadow-[0_5px_16px_rgba(0,0,0,.05)] transition-transform hover:-translate-y-0.5"
                      style={{ animationDelay: `${150 + i * 120}ms` }}
                    >
                      <ToolMark name={tool.name} website={tool.website} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{tool.name}</p>
                        <p className="truncate text-[11px] text-[#666]">
                          <T en={tool.role} es={es.roles[i]} />
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          tool.published
                            ? 'bg-[#fff4bf] text-[#3d3200]'
                            : 'bg-[#f1f1f1] text-[#666]'
                        }`}
                      >
                        {tool.published ? (
                          <T
                            en={`${tool.sourceCount} source${tool.sourceCount === 1 ? '' : 's'}`}
                            es={`${tool.sourceCount} fuente${tool.sourceCount === 1 ? '' : 's'}`}
                          />
                        ) : (
                          <T en="Pending" es="Pendiente" />
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 rounded-xl bg-[#111] p-4 text-white">
                  <p className="text-[10px] uppercase tracking-[.12em] text-white/55">
                    <T en="Personalized matching" es="Recomendación personalizada" />
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {scenario.job ? (
                      <T en={jobs[scenario.job].title} es={jobEs[scenario.job]} />
                    ) : (
                      <T
                        en="Outside the three supported tasks"
                        es="Fuera de las tres tareas compatibles"
                      />
                    )}
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-white/60">
                    <T
                      en={
                        scenario.job
                          ? 'Your brief is checked against your budget, setup time and boundaries.'
                          : 'This is a curated library shortlist. Personalized matching does not cover this job yet.'
                      }
                      es={
                        scenario.job
                          ? 'Tu información se contrasta con tu presupuesto, tu tiempo y tus límites.'
                          : 'Es una lista curada del catálogo. La recomendación personalizada aún no cubre esta tarea.'
                      }
                    />
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- The workflow ---------- */}
      <section
        id="workflow"
        className="relative z-10 mx-auto -mt-16 max-w-[1240px] scroll-mt-24 px-5 lg:px-8"
      >
        <div className="rounded-[28px] border border-white/50 bg-white p-3 shadow-[0_35px_90px_rgba(0,0,0,.14)] sm:p-4">
          <div className="rounded-[20px] bg-[#f4f4f2] p-5 sm:p-7">
            <p className="mb-2 text-xs font-bold uppercase tracking-[.14em] text-[#5f5f5f]">
              <T en="The workflow" es="El flujo" />
            </p>
            <h2 className="text-2xl font-semibold tracking-[-0.035em] sm:text-[30px]">
              <T
                en="How the work could flow, step by step."
                es="Cómo podría fluir el trabajo, paso a paso."
              />
            </h2>
            <ol className="mt-8 grid gap-4 lg:grid-flow-col lg:auto-cols-fr">
              {scenario.steps.map((step, index) => {
                const tool = toolFor(step.toolSlug);
                const last = index === scenario.steps.length - 1;
                return (
                  <li
                    key={step.title}
                    className="rise relative"
                    style={{ animationDelay: `${index * 90}ms` }}
                  >
                    {!last && (
                      <>
                        <span
                          aria-hidden="true"
                          className="flow-line absolute left-[calc(50%+28px)] right-[calc(-50%+28px)] top-7 hidden h-[2px] lg:block"
                        />
                        <span
                          aria-hidden="true"
                          className="flow-line-v absolute -bottom-4 left-7 top-[64px] w-[2px] lg:hidden"
                        />
                      </>
                    )}
                    <div className="flex gap-4 lg:flex-col lg:items-center lg:text-center">
                      <span
                        className={`relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-4 border-[#f4f4f2] text-sm font-bold shadow-[0_8px_20px_rgba(0,0,0,.12)] ${
                          step.human ? 'pulse-ring bg-[#ffd200] text-black' : 'bg-[#111] text-white'
                        }`}
                      >
                        {step.human ? (
                          <UserRound className="h-5 w-5" aria-hidden="true" />
                        ) : (
                          index + 1
                        )}
                      </span>
                      <div className="flex-1 rounded-2xl border border-[#e3e3e3] bg-white p-4 shadow-[0_5px_16px_rgba(0,0,0,.04)] transition-transform hover:-translate-y-1 lg:w-full">
                        <p className="text-sm font-semibold tracking-[-0.01em]">
                          <T en={step.title} es={es.steps[index].title} />
                        </p>
                        <p className="mt-1.5 text-xs leading-5 text-[#666]">
                          <T en={step.detail} es={es.steps[index].detail} />
                        </p>
                        <p className="mt-3 flex items-center gap-2 text-[11px] font-semibold lg:justify-center">
                          {step.human ? (
                            <span className="rounded-full bg-[#fff4bf] px-2 py-0.5 text-[#3d3200]">
                              <T en="You decide" es="Tú decides" />
                            </span>
                          ) : tool ? (
                            <>
                              <ToolMark name={tool.name} website={tool.website} size="sm" />
                              <span className="text-[#333]">{tool.name}</span>
                            </>
                          ) : null}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </section>

      {/* ---------- Tools ---------- */}
      <section className="mx-auto max-w-[1240px] px-5 py-20 lg:px-8">
        <div className="mb-9 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[.14em] text-[#c41230]">
              <T en="AI tools to consider" es="Herramientas de IA para considerar" />
            </p>
            <h2 className="text-3xl font-semibold tracking-[-0.045em] sm:text-[40px]">
              <T en="A starting shortlist, with sources." es="Una lista de partida, con fuentes." />
            </h2>
            <p className="mt-3 max-w-2xl text-[#666]">
              <T
                en="Descriptions come from each vendor’s official page on the checked date. Fit for your business, total price and approval controls still need checking."
                es="Las descripciones vienen de la página oficial de cada proveedor en la fecha de revisión. Aún falta comprobar si encajan con tu negocio, el precio total y los controles de aprobación."
              />
            </p>
          </div>
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          {tools.map((tool, index) => (
            <article
              key={tool.slug}
              className="rise group relative flex flex-col overflow-hidden rounded-[26px] border border-[#dddddd] bg-white p-5 shadow-[0_12px_35px_rgba(0,0,0,.07)] transition-all hover:-translate-y-2 hover:shadow-[0_25px_55px_rgba(226,24,51,.12)]"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className="pointer-events-none absolute -right-16 -top-20 h-40 w-40 rounded-full bg-[#ffd200]/20 blur-2xl" />
              <div className="mb-5 flex items-center gap-3">
                <ToolMark name={tool.name} website={tool.website} size="lg" />
                <div>
                  <h3 className="font-semibold tracking-[-0.025em]">{tool.name}</h3>
                  <p className="mt-0.5 text-xs text-[#666]">
                    <T en={tool.role} es={es.roles[index]} />
                  </p>
                </div>
              </div>
              {tool.published ? (
                <>
                  <p className="min-h-[72px] text-[15px] leading-6 text-[#555]">
                    <T
                      en={tool.summary ?? ''}
                      es={spanishToolSummary(tool.slug) ?? tool.summary ?? ''}
                    />
                  </p>
                  <dl className="my-5 grid grid-cols-3 gap-2 border-y border-[#e8e8e8] py-4 text-[11px]">
                    <div className="border-r border-[#e8e8e8] pr-1">
                      <dt className="text-[10px] text-[#666]">
                        <T en="Price" es="Precio" />
                      </dt>
                      <dd className="mt-1 font-bold text-[#2d2d2d]">
                        <T en={tool.price ?? ''} es={priceLabelEs(tool.price ?? '')} />
                      </dd>
                    </div>
                    <div className="border-r border-[#e8e8e8] px-1">
                      <dt className="text-[10px] text-[#666]">
                        <T en="Sources" es="Fuentes" />
                      </dt>
                      <dd className="mt-1 font-bold text-[#2d2d2d]">
                        {tool.sourceCount} <T en="official" es="oficiales" />
                      </dd>
                    </div>
                    <div className="pl-1">
                      <dt className="text-[10px] text-[#666]">
                        <T en="Checked" es="Revisado" />
                      </dt>
                      <dd className="mt-1 font-bold text-[#2d2d2d]">
                        {tool.checkedAt ?? <T en="Unknown" es="Desconocido" />}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-auto flex items-center justify-between gap-3">
                    <Link
                      href={`/tools/${tool.slug}`}
                      className="flex items-center gap-1.5 text-xs font-bold text-[#c41230] transition-all hover:gap-2.5"
                    >
                      <T en="View evidence" es="Ver evidencia" />{' '}
                      <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                    {tool.website && (
                      <a
                        href={tool.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs font-semibold text-[#666] hover:text-black"
                      >
                        <T en="Official site" es="Sitio oficial" />{' '}
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        <span className="sr-only">
                          <T en="(opens in a new tab)" es="(se abre en otra pestaña)" />
                        </span>
                      </a>
                    )}
                  </div>
                </>
              ) : (
                <p className="rounded-xl bg-[#f4f4f2] p-4 text-sm leading-6 text-[#555]">
                  <T
                    en="This tool is not in the published catalog yet, so no facts are shown. An administrator must import its source-checked record first."
                    es="Esta herramienta aún no está en el catálogo publicado, así que no se muestran datos. Primero hay que importar su registro con fuentes verificadas."
                  />
                </p>
              )}
            </article>
          ))}
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <div className="rounded-[24px] border border-[#e2e2df] bg-white p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ffd200] text-black">
                <HeartHandshake className="h-5 w-5" aria-hidden="true" />
              </span>
              <h2 className="text-lg font-semibold tracking-[-0.02em]">
                <T en="What stays human" es="Lo que sigue en manos de personas" />
              </h2>
            </div>
            <ul className="mt-5 space-y-3">
              {scenario.staysHuman.map((item, si) => (
                <li key={item} className="flex items-start gap-3 text-sm text-[#444]">
                  <ShieldCheck
                    className="mt-0.5 h-4 w-4 shrink-0 text-[#c41230]"
                    aria-hidden="true"
                  />
                  <T en={item} es={es.staysHuman[si]} />
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-[24px] border border-[#e2e2df] bg-[#fffbe8] p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-[#ffd200]">
                <NotebookPen className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#c41230]">
                  <T en="Always an option" es="Siempre es una opción" />
                </p>
                <h2 className="text-lg font-semibold tracking-[-0.02em]">
                  <T en="Start with no new tool" es="Empieza sin una herramienta nueva" />
                </h2>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-[#4b4535]">
              <T en={scenario.existingOption} es={es.existingOption} />
            </p>
            <p className="mt-3 text-xs font-semibold text-[#6b5f2c]">
              <T en="No new subscription · $0" es="Sin suscripción nueva · $0" />
            </p>
          </div>
        </div>

        <p className="mt-6 flex items-start gap-2 text-xs leading-5 text-[#666]">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <T
            en="This workflow is an illustration of how tools could fit together. It is not a review, endorsement or measured outcome, and SABKA AI has no partnership with these vendors."
            es="Este flujo es una ilustración de cómo podrían encajar las herramientas. No es una reseña, un aval ni un resultado medido, y SABKA AI no tiene alianzas con estos proveedores."
          />
        </p>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="bg-black px-5 py-16 text-white">
        <div className="mx-auto flex max-w-[1240px] flex-col items-start justify-between gap-6 lg:flex-row lg:items-center lg:px-8">
          <div>
            <h2 className="text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
              <T en="Make this workflow yours." es="Haz tuyo este flujo." />
            </h2>
            <p className="mt-3 max-w-xl text-white/65">
              <T
                en="We’ll prefill your brief with this workflow. You review every answer, then add your budget, setup time and boundaries."
                es="Completaremos tu información con este flujo. Tú revisas cada respuesta y luego agregas tu presupuesto, tu tiempo y tus límites."
              />
            </p>
          </div>
          <UseScenarioButton
            slug={scenario.slug}
            label="Prefill my brief"
            labelEs="Completar mi información"
          />
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-5 py-14 lg:px-8">
        <h2 className="mb-5 text-sm font-bold uppercase tracking-[.14em] text-[#5f5f5f]">
          <T en="Other workflows" es="Otros flujos" />
        </h2>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {others.map((other) => (
            <Link
              key={other.slug}
              href={`/workflows/${other.slug}`}
              className="group flex min-w-[220px] items-center gap-3 rounded-2xl border border-[#e2e2df] bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-[#e21833]"
            >
              <span
                className="flex h-10 w-10 items-center justify-center rounded-xl text-black"
                style={{ background: other.accent }}
              >
                <ScenarioIcon name={other.icon} />
              </span>
              <span className="text-sm font-semibold">
                <T en={other.profession} es={scenarioNames(other, 'es').profession} />
              </span>
              <ArrowRight
                className="ml-auto h-4 w-4 text-[#999] transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
