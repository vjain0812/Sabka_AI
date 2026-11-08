import type { CatalogRecord } from './catalog-record';
import { knownPrices, pricingLabel } from './catalog-browse';
import { reviewedClaim, setupEstimate } from './tool-insights';
import { tutorialFor } from './learning-resources';
import { toolFeatures } from './accessibility';
import { workflowTags } from './library-taxonomy';
import data from './tool-accessibility.json';

/**
 * Plain-language metrics for a recommendation card: cost, setup difficulty, integration effort
 * and a "worth it?" scenario. Every value carries an evidence label, and nothing here changes the
 * ranking: these explain the economics/compatibility/usability trade-offs, they are not bonuses.
 *
 * Evidence labels:
 *  - verified:   from a source we checked and that is still current (e.g. a vendor pricing page)
 *  - vendor:     stated in the vendor's own material; not tested by us
 *  - estimated:  SABKA's documented rule of thumb; weights are provisional
 *  - yours:      calculated only from numbers the owner entered
 *  - unverified: we have no evidence either way
 */
export type Evidence = 'verified' | 'vendor' | 'estimated' | 'yours' | 'unverified';
type Copy = { en: string; es: string };
export const evidenceCopy: Record<Evidence, Copy> = {
  verified: { en: 'Verified', es: 'Verificado' },
  vendor: { en: 'Vendor says', es: 'Según el proveedor' },
  estimated: { en: 'Estimated', es: 'Estimado' },
  yours: { en: 'Your numbers', es: 'Tus números' },
  unverified: { en: 'Not verified', es: 'Sin verificar' },
};
export const METRICS_VERSION = 'metrics-1.0.0';

const docText = (r: CatalogRecord) =>
  [
    r.tool.name,
    r.tool.summary,
    ...r.claims.filter((c) => c.key === 'capability').map((c) => String(c.value)),
  ]
    .join(' ')
    .toLowerCase();
const technical = new Set(data.technicalSetup);

/* ---------------- Cost ---------------- */
export function costMetric(record: CatalogRecord, now = Date.now()) {
  const prices = knownPrices(record, now);
  const paid = prices.filter((p) => p.price > 0);
  const free = prices.some((p) => p.price === 0);
  const trial = reviewedClaim(record, 'free_trial_days', now)?.value;
  const usage = prices.map((p) => p.plan.usageLimit).find(Boolean) ?? null;
  return {
    label: pricingLabel(record, now),
    /** Cheapest paid monthly price, if verified. */
    monthly: paid[0]?.price ?? null,
    free,
    trialDays: typeof trial === 'number' ? trial : null,
    usageLimit: usage,
    evidence: (prices.length ? 'verified' : 'unverified') as Evidence,
  };
}

/* ---------------- Setup difficulty (rubric) ---------------- */
export type Level3 = 'easy' | 'moderate' | 'advanced';
export type Factor = {
  key: string;
  label: Copy;
  points: number;
  weight: number;
  evidence: Evidence;
  note: Copy;
};
/** Setup time → 0–100 friction. 30 min = 0, 1 h = 20, half day = 50, a day = 75, days = 100. */
function setupTimePoints(minutes: number) {
  if (minutes <= 30) return 0;
  if (minutes <= 60) return 20;
  if (minutes <= 240) return 50;
  if (minutes <= 480) return 75;
  return 100;
}
function technicalPoints(record: CatalogRecord): { points: number; note: Copy } {
  const text = docText(record);
  if (technical.has(record.tool.slug))
    return {
      points: 100,
      note: {
        en: 'A builder or platform: you design the workflow yourself.',
        es: 'Un constructor o plataforma: tú diseñas el flujo.',
      },
    };
  if (/\bapi\b|developer|configure|sdk/.test(text))
    return {
      points: 70,
      note: {
        en: 'Its sources mention APIs or configuration.',
        es: 'Sus fuentes mencionan APIs o configuración.',
      },
    };
  if (workflowTags(record.tool).includes('automation'))
    return {
      points: 50,
      note: {
        en: 'Automation tools need some setup thinking.',
        es: 'Las automatizaciones requieren algo de planificación.',
      },
    };
  return {
    points: 0,
    note: {
      en: 'Ready-made app; no coding mentioned.',
      es: 'App lista para usar; no se menciona programación.',
    },
  };
}
export function setupDifficulty(record: CatalogRecord) {
  const est = setupEstimate(record);
  const tech = technicalPoints(record);
  const video = tutorialFor(record.tool.slug);
  const humans = toolFeatures(record.tool.slug).includes('human_help');
  const factors: Factor[] = [
    {
      key: 'steps',
      label: { en: 'Time before first use', es: 'Tiempo antes del primer uso' },
      points: setupTimePoints(est.minutes),
      weight: 0.4,
      evidence: 'estimated',
      note: { en: est.label, es: est.labelEs },
    },
    {
      key: 'technical',
      label: { en: 'Technical prerequisites', es: 'Requisitos técnicos' },
      points: tech.points,
      weight: 0.35,
      evidence: 'estimated',
      note: tech.note,
    },
    {
      key: 'learning',
      label: { en: 'Beginner learning material', es: 'Material para principiantes' },
      points: video ? 0 : 60,
      weight: 0.15,
      evidence: video ? 'verified' : 'unverified',
      note: video
        ? {
            en: 'We found and checked a tutorial video.',
            es: 'Encontramos y revisamos un video tutorial.',
          }
        : { en: 'No reviewed tutorial yet.', es: 'Aún no hay un tutorial revisado.' },
    },
    {
      key: 'help',
      label: { en: 'Human help', es: 'Ayuda de personas' },
      points: humans ? 0 : 50,
      weight: 0.1,
      evidence: humans ? 'vendor' : 'unverified',
      note: humans
        ? { en: 'Real people can take over.', es: 'Personas reales pueden ayudarte.' }
        : { en: 'Support level not checked.', es: 'No revisamos el nivel de soporte.' },
    },
  ];
  const score = Math.round(factors.reduce((s, f) => s + f.points * f.weight, 0));
  const level: Level3 = score < 30 ? 'easy' : score < 60 ? 'moderate' : 'advanced';
  const vendorSetup = reviewedClaim(record, 'vendor_setup_claim')?.value;
  return {
    level,
    score,
    factors,
    /** A vendor's own setup statement, quoted, when we have one. */
    vendorQuote: typeof vendorSetup === 'string' ? vendorSetup : null,
    evidence: 'estimated' as Evidence,
  };
}
export const levelCopy: Record<Level3, Copy> = {
  easy: { en: 'Easy', es: 'Fácil' },
  moderate: { en: 'Moderate', es: 'Moderada' },
  advanced: { en: 'Advanced', es: 'Avanzada' },
};

/* ---------------- Integration friction ---------------- */
export type IntegrationContext = {
  currentSystems: string[];
  subscriptions: string;
  requiredIntegrations: string;
  manualHandoffAllowed: boolean;
};
/** Words that, if a tool's sourced text contains them, show it documents that connection. */
const systemTerms: Record<string, string[]> = {
  Calendar: ['google calendar', 'outlook', 'calendar'],
  POS: ['point of sale', 'pos', 'square', 'clover', 'toast'],
  CRM: ['crm', 'hubspot', 'salesforce'],
  Email: ['email', 'gmail', 'outlook', 'inbox'],
  Spreadsheet: ['spreadsheet', 'google sheets', 'excel', 'csv', 'sheets'],
};
export const methodCopy = {
  // A mention in vendor sources is evidence, not a tested connection.
  native: { en: 'Named in vendor sources', es: 'Mencionado por el proveedor' },
  manual: { en: 'Copy by hand / CSV', es: 'Copiar a mano / CSV' },
  unverified: { en: 'Not verified', es: 'Sin verificar' },
} as const;
export type IntegrationMethod = keyof typeof methodCopy;
const methodPoints: Record<Exclude<IntegrationMethod, 'unverified'>, number> = {
  native: 0,
  manual: 40,
};
const escape = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const mentions = (text: string, term: string) =>
  new RegExp(`(^|[^a-z0-9])${escape(term.toLowerCase())}([^a-z0-9]|$)`).test(text);

/** What the owner needs this tool to work with: required tools, paid software, core systems. */
export function systemsToConnect(ctx: IntegrationContext) {
  const list = (s: string) =>
    s
      .split(/[,;\n]/)
      .map((x) => x.trim())
      .filter((x) => x.length > 1)
      .slice(0, 10);
  const named = [...list(ctx.requiredIntegrations), ...list(ctx.subscriptions)].map((name) => ({
    name,
    terms: [name.toLowerCase()],
    required: list(ctx.requiredIntegrations).includes(name),
  }));
  const core = ctx.currentSystems
    .filter((s) => systemTerms[s])
    .map((s) => ({ name: s, terms: systemTerms[s], required: false }));
  const seen = new Set<string>();
  return [...named, ...core].filter((s) => {
    const k = s.name.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * Integration Friction Score, 0 (easiest) – 100 (hardest): IFS = 0.5·I + 0.3·S + 0.2·T.
 * I = worst integration method across the owner's systems, S = setup time, T = technical needs.
 * Weights are provisional. When a connection can't be verified, I is unknown and we say so
 * instead of guessing; a missing mention is not proof the connection doesn't exist.
 */
export function integrationFriction(record: CatalogRecord, ctx: IntegrationContext) {
  const text = docText(record);
  const systems = systemsToConnect(ctx).map((s) => {
    const native = s.terms.some((t) => mentions(text, t));
    const method: IntegrationMethod = native
      ? 'native'
      : ctx.manualHandoffAllowed
      ? 'manual'
      : 'unverified';
    const evidence: Evidence = native ? 'vendor' : method === 'manual' ? 'estimated' : 'unverified';
    return { name: s.name, required: s.required, method, evidence };
  });
  const known = systems.filter((s) => s.method !== 'unverified');
  const unknown = systems.filter((s) => s.method === 'unverified');
  const setup = setupDifficulty(record);
  const S = setup.factors.find((f) => f.key === 'steps')!.points;
  const T = setup.factors.find((f) => f.key === 'technical')!.points;
  const I = systems.length
    ? unknown.length
      ? null
      : Math.max(...known.map((s) => methodPoints[s.method as 'native' | 'manual']))
    : 0;
  const score = I === null ? null : Math.round(0.5 * I + 0.3 * S + 0.2 * T);
  const level = score === null ? 'unknown' : score < 30 ? 'low' : score < 60 ? 'medium' : 'high';
  return {
    score,
    level: level as 'low' | 'medium' | 'high' | 'unknown',
    components: { I, S, T },
    systems,
    /** A required connection we couldn't verify: ask the vendor before paying. */
    unverifiedRequired: unknown.filter((s) => s.required).map((s) => s.name),
    evidence: (score === null
      ? 'unverified'
      : systems.some((s) => s.evidence === 'vendor')
      ? 'vendor'
      : 'estimated') as Evidence,
  };
}
export const frictionCopy = {
  low: { en: 'Low', es: 'Bajo' },
  medium: { en: 'Medium', es: 'Medio' },
  high: { en: 'High', es: 'Alto' },
  unknown: { en: 'Not verified', es: 'Sin verificar' },
} as const;

/* ---------------- Worth it? (owner's scenario) ---------------- */
export type RoiInput = {
  hoursPerWeek: number;
  /** 0–100 */
  percentSaved: number;
  hourlyValue: number;
  monthlyCost: number;
  setupCost: number;
};
const WEEKS_PER_MONTH = 52 / 12;
/**
 * Scenario estimate only: assumes savings start immediately and stay constant.
 * Monthly net benefit = hours saved per month × value of an hour − monthly cost.
 * Payback (months) = one-time setup cost ÷ monthly net benefit, when both are positive.
 */
export function roiScenario(i: RoiInput) {
  const hoursSaved = i.hoursPerWeek * WEEKS_PER_MONTH * (i.percentSaved / 100);
  const value = hoursSaved * i.hourlyValue;
  const net = value - i.monthlyCost;
  const paybackMonths = i.setupCost > 0 && net > 0 ? i.setupCost / net : null;
  return {
    hoursSavedPerMonth: Math.round(hoursSaved * 10) / 10,
    valuePerMonth: Math.round(value),
    netPerMonth: Math.round(net),
    coversCost: net >= 0,
    paybackMonths: paybackMonths === null ? null : Math.round(paybackMonths * 10) / 10,
    paybackWeeks:
      paybackMonths === null ? null : Math.round(paybackMonths * WEEKS_PER_MONTH * 10) / 10,
    evidence: 'yours' as Evidence,
  };
}

/** Metrics we deliberately don't show until we have run real, repeated tests. */
export const untestedMetrics: { key: string; label: Copy; why: Copy }[] = [
  {
    key: 'automation_yield',
    label: { en: 'Workflow automation yield', es: 'Rendimiento de automatización' },
    why: {
      en: 'Needs us to run a set of real tasks and count how many finish without a human fix.',
      es: 'Requiere ejecutar tareas reales y contar cuántas terminan sin corrección humana.',
    },
  },
  {
    key: 'reliability',
    label: { en: 'Drift & reliability', es: 'Estabilidad y fiabilidad' },
    why: {
      en: 'Needs repeated tests over weeks. A one-time demo can’t show this.',
      es: 'Requiere pruebas repetidas durante semanas. Una demostración puntual no lo muestra.',
    },
  },
  {
    key: 'cost_per_1000',
    label: { en: 'Cost per 1,000 interactions', es: 'Costo por 1.000 interacciones' },
    why: {
      en: 'Shown only when a plan has verified usage-based pricing. Otherwise see the plan price and limits.',
      es: 'Solo se muestra con precios por uso verificados. Si no, mira el precio del plan y sus límites.',
    },
  },
];
