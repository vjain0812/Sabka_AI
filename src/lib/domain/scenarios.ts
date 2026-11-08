import type { BusinessBrief, SupportedJob, categories } from './brief';
import type { BusinessType } from './library-taxonomy';
import { scenariosEs } from './scenarios-es';

/**
 * Profession workflow scenarios.
 *
 * A scenario is a *curated starting shortlist*: it shows how a type of business could combine
 * real, source-checked catalog tools around one problem. It is not a personalized match and
 * never overrides the matcher's eligibility gates. Tool facts always come from the catalog
 * record (official sources); the copy below only describes the problem and workflow shape.
 */
export type ScenarioStep = {
  title: string;
  detail: string;
  /** Catalog slug of the tool that could support this step, if any. */
  toolSlug?: string;
  /** True when a person must own this step. */
  human?: boolean;
};
export type ScenarioTool = { slug: string; name: string; role: string };
export type Scenario = {
  slug: string;
  profession: string;
  shortName: string;
  /** Lucide icon name used by the UI. */
  icon: 'dumbbell' | 'wrench' | 'building' | 'shirt' | 'cake' | 'sprout';
  accent: string;
  category: (typeof categories)[number];
  businessType: BusinessType;
  /** Supported matching job, or null when the problem sits outside the three MVP jobs. */
  job: SupportedJob | null;
  problem: string;
  pains: string[];
  successMeasure: string;
  channels: string[];
  currentSystems: string[];
  tools: ScenarioTool[];
  steps: ScenarioStep[];
  staysHuman: string[];
  existingOption: string;
};

export const scenarios: Scenario[] = [
  {
    slug: 'zumba-instructor',
    profession: 'Zumba Instructor',
    shortName: 'Fitness instructor',
    icon: 'dumbbell',
    accent: '#e21833',
    category: 'Instructor or creator',
    businessType: 'health_wellness',
    job: 'appointment_organization',
    problem:
      "Students forget classes, cancel at the last minute, or don't show up. The instructor wastes time coordinating bookings and reminders.",
    pains: ['Forgotten classes', 'Last-minute cancellations', 'No-shows', 'Manual reminders'],
    successMeasure: 'Fewer no-shows and less time spent chasing bookings each week.',
    channels: ['WhatsApp', 'Social media', 'Walk-in'],
    currentSystems: ['Calendar', 'Spreadsheet'],
    tools: [
      { slug: 'mindbody', name: 'Mindbody', role: 'Booking and client management' },
      { slug: 'fitune', name: 'Fitune', role: 'Fitness class scheduling' },
      { slug: 'chatgpt', name: 'ChatGPT', role: 'Drafting personalized reminder wording' },
    ],
    steps: [
      {
        title: 'Students book a spot online',
        detail: 'A class schedule with self-booking replaces the WhatsApp back-and-forth.',
        toolSlug: 'mindbody',
      },
      {
        title: 'Reminders go out before class',
        detail: 'Automated reminders reach students ahead of each session.',
        toolSlug: 'fitune',
      },
      {
        title: 'Waitlist fills cancelled spots',
        detail: 'A cancellation window and waitlist keep late drop-outs from leaving gaps.',
        toolSlug: 'mindbody',
      },
      {
        title: 'Reminder wording in your voice',
        detail: 'Draft friendly reminder and follow-up messages, then edit them yourself.',
        toolSlug: 'chatgpt',
      },
      {
        title: 'You set the policy',
        detail: 'Cancellation fees, exceptions and regulars stay your call.',
        human: true,
      },
    ],
    staysHuman: [
      'Cancellation fees and exceptions',
      'Approving reminder wording before it is sent',
      'Personal check-ins with regular students',
    ],
    existingOption:
      'Post a weekly class list in your WhatsApp group and send one reminder the evening before. Track sign-ups in a simple spreadsheet.',
  },
  {
    slug: 'home-services',
    profession: 'Plumber / Handyman / Painter',
    shortName: 'Home services',
    icon: 'wrench',
    accent: '#ffd200',
    category: 'HVAC or home services',
    businessType: 'home_field_services',
    job: 'appointment_organization',
    problem:
      'Misses customer calls while working, forgets addresses, and struggles to schedule appointments.',
    pains: ['Missed calls on the job', 'Lost addresses', 'Double-booked visits'],
    successMeasure: 'Every caller gets a response and every visit has an address and a time.',
    channels: ['Phone', 'WhatsApp'],
    currentSystems: ['Notebook', 'Calendar'],
    tools: [
      { slug: 'jobber', name: 'Jobber', role: 'Field-service scheduling and automation' },
      {
        slug: 'housecall-pro',
        name: 'Housecall Pro',
        role: 'AI-assisted customer communication and dispatch',
      },
      { slug: 'smith-ai', name: 'Smith.ai', role: 'AI receptionist' },
    ],
    steps: [
      {
        title: 'Calls answered while you work',
        detail: 'An AI receptionist picks up, takes the request and screens the caller.',
        toolSlug: 'smith-ai',
      },
      {
        title: 'Requests land in one job list',
        detail:
          'Requests that cannot be booked outright arrive as work requests for you to review.',
        toolSlug: 'jobber',
      },
      {
        title: 'Visit, address and time together',
        detail: 'Each job keeps the customer, address and schedule in one place.',
        toolSlug: 'housecall-pro',
      },
      {
        title: 'You confirm the job',
        detail: 'Quotes, pricing and anything unusual are confirmed by you.',
        human: true,
      },
    ],
    staysHuman: [
      'Quoting prices and approving discounts',
      'Confirming emergency or unusual jobs',
      'What the receptionist may promise customers',
    ],
    existingOption:
      'Set a voicemail greeting that asks for name, address and the job, and call back from a daily list in your notebook or phone calendar.',
  },
  {
    slug: 'leasing-agent',
    profession: 'Real Estate Rental & Leasing Agent',
    shortName: 'Leasing agent',
    icon: 'building',
    accent: '#e21833',
    category: 'Professional services',
    businessType: 'professional_services',
    job: 'customer_reply_drafting',
    problem:
      'Receives repetitive rental inquiries, spends hours answering questions, and struggles to follow up with prospective tenants.',
    pains: ['Repetitive inquiries', 'Hours answering questions', 'Missed follow-ups'],
    successMeasure: 'Every prospective tenant gets a timely answer and a follow-up.',
    channels: ['Email', 'Phone', 'Website'],
    currentSystems: ['Email', 'CRM'],
    tools: [
      { slug: 'eliseai', name: 'EliseAI', role: 'Leasing conversations' },
      { slug: 'structurely', name: 'Structurely', role: 'Lead qualification and follow-up' },
      { slug: 'appfolio', name: 'AppFolio', role: 'Property management and AI-assisted workflows' },
    ],
    steps: [
      {
        title: 'Inquiries get a first answer',
        detail: 'Common questions about price, availability and pets are answered across channels.',
        toolSlug: 'eliseai',
      },
      {
        title: 'Leads are qualified',
        detail: 'A conversational assistant asks the qualifying questions you choose.',
        toolSlug: 'structurely',
      },
      {
        title: 'Tours get scheduled',
        detail: 'Showings are booked into the property calendar.',
        toolSlug: 'appfolio',
      },
      {
        title: 'You make the leasing decision',
        detail: 'Screening, approvals and anything legally sensitive stay with you.',
        human: true,
      },
    ],
    staysHuman: [
      'Tenant screening and approval decisions',
      'Fair-housing-sensitive answers',
      'Negotiating rent or terms',
    ],
    existingOption:
      'Keep a set of saved email replies for your five most common questions, and a follow-up column in your current spreadsheet or CRM.',
  },
  {
    slug: 'laundromat',
    profession: 'Family-Owned Laundromat',
    shortName: 'Laundromat',
    icon: 'shirt',
    accent: '#ffd200',
    category: 'Laundromat',
    businessType: 'home_field_services',
    job: 'customer_reply_drafting',
    problem:
      'Customers repeatedly call about pickup times, machine availability, and order status, while staff struggle to track orders.',
    pains: ['"Is my order ready?" calls', 'Pickup-time questions', 'Untracked orders'],
    successMeasure: 'Customers know when their order is ready without having to call.',
    channels: ['Phone', 'Walk-in', 'WhatsApp'],
    currentSystems: ['POS', 'Notebook'],
    tools: [
      { slug: 'cents', name: 'Cents', role: 'Laundry operations and automation' },
      { slug: 'cleancloud', name: 'CleanCloud', role: 'Laundry POS and customer communication' },
      { slug: 'tidio-lyro', name: 'Tidio', role: 'AI customer support' },
    ],
    steps: [
      {
        title: 'Every order is tracked',
        detail: 'Orders move through drop-off, washing, ready and picked up.',
        toolSlug: 'cleancloud',
      },
      {
        title: 'Status texts go out automatically',
        detail: 'Customers get a "ready for pickup" text with wording you set.',
        toolSlug: 'cents',
      },
      {
        title: 'Common questions answered online',
        detail: 'Hours, prices and pickup times are answered from your own FAQ.',
        toolSlug: 'tidio-lyro',
      },
      {
        title: 'Staff handle the exceptions',
        detail: 'Damaged items, refunds and complaints go to a person.',
        human: true,
      },
    ],
    staysHuman: [
      'Refunds, damaged items and complaints',
      'Approving the wording of automatic texts',
      'Machine maintenance decisions',
    ],
    existingOption:
      'Write a ticket number on each order, keep a ready-for-pickup board, and send one "ready" text from the shop phone.',
  },
  {
    slug: 'home-baker',
    profession: 'Granny Baker',
    shortName: 'Home baker',
    icon: 'cake',
    accent: '#e21833',
    category: 'Home bakery',
    businessType: 'food_hospitality',
    job: 'appointment_organization',
    problem:
      'Takes orders through calls and WhatsApp, forgets special requests, and finds complicated software intimidating.',
    pains: [
      'Orders scattered across calls & chats',
      'Forgotten special requests',
      'Software feels hard',
    ],
    successMeasure: 'Every order, with its special request, written down in one simple place.',
    channels: ['Phone', 'WhatsApp'],
    currentSystems: ['Notebook'],
    tools: [
      { slug: 'chatgpt', name: 'ChatGPT', role: 'Organizing and drafting order information' },
      { slug: 'bakesy', name: 'Bakesy', role: 'Bakery order management' },
      { slug: 'jotform-ai-agents', name: 'Jotform AI Agents', role: 'Conversational order intake' },
    ],
    steps: [
      {
        title: 'Customers order in a friendly chat',
        detail: 'A conversational form asks for date, flavour, size and allergies.',
        toolSlug: 'jotform-ai-agents',
      },
      {
        title: 'Orders collect in one list',
        detail: 'Each order, with its special request, lands in one simple order list.',
        toolSlug: 'bakesy',
      },
      {
        title: 'Messy notes tidied up',
        detail: 'Paste a long WhatsApp message and get a clean order summary to check.',
        toolSlug: 'chatgpt',
      },
      {
        title: 'You confirm every order',
        detail: 'Price, pickup time and allergy notes are confirmed by you.',
        human: true,
      },
    ],
    staysHuman: [
      'Confirming allergies and special requests',
      'Accepting or declining orders',
      'Pricing and pickup times',
    ],
    existingOption:
      'Use one paper order book with a fixed list of questions (date, flavour, size, allergies) and read each order back to the customer.',
  },
  {
    slug: 'farmer',
    profession: 'Farmer',
    shortName: 'Farmer',
    icon: 'sprout',
    accent: '#ffd200',
    category: 'Farming',
    businessType: 'agriculture_manufacturing',
    job: null,
    problem:
      'Has difficulty deciding when to irrigate or identifying crop problems early, potentially losing yield and water.',
    pains: ['When to irrigate', 'Spotting crop disease late', 'Wasted water'],
    successMeasure: 'Catch crop problems early and water based on what the field actually needs.',
    channels: ['Phone', 'Walk-in'],
    currentSystems: ['Notebook'],
    tools: [
      { slug: 'plantix', name: 'Plantix', role: 'Crop disease identification' },
      { slug: 'cropx', name: 'CropX', role: 'Soil and irrigation insights' },
      { slug: 'onesoil', name: 'OneSoil', role: 'Satellite-based field monitoring' },
    ],
    steps: [
      {
        title: 'Watch fields from above',
        detail: 'Satellite crop-health maps highlight areas that look stressed.',
        toolSlug: 'onesoil',
      },
      {
        title: 'Photograph a sick plant',
        detail: 'Get a likely pest, disease or nutrient diagnosis from a photo.',
        toolSlug: 'plantix',
      },
      {
        title: 'Read the soil',
        detail: 'Soil-moisture sensors turn field data into irrigation recommendations.',
        toolSlug: 'cropx',
      },
      {
        title: 'You walk the field and decide',
        detail: 'Confirm diagnoses with an agronomist or extension office before treating.',
        human: true,
      },
    ],
    staysHuman: [
      'Treatment and spraying decisions',
      'Confirming a diagnosis with a local expert',
      'When to irrigate and how much',
    ],
    existingOption:
      'Walk the same route through your fields each week, note problem spots in a notebook, and ask your local extension office about anything unusual.',
  },
];

export function scenarioBySlug(slug: string) {
  return scenarios.find((s) => s.slug === slug) ?? null;
}
export function scenarioForCategory(category: string) {
  return scenarios.find((s) => s.category === category) ?? null;
}
export function scenarioToolSlugs() {
  return [...new Set(scenarios.flatMap((s) => s.tools.map((t) => t.slug)))];
}

/**
 * Prefill a brief from a scenario. Only generic, fictional-safe problem text is written; the
 * owner still reviews every answer, sets their own budget and setup time, and gives consent.
 * A scenario without a supported job sets `other`, so the matcher's coverage disclosure holds.
 */
export function applyScenario(
  brief: BusinessBrief,
  scenario: Scenario,
  locale: 'en' | 'es' = 'en',
): BusinessBrief {
  const es = locale === 'es' ? scenariosEs[scenario.slug] : null;
  return {
    ...brief,
    profile: { ...brief.profile, category: scenario.category, otherCategory: '' },
    need: {
      ...brief.need,
      job: scenario.job ?? 'other',
      problem: es?.problem ?? scenario.problem,
      successMeasure: es?.successMeasure ?? scenario.successMeasure,
      channels: [...scenario.channels],
      currentSystems: [...scenario.currentSystems],
    },
  };
}

const professionEs: Record<string, [string, string]> = {
  'zumba-instructor': ['Instructor de Zumba', 'Instructor de fitness'],
  'home-services': ['Plomero / Manitas / Pintor', 'Servicios del hogar'],
  'leasing-agent': ['Agente de alquileres', 'Agente de alquileres'],
  laundromat: ['Lavandería familiar', 'Lavandería'],
  'home-baker': ['Repostera casera', 'Repostería casera'],
  farmer: ['Agricultor', 'Agricultor'],
};
/** Spanish names for the pages that have a Spanish version. */
export function scenarioNames(scenario: Scenario, locale: 'en' | 'es') {
  const es = professionEs[scenario.slug];
  return locale === 'es' && es
    ? { profession: es[0], shortName: es[1] }
    : { profession: scenario.profession, shortName: scenario.shortName };
}

/** Scenario copy in the requested language (English fields are the fallback). */
export function scenarioCopy(scenario: Scenario, locale: 'en' | 'es') {
  const es = locale === 'es' ? scenariosEs[scenario.slug] : null;
  return {
    ...scenarioNames(scenario, locale),
    problem: es?.problem ?? scenario.problem,
    pains: es?.pains ?? scenario.pains,
    successMeasure: es?.successMeasure ?? scenario.successMeasure,
    steps: scenario.steps.map((step, i) => ({
      ...step,
      title: es?.steps[i]?.title ?? step.title,
      detail: es?.steps[i]?.detail ?? step.detail,
    })),
    tools: scenario.tools.map((tool, i) => ({ ...tool, role: es?.roles[i] ?? tool.role })),
    staysHuman: es?.staysHuman ?? scenario.staysHuman,
    existingOption: es?.existingOption ?? scenario.existingOption,
  };
}
