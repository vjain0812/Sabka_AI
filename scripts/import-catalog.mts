import { createClient } from '@supabase/supabase-js';
import { researchedCatalog } from '../src/lib/server/researched-catalog';
import { evidenceIssues } from '../src/lib/domain/catalog-record';

// Import just the new snapshot without overwriting previously reviewed records.
const records = researchedCatalog(
  process.argv.includes('--expanded2-only')
    ? 'expanded2'
    : process.argv.includes('--scenarios-only')
    ? 'scenarios'
    : process.argv.includes('--expanded-only')
    ? 'expanded'
    : 'all',
);
if (new Set(records.map((r) => r.tool.canonicalKey)).size !== records.length)
  throw new Error('Duplicate canonical products in research snapshot.');
for (const record of records) {
  const issues = evidenceIssues(record);
  if (issues.length) throw new Error(`${record.tool.name}: ${issues.join('; ')}`);
}
if (!process.argv.includes('--apply')) {
  console.log(
    `Validated ${records.length} source-checked records. No database write performed. Add --apply to import.`,
  );
} else {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase URL and server secret key are required.');
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  for (const record of records) {
    const { error } = await db.rpc('import_reviewed_catalog', { p_record: record });
    if (error)
      throw new Error(`Import failed for ${record.tool.name}; check schema and source validation.`);
    console.log(`Imported source-reviewed reference: ${record.tool.name}`);
  }
  console.log('Research snapshot imported. This was not a live discovery run.');
}
