'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  HeartHandshake,
  LockKeyhole,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  boundaryOptions,
  categories,
  channelOptions,
  issuesForStep,
  jobs,
  systemOptions,
  type BusinessBrief,
  type DataSource,
} from '@/lib/domain/brief';
import { useWorkspace, workspace } from '@/lib/client/workspace';
import { Field, Choices } from './fields';
import { Badge, LoadingState, Note, PageHeading } from './ui';
import { BriefSummary } from './brief-summary';

const steps = [
  'Your business',
  'Your first job',
  'Your workflow',
  'Your priorities',
  'Review your brief',
];
const headings = [
  'Let’s start with your business.',
  'What would you like off your plate?',
  'Start with what you already use.',
  'Make room for what matters.',
  'Does this sound like you?',
];
const descriptions = [
  'Big ambitions, small team? You’re in the right place.',
  'Pick one job to focus on first. You can always change it.',
  'No accounts to connect. Just tell us how things work today.',
  'A useful tool should fit your limits and respect your relationships.',
  'This is what you told us. Nothing has been inferred by an AI.',
];

export function Onboarding() {
  const state = useWorkspace();
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const headingRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  if (!state.ready) return <LoadingState />;
  if (!state.session)
    return (
      <>
        <PageHeading
          eyebrow="YOUR BUSINESS, YOUR PACE"
          title="A thoughtful start takes just a few steps."
        >
          Tell us about the work, tools and people that make your business yours.
        </PageHeading>
        <section className="card intro-card">
          <h2>No account. No connected tools.</h2>
          <p>
            Your brief stays in this browser tab, is removed when the tab closes, and expires after
            24 hours without an edit. Don’t include customer names, contact details or confidential
            information.
          </p>
          <button className="button" onClick={() => workspace.startGuest()}>
            Start my business brief <ArrowRight size={18} />
          </button>
        </section>
      </>
    );
  const { brief: b, step } = state.session;
  function update(brief: BusinessBrief) {
    workspace.update(brief);
  }
  function profile<K extends keyof BusinessBrief['profile']>(
    key: K,
    value: BusinessBrief['profile'][K],
  ) {
    update({ ...b, profile: { ...b.profile, [key]: value } });
  }
  function need<K extends keyof BusinessBrief['need']>(key: K, value: BusinessBrief['need'][K]) {
    update({ ...b, need: { ...b.need, [key]: value } });
  }
  function boundary<K extends keyof BusinessBrief['boundaries']>(
    key: K,
    value: BusinessBrief['boundaries'][K],
  ) {
    update({ ...b, boundaries: { ...b.boundaries, [key]: value } });
  }
  function go(next: number) {
    setErrors({});
    workspace.step(next);
    requestAnimationFrame(() => {
      headingRef.current?.focus();
      window.scrollTo({ top: 0 });
    });
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    const found = issuesForStep(b, step);
    setErrors(found);
    if (Object.keys(found).length) {
      requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }
    if (step < 4) go(step + 1);
    else if (workspace.confirm()) router.push('/readiness');
  }
  function source(index: number, patch: Partial<DataSource>) {
    update({
      ...b,
      dataSources: b.dataSources.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    });
  }
  return (
    <>
      <div className="wizard-topline">
        <p className="eyebrow">LET’S GET TO KNOW YOUR BUSINESS</p>
        <Badge tone={state.mode === 'demo' ? 'amber' : 'teal'}>
          {state.mode === 'demo' ? 'Fictional demo brief' : 'Private guest brief'}
        </Badge>
      </div>
      <ol className="wizard-progress" aria-label="Business brief progress">
        {steps.map((label, i) => (
          <li
            className={i === step ? 'current' : i < step ? 'complete' : ''}
            aria-current={i === step ? 'step' : undefined}
            key={label}
          >
            <span>{i < step ? <Check size={15} aria-hidden="true" /> : `0${i + 1}`}</span>
            <span>{label}</span>
          </li>
        ))}
      </ol>
      <div className="wizard-layout">
        <form className="card wizard-card" onSubmit={submit} noValidate>
          <p className="step-caption">STEP {step + 1} OF 5</p>
          <h1 ref={headingRef} tabIndex={-1}>
            {headings[step]}
          </h1>
          <p className="wizard-description">{descriptions[step]}</p>
          {Object.keys(errors).length > 0 && (
            <div className="error-summary" role="alert" ref={errorRef} tabIndex={-1}>
              <strong>A few things need your attention.</strong>
              <ul>
                {Object.entries(errors).map(([field, message]) => (
                  <li key={field}>{message}</li>
                ))}
              </ul>
            </div>
          )}
          {step === 0 && (
            <div className="form-fields">
              <Note title="Private to this browser tab">
                No account or upload is needed. Your brief expires after 24 hours without an edit.
                Browser session restore may keep tab data, so clear your brief on a shared device.
                Leave out customer details and secrets.
              </Note>
              <Field
                label="Business name (optional)"
                name="business-name"
                hint="A nickname is fine. No identifying details are needed."
              >
                {(props) => (
                  <input
                    {...props}
                    value={b.profile.name}
                    maxLength={120}
                    autoComplete="off"
                    onChange={(e) => profile('name', e.target.value)}
                    placeholder="What do you call your business?"
                  />
                )}
              </Field>
              <Field
                label="What kind of business?"
                name="category"
                error={errors['profile.category']}
              >
                {(props) => (
                  <select
                    {...props}
                    value={b.profile.category}
                    onChange={(e) =>
                      profile('category', e.target.value as BusinessBrief['profile']['category'])
                    }
                  >
                    <option value="">Choose a business type</option>
                    {categories.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                )}
              </Field>
              {b.profile.category === 'Other' && (
                <Field
                  label="Your business type"
                  name="other-category"
                  error={errors['profile.otherCategory']}
                >
                  {(props) => (
                    <input
                      {...props}
                      value={b.profile.otherCategory}
                      maxLength={120}
                      onChange={(e) => profile('otherCategory', e.target.value)}
                    />
                  )}
                </Field>
              )}
              <div className="field-columns">
                <Field label="Your role" name="role">
                  {(props) => (
                    <select
                      {...props}
                      value={b.profile.role}
                      onChange={(e) =>
                        profile('role', e.target.value as BusinessBrief['profile']['role'])
                      }
                    >
                      <option value="owner">Owner</option>
                      <option value="manager">Manager</option>
                      <option value="staff">Staff</option>
                      <option value="advisor">Trusted advisor</option>
                    </select>
                  )}
                </Field>
                <Field label="Team size" name="size">
                  {(props) => (
                    <select
                      {...props}
                      value={b.profile.size}
                      onChange={(e) =>
                        profile('size', e.target.value as BusinessBrief['profile']['size'])
                      }
                    >
                      <option value="solo">Just me</option>
                      <option>2–5</option>
                      <option>6–20</option>
                      <option>21+</option>
                    </select>
                  )}
                </Field>
              </div>
              <Field
                label="City or region (optional)"
                name="region"
                hint="Please don’t include a street address."
              >
                {(props) => (
                  <input
                    {...props}
                    value={b.profile.region}
                    maxLength={120}
                    onChange={(e) => profile('region', e.target.value)}
                    placeholder="e.g. College Park, Maryland"
                  />
                )}
              </Field>
            </div>
          )}
          {step === 1 && (
            <div className="form-fields">
              <fieldset
                className="job-options"
                aria-describedby={errors['need.job'] ? 'job-error' : undefined}
              >
                <legend>Choose your first job</legend>
                {Object.entries(jobs).map(([key, job]) => (
                  <label className={`job-choice ${b.need.job === key ? 'selected' : ''}`} key={key}>
                    <input
                      type="radio"
                      name="job"
                      value={key}
                      checked={b.need.job === key}
                      onChange={() => need('job', key as BusinessBrief['need']['job'])}
                    />
                    <span>
                      <strong>{job.title}</strong>
                      <small>{job.description}</small>
                    </span>
                  </label>
                ))}
                {errors['need.job'] && (
                  <p id="job-error" className="field-error">
                    {errors['need.job']}
                  </p>
                )}
              </fieldset>
              {b.need.job === 'other' && (
                <Note title="You’re welcome here. This job isn’t supported yet.">
                  We’ll help you describe the process and assess readiness. We won’t suggest a tool
                  or silently change your job.
                </Note>
              )}
              <Field
                label="What makes this task difficult?"
                name="problem"
                hint="Describe the process, without customer details."
                error={errors['need.problem']}
              >
                {(props) => (
                  <textarea
                    {...props}
                    rows={3}
                    maxLength={1000}
                    value={b.need.problem}
                    onChange={(e) => need('problem', e.target.value)}
                    placeholder="I spend too much time…"
                  />
                )}
              </Field>
              <div className="field-columns">
                <Field label="How often does it come up?" name="frequency">
                  {(props) => (
                    <select
                      {...props}
                      value={b.need.frequency}
                      onChange={(e) =>
                        need('frequency', e.target.value as BusinessBrief['need']['frequency'])
                      }
                    >
                      <option value="daily">Every day</option>
                      <option value="weekly">Every week</option>
                      <option value="occasionally">Occasionally</option>
                    </select>
                  )}
                </Field>
                <Field label="How important is this?" name="priority">
                  {(props) => (
                    <select
                      {...props}
                      value={b.need.priority}
                      onChange={(e) =>
                        need('priority', e.target.value as BusinessBrief['need']['priority'])
                      }
                    >
                      <option value="high">High priority</option>
                      <option value="medium">Medium priority</option>
                      <option value="low">Exploring for later</option>
                    </select>
                  )}
                </Field>
              </div>
              <Field
                label="What would a useful result look like?"
                name="success"
                error={errors['need.successMeasure']}
              >
                {(props) => (
                  <textarea
                    {...props}
                    rows={2}
                    maxLength={1000}
                    value={b.need.successMeasure}
                    onChange={(e) => need('successMeasure', e.target.value)}
                    placeholder="e.g. Spend 30 fewer minutes on order follow-ups each evening."
                  />
                )}
              </Field>
            </div>
          )}
          {step === 2 && (
            <div className="form-fields">
              <Choices
                legend="Where does work come in?"
                options={channelOptions}
                values={b.need.channels}
                onChange={(v) => need('channels', v)}
                error={errors['need.channels']}
                custom
              />
              <Choices
                legend="What tools do you use today?"
                options={systemOptions}
                values={b.need.currentSystems}
                onChange={(v) => need('currentSystems', v)}
                error={errors['need.currentSystems']}
                custom
                exclusive="None yet"
              />
              <Field
                label="Existing subscriptions (optional)"
                name="subscriptions"
                hint="Names and approximate costs only. No account credentials."
              >
                {(props) => (
                  <input
                    {...props}
                    maxLength={1000}
                    value={b.need.subscriptions}
                    onChange={(e) => need('subscriptions', e.target.value)}
                    placeholder="e.g. Already pay for an office suite"
                  />
                )}
              </Field>
              <Field
                label="Connections you must keep (optional)"
                name="integrations"
                hint="This records a requirement; it does not connect or verify an integration."
              >
                {(props) => (
                  <input
                    {...props}
                    maxLength={1000}
                    value={b.need.requiredIntegrations}
                    onChange={(e) => need('requiredIntegrations', e.target.value)}
                    placeholder="e.g. Must work with our current calendar"
                  />
                )}
              </Field>
              <label className="checkbox-line">
                <input
                  type="checkbox"
                  checked={b.need.manualHandoffAllowed}
                  onChange={(e) => need('manualHandoffAllowed', e.target.checked)}
                />
                <span>I’m open to a verified manual copy/paste or CSV handoff.</span>
              </label>
              <div className="source-heading">
                <h2>What information already exists?</h2>
                <p className="field-hint">
                  Optional. Add a description of a source, not its contents. Unanswered details stay
                  unknown.
                </p>
              </div>
              {b.dataSources.map((s, index) => (
                <fieldset className="source-card" key={index}>
                  <legend>Information source {index + 1}</legend>
                  <div className="row-between">
                    <span className="small muted">Describe only — no uploads</span>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Remove information source ${index + 1}`}
                      onClick={() =>
                        update({ ...b, dataSources: b.dataSources.filter((_, i) => i !== index) })
                      }
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                  <Field
                    label="Source name"
                    name={`source-${index}`}
                    error={errors[`dataSources.${index}.name`]}
                  >
                    {(props) => (
                      <input
                        {...props}
                        maxLength={120}
                        value={s.name}
                        onChange={(e) => source(index, { name: e.target.value })}
                      />
                    )}
                  </Field>
                  <div className="field-columns">
                    {(
                      [
                        {
                          key: 'format',
                          label: 'Format',
                          values: [
                            ['unknown', 'Not sure'],
                            ['paper', 'Paper'],
                            ['digital', 'Digital'],
                          ],
                        },
                        {
                          key: 'owner',
                          label: 'Who owns it?',
                          values: [
                            ['unknown', 'Not sure'],
                            ['business', 'Our business'],
                            ['third_party', 'Someone else'],
                          ],
                        },
                        {
                          key: 'availability',
                          label: 'Available to you?',
                          values: [
                            ['unknown', 'Not sure'],
                            ['available', 'Available'],
                            ['missing', 'Not available'],
                          ],
                        },
                        {
                          key: 'completeness',
                          label: 'How complete is it?',
                          values: [
                            ['unknown', 'Not checked'],
                            ['partial', 'Some gaps'],
                            ['complete', 'Complete'],
                          ],
                        },
                        {
                          key: 'permission',
                          label: 'Permission to reuse?',
                          values: [
                            ['unknown', 'Not sure'],
                            ['not_confirmed', 'Not confirmed'],
                            ['confirmed', 'Confirmed by me'],
                          ],
                        },
                        {
                          key: 'sensitivity',
                          label: 'Sensitive information?',
                          values: [
                            ['unknown', 'Not assessed'],
                            ['standard', 'No sensitive data reported'],
                            ['sensitive', 'Contains sensitive data'],
                          ],
                        },
                      ] as const
                    ).map((field) => (
                      <Field key={field.key} label={field.label} name={`${field.key}-${index}`}>
                        {(props) => (
                          <select
                            {...props}
                            value={s[field.key]}
                            onChange={(e) => source(index, { [field.key]: e.target.value })}
                          >
                            {field.values.map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                        )}
                      </Field>
                    ))}
                  </div>
                </fieldset>
              ))}
              {b.dataSources.length < 20 && (
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() =>
                    update({
                      ...b,
                      dataSources: [
                        ...b.dataSources,
                        {
                          name: '',
                          format: 'unknown',
                          owner: 'unknown',
                          availability: 'unknown',
                          completeness: 'unknown',
                          permission: 'unknown',
                          sensitivity: 'unknown',
                        },
                      ],
                    })
                  }
                >
                  <Plus size={17} />
                  Add an information source
                </button>
              )}
            </div>
          )}
          {step === 3 && (
            <div className="form-fields">
              <div className="field-columns">
                <Field
                  label="Additional monthly budget (USD)"
                  name="budget"
                  hint="A firm cap. $0 is a valid choice."
                  error={errors['need.monthlyBudgetUsd']}
                >
                  {(props) => (
                    <input
                      {...props}
                      type="number"
                      min={0}
                      max={100000}
                      step="0.01"
                      inputMode="decimal"
                      value={b.need.monthlyBudgetUsd ?? ''}
                      onChange={(e) =>
                        need(
                          'monthlyBudgetUsd',
                          e.target.value === '' ? null : Number(e.target.value),
                        )
                      }
                      placeholder="40"
                    />
                  )}
                </Field>
                <Field
                  label="Time available for setup (minutes)"
                  name="setup"
                  hint="Total time you can give a first setup."
                  error={errors['need.setupMinutes']}
                >
                  {(props) => (
                    <input
                      {...props}
                      type="number"
                      min={0}
                      max={10080}
                      step={1}
                      inputMode="numeric"
                      value={b.need.setupMinutes ?? ''}
                      onChange={(e) =>
                        need('setupMinutes', e.target.value === '' ? null : Number(e.target.value))
                      }
                      placeholder="45"
                    />
                  )}
                </Field>
              </div>
              <Field label="Comfort with technology" name="comfort">
                {(props) => (
                  <select
                    {...props}
                    value={b.profile.technicalComfort}
                    onChange={(e) =>
                      profile(
                        'technicalComfort',
                        e.target.value as BusinessBrief['profile']['technicalComfort'],
                      )
                    }
                  >
                    <option value="beginner">Beginner — keep it simple</option>
                    <option value="comfortable">Comfortable with everyday tools</option>
                    <option value="experienced">Experienced — happy to configure tools</option>
                  </select>
                )}
              </Field>
              <Note title="A person always has the final say.">
                Messages, content, bookings and spending require human approval. SABKA AI never
                performs these actions for you.
              </Note>
              <Choices
                legend="What especially needs a human touch?"
                hint="These preferences add to the approval rule above."
                options={boundaryOptions}
                values={b.boundaries.mustStayHuman}
                onChange={(v) => boundary('mustStayHuman', v)}
                custom
              />
              <Field label="People come back because… (optional)" name="values">
                {(props) => (
                  <textarea
                    {...props}
                    rows={2}
                    maxLength={1000}
                    value={b.boundaries.customerValues}
                    onChange={(e) => boundary('customerValues', e.target.value)}
                    placeholder="We remember their favorites and take time to listen."
                  />
                )}
              </Field>
              <Field label="We want to sound… (optional)" name="tone">
                {(props) => (
                  <input
                    {...props}
                    maxLength={120}
                    value={b.boundaries.tone}
                    onChange={(e) => boundary('tone', e.target.value)}
                    placeholder="Warm, clear and down to earth"
                  />
                )}
              </Field>
              <Field
                label="Facts a future content tool should know (optional)"
                name="facts"
                hint="Only facts you can confirm. Don’t include private customer information."
              >
                {(props) => (
                  <textarea
                    {...props}
                    rows={2}
                    maxLength={1000}
                    value={b.boundaries.businessFacts}
                    onChange={(e) => boundary('businessFacts', e.target.value)}
                    placeholder="Our services, hours, or confirmed policies…"
                  />
                )}
              </Field>
              <Field label="With time back, I’d… (optional)" name="time-back">
                {(props) => (
                  <input
                    {...props}
                    maxLength={1000}
                    value={b.boundaries.timeSavedFor}
                    onChange={(e) => boundary('timeSavedFor', e.target.value)}
                    placeholder="Spend more evenings with my family."
                  />
                )}
              </Field>
            </div>
          )}
          {step === 4 && (
            <>
              <BriefSummary brief={b} onEdit={go} />
              {b.need.job === 'other' && (
                <Note title="Coverage limit">
                  Your job is outside the three supported jobs. Readiness can still help, but no
                  tool match will be claimed.
                </Note>
              )}
              <div className="confirmation-note">
                <Check size={19} />
                <p>
                  By continuing, you confirm this brief reflects what you want. You can edit it at
                  any time.
                </p>
              </div>
            </>
          )}
          <div className="wizard-actions">
            <button
              type="button"
              className="text-button"
              onClick={() => (step > 0 ? go(step - 1) : router.push('/'))}
            >
              <ArrowLeft size={17} />
              {step === 0 ? 'Home' : 'Back'}
            </button>
            <span className="save-caption">
              {state.storageError ? 'In-memory only' : 'Saved in this tab'}
            </span>
            <button className="button" type="submit">
              {step === 4 ? 'Confirm & see readiness' : 'Save & continue'}
              <ArrowRight size={17} />
            </button>
          </div>
        </form>
        <aside className="wizard-aside decorative">
          <span className="icon-tile">
            <HeartHandshake size={24} />
          </span>
          <h2>
            The best next step
            <br />
            starts with you.
          </h2>
          <p>You don’t need to know anything about AI. You already know your business.</p>
          <div className="aside-divider" />
          <h3>Keep what makes you, you.</h3>
          <p>Your relationships. Your judgment. Your way of doing things.</p>
          <div className="privacy-caption">
            <LockKeyhole size={17} />
            <span>
              No login or uploads.
              <br />
              Your brief stays in this tab.
            </span>
          </div>
          <p className="small muted">
            Automatically expires after 24 hours without an edit. Closing the tab removes its saved
            brief.
          </p>
        </aside>
      </div>
    </>
  );
}
