import * as cheerio from "cheerio";
import { createHash } from "crypto";
import { prisma } from "@/lib/db";
import { generateEmbedding } from "./embedding.service";

/** Default fallback if no plan limit is passed. */
const MAX_PAGES = 20;
const CHUNK_SIZE = 700; // characters per chunk
const CHUNK_OVERLAP = 100;

/** Fetch a URL and return the HTML string, or null on failure. */
async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Integriochat-Bot/1.0 (website training crawler)" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("text/html")) return null;
    return res.text();
  } catch {
    return null;
  }
}

/** Extract clean text content from HTML, ignoring boilerplate. */
function extractText(html: string): string {
  const $ = cheerio.load(html);
  // Remove non-content elements
  $("script, style, noscript, nav, footer, header, aside, [role=navigation], [role=banner], [role=contentinfo]").remove();
  // Prefer semantic content containers
  const main = $("main, article, [role=main], .content, #content, .main, #main");
  const text = (main.length ? main : $("body")).text();
  return text.replace(/\s+/g, " ").trim();
}

/** Split text into overlapping chunks of ~CHUNK_SIZE characters. */
function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    chunks.push(text.slice(start, end).trim());
    if (end === text.length) break;
    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  return chunks.filter((c) => c.length > 50);
}

/** Collect all same-domain hrefs from a page. */
function extractLinks(html: string, baseUrl: URL): string[] {
  const $ = cheerio.load(html);
  const links: string[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    try {
      const resolved = new URL(href, baseUrl);
      if (resolved.hostname === baseUrl.hostname && resolved.protocol.startsWith("http")) {
        resolved.hash = "";
        links.push(resolved.toString());
      }
    } catch {
      // ignore malformed hrefs
    }
  });
  return [...new Set(links)];
}

export interface ScrapeResult {
  pagesScraped: number;
  chunksIndexed: number;
  chunksSkipped: number;
}

export interface ScrapeProgress {
  done: number;
  total: number;
  url: string;
}

/**
 * Fire-and-forget helper used by the auto-retrain cron job.
 * NOTE: only use this from long-lived contexts (cron). In serverless routes
 * use the SSE-streaming POST /scrape endpoint instead, which keeps the
 * connection open for the full duration of the scrape.
 */
export function triggerScrapeInBackground(
  chatbotId: string,
  tenantId: string,
  websiteUrl: string,
  maxPages: number
): void {
  void (async () => {
    try {
      await prisma.chatbot.update({
        where: { id: chatbotId, tenantId },
        data: { scrapeStatus: "scraping" },
      });
      await scrapeAndIndex(websiteUrl, chatbotId, tenantId, maxPages);
      await prisma.chatbot.update({
        where: { id: chatbotId, tenantId },
        data: { scrapeStatus: "done", lastScrapedAt: new Date() },
      });
    } catch (e) {
      console.error(`[scraper] background scrape failed for chatbot ${chatbotId}:`, e);
      await prisma.chatbot.update({
        where: { id: chatbotId, tenantId },
        data: { scrapeStatus: "error" },
      }).catch(() => undefined);
    }
  })();
}

/**
 * Crawl a website starting from startUrl (BFS, same domain, up to maxPages),
 * chunk extracted text, generate embeddings in parallel per page, and upsert
 * into EmbeddingDocument.
 *
 * onProgress is called after each page is visited (before embedding) so
 * callers can stream progress to clients in real time.
 */
export async function scrapeAndIndex(
  startUrl: string,
  chatbotId: string,
  tenantId: string,
  maxPages = MAX_PAGES,
  onProgress?: (p: ScrapeProgress) => void
): Promise<ScrapeResult> {
  const base = new URL(startUrl);
  const queue = [startUrl];
  const visited = new Set<string>();
  let chunksIndexed = 0;
  let chunksSkipped = 0;

  while (queue.length > 0 && visited.size < maxPages) {
    const url = queue.shift()!;
    if (visited.has(url)) continue;
    visited.add(url);

    onProgress?.({ done: visited.size, total: maxPages, url });

    const html = await fetchPage(url);
    if (!html) continue;

    // Discover more pages on the same domain
    const links = extractLinks(html, base);
    for (const link of links) {
      if (!visited.has(link) && queue.length + visited.size < maxPages) {
        queue.push(link);
      }
    }

    // Chunk the text
    const text = extractText(html);
    if (!text) continue;
    const chunks = chunkText(text);

    // Generate all embeddings for this page in parallel (big speedup vs sequential)
    const results = await Promise.allSettled(
      chunks.map(async (chunk) => {
        const contentHash = createHash("sha256").update(chunk).digest("hex");

        const existing = await prisma.$queryRaw<{ id: string }[]>`
          SELECT id FROM embedding_documents
          WHERE "chatbotId" = ${chatbotId}::uuid
            AND "contentHash" = ${contentHash}
          LIMIT 1
        `;
        if (existing.length > 0) return "skipped" as const;

        const embedding = await generateEmbedding(chunk);
        const vectorStr = `[${embedding.join(",")}]`;

        await prisma.$executeRaw`
          INSERT INTO embedding_documents
            ("tenantId", "chatbotId", "content", "sourceUrl", "contentHash", "embedding", "updatedAt")
          VALUES
            (${tenantId}::uuid, ${chatbotId}::uuid, ${chunk}, ${url}, ${contentHash}, ${vectorStr}::vector, now())
          ON CONFLICT DO NOTHING
        `;
        return "indexed" as const;
      })
    );

    for (const r of results) {
      if (r.status === "fulfilled") {
        if (r.value === "indexed") chunksIndexed++;
        else chunksSkipped++;
      }
    }
  }

  return { pagesScraped: visited.size, chunksIndexed, chunksSkipped };
}
