'use client';

import { useRouter } from 'next/navigation';
import { ArrowRight, Check, CircleHelp, ClipboardList, Pencil, Sprout } from 'lucide-react';
import { assessReadiness } from '@/lib/domain/readiness';
import { jobs } from '@/lib/domain/brief';
import { useWorkspace, workspace } from '@/lib/client/workspace';
import { ActionLink, Badge, EmptyState, LoadingState, Note, PageHeading } from './ui';
import { BriefSummary } from './brief-summary';

export function Readiness() {
  const state = useWorkspace();
  const router = useRouter();
  if (!state.ready) return <LoadingState />;
  if (!state.session?.confirmedAt)
    return (
      <>
        <PageHeading eyebrow="YOUR READINESS" title="A clear brief comes first.">
          Readiness should reflect your choices, with no assumptions.
        </PageHeading>
        <EmptyState
          title={
            state.session ? 'Review and confirm your brief.' : 'Let’s understand your business.'
          }
        >
          {state.session
            ? 'Your brief is unfinished or has changed. Confirm the latest version to see an accurate snapshot.'
            : 'Share the task, tools and limits you want us to work with.'}
        </EmptyState>
      </>
    );
  const b = state.session.brief;
  const result = assessReadiness(b);
  const ready = result.items.filter((i) => i.state === 'ready').length;
  function edit(step: number) {
    workspace.step(step);
    router.push('/onboarding');
  }
  return (
    <>
      <div className="row-between page-top">
        <PageHeading eyebrow="YOUR BUSINESS SNAPSHOT" title="You have a starting point.">
          You don’t need to change everything. Start small, keep what works, and build from there.
        </PageHeading>
        <button className="button button-secondary" onClick={() => edit(4)}>
          <Pencil size={16} />
          Edit your brief
        </button>
      </div>
      <section className="snapshot-banner">
        <span className="snapshot-icon">
          <Sprout size={28} />
        </span>
        <div>
          <p className="eyebrow">
            {state.mode === 'demo' ? 'FICTIONAL BUSINESS' : 'YOUR BUSINESS'}
          </p>
          <h2>
            {b.profile.name ||
              (b.profile.category === 'Other' ? b.profile.otherCategory : b.profile.category)}
          </h2>
          <p>{b.need.job && jobs[b.need.job].title}</p>
        </div>
        <div className="snapshot-budget">
          <strong>
            ${b.need.monthlyBudgetUsd}
            <span> / month</span>
          </strong>
          <small>Additional budget · {b.need.setupMinutes} min setup</small>
        </div>
      </section>
      {!result.supported && (
        <Note title="This job is outside current coverage.">
          We can help you map the process, but we won’t recommend a tool for this unsupported job.
          Keep using your existing process while its requirements are reviewed.
        </Note>
      )}
      <div className="readiness-layout">
        <section>
          <div className="section-heading">
            <div>
              <p className="eyebrow">A PRACTICAL READINESS CHECK</p>
              <h2>What’s in place. What needs a look.</h2>
            </div>
            <Badge tone="teal">
              {ready} of {result.items.length} in place
            </Badge>
          </div>
          <p className="small muted readiness-caption">
            Based only on your answers. This checklist is not an audit or a prediction of success.
          </p>
          <div className="readiness-list">
            {result.items.map((item) => (
              <article className="readiness-item" key={item.title}>
                <span className={`readiness-indicator ${item.state}`}>
                  {item.state === 'ready' ? (
                    <Check size={18} />
                  ) : item.state === 'unknown' ? (
                    <CircleHelp size={18} />
                  ) : (
                    <ClipboardList size={18} />
                  )}
                </span>
                <div>
                  <div className="row-between">
                    <h3>{item.title}</h3>
                    <span className={`readiness-label ${item.state}`}>
                      {item.state === 'ready'
                        ? 'In place'
                        : item.state === 'action'
                        ? 'Next step'
                        : 'Check first'}
                    </span>
                  </div>
                  <p>{item.detail}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
        <aside className="next-step-card">
          <span className="icon-tile">
            <Sprout size={25} />
          </span>
          <Badge tone="teal">Existing tools first</Badge>
          <h2>Your smallest useful next step.</h2>
          <p>{result.nextStep}</p>
          <div className="next-step-meta">
            <strong>No new subscription needed.</strong>
            <span>
              {result.existingTools.length
                ? `Start with: ${result.existingTools.join(', ')}.`
                : 'A paper list is enough to begin.'}
            </span>
          </div>
          <p className="small">
            {b.need.setupMinutes === 0
              ? 'You have no setup time available. Keep your current process until you have room to test a change.'
              : `Keep preparation within your ${b.need.setupMinutes}-minute setup limit.`}{' '}
            This is preparation guidance, not a generated trial plan.
          </p>
          <ActionLink href="/discover">Explore the catalog</ActionLink>
        </aside>
      </div>
      <details className="card snapshot-details">
        <summary>Review your complete business snapshot</summary>
        <BriefSummary brief={b} onEdit={edit} />
      </details>
      <div className="page-bottom-actions">
        <ActionLink href="/hub" secondary>
          Open your business hub
        </ActionLink>
        <button className="text-button" onClick={() => edit(4)}>
          Review your answers <ArrowRight size={16} />
        </button>
      </div>
    </>
  );
}
