interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

interface TavilyResponse {
  answer?: string;
  results: TavilyResult[];
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

/**
 * Search the web using the Tavily Search API.
 * Returns up to maxResults results ranked by relevance.
 *
 * Requires TAVILY_API_KEY in environment.
 * Throws if the API key is missing or the request fails.
 */
export async function webSearch(
  query: string,
  maxResults = 5
): Promise<{ answer: string | null; results: SearchResult[] }> {
  const apiKey = process.env["TAVILY_API_KEY"];
  if (!apiKey) {
    throw new Error("TAVILY_API_KEY is not configured.");
  }

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: "basic",
      include_answer: true,
      max_results: maxResults,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Tavily API error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as TavilyResponse;

  return {
    answer: data.answer ?? null,
    results: data.results.map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.content,
    })),
  };
}
