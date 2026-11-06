# SEND THIS MESSAGE TO CODEX FIRST — SABKA AI

You are my senior full-stack engineer and product-design partner. Build **SABKA AI**, a working, accessible, visually polished, evidence-based AI tool discovery and adoption platform for small businesses. This is a University of Maryland Smith School AI for Small Business Hackathon project. The initial submission deadline is **Sunday, November 8, 2026, at 11:59 p.m. ET**, including a public prototype and a 10-minute demo. Prioritize an honest, functional product over an elaborate mockup. Do not claim that a feature works unless it actually does.

## READ BEFORE CODING

Read these repo files completely and regard them as our source of truth:
- `AGENTS.md` — implementation rules and nonnegotiables.
- `docs/SABKA_AI_PRODUCT_SPEC.md` — brand, user journeys, feature coverage and phased scope.
- `docs/SABKA_AI_ARCHITECTURE.md` — services, trust/evidence pipeline, database, data contracts, matching logic and interfaces.
- `docs/SABKA_AI_TASKS.md` — prioritized implementation checkpoints and acceptance tests.
- `docs/SABKA_AI_DEMO_AND_QA.md` — demonstration scenarios, testing and submission criteria.

There are **two horizons**. P0 is what must run now; P1 and 16-week features are future designs, never fake working features. Every important feature from the broader product vision is in the docs, but do not implement the future features at the expense of shipping P0.

## TECHNICAL DECISION

First inspect the existing repo; do not destroy functioning code. If the repo is empty, scaffold **Next.js (App Router) + TypeScript + Tailwind CSS + accessible UI components**, with PostgreSQL/Supabase as the production data store. Keep matching and eligibility deterministic and server-side. Create a modular server layer so a Python/FastAPI service can be added later if useful; do not introduce an extra service just for appearances. For local development and demo resilience, support an explicit seeded catalog and a clear configuration/error state when Supabase, OpenRouter or web-search credentials are absent.

Optional LLM: OpenRouter, called only from the server for structured interpretation or readable explanations, with a deterministic fallback. Web discovery: a real search-provider adapter with bounded admin-only execution, evidence capture, dedupe and pending-review status; no fabricated live results. Never assume the $25 OpenRouter credit pays for search. Protect secrets, rates and cost.

## PRODUCT REQUIREMENTS

Brand **SABKA AI**. Promise: “The right AI for your business. More time for what matters.” Friendly, credible, inclusive, modern and accessible; not a cartoon chatbot or a crowded directory. Our distinctive value: not generating generic top-five recommendations but **discovering candidate solutions, storing claim-level evidence, applying transparent constraints, comparing tradeoffs, mapping readiness, and helping owners run a safe, reversible first trial**. It can recommend existing/non-AI solutions, one AI product, a verified pair of tools, or no adoption yet.

P0 owner journey:
1. Welcome: start as guest, try clearly labeled demo, accessibility preferences.
2. Understand my business: business category (Maryland examples plus Other), owner/manager/staff role, task/problem, existing systems/channels, budget/setup time/technical comfort, human boundaries/brand values. Structured inputs plus optional text; edited/confirmed brief.
3. Business snapshot and readiness: show what we understood, editable needs and existing data sources/gaps.
4. Discover: up to three real, published, reviewed tool matches with evidence freshness; demonstrate genuinely discovering at least one previously unseeded tool into an admin review queue.
5. Compare: source-backed criteria, actual prices or explicit unknown, integration route, benefit/tradeoff, hard-constraint rejection and separate fit/evidence/risk.
6. Solution and adoption: existing-tools-first / one-tool / (P1 only) verified two-tool recipe; real printable seven-day trial plan, safe sample test, human checkpoints, cost assumptions, exit/reversal, and a real sanitized CSV export.
7. Dashboard: see saved plan/checklist; optional P1 trial feedback. A future-features roadmap may be displayed as clearly labeled noninteractive content, never dead buttons.

Three initially supported **jobs**, across any business category: (a) owner-approved draft replies/follow-ups, (b) fact-based marketing content planning, (c) appointment/request organization with human confirmation. For other jobs, acknowledge coverage limits and offer exploratory discovery or a no-tool recommendation. Example businesses: home baker using WhatsApp/notebook, HVAC contractor, landscaping business. Additional examples: café, salon, retail, laundromat, farmers, tailoring, independent instructors and creators. Do not hardcode results by business type.

Match engine policy: hard gates before rank; unknown critical claims => Needs verification, not assumed eligible. Eligible-only weighted score 0–100: job capability 30, ease/accessibility 25, existing-system compatibility 20, total incremental cost 15, human approval/reversibility 10; grades 0–4 with documented reasons. Evidence coverage is SEPARATE (official facts, policy/control docs, internal task test, relevant independent experience, second origin). Risk is SEPARATE. A high marketing or review rating cannot override a failed gate. Show rejected candidates with reasons.

Source claims require: product, plan/tier/region, claim/value, source URL/type, checked and expiration dates, review status and permission basis. Review-derived themes only where licensed/permitted; do not scrape Reddit/Trustpilot or fabricate reviews/ratings. Admin must approve newly found candidates before publication. Provide saved-catalog fallback when providers are unavailable.

Include focus view, large-text/spacing, reduced motion, semantic headings, keyboard operability and useful error/loading/empty states. Do not infer age/disability from any media. No autonomous messaging, purchasing, account linking or access to private customer data. No invented integrations; manual/CSV handoffs are valid only when tested. Admin routes need authentication.

## YOUR IMMEDIATE EXECUTION TASK

Do not spend the whole run in planning mode. Do the following in the repository:
1. Inspect the files and summarize what already exists, if anything, in under 12 bullets.
2. Define the exact P0 implementation order with dependencies and choose sensible, minimal architecture decisions. Create/update `docs/IMPLEMENTATION_STATUS.md` with P0/P1/future checkboxes.
3. Implement **Phase 1** completely: project bootstrap if needed; coherent visual design system and navigation; landing page; guest/demo entry; accessible structured onboarding; editable business brief; initial business snapshot and readiness; and robust local demo fixtures labeled as fictional. Build usable responsive pages with real state, validation, save/back behavior and a no-login journey.
4. Create typed domain schemas, stub the matching/discovery interfaces without misleading data, and seed/setup infrastructure for the next phase. Show meaningful user-visible empty/loading/error states.
5. Run lint, typecheck and available tests; fix failures. Start the app if supported and visually inspect core pages if your environment allows. Document any limitation.
6. Report files changed, what is actually functional, how to run locally, environment variables needed, test outputs and the **exact next Codex prompt** to continue into Phase 2.

Important: take action, write code, and run tests. Ask only if a missing credential or truly blocking decision makes progress impossible; otherwise use documented, reversible defaults. Never silently invent external evidence or claim a stub is real. Never prioritize P1 at the expense of P0.
