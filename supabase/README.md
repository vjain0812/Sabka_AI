# Supabase setup

The guest journey and dated catalog fallback work without a database. Live catalog, authentication and discovery require Supabase.

## Migrations

Apply once, in order, in your project's SQL Editor or Supabase CLI workflow:

1. migrations/202611060001_business_foundation.sql
2. migrations/202611060002_verified_catalog.sql
3. migrations/202611080001_connect.sql (the Connect directory and messages)
4. migrations/202611090001_journey.sql (My AI Journey: saved tools, adoption status and feedback)
5. migrations/202611090002_journey_accounts.sql (owner sign-in: several businesses per account)

These additive migrations require Supabase auth.users, auth.uid(), anon, authenticated and service_role. Both were applied to the configured development project and exercised in embedded PostgreSQL tests. API keys cannot execute schema DDL. Future changes to an applied migration must use a new migration.

The foundation contains owner-only, consent-aware business tables. No cloud business-save UI is enabled. The catalog migration adds normalized published tools/sources/plans/claims, protected discovery runs/candidates, administrator membership, audit records and controlled RPCs. Anonymous users read only published records; ordinary authenticated users cannot review, publish or write catalog tables directly.

## Add your administrator

Create/confirm an email/password user in Supabase Authentication. In SQL Editor, replace the email below with that account:

    insert into public.catalog_admins(user_id, enabled)
    select id, true from auth.users where email = 'YOUR_ADMIN_EMAIL'
    on conflict(user_id) do update set enabled = true;

Sign in at /admin/discovery. The server checks both the Supabase session and catalog_admins on protected requests. A URL, frontend flag or caller-supplied ID grants no access. APP_ORIGIN must exactly match the browser origin. HttpOnly/SameSite Strict cookies are Secure on HTTPS and expire within an hour. Supabase managed Auth limits complement a per-process application login limit.

Revoke access using:

    update public.catalog_admins set enabled = false
    where user_id in (select id from auth.users where email = 'YOUR_ADMIN_EMAIL');

The temporary verifier is disabled and its membership revoked after testing. Its identifier remains for audit foreign keys; it is not a team login.

## Import researched references

Set SUPABASE_URL and operator-only SUPABASE_SECRET_KEY (or legacy service-role alias) in ignored .env.local:

    npm run catalog:check
    npm run catalog:import

Import validates twelve references and writes through a service-role-only RPC with audit entries. Re-import replaces those stable IDs; review before overwriting newer research. It creates no fake search runs or human reviewers. The configured database also contains Missive, discovered through the real pipeline; seed import does not remove it.

Runtime uses only the publishable key and authenticated session. Keep operator secrets out of browser bundles and deployment runtime when scripts are unnecessary. Configure backups, Auth settings and hosting limits before public release.

## Connect (business-to-business introductions)

`202611080001_connect.sql` adds `connect_profiles`, `connect_messages` and `connect_reports`. Row level security is enabled with **no policies**, so no role can read or write the tables directly; the app calls security-definer functions (`connect_list`, `connect_create_profile`, `connect_send`, …) that check a private key. Only the key's SHA-256 hash is stored. The public listing returns only fields the owner typed; no email or phone is collected. Deleting a profile cascades to its messages and reports.

The migration is exercised in `tests/connect-database.test.ts` against real PostgreSQL (PGlite): direct table access is denied to `anon`, keys are enforced, paused profiles can't be messaged, and rate limits and cascades work.

Until the migration is applied, the app uses a **local preview file** (`~/.cache/sabka-ai/connect-preview.json`, outside the project so the dev server doesn't reload on every write) in development only and shows a "Preview mode" notice. In production without the migration, Connect shows as unavailable rather than silently losing data. Apply the migration in the SQL Editor to switch it on; no code change is needed.

Reports are stored in `connect_reports`. There is no admin review screen yet; review them in the SQL Editor:

    select p.display_name, r.reason, r.created_at
    from public.connect_reports r join public.connect_profiles p on p.id = r.profile_id
    order by r.created_at desc;

## My AI Journey (saved tools, adoption and feedback)

`202611090001_journey.sql` adds `journeys`, `journey_goals`, `saved_tools`, `tool_adoptions` and `tool_feedback`. It follows the Connect model: owners have no account, a private key stays in their browser (only its SHA-256 hash is stored), row level security is on with **no policies**, and every read or write goes through key-checked security-definer functions (`journey_get`, `journey_save_tool`, `journey_set_status`, `journey_add_feedback`, …).

- A journey is created only after the owner consents on their first "Save this tool".
- Goals store the matching inputs the owner typed (business type, problem, limits, optional business name). Accessibility answers are never stored.
- Limits: 10 goals and 30 saved tools per journey, 50 feedback entries per tool.
- Feedback history is kept; the app reads the latest entry. Time saved is only ever self-reported.
- "Delete my journey" cascades to everything. Anyone holding the private link can open the journey, so the app tells owners to share it only with family or staff they trust.
- A "journey" is the accountless business workspace, so tables use `journey_id` where an account-based design would use `business_id`. If you later add Supabase Auth for owners, attach journeys to `business_profiles` with a new migration.

Tested against real PostgreSQL (PGlite) in `tests/journey-database.test.ts`. Until the migration is applied, development uses a local preview file (`~/.cache/sabka-ai/journey-preview.json`, override with `JOURNEY_DEV_STORE`) and shows "Preview mode"; production shows the journey as unavailable rather than losing data.

Owners who said a tool didn't work (status "Stopped" or "No, it didn't work for me") have it set aside in their next recommendations with the reason "You said this didn't work for you".

## Owner accounts (sign in / sign out)

`202611090002_journey_accounts.sql` adds `journeys.user_id` (Supabase Auth) so one account can hold up to 20 businesses, each its own journey. The journey functions accept either the private device key or the signed-in owner (`auth.uid()`); `account_journeys()` lists an owner's businesses and `journey_claim()` moves a journey started before sign-in into the account. Sessions are HttpOnly cookies (access token, plus a 30-day refresh token renewed on the server).

- Email confirmation: if "Confirm email" is on, Supabase's built-in mailer only delivers to project team addresses unless you configure custom SMTP. For demos, turn it off under Authentication → Sign In / Providers → Email; turn it back on (with SMTP) before real users.
- Add `<APP_ORIGIN>/account` to Authentication → URL Configuration → Redirect URLs so confirmation links return to the sign-in page.
- Tested in `tests/journey-accounts-database.test.ts` against PostgreSQL with stubbed `auth.uid()`.
