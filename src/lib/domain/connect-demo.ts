import type { PublicProfile } from './connect';

/**
 * Fictional examples so the directory is never blank. They are labelled in the UI, cannot be
 * messaged, and make no claims about any real product, price or outcome.
 */
export const connectDemoProfiles: PublicProfile[] = [
  {
    id: 'demo-bakery',
    displayName: 'Sample Bakery',
    category: 'Home bakery',
    region: 'Anytown',
    about:
      'A made-up profile that shows what a Connect card looks like: who they are, what they like to talk about, and nothing private.',
    topics: ['getting_started', 'saving_time'],
    wins: [],
    createdAt: '2026-11-01T00:00:00.000Z',
    demo: true,
  },
  {
    id: 'demo-studio',
    displayName: 'Sample Fitness Studio',
    category: 'Instructor or creator',
    region: 'Anytown',
    about: 'Another made-up example. Real businesses appear here only after they say yes.',
    topics: ['customers', 'choosing_tools'],
    wins: [],
    createdAt: '2026-11-01T00:00:00.000Z',
    demo: true,
  },
  {
    id: 'demo-plumbing',
    displayName: 'Sample Plumbing Co.',
    category: 'HVAC or home services',
    region: 'Anytown',
    about: 'A third example profile, here to show how filters and topics look.',
    topics: ['industry', 'budget'],
    wins: [],
    createdAt: '2026-11-01T00:00:00.000Z',
    demo: true,
  },
];
