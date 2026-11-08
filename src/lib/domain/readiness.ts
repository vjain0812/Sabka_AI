import type { BusinessBrief } from './brief';

export type ReadinessItem = {
  title: string;
  detail: string;
  state: 'ready' | 'action' | 'unknown';
};
/** Readiness is a transparent preparation checklist, never a model confidence score. */
export function assessReadiness(brief: BusinessBrief): {
  supported: boolean;
  items: ReadinessItem[];
  nextStep: string;
  existingTools: string[];
} {
  const digital = brief.dataSources.some(
    (s) => s.format === 'digital' && s.availability === 'available',
  );
  const permitted =
    brief.dataSources.length > 0 && brief.dataSources.every((s) => s.permission === 'confirmed');
  const sensitive =
    brief.dataSources.length === 0 || brief.dataSources.some((s) => s.sensitivity !== 'standard');
  const complete =
    brief.dataSources.length > 0 && brief.dataSources.every((s) => s.completeness === 'complete');
  const supported = brief.need.job !== 'other' && brief.need.job !== '';
  const nextSteps = {
    customer_reply_drafting:
      'Write three common questions and your own approved answers in a notebook or spreadsheet. Use fictional customers while testing.',
    marketing_content:
      'List three confirmed business facts and one content idea in your existing notebook or spreadsheet. Check every statement before sharing.',
    appointment_organization:
      'Create a simple request list: requested date, service, status, and a human-confirmation checkbox. Test with fictional requests.',
    other:
      'Map one recurring task and the person responsible in your current notebook or spreadsheet. Keep using your current process while support is evaluated.',
    '': 'Describe one recurring task before exploring tools.',
  };
  return {
    supported,
    nextStep: nextSteps[brief.need.job],
    existingTools: brief.need.currentSystems.filter((s) => s !== 'None yet'),
    items: [
      {
        title: 'A clear first task',
        detail: supported
          ? 'Your chosen job is within the three-job MVP scope. Product matching is still planned.'
          : 'This job is outside current coverage. We won’t turn it into a different recommendation.',
        state: supported ? 'ready' : 'action',
      },
      {
        title: 'Information you can reuse',
        detail: digital
          ? 'You report having digital information. Check fields before reusing it; no account is connected.'
          : 'Paper is a valid starting point. Make a small structured list before buying anything.',
        state: digital ? 'ready' : 'action',
      },
      {
        title: 'Permission to use data',
        detail: permitted
          ? 'You confirmed permission. Still use fictional or redacted examples for any first test.'
          : 'Ownership and permission need confirmation before information goes into another service.',
        state: permitted ? 'ready' : 'unknown',
      },
      {
        title: 'Enough detail to start',
        detail: complete
          ? 'You marked your sources complete. Check a few sample records for gaps.'
          : 'Check for missing dates, task details, status and responsible person. Unknown is okay.',
        state: complete ? 'ready' : 'action',
      },
      {
        title: 'Sensitive information',
        detail: sensitive
          ? 'Sensitivity is unknown or marked sensitive. Keep customer and confidential details out of test tools.'
          : 'No sensitive data was reported. This is your assessment, not a privacy audit.',
        state: sensitive ? 'unknown' : 'ready',
      },
      {
        title: 'People stay in control',
        detail:
          'A person reviews all outgoing messages, published content, bookings and purchases. Nothing is sent automatically.',
        state: 'ready',
      },
    ],
  };
}
