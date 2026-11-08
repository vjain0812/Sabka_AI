import { loadEnvFile } from 'node:process';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
try {
  loadEnvFile('.env.local');
} catch {
  /* Credential-free builds are supported. */
}
const names = [
  'SUPABASE_SECRET_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'GROQ_API_KEY',
  'TAVILY_API_KEY',
  'BRAVE_SEARCH_API_KEY',
  'OPENROUTER_API_KEY',
];
const secrets = names
  .map((name) => process.env[name])
  .filter((value) => value && value.length >= 12);
async function scan(path) {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const file = join(path, entry.name);
    if (entry.isDirectory()) await scan(file);
    else {
      const contents = await readFile(file);
      if (secrets.some((secret) => contents.includes(Buffer.from(secret))))
        throw new Error(`Server credential found in browser artifact: ${file}`);
    }
  }
}
await scan('.next/static');
console.log(
  `Browser artifacts checked against ${secrets.length} configured server credentials: no matches.`,
);
