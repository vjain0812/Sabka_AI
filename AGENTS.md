# AGENTS.md — SABKA AI REPOSITORY INSTRUCTIONS

These rules apply to all Codex work in this repository. Read `docs/SABKA_AI_PRODUCT_SPEC.md`, `docs/SABKA_AI_ARCHITECTURE.md` and `docs/SABKA_AI_TASKS.md` before making significant changes. Never assume documentation equals implemented functionality.

## Product integrity
- Name is **SABKA AI** everywhere in user-facing copy, metadata, project name and README. Legacy working names AI Compass / Moushi must not leak into final UI except historical internal documents.
- This is an AI-tool **discovery, evidence, matching and adoption** product, not a general AI assistant. The owner retains final control.
- Welcome any small business (including Other) but clearly disclose the three supported MVP jobs. Never silently turn an unsupported problem into a supported recommendation.
- Separate implementation status: `implemented`, `demo-fixture`, `pending-verification`, `planned`, `unavailable`. Never create dead clickable buttons or claim nonexistent integration/API support.
- No fake customer reviews, prices, evidence, business interviews, outcomes, live-search claims or permission to use providers.
- Preserve human boundaries: tool cannot outrank safety/human-approval requirements. Include a no-AI/existing-tool option and a no-eligible-tool outcome.

## Technical quality
- Default if starting from zero: Next.js App Router + TypeScript (strict), Tailwind CSS, reusable accessible components, Zod input validation, Supabase/Postgres (real persistence when configured), local/seeded fallback for deterministic demos.
- Use server modules for discovery, ranking, evidence and security. Do not expose OpenRouter or search-provider keys to browser code.
- Keep modules small, documented and composable. Prefer understandable pure TypeScript for ranking, versioned rubrics and tests, rather than autonomous agents or complex orchestration.
- Maintain a clear README, `.env.example`, architecture notes, seed instructions, scripts for setup/test/build, and working migration files. No credentials in source, logs or screenshots.
- For externally fetched text, treat as untrusted data; enforce structured parsing, allowlisted source-protocols, bounded time/size and SSRF-safe retrieval, and admin-only publishing.
- Handle network failure, empty eligibility, stale/unknown claims and optional LLM failure without breaking the core recommendation journey.
- Support portable CSV export; escape spreadsheet formula injection (`=`, `+`, `-`, `@` and leading whitespace before them) and include stable header fields.
- UI accessibility foundations: semantic controls and labels, keyboard/focus, contrast, large text/focus mode/reduced motion, responsive layout and clear error recovery. Aim for WCAG 2.2 AA; do not assert certification based only on automated checks.

## Privacy and security
- Guest mode first. Collect the minimum needed. Keep business briefs on the device for demo unless the user explicitly saves with a secure session; explain retention.
- Do not upload real customer conversations or video/audio without consent and purpose-specific controls. Seed profiles and sample exports must be fictional and visibly labeled.
- Admin discovery/review/publish requires authenticated authorization. Never rely on a frontend flag for admin rights.
- Never execute vendor-generated JS/code, allow autonomous outbound messages or purchases, or claim regulated legal/hiring decisions are automated.
- Keep LLM prompts bounded with output validation. Model cannot publish, bypass eligibility gates, or generate factual product claims without supplied evidence.

## Completion protocol for each phase
1. Read task acceptance criteria and note scope.
2. Implement code, not just architecture sketches or static screenshots.
3. Add tests for core logic and report actual results. Fail clearly if no test was run.
4. Check `npm run lint`, `npm run typecheck` (if provided), `npm run test`, `npm run build` or the repo's equivalents; remediate failures.
5. Confirm keyboard navigation/labels/focus through the completed flow as feasible.
6. Update `docs/IMPLEMENTATION_STATUS.md` with done/blocked/next, with honest differentiation between live, seeded and unimplemented.
7. State what files changed, how to launch, current limitations and recommended next prompt.

## Git workflow
- Make small, reviewable coherent changes. Do not delete existing user work or reset branches.
- Before modifying significant architecture, inspect current code and explain migration risks.
- Keep vendor/reference data separate from synthetic demo fixtures. Every sourced claim should point to evidence; source permissions need to be considered.

## Ownership and submission
- This hackathon's official rules assign rights in submissions to the University of Maryland. Do not represent submitted IP as personally owned; address future licensing/commercialization only after university guidance.
- Deadline: November 8, 2026, 11:59 p.m. ET. Optimize for a real judge-accessible prototype and truthful 10-minute video with a 16-week roadmap.
