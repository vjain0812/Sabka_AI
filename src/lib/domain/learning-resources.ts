/** Curated external learning links, source checked 2026-11-07. Not product evidence. */
import toolVideoData from './tool-videos.json';
export type LearningVideo = {
  id: string;
  title: string;
  publisher: string;
  sourceUrl: string;
  checkedAt: string;
  language: 'en';
};
export const introVideo: LearningVideo = {
  id: '5mHxO2JpCR0',
  title: "AI Explained: It's maths, not magic",
  publisher: 'CSIRO',
  sourceUrl: 'https://blog.google/intl/en-au/company-news/outreach-initiatives/what-is-ai/',
  checkedAt: '2026-11-07',
  language: 'en',
};
const videos: Record<string, LearningVideo> = {
  grammarly: {
    id: 'DU0IeYwVJHg',
    title: 'How To Use Generative AI | GrammarlyGO',
    publisher: 'Grammarly',
    sourceUrl: 'https://www.youtube.com/watch?v=DU0IeYwVJHg',
    checkedAt: '2026-11-07',
    language: 'en',
  },
  'canva-magic-write': {
    id: 'npi4Yo82uJ0',
    title: "Introducing Magic Write — Canva's AI Copy Generator",
    publisher: 'Design with Canva (independent creator)',
    sourceUrl: 'https://www.youtube.com/watch?v=npi4Yo82uJ0',
    checkedAt: '2026-11-07',
    language: 'en',
  },
  missive: {
    id: 'uN4CSAt_hCs',
    title: 'Missive AI assistant: draft replies, search email and calendar',
    publisher: 'Missive',
    sourceUrl: 'https://www.youtube.com/watch?v=uN4CSAt_hCs',
    checkedAt: '2026-11-07',
    language: 'en',
  },
};
/**
 * Per-tool tutorials, checked 2026-11-08 via YouTube oEmbed (live + embeddable).
 * Vendor channels preferred; "(independent creator)" marks reputable third-party educators.
 */
const toolVideos = toolVideoData as Record<
  string,
  { id: string; title: string; publisher: string }
>;
const TOOL_VIDEOS_CHECKED_AT = '2026-11-08';

export function tutorialFor(slug: string): LearningVideo | undefined {
  const curated = videos[slug] ?? (slug.startsWith('missive-') ? videos.missive : undefined);
  if (curated) return curated;
  const v = toolVideos[slug];
  if (!v) return undefined;
  return {
    id: v.id,
    title: v.title,
    publisher: v.publisher,
    sourceUrl: `https://www.youtube.com/watch?v=${v.id}`,
    checkedAt: TOOL_VIDEOS_CHECKED_AT,
    language: 'en',
  };
}

/** Unreviewed fallback: a YouTube search for tools without a curated tutorial. */
export function tutorialSearchUrl(toolName: string) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(
    `${toolName} tutorial for beginners`,
  )}`;
}
