import { z } from 'zod';
import { accessNeedSchema, accessNeeds } from './accessibility';

export const jobs = {
  customer_reply_drafting: {
    title: 'Customer replies & follow-ups',
    description: 'Prepare thoughtful drafts. A person always approves and sends.',
  },
  marketing_content: {
    title: 'Marketing & content planning',
    description: 'Plan content using your business facts, with your voice and approval.',
  },
  appointment_organization: {
    title: 'Appointments & requests',
    description: 'Organize requests. A person confirms every booking.',
  },
  other: {
    title: 'Something else',
    description: 'Tell us what you need. We’ll be clear about what we can support.',
  },
} as const;
export const categories = [
  'Home bakery',
  'Café or restaurant',
  'HVAC or home services',
  'Landscaping',
  'Salon or wellness',
  'Retail',
  'Laundromat',
  'Farming',
  'Tailoring',
  'Instructor or creator',
  'Professional services',
  'Other',
] as const;
export const channelOptions = [
  'WhatsApp',
  'Email',
  'Phone',
  'Walk-in',
  'Social media',
  'Website',
] as const;
export const systemOptions = [
  'Notebook',
  'Spreadsheet',
  'Calendar',
  'POS',
  'CRM',
  'Email',
  'None yet',
] as const;
export const boundaryOptions = [
  'Sending customer messages',
  'Publishing marketing',
  'Confirming appointments',
  'Spending money',
  'Sensitive decisions',
] as const;
const text = z.string().trim().max(1000, 'Please use 1,000 characters or fewer.');
const short = z.string().trim().max(120);
const selection = z.array(short).max(20);
export const dataSourceSchema = z.object({
  name: short.min(1),
  format: z.enum(['paper', 'digital', 'unknown']),
  owner: z.enum(['business', 'third_party', 'unknown']),
  availability: z.enum(['available', 'missing', 'unknown']),
  completeness: z.enum(['complete', 'partial', 'unknown']),
  permission: z.enum(['confirmed', 'not_confirmed', 'unknown']),
  sensitivity: z.enum(['standard', 'sensitive', 'unknown']),
});
export const draftSchema = z.object({
  profile: z.object({
    name: short,
    category: z.enum(['', ...categories]),
    otherCategory: short,
    role: z.enum(['owner', 'manager', 'staff', 'advisor']),
    size: z.enum(['solo', '2–5', '6–20', '21+']),
    region: short,
    technicalComfort: z.enum(['beginner', 'comfortable', 'experienced']),
    accessibilityNeeds: short.default(''),
    /** Optional, owner-chosen. Used by the rules ranker only; never sent to an AI model. */
    access: z.array(accessNeedSchema).max(accessNeeds.length).default([]),
  }),
  need: z.object({
    job: z.enum(['', ...(Object.keys(jobs) as [keyof typeof jobs, ...(keyof typeof jobs)[]])]),
    problem: text,
    frequency: z.enum(['daily', 'weekly', 'occasionally']),
    priority: z.enum(['high', 'medium', 'low']),
    successMeasure: text,
    monthlyBudgetUsd: z.number().finite().nullable(),
    setupMinutes: z.number().finite().nullable(),
    channels: selection,
    currentSystems: selection,
    subscriptions: text,
    requiredIntegrations: text,
    manualHandoffAllowed: z.boolean(),
  }),
  boundaries: z.object({
    humanApprovalRequired: z.literal(true),
    tone: short,
    customerValues: text,
    mustStayHuman: selection,
    timeSavedFor: text,
    businessFacts: text,
  }),
  dataSources: z.array(dataSourceSchema.extend({ name: short })).max(20),
});
export const businessBriefSchema = draftSchema.superRefine((brief, ctx) => {
  const issue = (path: string[], message: string) =>
    ctx.addIssue({ code: 'custom', path, message });
  if (!brief.profile.category) issue(['profile', 'category'], 'Choose your business type.');
  if (brief.profile.category === 'Other' && !brief.profile.otherCategory)
    issue(['profile', 'otherCategory'], 'Tell us your business type.');
  if (!brief.need.job) issue(['need', 'job'], 'Choose the work you want help with.');
  if (brief.need.problem.length < 10)
    issue(['need', 'problem'], 'Describe the task in at least 10 characters.');
  if (!brief.need.channels.length)
    issue(['need', 'channels'], 'Choose at least one channel, or add your own.');
  if (!brief.need.currentSystems.length)
    issue(['need', 'currentSystems'], 'Choose your existing tools, or select None yet.');
  if (brief.need.monthlyBudgetUsd === null)
    issue(['need', 'monthlyBudgetUsd'], 'Enter your monthly budget. Zero is welcome.');
  if (
    brief.need.monthlyBudgetUsd !== null &&
    Math.abs(brief.need.monthlyBudgetUsd * 100 - Math.round(brief.need.monthlyBudgetUsd * 100)) >
      0.000001
  )
    issue(['need', 'monthlyBudgetUsd'], 'Use no more than two decimal places.');
  if (brief.need.setupMinutes === null)
    issue(['need', 'setupMinutes'], 'Enter the time you can spend getting started.');
  if (
    brief.need.monthlyBudgetUsd !== null &&
    (brief.need.monthlyBudgetUsd < 0 || brief.need.monthlyBudgetUsd > 100000)
  )
    issue(['need', 'monthlyBudgetUsd'], 'Use a budget between $0 and $100,000.');
  if (
    brief.need.setupMinutes !== null &&
    (!Number.isInteger(brief.need.setupMinutes) ||
      brief.need.setupMinutes < 0 ||
      brief.need.setupMinutes > 10080)
  )
    issue(['need', 'setupMinutes'], 'Use whole minutes between 0 and 10,080.');
  brief.dataSources.forEach((source, index) => {
    if (!source.name)
      issue(['dataSources', String(index), 'name'], 'Name this information source or remove it.');
  });
});
export type BusinessBrief = z.infer<typeof draftSchema>;
export type DataSource = z.infer<typeof dataSourceSchema>;
export type SupportedJob = Exclude<keyof typeof jobs, 'other'>;
export function emptyBrief(): BusinessBrief {
  return {
    profile: {
      name: '',
      category: '',
      otherCategory: '',
      role: 'owner',
      size: 'solo',
      region: '',
      technicalComfort: 'beginner',
      accessibilityNeeds: '',
      access: [],
    },
    need: {
      job: '',
      problem: '',
      frequency: 'daily',
      priority: 'high',
      successMeasure: '',
      monthlyBudgetUsd: null,
      setupMinutes: null,
      channels: [],
      currentSystems: [],
      subscriptions: '',
      requiredIntegrations: '',
      manualHandoffAllowed: false,
    },
    boundaries: {
      humanApprovalRequired: true,
      tone: '',
      customerValues: '',
      mustStayHuman: [
        'Sending customer messages',
        'Publishing marketing',
        'Confirming appointments',
        'Spending money',
      ],
      timeSavedFor: '',
      businessFacts: '',
    },
    dataSources: [],
  };
}
export function issuesForStep(brief: BusinessBrief, step: number): Record<string, string> {
  const parsed = businessBriefSchema.safeParse(brief);
  if (parsed.success) return {};
  const stepFields = [
    ['profile'],
    ['need.job', 'need.problem', 'need.successMeasure'],
    ['need.channels', 'need.currentSystems', 'dataSources'],
    ['need.monthlyBudgetUsd', 'need.setupMinutes', 'boundaries'],
    [''],
  ];
  return Object.fromEntries(
    parsed.error.issues
      .filter((issue) => stepFields[step].some((prefix) => issue.path.join('.').startsWith(prefix)))
      .map((issue) => [issue.path.join('.'), issue.message]),
  );
}
