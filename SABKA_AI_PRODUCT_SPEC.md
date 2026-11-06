# SABKA AI — PRODUCT REQUIREMENTS & COMPLETE USER EXPERIENCE

**Version:** 1.0 | **Date:** November 6, 2026 | **Status:** intended product and implementation requirements, not completed features.

## 1. Product definition

**Name:** SABKA AI. Meaning/identity: AI assistance for every small business, without requiring technical expertise. **Working tagline:** “The right AI for your business. More time for what matters.” **Human philosophy:** “AI should help you be more human.” The product is an independent evidence-backed AI adoption navigator; it is **not** another general-purpose chatbot or just a searchable AI tool directory.

SABKA AI helps owners:
1. Describe their business and everyday work in a comfortable, accessible format.
2. Preserve what should stay personal: customer relationships, brand voice, sensitive decisions and human approval.
3. Audit existing tools, data, channels and readiness before suggesting purchases.
4. Discover current candidate AI tools from a curated database and bounded, real web searches.
5. Inspect product-specific evidence with pricing, reliability, risk, accessibility and compatibility distinctions.
6. Compare suitable options using visible eligibility criteria and reproducible scores.
7. Choose among improving existing processes, one external tool, a verified multi-tool workflow, or no AI yet.
8. Implement a small, reversible trial and evaluate whether outcomes improved.
9. Return for help with tools, costs, staff, content workflows and opt-in community learning.

## 2. Primary users and support boundaries

Initially target small businesses in Maryland for examples and pilot recruitment but do not limit the product to Maryland. Examples: mom-and-pop café, home baker, HVAC/plumbing/painter, landscaper, salon, retail store, laundromat, independent instructor, fitness coach, farmer, tailor/designer, independent creator, property/lease admin, professional services. Always offer “Other business.” This is one common product with job-based matching, not separately hardcoded business apps.

Roles: owner, manager, staff and trusted advisor. P0 only records the role. Future team membership assigns enforceable permissions for tool adoption, subscription approvals, customer-facing actions and trial feedback. Multiple role types and users (students, older adults, people with disabilities) are accommodated through personal preferences, not diagnosis/age assumptions. Never infer age/disability from media; child-specific onboarding is outside current scope.

P0 supports three cross-business jobs:
- **Customer replies and follow-ups**: draft and organize with required owner/authorized-human approval before external sending.
- **Marketing and social content planning**: create or organize owner-approved ideas based on supplied business facts and brand tone; do not invent promotions/testimonials or send/publish automatically.
- **Appointment and request administration**: intake, scheduling coordination, organization and existing-system handoffs with human confirmation.

Other possible jobs (inventory forecasting, invoicing, hiring, legal/compliance, support knowledge bases, routing, data intelligence, financial reporting, recruitment, field services) remain visible only as future/unsupported or exploratory work. Legal/hiring workflows need extra privacy, human and professional-review safeguards. Unsupported jobs never receive fabricated recommendations.

## 3. Full product screen-by-screen map (15 screens)

This is the ENTIRE experience, including staged future capabilities. Do not confuse long-term screens with P0 implementation requirements.

| ID | Screen | Owner sees and does | Backend/data involved | Phase |
|---|---|---|---|---|
| 01 | Welcome / Guest Entry | SABKA AI promise, start as guest, sample business, accessibility settings | local guest session, sample fixtures | P0 |
| 02 | Business Identity | business type (including Other), location optional, role, approximate size | BusinessProfile | P0 |
| 03 | What Is Hard Today? | selects job(s), frequency, biggest pain, priority, outcome desired | BusinessNeed; unsupported-job guard | P0 |
| 04 | How Do You Work? | current channels (phone, WhatsApp, email, walk-in, social), tools (POS, spreadsheet, CRM, notebook), preferred text input; future voice/photo/video upload | WorkflowMap, DataSource, optional media processing | text P0; media pilot |
| 05 | Your People and Values | brand voice, what customers value, what must remain human; budget, setup time, technical comfort and accessibility | HumanBoundary, budget, consent | P0 |
| 06 | Confirm Business Snapshot | editable interpreted profile and uncertainties, all assumptions correctable | validated structured profile; optional OpenRouter parsing | P0 |
| 07 | AI/Data Readiness | what data exists, gaps, permissions, easiest readiness steps, no-tech-first alternative | deterministic readiness assessment | simple P0, expanded pilot |
| 08 | How We Discover | accessible discovery explanation; actual published source catalog and last checked date; admin-only discovery trace | search/source adapters, candidate review | P0 |
| 09 | Your Matches | up to three eligible choices, no-subscription option, fit reason/limits/cost and evidence badge | eligibility & deterministic rank | P0 |
| 10 | Compare and Verify | 2–3 consistent options, official sources, plan-specific claims, source freshness, separate risk | Tool/Plan/Claim/Evidence | P0 |
| 11 | Build Your Solution | existing-tools-first, one vetted tool, verified two-tool workflow with explicit human step/edge | SolutionRecipe and IntegrationEdge | one-tool P0; verified pair P1 |
| 12 | Seven-Day Trial | printable checklist, real CSV handoff, sample-data pilot, owner approval, cancellation path | AdoptionPlan, export | P0 |
| 13 | Did It Help? | baseline, setup effort, stress/time/customer/revenue outcomes, keep/change/stop | opt-in TrialFeedback | P1/pilot |
| 14 | My Business Hub | saved plan, status, subscriptions/renewals, guidance, content calendar and offline library | dashboard modules and PWA cache | minimal P0; fuller pilot |
| 15 | Community and Team | contextual peer stories, permissioned family/team workspace, advisor introductions | CommunityCase, TeamMembership, Roles | pilot/future |

**Seven P0 navigable destinations** (combine related screens while preserving data and user control):
- `/` Welcome
- `/onboarding` a multi-step wizard covering full screens 02–05, plus 06 review
- `/readiness` diagnosis (07)
- `/discover` discovery explanation and shortlist (08–09)
- `/compare` inspect up to three candidates, fit/evidence/risk (10)
- `/adoption` solution selection and actual trial/export (11–12)
- `/dashboard` simple guest-safe checklist and return path (14); optional feedback only if functioning
- `/admin/discovery` authenticated administrative review operation (not an owner screen)

The navigation must allow Back, edit assumptions, start over, error recovery and change-constraints re-ranking. Use URL state/local storage carefully and do not leak private information into URLs.

## 4. Functional requirements by subsystem

### 4.1 Onboarding and accessibility
- Structured fields always allow the core journey without an LLM, microphone or upload.
- Optional free-text description can be interpreted into structured proposed values; show editable confirmation; never accept unsupported model-inferred details as facts.
- Display controls: focus view (one core task), large text, increased spacing, reduced motion, readable default typography, visible progress, keyboard/screen-reader operation and explanatory text for first-time technology users.
- Read-aloud and speech input are P1/pilot only. Voice/photo/video onboarding requires opt-in, clear data-handling and redaction/consent safeguards. It is NOT required or presented as live for P0.

### 4.2 Business profile and human connection
- Capture job, tools, channel, data, time/budget limits, technical comfort, existing subscriptions, preferred brand tone and human no-go actions.
- “What makes us us”: people return because ___; we want to sound ___; a person must handle ___; the owner would use time saved for ___. These are functional inputs, not merely branding decoration.
- Human-boundary mismatches must exclude tools or modify the proposed recipe. No auto-sending customer messages; draft/approve remains with the business owner.

### 4.3 Data readiness and collection ladder
- Inventory what already exists: existing POS/CRM/email/calendar/WhatsApp, paper notebooks, CSV/Excel, bills/invoices, databases, staff calendars, manual logs, available structured fields, data owner, sensitivity and completeness.
- If existing data suffices, recommend reuse/export before new products. Next in preference: lightweight spreadsheet/form, safe CSV import/export, documented existing connectors, opt-in document extraction, then specialized hardware/sensors/cameras **only with justified use case, privacy assessment and cost**.
- Document intelligence, Copilot Studio, Microsoft Power Platform, camera/IoT data, advanced forecasting and richer analytics are future architecture options, not weekend integrations.

### 4.4 Discovery, catalog and evidence
- Use a seed catalog of 12–18 meticulously sourced tools if practical (quality beats count); ensure three supported jobs. Separate seed `sample/demo` from source-reviewed/published records.
- Real web search from an admin-only bounded adapter can find previously unseeded candidates. Candidate remains unpublished pending review. No unreviewed candidate in the recommended shortlist.
- Source categories: vendor official pricing/docs/policy, permitted licensed third-party reviews, independently documented tests, opt-in moderated case studies. Keep source permission, dates, applicability and URL on each claim. Do not rely on unauthorized scraping or assume access to Reddit/Trustpilot APIs. Preserve Trustpilot rating identity if displayed; never rebrand it as a universal trust probability.
- Claims: name, plan/tier, feature, region, price and billing basis, integration, accessibility, human-approval control, retention/privacy, trial/cancellation and limitation; all time-scoped and reviewable.
- Saved verified snapshot plus graceful unavailable provider states; never fake a live search to avoid failure.

### 4.5 Matching and explainable comparison
- Stage 1 hard gates: required task, verified price within a firm budget, mandatory system compatibility OR accepted manual handoff, required approval support, relevant privacy requirements, risk restrictions. Unknown critical claims => hold/Needs verification. A tool with a failed gate cannot be #1 regardless of reviews.
- Stage 2 deterministic fit only on eligible products: 30% job capability, 25% ease/accessibility, 20% existing-process fit, 15% total incremental cost, 10% human control/reversibility; grade each 0–4 with explanation.
- Stage 3 independent evidence coverage: official fact, policy/control documentation, task test, relevant independent experience, second independent source. Labels high/moderate/limited as defined in architecture. Record unsupported or conflicting claims.
- Stage 4 separate risk notes for privacy, billing, accessibility, manual effort, cancellations, incomplete evidence; cost breakdown can include monthly seats, usage, setup, connector and renewal terms; show missing amounts as unknown.
- Stage 5 solution choice includes use-current-systems/no AI, one tool, or a verified multi-tool recipe with tested handoffs.
- Tie/near-tie: explain tradeoffs and do not claim overly precise superiority. No referral-driven ranking.

### 4.6 Adoption and continued support
- Trial plan includes baseline, objective, tool/tier/cost assumptions, setup steps, fictional sample-data test, review point(s), known risks, one success metric and stop/exit steps (export, revoke, avoid renewal).
- Prove interoperability with one usable CSV export and test re-opening. Treat copy/paste/manual as valid when tested and labeled, not as a native integration.
- P1: opt-in keep/change/stop feedback and setup burdens; distinguish owner-reported from verified outcomes.
- Pilot: account/team management, human advisor handoff, guided assistant using evidence, subscription tracker, social content calendar, offline PWA reading of saved plans, community success/failure stories, moderated peer introductions.
- Future monetization: transparent subscription/advisor sponsorship; referrals only if clearly disclosed and completely isolated from rankings. UMD IP restrictions must be respected.

## 5. Visual/UX style guide

SABKA AI should feel like a premium but welcoming tool for nontechnical neighborhood-business owners. Strong information hierarchy, friendly plain language, practical examples, readable headings, spacious cards, icons as aids not substitutes for text, and a consistent progress indicator. Suggested base styling: deep navy/charcoal, warm off-white and restrained teal/accent. Maintain accessible contrast in light/dark if both implemented; prioritize a beautiful light theme over a broken theme toggle. Avoid overdone gradients, emoji overload, irrelevant stock photos, dashboard clutter, tiny tables or many onboarding questions on one screen.

Landing story: “Your business. Your people. The right AI.” Action labels should be specific (“Tell us about your business”, “Compare these tools”, “See why”, “Start a 7-day trial”). Do not call everything “Ask AI.” A complex subject should be taught in everyday business language. Keep fit, evidence confidence and risks visually distinct.

## 6. MVP demo examples

**Hero example:** A fictional home baker takes orders via WhatsApp and notebook, has $40/month additional budget, cannot spend much time on setup, and requires personal approval of every customer reply. They want fewer evening order-coordination tasks, not fully automated customer relationships. The product produces an editable snapshot, data-readiness step, vetted options, excludes tools that lack approval / exceed cap, and offers an owner-reviewable handoff checklist CSV and 7-day plan.

**Generalization example:** HVAC contractor receives appointment requests via phone/email, uses a spreadsheet, requires human confirmation before booking. Show same engine with different constraint set and recommendations. A landscaper might ask for fact-based social marketing with tone and approval preferences.

Use actual claims only when sourced and approved; otherwise demo fictional records are distinctly labeled and cannot masquerade as verified external products. Demonstrate a truly discovered candidate with timestamp and review state, not a pre-scripted fake claim of live discovery.

## 7. Success measures and build strategy

P0 is done when a first-time user can complete onboarding, understand one verified recommendation plus a limitation, see source evidence, get a usable trial plan and download a working CSV without registration. A judge can inspect a real new candidate discovery, constraint-driven rank changes, source provenance and code. Track the number of cases with no known hard-constraint violations; do not fabricate user-testing results.

The full feature set remains retained in the roadmap, not “dropped.” See `SABKA_AI_TASKS.md` for the explicit preserve/build distinction and release plan.
