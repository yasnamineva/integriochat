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

/**
 * Crawl a website starting from startUrl (BFS, same domain, up to MAX_PAGES),
 * chunk extracted text, generate embeddings, and upsert into EmbeddingDocument.
 */
export async function scrapeAndIndex(
  startUrl: string,
  chatbotId: string,
  tenantId: string,
  maxPages = MAX_PAGES
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

    const html = await fetchPage(url);
    if (!html) continue;

    // Discover more pages on the same domain
    const links = extractLinks(html, base);
    for (const link of links) {
      if (!visited.has(link) && queue.length + visited.size < maxPages) {
        queue.push(link);
      }
    }

    // Chunk the text and upsert embeddings
    const text = extractText(html);
    if (!text) continue;
    const chunks = chunkText(text);

    for (const chunk of chunks) {
      const contentHash = createHash("sha256").update(chunk).digest("hex");

      // Skip if already indexed and unchanged
      const existing = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM embedding_documents
        WHERE "chatbotId" = ${chatbotId}::uuid
          AND "contentHash" = ${contentHash}
        LIMIT 1
      `;
      if (existing.length > 0) {
        chunksSkipped++;
        continue;
      }

      // Generate embedding
      const embedding = await generateEmbedding(chunk);
      const vectorStr = `[${embedding.join(",")}]`;

      // Upsert the document (delete old same-source-url chunk with same hash if needed)
      await prisma.$executeRaw`
        INSERT INTO embedding_documents
          ("tenantId", "chatbotId", "content", "sourceUrl", "contentHash", "embedding", "updatedAt")
        VALUES
          (${tenantId}::uuid, ${chatbotId}::uuid, ${chunk}, ${url}, ${contentHash}, ${vectorStr}::vector, now())
        ON CONFLICT DO NOTHING
      `;

      chunksIndexed++;
    }
  }

  return { pagesScraped: visited.size, chunksIndexed, chunksSkipped };
}
