# SABKA AI — CODEX HANDOFF PACKET

This folder is ready to copy into a new or existing SABKA AI GitHub repository. It is a full engineering brief plus five sequential build stages—not a claim that the application already exists.

## Recommended workflow

1. Create a repository called `sabka-ai` (or open your existing repo).
2. Copy the **contents** of this starter folder to the repo root. Keep `AGENTS.md` at the root and `docs/` beside it. Commit these documents.
3. Open the repo in Codex. Copy and paste the entire contents of `CODEX_START_HERE.md` as your **first Codex request**. (Or tell Codex to read that file and execute it.)
4. When Codex finishes Phase 1, run the app, inspect the screens, and verify the tests. Fix failures before moving ahead.
5. Then use the SECOND, THIRD, FOURTH and FIFTH messages in `docs/SABKA_AI_TASKS.md`, **one at a time**. Request code changes and tests each phase, not merely a design explanation.
6. Add API keys only to your local/deployment environment, using the `.env.example` Codex creates. Never paste secrets into chat, commit them, or include them in demo videos.
7. Ask Codex to keep `docs/IMPLEMENTATION_STATUS.md` current so the team knows what is truly working.

## Files in this packet

- `CODEX_START_HERE.md` — **FIRST MESSAGE TO PASTE**; includes immediate Phase 1 assignment.
- `AGENTS.md` — repo-wide, persistent coding/safety/quality rules for Codex.
- `docs/SABKA_AI_PRODUCT_SPEC.md` — full human-first vision and 15-screen journey, seven-screen P0, future features.
- `docs/SABKA_AI_ARCHITECTURE.md` — Mermaid architecture diagrams, schema, API outlines, ranking formula, discovery workflow, constraints, security.
- `docs/SABKA_AI_TASKS.md` — phase acceptance criteria and four ready-to-paste follow-up prompts.
- `docs/SABKA_AI_DEMO_AND_QA.md` — home-baker and HVAC test stories, 10-minute judge video, QA and 16-week roadmap.

## P0 success in one sentence

An owner can enter as a guest, tell SABKA AI about a real business problem, inspect vetted AI and non-AI options for their exact budget and human approval needs, see where facts came from, choose a solution, and take the first reversible step via an actual trial plan and CSV export.

**Actual discovery is essential:** at least one candidate must be discovered through a permitted external search and placed in an approval queue. The platform must work gracefully when web search/model keys are unavailable; do not label a seeded or replayed result as live.

**Important**: Product data must be researched and reviewed by the team. Codex should not fabricate product prices, reviews, compatibility, successful deployments or completed interviews.

**Official deadline**: Sunday, November 8, 2026 at 11:59 p.m. ET. The video is 10 minutes and must include the 16-week approach. Submitted hackathon IP belongs to University of Maryland under the supplied official rules.
