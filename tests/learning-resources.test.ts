import { describe, expect, it } from 'vitest';
import summaries from '@/lib/domain/tool-summaries-es.json';
import videos from '@/lib/domain/tool-videos.json';
import { tutorialFor, tutorialSearchUrl } from '@/lib/domain/learning-resources';

describe('tool tutorial videos', () => {
  it('only maps known catalog tools to well-formed YouTube ids', () => {
    for (const [slug, v] of Object.entries(videos)) {
      expect(slug in summaries, slug).toBe(true);
      expect(v.id, slug).toMatch(/^[A-Za-z0-9_-]{11}$/);
      expect(v.title.length, slug).toBeGreaterThan(0);
      expect(v.publisher.length, slug).toBeGreaterThan(0);
    }
  });

  it('covers most of the catalog', () => {
    const covered = Object.keys(summaries).filter((slug) => tutorialFor(slug));
    expect(covered.length / Object.keys(summaries).length).toBeGreaterThan(0.85);
  });

  it('keeps hand-curated videos ahead of the generated map', () => {
    expect(tutorialFor('grammarly')?.id).toBe('DU0IeYwVJHg');
    expect(tutorialFor('chatgpt')?.sourceUrl).toMatch(/^https:\/\/www\.youtube\.com\/watch\?v=/);
  });

  it('builds an encoded search fallback', () => {
    expect(tutorialSearchUrl('Smith.ai & Co')).toBe(
      'https://www.youtube.com/results?search_query=Smith.ai%20%26%20Co%20tutorial%20for%20beginners',
    );
  });
});
