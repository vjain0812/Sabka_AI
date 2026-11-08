import type { CatalogRecord } from './catalog-record';
import { businessTags, workflowTags } from './library-taxonomy';

/** Tools that do the same kind of job for the same kind of business, most similar first. */
export function similarTools(record: CatalogRecord, records: CatalogRecord[], n = 4) {
  const tags = workflowTags(record.tool);
  const sectors: string[] = businessTags(record.tool).filter((b) => b !== 'all_small_businesses');
  const words = new Set(record.tool.summary.toLowerCase().match(/[a-z]{5,}/g) ?? []);
  return records
    .filter(
      (r) => r.tool.id !== record.tool.id && r.tool.status === 'published' && !r.tool.fictional,
    )
    .map((r) => {
      const otherTags = workflowTags(r.tool);
      const shared = otherTags.filter((t) => tags.includes(t)).length;
      const samePrimary = otherTags[0] === tags[0] ? 2 : 0;
      const sector = businessTags(r.tool).some((b) => sectors.includes(b)) ? 2 : 0;
      const overlap = (r.tool.summary.toLowerCase().match(/[a-z]{5,}/g) ?? []).filter((w) =>
        words.has(w),
      ).length;
      return { r, score: shared * 3 + samePrimary + sector + Math.min(overlap, 4) };
    })
    .filter((x) => x.score >= 5)
    .sort((a, b) => b.score - a.score || a.r.tool.name.localeCompare(b.r.tool.name))
    .slice(0, n)
    .map((x) => x.r);
}
