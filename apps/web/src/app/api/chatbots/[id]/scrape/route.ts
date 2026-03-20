import { type NextRequest } from "next/server";
import { prisma, requireTenantId } from "@/lib/db";
import { ok, err } from "@integriochat/utils";
import { scrapeAndIndex } from "@/services/scraper.service";

interface Params {
  params: { id: string };
}

/**
 * POST /api/chatbots/[id]/scrape
 *
 * Triggers (or re-triggers) website scraping for a chatbot.
 * Fetches up to 20 pages from the chatbot's websiteUrl, chunks text,
 * generates embeddings, and stores them in EmbeddingDocument.
 */
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const tenantId = await requireTenantId();

    const chatbot = await prisma.chatbot.findFirst({
      where: { id: params.id, tenantId },
      select: { id: true, websiteUrl: true, scrapeStatus: true },
    });

    if (!chatbot) return err("Chatbot not found", 404);
    if (!chatbot.websiteUrl) return err("No website URL configured", 400);
    if (chatbot.scrapeStatus === "scraping") return err("Scraping already in progress", 409);

    // Mark as scraping
    await prisma.chatbot.update({
      where: { id: params.id, tenantId },
      data: { scrapeStatus: "scraping" },
    });

    try {
      const result = await scrapeAndIndex(chatbot.websiteUrl, chatbot.id, tenantId);

      await prisma.chatbot.update({
        where: { id: params.id, tenantId },
        data: { scrapeStatus: "done", lastScrapedAt: new Date() },
      });

      return ok({
        pagesScraped: result.pagesScraped,
        chunksIndexed: result.chunksIndexed,
        chunksSkipped: result.chunksSkipped,
      });
    } catch (scrapeError) {
      console.error("[POST /api/chatbots/[id]/scrape] scrape error:", scrapeError);
      await prisma.chatbot.update({
        where: { id: params.id, tenantId },
        data: { scrapeStatus: "error" },
      });
      return err("Scraping failed — check the URL and try again", 500);
    }
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[POST /api/chatbots/[id]/scrape]", e);
    return err("Internal server error", 500);
  }
}
