'use client';

import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, Clock3, FileText, RotateCcw, ShieldCheck } from 'lucide-react';
import { useWorkspace, workspace } from '@/lib/client/workspace';
import { ActionLink, Badge, LoadingState, Note, PageHeading } from './ui';
import type { DemoId } from '@/lib/fixtures/businesses';

export function Dashboard() {
  const state = useWorkspace();
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  if (!state.ready) return <LoadingState />;
  function demo(id: DemoId) {
    workspace.startDemo(id);
    router.push('/onboarding');
  }
  return (
    <>
      <PageHeading eyebrow="YOUR BUSINESS HUB" title="Pick up where you left off.">
        A quiet place for your business brief, your next step, and an honest view of what’s
        available.
      </PageHeading>
      <div className="dashboard-grid">
        <section className="card hub-brief">
          <span className="icon-tile">
            <FileText />
          </span>
          <div className="row-between">
            <h2>Your business brief</h2>
            <Badge tone={state.session?.confirmedAt ? 'teal' : 'neutral'}>
              {state.session?.confirmedAt
                ? 'Confirmed'
                : state.session
                ? 'In progress'
                : 'Not started'}
            </Badge>
          </div>
          {state.session ? (
            <>
              <h3>{state.session.brief.profile.name || 'Your business'}</h3>
              <p>
                {state.session.demoId
                  ? 'Fictional example. Your guest brief is kept separately.'
                  : 'Your own brief, stored only in this browser tab.'}
              </p>
              <p className="small muted">
                Last changed {new Date(state.session.updatedAt).toLocaleString()}.
              </p>
              <div className="button-row">
                <ActionLink href="/onboarding">
                  {state.session.confirmedAt ? 'Review or edit' : 'Continue your brief'}
                </ActionLink>
                {state.session.confirmedAt && (
                  <ActionLink secondary href="/readiness">
                    See readiness
                  </ActionLink>
                )}
              </div>
              <button
                className="text-button reset-link"
                onClick={() => dialog.current?.showModal()}
              >
                <RotateCcw size={15} />
                Clear this {state.mode === 'demo' ? 'demo' : 'guest'} brief
              </button>
            </>
          ) : (
            <>
              <p>
                Share a little about your business and the work you want help with. No account
                required.
              </p>
              <button
                className="button"
                onClick={() => {
                  workspace.startGuest();
                  router.push('/onboarding');
                }}
              >
                Start my brief <ArrowRight size={17} />
              </button>
            </>
          )}
        </section>
        <section className="card hub-plan">
          <span className="icon-tile neutral-tile">
            <Clock3 />
          </span>
          <Badge tone="amber">Planned · Phase 4</Badge>
          <h2>No trial plan yet.</h2>
          <p>
            Saved trial plans, seven-day checklists and exports will appear here after adoption is
            implemented.
          </p>
          <ActionLink href="/adoption" secondary>
            See adoption scope
          </ActionLink>
        </section>
      </div>
      <Note title="Your data, in this tab.">
        Guest briefs never leave your browser. They expire after 24 hours without an edit and are
        removed when this tab closes. Browser session restoration may retain tab data; use “Clear
        this brief” on a shared device. No cloud save or cross-device recovery is available.
      </Note>
      <section className="status-section">
        <p className="eyebrow">BUILT WITH CLARITY</p>
        <h2>What works today. What comes next.</h2>
        <div className="status-grid">
          {[
            {
              title: 'Business understanding',
              status: 'Implemented',
              detail:
                'Guest entry, validated onboarding, editable brief, local save, and readiness.',
            },
            {
              title: 'Discovery & evidence',
              status: 'Implemented',
              detail:
                'Sourced catalog, evidence browsing, authenticated review and configured discovery.',
            },
            {
              title: 'Matching & comparison',
              status: 'Partly implemented',
              detail:
                'Basic task/constraint matching and explained options work. Full comparison and detailed rubric explanations remain Phase 3.',
            },
            {
              title: 'Adoption & export',
              status: 'Planned · Phase 4',
              detail: 'Seven-day plans, human checkpoints, print and safe CSV export.',
            },
          ].map((c, i) => (
            <article className="card status-card" key={c.title}>
              <div className="row-between">
                <span className="status-icon">
                  {i < 2 ? <Check size={20} /> : <Clock3 size={20} />}
                </span>
                <Badge tone={i < 2 ? 'teal' : 'neutral'}>{c.status}</Badge>
              </div>
              <h3>{c.title}</h3>
              <p>{c.detail}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="card demo-selector">
        <h2>Explore a fictional business.</h2>
        <p>
          These examples demonstrate the form and readiness logic. They contain no vendor claims or
          measured outcomes. Selecting an example replaces the current demo, while keeping your
          guest brief separate.
        </p>
        <div className="button-row">
          <button className="button button-secondary" onClick={() => demo('baker')}>
            Home baker
          </button>
          <button className="button button-secondary" onClick={() => demo('hvac')}>
            HVAC contractor
          </button>
          <button className="button button-secondary" onClick={() => demo('landscaper')}>
            Landscaper
          </button>
        </div>
      </section>
      <details className="card roadmap">
        <summary>The longer view · planned, not available yet</summary>
        <p>
          The full vision includes verified two-tool workflows, opt-in trial feedback, team
          permissions, accessible voice and media intake, offline saved guides, subscriptions,
          content planning, community and advisor support. Permissioned business connectors,
          evidence refresh, document intelligence and justified sensor research belong to the
          sixteen-week roadmap.
        </p>
      </details>
      <div className="planned-footer">
        <ShieldCheck size={18} />
        <span>Human approval is a foundation, not a feature toggle.</span>
      </div>
      <dialog ref={dialog} className="preferences-dialog" aria-labelledby="reset-title">
        <h2 id="reset-title">Clear this brief?</h2>
        <p>
          This removes the {state.mode === 'demo' ? 'fictional demo' : 'guest'} brief from this tab.
          It cannot be undone. The other workspace and display preferences are kept.
        </p>
        <div className="button-row">
          <button
            className="button button-secondary"
            onClick={() => dialog.current?.close()}
            autoFocus
          >
            Keep my brief
          </button>
          <button
            className="button button-danger"
            onClick={() => {
              workspace.reset();
              dialog.current?.close();
            }}
          >
            Clear this brief
          </button>
        </div>
      </dialog>
    </>
  );
}
