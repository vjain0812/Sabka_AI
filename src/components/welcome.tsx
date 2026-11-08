'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Check,
  Clock3,
  HeartHandshake,
  Leaf,
  MessageSquareText,
  NotebookPen,
  ShieldCheck,
  Sparkles,
  Sprout,
} from 'lucide-react';
import { useWorkspace, workspace } from '@/lib/client/workspace';
import { Badge } from './ui';
import type { DemoId } from '@/lib/fixtures/businesses';

export function Welcome() {
  const router = useRouter();
  const state = useWorkspace();
  function start() {
    workspace.startGuest();
    router.push('/onboarding');
  }
  function demo(id: DemoId) {
    workspace.startDemo(id);
    router.push('/onboarding');
  }
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="small-line" />
            BIG POSSIBILITIES. SMALL BUSINESS.
          </p>
          <h1>
            Your business.
            <br />
            Your people.
            <br />
            <span>The right AI.</span>
          </h1>
          <p className="hero-description">
            You don’t need another list of tools.
            <br className="desktop-break" /> You need a next step that makes sense for <em>you.</em>
          </p>
          <p className="hero-subtext">
            Start with the work taking up your day. Keep the human touch that makes your business
            yours.
          </p>
          <div className="hero-actions">
            <button className="button" onClick={start}>
              {state.mode === 'guest' && state.session
                ? 'Continue my business brief'
                : 'Tell us about your business'}
              <ArrowRight size={18} />
            </button>
            <button className="text-button demo-link" onClick={() => demo('baker')}>
              Explore a fictional example <ArrowRight size={16} />
            </button>
          </div>
          <div className="hero-assurances">
            <span>
              <Check size={16} />
              No account needed
            </span>
            <span>
              <ShieldCheck size={16} />
              Your decisions, always
            </span>
          </div>
        </div>
        <div
          className="hero-art decorative"
          aria-label="Illustration of a fictional bakery’s journey from everyday tasks to a clear next step"
        >
          <div className="art-grid" />
          <span className="orbit-label">
            <Leaf size={15} /> A little help. More room to grow.
          </span>
          <div className="business-preview">
            <div className="row-between">
              <span className="preview-kicker">A BUSINESS LIKE YOURS</span>
              <span className="preview-dots">•••</span>
            </div>
            <div className="preview-business">
              <div className="bakery-symbol">
                <Sprout size={32} />
              </div>
              <div>
                <h2>Sunday Crumb</h2>
                <p>A neighborhood home bakery</p>
              </div>
            </div>
            <Badge tone="amber">Fictional example</Badge>
            <div className="preview-quote">
              “Less time sorting orders.
              <br />
              More time doing what I love.”
            </div>
            <div className="preview-chips">
              <span>
                <MessageSquareText size={15} /> WhatsApp
              </span>
              <span>
                <NotebookPen size={15} /> Notebook
              </span>
              <span>$40/mo budget</span>
            </div>
            <div className="preview-rule" />
            <div className="preview-human">
              <HeartHandshake size={22} />
              <span>
                Every customer reply
                <br />
                <strong>still comes from you.</strong>
              </span>
              <span className="circle-check">
                <Check size={15} />
              </span>
            </div>
          </div>
          <div className="next-step-preview">
            <span className="icon-tile">
              <Sparkles size={23} />
            </span>
            <div>
              <p>YOUR FIRST STEP</p>
              <strong>Start with what you have.</strong>
              <span>A clearer process before a new purchase.</span>
            </div>
          </div>
          <div className="art-caption">
            <span className="status-dot" />
            Practical. Personal. At your pace.
          </div>
        </div>
      </section>
      <section className="journey-strip" aria-label="Our approach">
        <div>
          <span className="step-number">01</span>
          <div>
            <h2>Your business comes first</h2>
            <p>Your everyday work, values and limits.</p>
          </div>
        </div>
        <div>
          <span className="step-number">02</span>
          <div>
            <h2>Clarity before commitment</h2>
            <p>Understand what’s ready and what’s missing.</p>
          </div>
        </div>
        <div>
          <span className="step-number">03</span>
          <div>
            <h2>A small, human-led step</h2>
            <p>Keep control. Start with what you have.</p>
          </div>
        </div>
      </section>
      <section className="home-bottom">
        <div className="scope-copy">
          <Badge tone="teal">Start with your business</Badge>
          <h2>
            Less overwhelm.
            <br />
            More room for your business.
          </h2>
          <p>
            Build your business brief, check readiness, and explore a source-backed tool catalog.
            Personalized matching, comparisons and trial plans are the next build phases.
          </p>
          <Link href="/hub" className="quiet-link">
            See what’s available <ArrowRight size={16} />
          </Link>
        </div>
        <div className="supported-work">
          <p className="eyebrow">THREE JOBS WE’RE BUILDING FOR</p>
          <div>
            <MessageSquareText size={22} />
            <span>
              <strong>Customer replies & follow-ups</strong>
              <small>Drafts with a personal touch and human approval.</small>
            </span>
          </div>
          <div>
            <Sparkles size={22} />
            <span>
              <strong>Marketing & content planning</strong>
              <small>Your real business facts. Your own voice.</small>
            </span>
          </div>
          <div>
            <Clock3 size={22} />
            <span>
              <strong>Appointments & requests</strong>
              <small>Keep things organized. Confirm every booking.</small>
            </span>
          </div>
          <p className="small muted">
            Any business is welcome. Other jobs receive an honest coverage limit.
          </p>
        </div>
      </section>
      <section className="example-strip">
        <div>
          <strong>Different businesses. The same thoughtful start.</strong>
          <p>Try another fictional brief. Your own brief stays separate.</p>
        </div>
        <div className="button-row">
          <button className="button button-secondary" onClick={() => demo('hvac')}>
            HVAC contractor <ArrowRight size={16} />
          </button>
          <button className="button button-secondary" onClick={() => demo('landscaper')}>
            Landscaper <ArrowRight size={16} />
          </button>
        </div>
      </section>
    </>
  );
}
