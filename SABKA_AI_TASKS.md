# SABKA AI — PRIORITIZED BUILD BOARD AND CONTINUATION PROMPTS

**Mission:** finish P0 truthfully by Sunday Nov 8, 2026 at 11:59 p.m. ET. A working smaller product is better than a fake broad product. The wide vision is preserved in the architecture and roadmap.

## Release gate: what P0 must genuinely do

- [ ] One click starts as guest; a clearly labeled fictional demo profile is available.
- [ ] Complete and edit structured business brief; required constraints persist across back/forward.
- [ ] Capture current channels, software, budget, technical comfort, human approval and business values.
- [ ] Show understandable readiness gaps and at least one no-tool/existing-process recommendation.
- [ ] Store sourced, versioned candidate and published tool/plan/evidence records; source URLs and freshness visible.
- [ ] Admin-only actual search via configured provider returns a newly discovered candidate and pending-review state; no fake search state.
- [ ] Admin manually approves/rejects with source inspection; unapproved tools cannot be recommended.
- [ ] Hard gates (capability, cost, integrations, human control, privacy) exclude/restrict correctly; unknown critical info is not assumed safe.
- [ ] Deterministic score and evidence coverage separate, independently testable and explained.
- [ ] Up to three qualifying options (possibly fewer), comparison and rejected/held reasons.
- [ ] Generate a personalized seven-day reversible pilot and working formula-safe CSV checklist export.
- [ ] Support keyboard, readable text, focus display, clear errors, mobile width and no-account route.
- [ ] Seeded fallback is available when optional search or model calls fail, honestly labeled.
- [ ] Build/test/lint pass or clearly documented nonpassing commands and blockers.
- [ ] Public HTTPS judge URL opens in an incognito browser; deployment doesn't reveal credentials.
- [ ] Ten-minute demo accurately shows research, working code, complete owner journey, discovery proof, engineering, and 16-week plan.

## Recommended execution phases

### PHASE 1 — Foundation + user understanding (P0)

**Work:** Next.js shell, SABKA brand/design system, welcome/sample entry, accessible wizard (business/need/workflow/values), owner edit and confirmation, simple readiness, persisted guest state, typed data models and empty/error states. Create seed **fictional examples** explicitly labeled; do not imply researched tool evidence. Ensure screenshot-ready polish with no dead controls.

**Done when:** A judge can enter as a baker, choose a job, set $40/month and owner-approval, edit their inputs, see a correct snapshot and move onward. Onboardings are usable by keyboard and on mobile. App starts without external keys.

### PHASE 2 — Genuine discovery, verification and catalog (P0)

**Work:** Tool, Plan, Source and Claim tables/migrations; real permitted search provider adapter with server-only env, bounded admin discovery query, canonical identity/dedupe, candidate status, claimed evidence and dates, protected reviewer approval, published read endpoint. Provide source registry, expiration flags and a catalog seed import path for **team-researched real vendor claims**; no invented price/reviews. Include a provider-disabled state.

**Done when:** A real configured query finds a not-previously-seeded candidate in pending review; a reviewer sees the query/source/time, approves a sufficiently verified record, and it becomes published. Without provider credentials, the UI says discovery unavailable rather than pretending it ran. No public user can publish.

### PHASE 3 — Constraints, ranking and comparison (P0)

**Work:** Validate brief, implement hard gates, versioned score 30/25/20/15/10 with 0–4 grades, evidence checklist, separate risk display and explainability. Shortlist <=3 published appropriate products plus existing-tool/no-match pathway. Pricing and plan scope matter; unknown critical info is blocked/held. Re-score on budget/approval/integration change; explain exclusions. Render consistent cards and accessible compare view.

**Done when:** For a fixed catalog/profile, results are deterministic; changing a hard requirement changes eligibility for documented reasons; high reviews never bypass failed gates. Every material displayed claim has a source or an unknown label. Unit tests cover adversarial cases.

### PHASE 4 — Real adoption / export / dashboard (P0)

**Work:** Existing-tools-first vs selected single tool, practical seven-day plan with cost assumptions, baseline, fictional sample, owner approval, success criteria, stop/revoke/cancel steps. Printable view and downloadable CSV that opens in spreadsheet software and neutralizes malicious formula prefixes. Minimal guest dashboard for continue/reset. Integrate live P0 journey end to end and polish empty/error/loading states.

**Done when:** New guest completes intake → published shortlist → compare → trial → export. Export content accurately reflects profile and plan; owner can retrieve it without accessing another session. No fake deployed vendor agent.

### PHASE 5 — Testing, deployment and demonstration (P0)

**Work:** Research log (honest participant count), deterministic 24-case suite if time, two business walkthroughs, code tests, keyboard/accessibility check, permission/source audit, provider-outage fallback, cold refresh, deployment and incognito testing. Verify demo story and source claims just before recording. Create `docs/DEMO_SCRIPT.md` and include contributor roles.

**Done when:** External judge can open the app and reproduce critical flows; no known secret leak/critical blocker; video under 10 min and 16-week expansion addressed with working-code evidence.

### P1 ONLY AFTER ALL P0 PASSES

- [ ] One verified two-tool/human recipe with tested transfer and total incremental cost.
- [ ] Opt-in outcome form (trial start, completion, setup effort, keep/change/stop).
- [ ] Additional accessible read-aloud control; only if keyboard and screen-reader basics already work.
- [ ] Richer admin source explorer.

### SIXTEEN-WEEK / FUTURE — DOCUMENT, DO NOT CODE NOW

- [ ] User accounts and family/team membership, role-based owner/manager/staff approval workflows.
- [ ] Voice assistant, voice onboarding, opt-in image/document/video intake.
- [ ] Offline PWA access to saved plans (not fake offline live search).
- [ ] Subscription tracker, overlapping tools/renewal reminders, transparent referral possibilities.
- [ ] Social-media content calendar and owner-controlled brand drafts.
- [ ] Guided support assistant grounded in selected tool's vetted documentation.
- [ ] Community, moderated outcomes and similar-business recommendations, peer-to-peer connections/mentor network.
- [ ] More tool categories: inventory, hiring and legal research triage with appropriate human guardrails, forecasting, logistics, field-service routing, invoices, support knowledge base.
- [ ] Business data discovery and permissioned connectors: POS, spreadsheets, CRM, calendar, approved document parsing, document intelligence, Power Platform/Copilot Studio.
- [ ] Only when justified, hardware sources such as sensors/cameras/IoT and advanced predictive models.
- [ ] Expanded source partnerships, licensing, evidence refresh jobs, ranking calibration, audit and accessibility validation.

## Four continuation messages to paste into Codex, one at a time

### SECOND MESSAGE (after Phase 1 works)

> Read `AGENTS.md`, the product spec, architecture and task board. Continue with **Phase 2 only**: implement real versioned Tool/ToolPlan/Source/ToolClaim/DiscoveryCandidate storage and migrations; an admin-authorized, bounded real web search adapter; canonical vendor/product dedupe; source URL/time/permission record; pending review; reviewer approve/hold/reject; public read restricted to approved published records. A manually researched seed import must not invent prices or reviews. Build a clear 'search not configured' state. Write tests proving public users cannot publish and draft candidates are never recommended. Run lint/typecheck/tests/build and report actual results and next prompt. Do not work on future community, voice or sensors.

### THIRD MESSAGE (after verified catalog exists)

> Continue with **Phase 3 only**. Implement deterministic eligibility gates and matching scoring from `docs/SABKA_AI_ARCHITECTURE.md` exactly. Hard gates first; unknown critical price/integration/privacy/approval must yield Needs Verification. Weighted fit 30/25/20/15/10 with 0–4 anchored grades; separate evidence coverage and risk, published-only sources, optional existing-tools/no-AI choice, explanation with factual source URLs and catalog/scorer versions. Build responsive top-three/compare UI and rejected/held reasons; changing user constraints must recompute results. Add tests for at least budget, required approval, integration, stale price, absent evidence, unsupported job, draft exclusion, no-match and deterministic repeat. No LLM authority over gates. Run and fix tests/build.

### FOURTH MESSAGE (after matching is tested)

> Continue with **Phase 4**. Finish the actual owner journey: readiness → shortlist → compare → choose existing tool or a verified tool → seven-day reversible adoption plan → printable view and working CSV checklist export → simple return dashboard. The plan must contain real cost assumptions, owner review checkpoints, fictional/redacted test data, measurement, and stop/export/revoke instructions. Protect guest-session data and spreadsheet formulas in CSV. Wire navigation end to end, add mobile/focus/keyboard states, real empty/error/offline fallback. Verify with the home baker and HVAC examples. Run lint/typecheck/tests/build and list exactly what now works.

### FIFTH MESSAGE (final hardening and demo)

> Stop adding major features. Perform **Phase 5**: audit `docs/SABKA_AI_TASKS.md` P0 checklist against the running code, fix critical gaps, run adversarial matcher and auth tests, inspect all source links/freshness, verify no false claims or secrets, test keyboard/mobile/incognito and search/OpenRouter outage fallback. Produce `.env.example`, migration/seed instructions, README deployment guide and a 10-minute demo runbook with timestamps including proof of real discovery, a constraint-driven rejection, a portable CSV export, architecture and a 16-week roadmap. Make the deployed judge URL work if deployment credentials are configured. State all unimplemented items honestly. Do not work on future community or voice features.

## Cadence and prioritization

**Friday Nov 6:** architecture freeze, repo shell, complete guest-onboarding/readiness, initial sourced catalog design. **Saturday Nov 7:** discovery/admin/evidence, deterministic gates, compare, seven-day plan/CSV. **Sunday Nov 8:** full journey, test, deployment, record and submit before 11:59 p.m. ET. Reserve material time for demo and source verification. If tight on time, narrow catalog to six well-reviewed products/two jobs while preserving genuine discovery, clear source labels, strict gates, practical trial/export and accessibility. Do not spend remaining hours on a community feed, fancy chatbot, voice or complicated automations.

## Quality and evaluation evidence

Prepare 24 profile variants where feasible (three illustrative business types × four constraint variations × two supported jobs) plus adversarial cases. Proposed targets, not achieved claims: zero known hard-gate violations; traceable material claims or clear unknowns; at least one suitable top-three match in 20/24 **supported** cases independently reviewed by two teammates (report counts honestly); reproducible same-profile same-catalog same-version ranking; no critical keyboard blocking issue. User research targets six interviews and five usability tests if feasible; record actual counts, limitations and observed redesigns. A 16-week pilot aims at measurable successful keep/change/stop decisions and may include 20 owners; do not treat targets as results.
