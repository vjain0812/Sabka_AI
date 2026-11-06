# SABKA AI — DEMO, QA, RESEARCH AND OFFICIAL HACKATHON REQUIREMENTS

## Competition obligations (from supplied AISB challenge PDF)

- Build an AI-solution discovery, comparison **and adoption** platform for small, nontechnical business owners.
- Ten-minute video: working MVP, how it was built, how it would be completed over 16 weeks, and technical/business evidence.
- Publicly accessible prototype judges can open and test.
- Initial submission: **Sunday, November 8, 2026, 11:59 p.m.** Finalists notified November 16; invited finalist presentation November 17. Team size 2–3.
- Rubric: research 10/50; MVP small-business fit 10, architecture/scalability 10, UX 10; demonstration/presentation 10.
- Official terms assign intellectual property interests in submissions to University of Maryland. Do not claim personal ownership of submitted IP.

## Testable hero demonstration: fictional home baker

Input: home bakery; WhatsApp + notebook; many customer follow-ups; max $40 additional monthly spend; beginner technical comfort; owner approves every outgoing customer reply; values personal customer relationships; wants fewer evenings spent organizing orders.

Expected visible outputs:
1. Guest entry, normal / focus / large-text selection.
2. Reviewable business brief accurately reflecting stated facts; edit budget from $40 to another amount and re-evaluate.
3. Readiness: reuse existing order/message information and introduce a simple structured checklist before advanced AI, if warranted.
4. Catalog: show actual approved sources with plan/tier and checked date; absence of independent reviews labeled honestly.
5. Hard-gate demo: an otherwise appealing tool cannot qualify if approval mechanism is missing/unverified or costs more than the cap. Explain the rejection.
6. Up to three qualified comparisons; if none is eligible, show no-match and no-subscription guidance.
7. Seven-day plan with manual or verified handoff, sample data, budget, success measure, owner review and stop path.
8. Download a CSV template/checklist and reopen it correctly in a spreadsheet; do not claim WhatsApp or vendor API integration unless actually verified/implemented.
9. Show one actual previously unseeded candidate discovered via search, with source and review queue; candidate not included in public recommendations before approval.

**Second scenario:** HVAC contractor with phone/email booking requests, an existing spreadsheet and mandatory approval before confirmations. The same generic engine should behave differently through changed inputs; not a custom hardcoded page.

**Third scenario for breadth if needed:** landscaping company needing owner-fact-based marketing copy planning, practical cost limits and tone preferences.

## Ten-minute judge video outline

| Time | Content | What must be real or explicitly labeled |
|---|---|---|
| 0:00–0:45 | Owner problem and human-first SABKA AI promise | Business example fictional unless genuine consented interview exists |
| 0:45–1:30 | Research and product decision | Real research method/count or clearly stated hypothesis |
| 1:30–3:45 | Working intake, editable profile, readiness | Live functioning app, no fake form buttons |
| 3:45–5:15 | Discovery/evidence and ranking | Actual source links, real prior or live discovery state correctly labeled, one rejected tool |
| 5:15–6:20 | Compare, human control, no-AI option | Constraint logic and caveat visible |
| 6:20–7:10 | Practical plan and CSV handoff | Download/export works |
| 7:10–8:00 | Technical evidence and architecture | Data models, backend code, matcher tests, outage handling |
| 8:00–8:45 | Second business / accessibility | Same engine generalizes; keyboard/focus shown |
| 8:45–9:40 | 16-week roadmap and potential impact | Proposed future abilities, clearly not already built |
| 9:40–10:00 | Team contributions and close | Real team work, judge link |

## Four-point technology credibility test

1. **Discovery is genuinely external:** source API/request, query, candidate and review decision are inspectable. A replay is labeled replay, not live.
2. **Matching isn't generic prompting:** a deterministic gate blocks a poor fit, with transparent reason and unit test.
3. **Evidence is attributable:** official documents used for product claims; permitted reviews treated as subjective experiences; unknowns not made up.
4. **Adoption actually does something:** an exportable, user-specific plan/CSV exists, with human checkpoints and cancellation path.

## UX/accessibility checks

Keyboard only: start guest, select category/job, edit brief, see readiness, compare, open evidence, select solution, download/export, return home. Focus stays visible, modals/dialogs work, headings meaningful, screen reader announces important status and errors, controls are labeled. Test one small-screen viewport, large text, focus view and reduced motion; avoid horizontal scrolling tables. Contrast and target sizes should aim at WCAG 2.2 AA applicable criteria. Document manual and automated checks without claiming broad certification.

## Security and provider failure checks

Unknown price != free, absent integration != working, vendor marketing != verified quality, provider outage != no tool data. Tests include server secrets absent from bundle, protected admin routes, guest session separation, broken source link/expired claim, stale catalog label, unsupported job, an empty result, LLM down, search down, tool candidate awaiting review and malicious CSV formula inputs.

## Research and metrics

Ask real small-business owners what repetitive task is painful, how work is done now, what they have tried, non-negotiable restrictions, adoption time/money and what they need before trusting evidence. If conducting sessions, log anonymized observations and how a product decision changed. Comparative evaluation against basic web search or a chat assistant can document concrete limitations and pros/cons; do not claim universal superiority from tiny samples.

Measure informed decision completion (includes keep/change/stop), owner explanation of one fit and one limitation, hard-gate violations, missing claims, keyboard blockers, user-reported setup effort, task time, owner stress and recurring cost. Report proposed targets separately from actual test results.

## Sixteen-week roadmap (all future unless explicitly implemented)

- Weeks 1–2: 12–15 owner interviews across >=4 businesses, formalize priority jobs and authorized review-source access.
- Weeks 3–4: 30–40 approved tool/plan records, catalog governance, identity dedupe, source expiry/review processes.
- Weeks 5–6: accessibility sessions, scoring calibration and personalized interfaces for different business users.
- Weeks 7–8: 2–3 verified multi-tool/manual integration recipes, expanded data readiness and human approval routes.
- Weeks 9–10: guided ~20-business pilot measuring trial starts, abandonment and outcomes.
- Weeks 11–12: permissioned customer experience/peer stories, optional voice/document/image trials, moderated feedback.
- Weeks 13–14: subscriptions, community/team workflow exploration, security, permissions, capacity and pricing/cost review; selected business connectors and Copilot/Document Intelligence feasibility.
- Weeks 15–16: accessible scalable beta, publish honest pilot learnings, decide which categories and hardware/sensors proposals have proven value.

## Release checklist

- [ ] Responsive real UI, no account needed for judge path.
- [ ] All product claims either sourced/dated or marked unknown; review-platform access handled legally.
- [ ] One real discovery example, secure admin reviewer, published-only recommendations.
- [ ] Hard-gate exclusion and rank-change demo.
- [ ] Data-readiness/no-AI branch.
- [ ] Seven-day plan and spreadsheet-safe export.
- [ ] Demo site loads in an unrelated browser/incognito session.
- [ ] Scripts/test evidence recorded, no API keys in repo or frontend.
- [ ] 10-minute video clear/captioned, accurate about implemented/future work, contributions and roadmap.
