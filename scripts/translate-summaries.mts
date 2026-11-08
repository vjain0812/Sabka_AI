/**
 * Operator script: translate every tool summary to Spanish once, offline, into
 * src/lib/domain/tool-summaries-es.json. The app never translates catalog facts at request time.
 * Only the short summary sentence is translated; no new claims are introduced.
 *
 *   node --conditions=react-server --env-file=.env.local --import tsx scripts/translate-summaries.mts
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { researchedCatalog } from '../src/lib/server/researched-catalog';

const OUT = 'src/lib/domain/tool-summaries-es.json';
const done: Record<string, string> = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};
const key = process.env.OPENROUTER_API_KEY || process.env.GROQ_API_KEY;
if (!key) throw new Error('A model key is required (OPENROUTER_API_KEY or GROQ_API_KEY).');
const openrouter = Boolean(process.env.OPENROUTER_API_KEY);
const todo = researchedCatalog()
  .map((r) => ({ slug: r.tool.slug, name: r.tool.name, en: r.tool.summary }))
  .filter((t) => !done[t.slug]);
console.log(`To translate: ${todo.length}`);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

for (let i = 0; i < todo.length; i += 20) {
  const batch = todo.slice(i, i + 20);
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(
      openrouter
        ? 'https://openrouter.ai/api/v1/chat/completions'
        : 'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: openrouter ? 'anthropic/claude-haiku-5.5' : 'openai/gpt-oss-120b',
          temperature: 0,
          max_tokens: 3500,
          ...(openrouter ? {} : { reasoning_effort: 'low' }),
          messages: [
            {
              role: 'system',
              content:
                'Translate each English software description into natural, plain Latin-American Spanish for small-business owners. Keep product and brand names unchanged. Do not add, remove or soften any claim. Keep each translation to one sentence. Reply with JSON only: {"<slug>": "<spanish>", ...} using exactly the slugs provided.',
            },
            {
              role: 'user',
              content: JSON.stringify(Object.fromEntries(batch.map((t) => [t.slug, t.en]))),
            },
          ],
        }),
        signal: AbortSignal.timeout(60000),
      },
    ).catch(() => null);
    if (!res || res.status === 429) {
      await sleep(25000);
      continue;
    }
    if (!res.ok) break;
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content ?? '';
    try {
      const parsed = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)) as Record<
        string,
        unknown
      >;
      for (const t of batch)
        if (typeof parsed[t.slug] === 'string' && (parsed[t.slug] as string).length > 8)
          done[t.slug] = (parsed[t.slug] as string).trim();
      writeFileSync(
        OUT,
        JSON.stringify(
          Object.fromEntries(Object.entries(done).sort(([a], [b]) => a.localeCompare(b))),
          null,
          1,
        ) + '\n',
      );
      break;
    } catch {
      await sleep(5000);
    }
  }
  console.log(`${Math.min(i + 20, todo.length)}/${todo.length}`);
  await sleep(9000);
}
console.log(`Translated: ${Object.keys(done).length}`);
