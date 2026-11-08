# SABKA AI

**The right AI for your business. More time for what matters.**

SABKA AI is an independent, evidence-backed AI adoption navigator for small businesses. It is not another chatbot or a plain tool directory. An owner describes a real business problem, and SABKA AI shows suitable AI and non-AI options for their budget, comfort level, and the parts of the work that must stay human. Every option shows where its facts came from and when they were last checked.

> _Sabka_ means "everyone's" in Hindi. The goal is AI help for every small business, with no technical background needed.

---

## Table of contents

- [Features](#features)
- [Design principles](#design-principles)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Database setup (Supabase)](#database-setup-supabase)
- [Scripts](#scripts)
- [Testing](#testing)
- [Deployment](#deployment)
- [Project structure](#project-structure)
- [Security and privacy](#security-and-privacy)
- [Contributing](#contributing)

---

## Features

| Area | What it does |
| --- | --- |
| **Guest onboarding** | Start with no account. Describe the business, its hardest tasks, current tools, budget, and what must stay human. A sample business is available. |
| **Readiness check** | Rules-based review of what data and tools the owner already has, the gaps, and the easiest first steps, including a "no new tech first" option. |
| **Discover and recommend** | A shortlist of eligible tools with visible fit reasons, limits, and costs. Ranking is deterministic and reproducible. An optional LLM re-ranker can run on top and falls back to rules if it is unavailable. |
| **Tool library** | A researched catalog of AI tools with plan-level pricing, source links, freshness dates, accessibility notes, and a separate risk view. |
| **Compare and verify** | Side-by-side comparison of 2-3 options, with each claim tied to an official source. |
| **Workflows** | Scenario-based workflows that combine tools into practical, human-approved flows. |
| **Tool assistant** | Grounded Q&A about a single tool. The model sees only that tool's sourced facts and any price it states must already be in them. If the model fails, a rules-based answer is returned. |
| **Adoption plans** | A 7-day trial plan, a printable checklist, and CSV export, so the owner can start small and reversibly. |
| **My AI Journey** | Opt-in tracking of saved tools, adoption status, and self-reported feedback. It works without an account (keyed to a private key on the owner's device) or with sign-in for several businesses. |
| **Connect** | An opt-in directory where businesses can share what worked. Public cards show only what the owner types, and no contact details are public. |
| **Admin discovery (API)** | Admin-only API pipeline (`/api/admin/*`) that runs permitted web searches, extracts candidates with a model, and queues them for human review. Nothing is published without approval. |
| **Accessibility and language** | English and Spanish, a display menu, text-to-speech and speech helpers, and an accessibility test suite. |

## Design principles

1. **Evidence over claims.** Prices, features, and risks link to a source and a checked date. Nothing is invented.
2. **Humans stay in control.** Customer-facing actions need owner approval. Unsupported jobs never get fabricated recommendations.
3. **Works without credentials.** Guest onboarding and the dated research snapshot need no database or API keys.
4. **Privacy by default.** No accounts required, no public contact details, and opt-in consent for anything stored.
5. **Honest about live vs. replayed data.** Seeded or replayed results are never labeled as live discovery.

## Tech stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router) with React 19 and TypeScript
- **Styling:** Tailwind CSS 4, with custom CSS for accessibility and brand
- **Database and auth:** [Supabase](https://supabase.com/) (Postgres, Row Level Security, Auth)
- **Validation:** Zod 4
- **AI providers (optional):** Groq or OpenRouter for extraction, re-ranking, and the assistant; Tavily or Brave Search for discovery
- **Testing:** Vitest (unit and embedded-Postgres database tests via PGlite), Playwright with axe-core (end-to-end and accessibility)
- **Tooling:** ESLint, Prettier, tsx
- **Runtime:** Node.js 22.14 or later

## Architecture

```
Browser (React 19, guest session + opt-in journey key)
        |
Next.js App Router
  |- Pages: /, /onboarding, /readiness, /discover, /compare, /tools, /workflows,
  |         /recommendations, /dashboard (My AI Journey), /connect, /hub, /account
  |- API routes (src/app/api): assistant, recommend, recommendations, matches,
  |         tools, journey, connect, account, admin
  |
  |- src/lib/domain   Pure logic: schemas, readiness, scenarios, i18n, tool metrics
  |- src/lib/server   Server-only: Supabase access, ranking, search, extraction,
  |                   rate limiting, auth, discovery pipeline
  |
Supabase (Postgres + RLS)  <-  migrations in supabase/migrations
External providers (optional): Tavily/Brave, Groq/OpenRouter
```

Key points:

- Domain code in `src/lib/domain` has no server dependencies and is shared with the client.
- Server modules import `server-only`, so they cannot leak into client bundles. `npm run secrets:check` also scans for leaked secrets.
- The recommender ranks with deterministic rules first. The AI layer is optional, capped by `RECOMMENDER_AI_DAILY_LIMIT`, and always falls back to the rules.
- The catalog falls back to a dated research snapshot (`docs/research`, `src/lib/server/researched-catalog.ts`) when Supabase is not configured.
- Rate limits use an in-memory limiter per server instance, backed by caps in the database.

## Getting started

### Prerequisites

- Node.js **22.14 or later** and npm
- (Optional) a free [Supabase](https://supabase.com/) project for the live catalog, accounts, Journey, and Connect
- (Optional) API keys for Groq/OpenRouter and Tavily/Brave

### Run locally

```bash
git clone https://github.com/vjain0812/Sabka_AI.git
cd Sabka_AI
npm ci
cp .env.example .env.local   # then edit .env.local
npm run dev
```

Open <http://localhost:3000>. With no credentials the app runs in guest mode against the dated research snapshot. To check your setup:

```bash
npm run seed:check       # validates the bundled fixtures
npm run services:check   # checks Supabase, Groq, and Tavily configuration
```

## Environment variables

Copy `.env.example` to `.env.local`. Never commit `.env.local`. It is git-ignored.

| Variable | Required | Purpose |
| --- | --- | --- |
| `APP_ORIGIN` | Yes, in production | Exact public origin of the app, for example `https://your-app.vercel.app` (no trailing slash). POST requests from any other origin are rejected. |
| `SUPABASE_URL` | For live data | Supabase project URL. |
| `SUPABASE_PUBLISHABLE_KEY` | For live data | Supabase publishable (anon) key. |
| `SUPABASE_SECRET_KEY` | Operator scripts only | Used by `catalog:import` and verification scripts. **Never set on the hosting platform.** |
| `TAVILY_API_KEY` / `BRAVE_SEARCH_API_KEY` | Optional | Web search for admin discovery. |
| `GROQ_API_KEY`, `GROQ_MODEL` | Optional | Extraction, assistant, and ranking. |
| `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` | Optional | Alternative provider (needs an explicit model). |
| `OPENROUTER_RANKING_MODEL`, `GROQ_RANKING_MODEL` | Optional | Models for recommendation re-ranking. |
| `RECOMMENDER_AI_DAILY_LIMIT` | Optional | Per-server daily cap on model calls (default 2000). Extra requests use rules only. |
| `CONNECT_DEV_STORE`, `JOURNEY_DEV_STORE` | Dev only | Local JSON file stores used before migrations are applied. Ignored in production. |

Variables are never prefixed with `NEXT_PUBLIC_`; secrets must stay server-side.

## Database setup (Supabase)

The guest journey and dated catalog fallback work without a database. For live data:

1. Create a Supabase project.
2. In the SQL Editor, run the files in `supabase/migrations/` **in filename order**:
   1. `202611060001_business_foundation.sql`
   2. `202611060002_verified_catalog.sql`
   3. `202611080001_connect.sql`
   4. `202611090001_journey.sql`
   5. `202611090002_journey_accounts.sql`
3. `supabase/seed.sql` is intentionally empty. Guest data is never seeded into a cloud database.
4. To use the admin discovery API, create an email/password user in Supabase Auth and add them to `catalog_admins`. See [`supabase/README.md`](supabase/README.md) for the exact SQL.
5. Load the researched catalog from your machine:

   ```bash
   npm run catalog:check    # dry run
   npm run catalog:import   # applies (needs SUPABASE_SECRET_KEY in .env.local)
   ```

Changes to an applied migration must go in a new migration file.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check (`tsc --noEmit`) |
| `npm run format` / `format:check` | Prettier write / check |
| `npm test` / `test:watch` | Vitest unit and database tests |
| `npm run test:e2e` | Playwright end-to-end and accessibility tests |
| `npm run seed:check` | Validate bundled fixtures |
| `npm run catalog:check` / `catalog:import` | Dry-run / apply the researched catalog to Supabase |
| `npm run services:check` | Check Supabase, Groq, and Tavily configuration |
| `npm run secrets:check` | Scan for secrets exposed to the client |
| `npm run logos:fetch` | Fetch tool logos |

## Testing

```bash
npm run typecheck
npm run lint
npm test            # Vitest: domain, recommender, assistant, journey, connect, catalog,
                    # plus database tests against embedded Postgres (PGlite)
npm run test:e2e    # Playwright: simple flow, catalog, workflows, journey, connect,
                    # template, and axe accessibility checks
```

Playwright starts the dev server automatically. Set `PW_EXTERNAL_SERVER=1` and `PW_BASE_URL` to test an already-running server.

## Deployment

SABKA AI is a full server-side Next.js app (API routes, server-only code, and a long-running admin route), so it needs a Node host rather than static hosting. [Vercel](https://vercel.com/) works well:

1. Push the repo to GitHub and import it in Vercel (framework preset: Next.js).
2. Add `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `APP_ORIGIN` (your live URL), and any optional provider keys in **Settings > Environment Variables**.
3. Do **not** add `SUPABASE_SECRET_KEY` or the `*_DEV_STORE` variables.
4. Deploy, then set `APP_ORIGIN` to the final URL and redeploy.
5. Run `npm run catalog:import` locally to populate the catalog.

Other Node hosts such as Render, Netlify, Fly.io, and Railway also work. Before deploying, run `npm run build`, `npm run typecheck`, and `npm run secrets:check`.

> The admin route sets `maxDuration = 180`. If your hosting plan caps function duration lower, reduce this value or run discovery from a local operator script.

## Project structure

```
src/
  app/                 Next.js routes and API handlers
    api/               assistant, recommend, matches, tools, journey, connect, account, admin
    tools/ workflows/  Library and scenario pages
    dashboard/ hub/    My AI Journey and business hub
    connect/           Opt-in community directory
  components/          UI, grouped by feature (journey, connect, accessibility, site, metrics)
  lib/
    domain/            Shared schemas, readiness, scenarios, i18n (en/es), tool data
    server/            Server-only: Supabase, ranking, search, extraction, auth, rate limiting
    client/            Browser helpers: language, display, speech, workspace
    fixtures/          Fictional example businesses
scripts/               Catalog import, service checks, secret scan, logo fetch, verification
supabase/              Migrations and Supabase setup guide
docs/research/         Dated research snapshots: pricing, workflows, tool expansions
tests/                 Vitest suites and Playwright e2e specs
public/                Brand assets, tool logos, templates
```

## Security and privacy

- **No secrets in the browser.** Server modules are `server-only`, env vars are never `NEXT_PUBLIC_`, and `npm run secrets:check` scans for leaks.
- **Same-origin enforcement** on state-changing requests via `APP_ORIGIN`.
- **Row Level Security** on all tables. Anonymous users read only published records, and ordinary users cannot write catalog tables.
- **Admin access** requires a valid Supabase session and an enabled row in `catalog_admins`. Admin cookies are HttpOnly and SameSite=Strict, and expire within an hour.
- **Private keys stay on the device.** Journey and Connect ownership is proven by a random key whose hash is the only thing stored.
- **Human review gate.** Discovered candidates are queued and never published automatically.
- **No fabricated evidence.** Pricing and claims come from reviewed sources with checked dates. Self-reported usage is labeled as such.

To report a vulnerability, please open a private security advisory on GitHub instead of a public issue.

## Contributing

1. Fork the repo and create a feature branch.
2. Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run format:check` before opening a PR.
3. Follow `AGENTS.md`. Note that this project uses Next.js 16, which has breaking changes from earlier versions. Check `node_modules/next/dist/docs/` before changing framework-level code.
4. Never commit secrets or invent vendor data. Add sourced entries through the reviewed catalog import.

---

Built for small businesses everywhere. AI should help you be more human.
