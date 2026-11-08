import { z } from 'zod';
import { categories } from './brief';

/**
 * Connect: businesses that explicitly opt in can be found by other opted-in businesses to share
 * what worked. Public cards hold only what the owner types here. No contact details are public.
 */
export const CONNECT_CONSENT_VERSION = 'connect-1';

export const connectTopics = [
  { id: 'what_worked', en: 'What worked for me', es: 'Lo que me funcionó' },
  { id: 'choosing_tools', en: 'Choosing tools', es: 'Elegir herramientas' },
  { id: 'getting_started', en: 'Getting started with AI', es: 'Empezar con la IA' },
  { id: 'saving_time', en: 'Saving time', es: 'Ahorrar tiempo' },
  { id: 'customers', en: 'Talking to customers', es: 'Hablar con los clientes' },
  { id: 'budget', en: 'Staying on budget', es: 'Cuidar el presupuesto' },
  { id: 'team', en: 'Training my team', es: 'Capacitar a mi equipo' },
  { id: 'industry', en: 'Tips for my industry', es: 'Consejos de mi sector' },
] as const;
export type ConnectTopic = (typeof connectTopics)[number]['id'];
const topicIds = connectTopics.map((t) => t.id) as [ConnectTopic, ...ConnectTopic[]];

export const connectOutcomes = [
  { id: 'worked', en: 'Worked for us', es: 'Nos funcionó' },
  { id: 'mixed', en: 'Mixed results', es: 'Resultados mixtos' },
  { id: 'not_for_us', en: 'Not for us', es: 'No fue para nosotros' },
] as const;
export type ConnectOutcome = (typeof connectOutcomes)[number]['id'];
const outcomeIds = connectOutcomes.map((o) => o.id) as [ConnectOutcome, ...ConnectOutcome[]];

/** Public text must not carry ways to reach someone outside Connect. */
export function containsContactDetails(text: string) {
  return (
    /[\w.+-]+@[\w-]+\.[\w.]+/.test(text) ||
    /https?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|net|org|io|co|app|me|us|mx|es)\b/i.test(text) ||
    /\+?\(?\d[\d\s().-]{6,}\d/.test(text) ||
    /(^|\s)@\w{2,}/.test(text)
  );
}
const publicText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use ${max} characters or fewer.`)
    .refine(
      (v) => !containsContactDetails(v),
      'Keep emails, phone numbers and links out of your public profile. Share them in a message once you connect.',
    );
const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(100);

export const connectWinSchema = z
  .object({
    toolSlug: slug,
    outcome: z.enum(outcomeIds),
    note: publicText(160),
  })
  .strict();
export type ConnectWin = z.infer<typeof connectWinSchema>;

const businessCategories = categories as readonly [string, ...string[]];
export const connectProfileInputSchema = z
  .object({
    displayName: publicText(60).pipe(z.string().min(2, 'Use at least 2 characters.')),
    category: z.enum(businessCategories),
    region: publicText(60).default(''),
    about: publicText(280).default(''),
    topics: z.array(z.enum(topicIds)).max(6).default([]),
    wins: z.array(connectWinSchema).max(3).default([]),
    visible: z.boolean().default(true),
    consent: z.literal(true, { error: 'Please tick the box to agree before joining Connect.' }),
  })
  .strict();
export type ConnectProfileInput = z.infer<typeof connectProfileInputSchema>;
export const connectProfilePatchSchema = z
  .object({
    displayName: publicText(60).pipe(z.string().min(2)),
    category: z.enum(businessCategories),
    region: publicText(60),
    about: publicText(280),
    topics: z.array(z.enum(topicIds)).max(6),
    wins: z.array(connectWinSchema).max(3),
    visible: z.boolean(),
  })
  .partial()
  .strict();
export type ConnectProfilePatch = z.infer<typeof connectProfilePatchSchema>;

export const connectMessageSchema = z
  .object({
    toId: z.string().uuid(),
    body: z
      .string()
      .trim()
      .min(2, 'Write a short message.')
      .max(600, 'Use 600 characters or fewer.'),
  })
  .strict();
export const connectReportSchema = z
  .object({
    profileId: z.string().uuid(),
    reason: z.string().trim().min(3).max(300),
  })
  .strict();

export type PublicProfile = {
  id: string;
  displayName: string;
  category: string;
  region: string;
  about: string;
  topics: ConnectTopic[];
  wins: ConnectWin[];
  createdAt: string;
  /** Fictional examples only; never real businesses and never messageable. */
  demo?: boolean;
};
export type OwnProfile = PublicProfile & {
  visible: boolean;
  consentedAt: string;
  consentVersion: string;
};
export type InboxMessage = {
  id: string;
  fromId: string;
  toId: string;
  otherId: string;
  otherName: string;
  mine: boolean;
  body: string;
  createdAt: string;
  readAt: string | null;
};

export function topicLabel(id: string, locale: 'en' | 'es') {
  const t = connectTopics.find((x) => x.id === id);
  return t ? t[locale] : id;
}
export function outcomeLabel(id: string, locale: 'en' | 'es') {
  const o = connectOutcomes.find((x) => x.id === id);
  return o ? o[locale] : id;
}
