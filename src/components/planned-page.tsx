import { Compass, ShieldCheck } from 'lucide-react';
import { ActionLink, Badge, Note, PageHeading } from './ui';

const content = {
  discover: {
    eyebrow: 'DISCOVER TOOLS',
    title: 'Good recommendations need good evidence.',
    phase: 2,
    heading: 'The reviewed catalog isn’t available yet.',
    description:
      'No external search has run and no vendor products are published in this build. Your business brief and readiness check are available now.',
    steps: [
      'Find candidates through an authorized search provider.',
      'Record source, plan, price, permission and freshness.',
      'Have an authenticated reviewer approve publication.',
    ],
  },
  compare: {
    eyebrow: 'COMPARE OPTIONS',
    title: 'A clear comparison. No invented certainty.',
    phase: 3,
    heading: 'There are no reviewed matches to compare yet.',
    description:
      'The eligibility and matching engine is planned for Phase 3. We haven’t calculated scores or assumed that any product meets your budget or requirements.',
    steps: [
      'Apply capability, budget, compatibility and human-control gates.',
      'Score only eligible tools using the documented rubric.',
      'Show fit, evidence coverage and risks separately.',
    ],
  },
  adoption: {
    eyebrow: 'YOUR NEXT STEPS',
    title: 'Make the first change a small one.',
    phase: 4,
    heading: 'Personalized trial plans are coming in Phase 4.',
    description:
      'Trial generation, printing, checklist tracking and CSV export are not implemented yet. Your readiness page already offers a practical existing-process step.',
    steps: [
      'Choose your existing process or a reviewed tool.',
      'Create a seven-day trial with sample data and human checkpoints.',
      'Measure one useful outcome and keep a clear stop or exit path.',
    ],
  },
};
export function PlannedPage({ kind }: { kind: keyof typeof content }) {
  const c = content[kind];
  return (
    <>
      <PageHeading eyebrow={c.eyebrow} title={c.title}>
        {c.description}
      </PageHeading>
      <section className="card planned-card">
        <span className="icon-tile">
          <Compass size={29} />
        </span>
        <Badge tone="amber">Planned · Phase {c.phase}</Badge>
        <h2>{c.heading}</h2>
        <p>
          This destination is part of the seven-screen MVP. Here is what its implementation will
          add:
        </p>
        <ol className="planned-steps">
          {c.steps.map((s, i) => (
            <li key={s}>
              <span>{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
        <div className="button-row">
          <ActionLink href="/readiness">Back to readiness</ActionLink>
          <ActionLink href="/hub" secondary>
            View build status
          </ActionLink>
        </div>
      </section>
      <Note title="No tool is a valid outcome.">
        Improving an existing process or waiting to adopt can be the right next step. Unknown
        pricing, privacy or approval support will never be treated as verified.
      </Note>
      <div className="planned-footer">
        <ShieldCheck size={18} />
        <span>No accounts linked. No messages sent. No purchases made.</span>
      </div>
    </>
  );
}
