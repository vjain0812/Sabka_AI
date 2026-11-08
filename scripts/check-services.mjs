import { loadEnvFile } from 'node:process';
loadEnvFile('.env.local');
const url = process.env.SUPABASE_URL;
const publicKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
async function check(label, path, key) {
  try {
    const response = await fetch(new URL(path, url), {
      headers: { apikey: key },
      signal: AbortSignal.timeout(10000),
    });
    console.log(`${label}: HTTP ${response.status}`);
    if (label === 'Catalog schema' && response.status !== 200)
      console.log('Catalog migration may need to be applied in the Supabase SQL editor.');
  } catch {
    console.log(`${label}: connection unavailable`);
  }
}
await check('Supabase Auth', '/auth/v1/settings', publicKey);
await check('Catalog schema', '/rest/v1/tools?select=id&limit=1', publicKey);
await check('Supabase admin API', '/auth/v1/admin/users?page=1&per_page=1', secret);
console.log(`Groq configured: ${Boolean(process.env.GROQ_API_KEY)}`);
console.log(`Tavily configured: ${Boolean(process.env.TAVILY_API_KEY)}`);
