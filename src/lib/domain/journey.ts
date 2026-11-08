import { z } from 'zod';
import { draftSchema, type BusinessBrief } from './brief';
import type { CatalogRecord } from './catalog-record';

/**
 * My AI Journey: what an owner saved, tried and found helpful, so they can come back tomorrow.
 * Opt-in. Stored against a private key held on the owner's device (no account or email).
 * Usage numbers are only ever self-reported; SABKA cannot see inside the tools it recommends.
 */
export const JOURNEY_CONSENT_VERSION = 'journey-1';
export const MAX_GOALS = 10;
export const MAX_TOOLS = 30;
/** Businesses (journeys) one signed-in account can hold. */
export const MAX_BUSINESSES = 20;

export const adoptionStatuses = ['considering', 'trying', 'using', 'stopped'] as const;
export type AdoptionStatus = (typeof adoptionStatuses)[number];
export const helpfulValues = ['yes', 'somewhat', 'no'] as const;
export type Helpful = (typeof helpfulValues)[number];
export const feedbackReasons = [
  'too_hard',
  'too_expensive',
  'missing_feature',
  'not_a_fit',
  'no_time',
  'other',
] as const;
export type FeedbackReason = (typeof feedbackReasons)[number];

/** The part of a brief needed to re-run matching later. Accessibility answers are excluded. */
export const goalBriefSchema = z
  .object({
    profile: draftSchema.shape.profile
      .pick({ name: true, category: true, otherCategory: true })
      .strict(),
    need: draftSchema.shape.need
      .pick({
        job: true,
        problem: true,
        successMeasure: true,
        monthlyBudgetUsd: true,
        setupMinutes: true,
        channels: true,
        currentSystems: true,
        subscriptions: true,
      })
      .strict(),
  })
  .strict();
export type GoalBrief = z.infer<typeof goalBriefSchema>;

export function goalFromBrief(brief: BusinessBrief): GoalBrief {
  const { name, category, otherCategory } = brief.profile;
  const n = brief.need;
  return {
    profile: { name, category, otherCategory },
    need: {
      job: n.job,
      problem: n.problem,
      successMeasure: n.successMeasure,
      monthlyBudgetUsd: n.monthlyBudgetUsd,
      setupMinutes: n.setupMinutes,
      channels: n.channels,
      currentSystems: n.currentSystems,
      subscriptions: n.subscriptions,
    },
  };
}
/** Restore a goal into a brief, keeping anything only this device knows (e.g. accessibility). */
export function briefFromGoal(goal: GoalBrief, current: BusinessBrief): BusinessBrief {
  return {
    ...current,
    profile: { ...current.profile, ...goal.profile },
    need: { ...current.need, ...goal.need },
  };
}
const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
export function sameGoal(a: GoalBrief, b: GoalBrief) {
  return normalize(a.need.problem) === normalize(b.need.problem);
}

export const toolSlugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(100);
const minutes = z.number().int().min(0).max(10080).nullable();
export const feedbackInputSchema = z
  .object({
    helpful: z.enum(helpfulValues),
    reason: z.enum(feedbackReasons).nullable().default(null),
    note: z.string().trim().max(300).default(''),
    minutesBefore: minutes.default(null),
    minutesAfter: minutes.default(null),
  })
  .strict();
export type FeedbackInput = z.infer<typeof feedbackInputSchema>;

export const journeyCreateSchema = z
  .object({ consent: z.literal(true), goal: goalBriefSchema })
  .strict();
export const journeyActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('add_goal'), goal: goalBriefSchema }).strict(),
  z
    .object({ type: z.literal('save'), slug: toolSlugSchema, goalId: z.string().uuid().nullable() })
    .strict(),
  z.object({ type: z.literal('remove'), slug: toolSlugSchema }).strict(),
  z
    .object({ type: z.literal('status'), slug: toolSlugSchema, status: z.enum(adoptionStatuses) })
    .strict(),
  z
    .object({ type: z.literal('feedback'), slug: toolSlugSchema, feedback: feedbackInputSchema })
    .strict(),
]);
export type JourneyAction = z.infer<typeof journeyActionSchema>;

export type JourneyGoal = { id: string; brief: GoalBrief; createdAt: string };
export type JourneyFeedback = FeedbackInput & { createdAt: string };
export type JourneyTool = {
  slug: string;
  goalId: string | null;
  savedAt: string;
  status: AdoptionStatus | null;
  statusAt: string | null;
  /** Latest feedback only. */
  feedback: JourneyFeedback | null;
};
export type Journey = { id: string; createdAt: string; goals: JourneyGoal[]; tools: JourneyTool[] };
export type JourneyView = {
  mode: 'database' | 'preview';
  journey: Journey;
  records: CatalogRecord[];
};
/** One business in a signed-in owner's account (for the business switcher). */
export type AccountBusiness = {
  id: string;
  createdAt: string;
  updatedAt: string;
  profile: GoalBrief['profile'] | null;
  toolCount: number;
};
/** "Granny's Bakery" if named, else the business type, else a neutral fallback. */
export function businessLabel(profile: GoalBrief['profile'] | null | undefined, fallback: string) {
  if (!profile) return fallback;
  if (profile.name?.trim()) return profile.name.trim();
  if (profile.category === 'Other' && profile.otherCategory?.trim())
    return profile.otherCategory.trim();
  return profile.category || fallback;
}

/** Only numbers we can honestly know: what the owner told us. */
export function journeyStats(j: Journey) {
  const status = (s: AdoptionStatus) => j.tools.filter((t) => t.status === s).length;
  const solved = new Set(
    j.tools.filter((t) => t.feedback?.helpful === 'yes' && t.goalId).map((t) => t.goalId),
  );
  let minutesSaved = 0;
  let reported = 0;
  for (const t of j.tools) {
    const f = t.feedback;
    if (f && f.minutesBefore !== null && f.minutesAfter !== null) {
      reported++;
      minutesSaved += Math.max(0, f.minutesBefore - f.minutesAfter);
    }
  }
  return {
    saved: j.tools.length,
    trying: status('trying'),
    using: status('using'),
    solved: solved.size,
    goals: j.goals.length,
    /** Self-reported minutes per week, or null when nothing was reported. */
    minutesSavedPerWeek: reported ? minutesSaved : null,
  };
}
/** Tools the owner said didn't work: left out of their next recommendations. */
export function excludedSlugs(j: Journey | null | undefined) {
  if (!j) return [];
  return j.tools
    .filter((t) => t.status === 'stopped' || t.feedback?.helpful === 'no')
    .map((t) => t.slug);
}

type Copy = { en: string; es: string };
export const statusCopy: Record<AdoptionStatus, Copy> = {
  considering: { en: 'Considering', es: 'Lo estoy pensando' },
  trying: { en: 'Trying it', es: 'Probándola' },
  using: { en: 'Using it', es: 'La uso' },
  stopped: { en: 'Stopped', es: 'La dejé' },
};
export const helpfulCopy: Record<Helpful, Copy> = {
  yes: { en: 'Yes, it helped', es: 'Sí, me ayudó' },
  somewhat: { en: 'A little, but I need help', es: 'Un poco, pero necesito ayuda' },
  no: { en: 'No, it didn’t work for me', es: 'No, no me funcionó' },
};
export const reasonCopy: Record<FeedbackReason, Copy> = {
  too_hard: { en: 'Too hard to set up or use', es: 'Muy difícil de configurar o usar' },
  too_expensive: { en: 'Too expensive', es: 'Demasiado cara' },
  missing_feature: { en: 'Missing something I need', es: 'Le falta algo que necesito' },
  not_a_fit: { en: 'Didn’t fit how I work', es: 'No encaja con mi forma de trabajar' },
  no_time: { en: 'No time to learn it', es: 'No tengo tiempo para aprenderla' },
  other: { en: 'Something else', es: 'Otra cosa' },
};
/** A plain next action. Generic on purpose: we don't invent tool-specific steps. */
export function nextStep(status: AdoptionStatus | null, tool: string): Copy {
  switch (status) {
    case 'trying':
      return {
        en: `Use ${tool} for one real task this week, then tell us below whether it helped.`,
        es: `Usa ${tool} en una tarea real esta semana y luego cuéntanos abajo si te ayudó.`,
      };
    case 'using':
      return {
        en: 'Nice work. Note how much time it saves you, and share what worked with other owners.',
        es: 'Buen trabajo. Anota cuánto tiempo te ahorra y comparte lo que funcionó con otros dueños.',
      };
    case 'stopped':
      return {
        en: 'Good to know. We’ll leave it out of your next recommendations.',
        es: 'Es bueno saberlo. La dejaremos fuera de tus próximas recomendaciones.',
      };
    default:
      return {
        en: `Watch a short tutorial and check the price. If it looks right, try ${tool} on one real task.`,
        es: `Mira un tutorial corto y revisa el precio. Si te convence, prueba ${tool} en una tarea real.`,
      };
  }
}
