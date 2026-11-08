/** Operator-only integration check. Run against a local server with matching APP_ORIGIN.
 * Credentials are confined to an ignored .local file and removed by --cleanup.
 * --start spends at most one bounded discovery run. --publish requires a separately
 * source-inspected .local/reviewed-candidate.json; it never approves model output itself.
 */
import { createClient } from '@supabase/supabase-js';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';

const base = process.env.VERIFY_ORIGIN || 'http://127.0.0.1:3100';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname))
  throw new Error('Verification requires a local server.');
const statePath = resolve('.local/live-verification.json');
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!secret || !process.env.SUPABASE_URL)
  throw new Error('Operator database configuration missing.');
const db = createClient(process.env.SUPABASE_URL, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});
type State = { userId: string; cookie: string; runId?: string };
const save = async (state: State) => {
  await mkdir('.local', { recursive: true });
  await writeFile(statePath, JSON.stringify(state), { mode: 0o600 });
};
const read = async (): Promise<State> => JSON.parse(await readFile(statePath, 'utf8'));
async function api(path: string, data?: unknown, cookie = '') {
  const response = await fetch(`${base}/api/${path}`, {
    method: data === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', Origin: base, Cookie: cookie },
    body: data === undefined ? undefined : JSON.stringify(data),
    signal: AbortSignal.timeout(30000),
  });
  const body = await response.json();
  if (!response.ok)
    throw new Error(`Application request failed (${response.status}): ${body.error || path}`);
  return { body, cookie: response.headers.get('set-cookie')?.split(';')[0] || '' };
}
async function main() {
  const mode = process.argv[2];
  if (mode === '--start') {
    try {
      await readFile(statePath);
      throw new Error('Existing verification state: resume or clean up first.');
    } catch (e) {
      if (!(e instanceof Error) || !('code' in e) || e.code !== 'ENOENT') throw e;
    }
    const email = `sabka-verification-${randomUUID()}@example.invalid`;
    const password = randomBytes(32).toString('base64url');
    const { data, error } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { purpose: 'Temporary SABKA AI integration verification' },
    });
    if (error || !data.user) throw new Error('Could not create temporary verification account.');
    const state: State = { userId: data.user.id, cookie: '' };
    await save(state);
    const membership = await db
      .from('catalog_admins')
      .insert({ user_id: state.userId, enabled: true });
    if (membership.error) throw new Error('Could not grant temporary verification membership.');
    const login = await api('admin/login', { email, password });
    state.cookie = login.cookie;
    await save(state);
    const input = {
      idempotencyKey: randomUUID(),
      job: 'customer_reply_drafting',
      problem: 'Research an email drafting tool with a person reviewing outgoing replies.',
      requirement: 'site:missiveapp.com AI email drafts',
      monthlyBudgetUsd: 40,
      permissionsConfirmed: true,
    };
    const first = await api('admin/discovery-runs', input, state.cookie);
    state.runId = first.body.run.id;
    await save(state);
    const repeat = await api('admin/discovery-runs', input, state.cookie);
    if (repeat.body.run.id !== state.runId) throw new Error('Idempotency failed.');
    console.log(
      JSON.stringify({
        runId: state.runId,
        status: first.body.run.status,
        idempotency: 'same run returned',
      }),
    );
  } else if (mode === '--refresh') {
    const state = await read();
    const password = randomBytes(32).toString('base64url');
    const { data, error } = await db.auth.admin.updateUserById(state.userId, { password });
    if (error || !data.user.email)
      throw new Error('Could not refresh temporary verification login.');
    state.cookie = (await api('admin/login', { email: data.user.email, password })).cookie;
    await save(state);
    console.log('Temporary verification session refreshed. No discovery run started.');
  } else if (mode === '--inspect') {
    const state = await read();
    const { body } = await api('admin/candidates', undefined, state.cookie);
    const run = body.runs.find((r: { id: string }) => r.id === state.runId);
    const candidates = body.candidates.filter((c: { runId: string }) => c.runId === state.runId);
    await writeFile(
      resolve('.local/discovery-review.json'),
      JSON.stringify({ run, candidates }, null, 2),
    );
    console.log(
      JSON.stringify(
        {
          run,
          candidates: candidates.map(
            (c: {
              id: string;
              status: string;
              record: { tool: { name: string }; sources: unknown; review: unknown };
            }) => ({
              id: c.id,
              status: c.status,
              name: c.record.tool.name,
              sources: c.record.sources,
              review: c.record.review,
            }),
          ),
        },
        null,
        2,
      ),
    );
  } else if (mode === '--publish') {
    const state = await read();
    const review = JSON.parse(await readFile(resolve('.local/reviewed-candidate.json'), 'utf8'));
    const before = await api(`tools/${review.record.tool.slug}/evidence`).catch(() => null);
    if (before) throw new Error('Candidate was already public before verification.');
    const verified = await api(
      `admin/candidates/${review.id}/review`,
      {
        action: 'verify',
        expectedVersion: review.version,
        inspectedSources: true,
        note: review.note,
        record: review.record,
      },
      state.cookie,
    );
    const published = await api(
      `admin/candidates/${review.id}/review`,
      {
        action: 'publish',
        expectedVersion: verified.body.candidate.version,
        inspectedSources: true,
        note: review.note,
      },
      state.cookie,
    );
    const publicResult = await api(`tools/${review.record.tool.slug}/evidence`);
    const { data: audit, error } = await db
      .from('catalog_audit_events')
      .select('action,created_at,note')
      .eq('candidate_id', review.id)
      .order('created_at');
    if (error) throw new Error('Audit inspection failed.');
    const proof = {
      checkedAt: new Date().toISOString(),
      runId: state.runId,
      candidateId: review.id,
      tool: review.record.tool.name,
      slug: review.record.tool.slug,
      status: published.body.candidate.status,
      publicHttp: publicResult ? 200 : null,
      sourceUrls: review.record.sources.map((s: { url: string }) => s.url),
      audit,
    };
    await writeFile(
      resolve('docs/research/phase2-live-proof.json'),
      JSON.stringify(proof, null, 2) + '\n',
    );
    console.log(JSON.stringify(proof, null, 2));
  } else if (mode === '--hold-metadata') {
    const state = await read();
    const { body } = await api('admin/candidates', undefined, state.cookie);
    let count = 0;
    for (const candidate of body.candidates) {
      if (
        candidate.runId !== state.runId ||
        candidate.status !== 'pending_review' ||
        !candidate.record.review.notes.startsWith('deterministic metadata')
      )
        continue;
      await api(
        `admin/candidates/${candidate.id}/review`,
        {
          action: 'hold',
          expectedVersion: candidate.version,
          inspectedSources: true,
          note: 'Source inspection: vendor blog/category page is not a distinct product. Retain historical discovery provenance; related product Missive has its own reviewed record.',
        },
        state.cookie,
      );
      count++;
    }
    console.log(`Held ${count} metadata pages; no published tool changed.`);
  } else if (mode === '--cleanup') {
    const state = await read();
    const membership = await db
      .from('catalog_admins')
      .update({ enabled: false })
      .eq('user_id', state.userId);
    if (membership.error) throw new Error('Could not revoke temporary administrator.');
    const ban = await db.auth.admin.updateUserById(state.userId, { ban_duration: '876000h' });
    if (ban.error) throw new Error('Could not disable temporary verification account.');
    const denied = await fetch(`${base}/api/admin/candidates`, {
      headers: { Cookie: state.cookie },
      signal: AbortSignal.timeout(30000),
    });
    if (![401, 403].includes(denied.status))
      throw new Error('Revoked verification session was not denied.');
    const proofPath = resolve('docs/research/phase2-live-proof.json');
    const proof = JSON.parse(await readFile(proofPath, 'utf8'));
    await writeFile(
      proofPath,
      JSON.stringify(
        {
          ...proof,
          temporaryAccessRevoked: true,
          revokedSessionHttp: denied.status,
          revokedAt: new Date().toISOString(),
        },
        null,
        2,
      ) + '\n',
    );
    await unlink(statePath);
    console.log(
      'Temporary membership revoked, account disabled, local session removed. Audit identity retained.',
    );
  } else
    throw new Error(
      'Choose --start, --refresh, --inspect, --publish, --hold-metadata or --cleanup.',
    );
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Verification failed.');
  process.exitCode = 1;
});
