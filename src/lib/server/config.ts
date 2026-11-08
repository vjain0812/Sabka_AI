import 'server-only';

export function serverConfig() {
  return {
    supabaseUrl: process.env.SUPABASE_URL ?? '',
    supabaseAnonKey: process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '',
    braveKey: process.env.BRAVE_SEARCH_API_KEY ?? '',
    tavilyKey: process.env.TAVILY_API_KEY ?? '',
    appOrigin: process.env.APP_ORIGIN ?? 'http://localhost:3000',
    llmProvider: process.env.GROQ_API_KEY
      ? 'groq'
      : process.env.OPENROUTER_API_KEY
      ? 'openrouter'
      : null,
    llmModel: process.env.GROQ_API_KEY
      ? process.env.GROQ_MODEL || 'openai/gpt-oss-20b'
      : process.env.OPENROUTER_MODEL ?? '',
  };
}
/**
 * Model used only to re-rank recommendation candidates. OpenRouter is preferred (Claude Haiku
 * 5.5 by default: fast and inexpensive); Groq is a fallback. Without a key, ranking is rules-only.
 */
export function rankingProvider() {
  if (process.env.OPENROUTER_API_KEY)
    return {
      name: 'openrouter' as const,
      url: 'https://openrouter.ai/api/v1/chat/completions',
      key: process.env.OPENROUTER_API_KEY,
      model: process.env.OPENROUTER_RANKING_MODEL || 'anthropic/claude-haiku-5.5',
    };
  if (process.env.GROQ_API_KEY)
    return {
      name: 'groq' as const,
      url: 'https://api.groq.com/openai/v1/chat/completions',
      key: process.env.GROQ_API_KEY,
      model: process.env.GROQ_RANKING_MODEL || 'openai/gpt-oss-120b',
    };
  return null;
}
export function configurationStatus() {
  const c = serverConfig();
  return {
    database: !!(c.supabaseUrl && c.supabaseAnonKey),
    search: !!(c.tavilyKey || c.braveKey),
    searchProvider: c.tavilyKey ? 'tavily' : c.braveKey ? 'brave' : null,
    extraction: c.llmProvider && c.llmModel ? c.llmProvider : 'deterministic',
    maxSearchCallsPerRun: 6,
    maxRunsPerDay: 4,
    maxCandidatesPerRun: 4,
  };
}
