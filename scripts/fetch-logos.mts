/**
 * Operator script: download one icon per catalog tool into public/logos and write a manifest.
 * Logos are self-hosted so browsers never call third parties. Logos identify products only;
 * they imply no endorsement or partnership. Run: npm run logos:fetch
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { researchedCatalog } from '../src/lib/server/researched-catalog';

const MIN_WIDTH = 48;
const hosts = [
  ...new Set(
    researchedCatalog().map((r) => new URL(r.tool.website).hostname.replace(/^www\./, '')),
  ),
];

function pngWidth(bytes: Uint8Array) {
  const sig = [0x89, 0x50, 0x4e, 0x47];
  if (!sig.every((b, i) => bytes[i] === b) || bytes.length < 24) return 0;
  return new DataView(bytes.buffer, bytes.byteOffset).getUint32(16);
}
async function get(url: string) {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'SABKA-AI-logo-check/1.0' },
    });
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.byteLength > 300_000) return null;
    return bytes;
  } catch {
    return null;
  }
}
async function logoFor(host: string) {
  const candidates = [
    `https://${host}/apple-touch-icon.png`,
    `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`,
  ];
  let fallback: Uint8Array | null = null;
  for (const url of candidates) {
    const bytes = await get(url);
    const width = bytes ? pngWidth(bytes) : 0;
    if (bytes && width >= MIN_WIDTH) return bytes;
    if (bytes && width >= 32 && !fallback) fallback = bytes;
  }
  return fallback;
}

await mkdir('public/logos', { recursive: true });
const manifest: Record<string, string> = {};
let missing = 0;
const queue = [...hosts];
await Promise.all(
  Array.from({ length: 10 }, async () => {
    while (queue.length) {
      const host = queue.shift()!;
      const bytes = await logoFor(host);
      if (!bytes) {
        missing++;
        continue;
      }
      const file = `${host.replace(/[^a-z0-9.-]/gi, '')}.png`;
      await writeFile(`public/logos/${file}`, bytes);
      manifest[host] = `/logos/${file}`;
    }
  }),
);
const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
await writeFile('src/lib/domain/logo-manifest.json', JSON.stringify(sorted, null, 1) + '\n');
console.log(`Logos saved: ${Object.keys(sorted).length}/${hosts.length}. Missing: ${missing}.`);
