// Web-search abstraction used by the Verification agent. Phase 10 ships a
// stub that returns an empty result list so Verification runs end-to-end and
// the schema/upsert pipeline is exercised — but produces ~zero findings until
// a real provider (e.g. Tavily) is wired in. Keep the signature stable so the
// future swap is a one-file change.
export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

export async function webSearch(_query: string): Promise<WebSearchResult[]> {
  return [];
}
