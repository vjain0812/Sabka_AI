import 'server-only';
import { z } from 'zod';
import type { DiscoveryInput } from '@/lib/domain/catalog-record';
import { isRestrictedReviewUrl, safeSourceUrl } from '@/lib/domain/source-url';
import { serverConfig } from './config';
import { AppError } from './http';
import { providerJson } from './provider-http';

export type SearchHit = { url: string; title: string; content: string; rawContent: string | null };
export interface SearchProvider {
  name: string;
  search(query: string): Promise<SearchHit[]>;
}
const taskTerms = {
  customer_reply_drafting: 'AI draft customer replies human review small business',
  marketing_content: 'AI marketing content planning business facts brand voice',
  appointment_organization: 'AI scheduling assistant appointment requests human approval',
};
export function buildQueries(input: DiscoveryInput) {
  // Use the admin-confirmed task and bounded requirement, never a guest's private brief.
  const terms = `${taskTerms[input.job]} ${input.requirement}`.trim();
  return [
    `${terms} official product documentation`,
    `${terms} pricing plans`,
    `${terms} independent evaluation privacy limitations`,
  ];
}
export function parseTavily(data: unknown): SearchHit[] {
  const parsed = z
    .object({
      results: z
        .array(
          z.object({
            url: z.string(),
            title: z.string(),
            content: z.string().default(''),
            raw_content: z.string().nullable().optional(),
          }),
        )
        .max(20),
    })
    .parse(data);
  return parsed.results.flatMap((result) => {
    try {
      const url = safeSourceUrl(result.url);
      if (isRestrictedReviewUrl(url)) return [];
      return [
        {
          url,
          title: result.title.slice(0, 250),
          content: result.content.slice(0, 2000),
          rawContent: result.raw_content?.slice(0, 12000) ?? null,
        },
      ];
    } catch {
      return [];
    }
  });
}
export function configuredSearch(): SearchProvider {
  const c = serverConfig();
  if (c.tavilyKey)
    return {
      name: 'tavily',
      async search(query) {
        return parseTavily(
          await providerJson('https://api.tavily.com/search', {
            method: 'POST',
            headers: { Authorization: `Bearer ${c.tavilyKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query,
              search_depth: 'basic',
              max_results: 4,
              include_raw_content: 'text',
              include_answer: false,
              auto_parameters: false,
              exclude_domains: ['reddit.com', 'trustpilot.com', 'g2.com'],
            }),
          }),
        );
      },
    };
  if (c.braveKey)
    return {
      name: 'brave',
      async search(query) {
        const data = z
          .object({
            web: z
              .object({
                results: z.array(
                  z.object({
                    url: z.string(),
                    title: z.string(),
                    description: z.string().default(''),
                  }),
                ),
              })
              .optional(),
          })
          .parse(
            await providerJson(
              `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(
                query,
              )}&count=4`,
              { headers: { 'X-Subscription-Token': c.braveKey } },
            ),
          );
        return parseTavily({
          results: data.web?.results.map((r) => ({ ...r, content: r.description })) ?? [],
        });
      },
    };
  throw new AppError(
    503,
    'SEARCH_NOT_CONFIGURED',
    'Configure TAVILY_API_KEY or BRAVE_SEARCH_API_KEY to run live discovery. Catalog browsing does not require search.',
  );
}
