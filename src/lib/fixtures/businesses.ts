import { businessBriefSchema, emptyBrief, type BusinessBrief } from '@/lib/domain/brief';

function example(overrides: (brief: BusinessBrief) => void): BusinessBrief {
  const brief = emptyBrief();
  overrides(brief);
  return businessBriefSchema.parse(brief);
}
export const demoProfiles = {
  baker: example((b) => {
    b.profile = {
      ...b.profile,
      name: 'Sunday Crumb',
      category: 'Home bakery',
      region: 'College Park, Maryland',
    };
    b.need = {
      ...b.need,
      job: 'customer_reply_drafting',
      problem: 'I spend my evenings repeating order details and following up with customers.',
      successMeasure: 'Spend 30 fewer minutes each evening coordinating orders.',
      monthlyBudgetUsd: 40,
      setupMinutes: 45,
      channels: ['WhatsApp'],
      currentSystems: ['Notebook'],
      manualHandoffAllowed: true,
    };
    b.boundaries = {
      ...b.boundaries,
      tone: 'Warm and personal',
      customerValues: 'Remembering each customer and making every order feel personal.',
      timeSavedFor: 'Family time and trying new recipes.',
      businessFacts: 'A fictional home bakery taking pre-orders.',
    };
    b.dataSources = [
      {
        name: 'Order notebook',
        format: 'paper',
        owner: 'business',
        availability: 'available',
        completeness: 'partial',
        permission: 'unknown',
        sensitivity: 'standard',
      },
    ];
  }),
  hvac: example((b) => {
    b.profile = {
      ...b.profile,
      name: 'Maple Home Services',
      category: 'HVAC or home services',
      size: '2–5',
      technicalComfort: 'comfortable',
    };
    b.need = {
      ...b.need,
      job: 'appointment_organization',
      problem: 'Appointment requests arrive by phone and email and are difficult to track.',
      successMeasure: 'Every request has a status and a person responsible for confirming it.',
      monthlyBudgetUsd: 60,
      setupMinutes: 90,
      channels: ['Phone', 'Email'],
      currentSystems: ['Spreadsheet'],
      manualHandoffAllowed: true,
    };
    b.boundaries = {
      ...b.boundaries,
      tone: 'Clear and reassuring',
      customerValues: 'Reliable arrival times and honest communication.',
      timeSavedFor: 'More time helping customers on site.',
    };
    b.dataSources = [
      {
        name: 'Request spreadsheet',
        format: 'digital',
        owner: 'business',
        availability: 'available',
        completeness: 'complete',
        permission: 'confirmed',
        sensitivity: 'standard',
      },
    ];
  }),
  landscaper: example((b) => {
    b.profile = { ...b.profile, name: 'Clover Yard Care', category: 'Landscaping', size: '2–5' };
    b.need = {
      ...b.need,
      job: 'marketing_content',
      problem: 'We want a consistent content plan based on the services we actually offer.',
      successMeasure: 'Prepare two accurate, owner-approved post ideas each week.',
      monthlyBudgetUsd: 25,
      setupMinutes: 30,
      channels: ['Social media', 'Phone'],
      currentSystems: ['Notebook'],
      manualHandoffAllowed: true,
    };
    b.boundaries = {
      ...b.boundaries,
      tone: 'Friendly and practical',
      customerValues: 'Dependable care and a personal relationship.',
      businessFacts: 'Fictional business offering lawn mowing and seasonal planting.',
      timeSavedFor: 'Training our crew.',
    };
    b.dataSources = [
      {
        name: 'Service notes',
        format: 'paper',
        owner: 'business',
        availability: 'available',
        completeness: 'partial',
        permission: 'confirmed',
        sensitivity: 'standard',
      },
    ];
  }),
} as const;
export type DemoId = keyof typeof demoProfiles;
export const fixtureMetadata = {
  version: '1.0.0',
  status: 'demo-fixture',
  fictional: true,
  containsVendorClaims: false,
} as const;
