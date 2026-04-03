import { type NextRequest } from "next/server";
import { prisma, requireTenantId } from "@/lib/db";
import { err } from "@integriochat/utils";
import { scrapeAndIndex } from "@/services/scraper.service";
import { getPlanConfig } from "@/lib/plans";
import type { APIError } from "openai";

// Allow up to 5 minutes on Vercel Pro — scraping 20 pages with embeddings
// typically takes 1–3 minutes.
export const maxDuration = 300;

interface Params {
  params: { id: string };
}

type ScrapeEvent =
  | { type: "start"; total: number }
  | { type: "page"; done: number; total: number; url: string }
  | { type: "done"; pagesScraped: number; chunksIndexed: number; chunksSkipped: number }
  | { type: "error"; message: string };

/**
 * POST /api/chatbots/[id]/scrape
 *
 * Streams Server-Sent Events (SSE) so the browser can track progress in real
 * time.  Events:
 *   {"type":"start","total":20}
 *   {"type":"page","done":3,"total":20,"url":"https://..."}
 *   {"type":"done","pagesScraped":18,"chunksIndexed":124,"chunksSkipped":6}
 *   {"type":"error","message":"..."}
 *
 * The connection is kept open for the full scrape duration (up to maxDuration).
 * This avoids the "fire-and-forget gets killed" problem with background tasks
 * on Vercel serverless functions.
 */
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const tenantId = await requireTenantId();

    const [chatbot, subscription] = await Promise.all([
      prisma.chatbot.findFirst({
        where: { id: params.id, tenantId },
        select: { id: true, websiteUrl: true, scrapeStatus: true, updatedAt: true },
      }),
      prisma.subscription.findFirst({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        select: { plan: true },
      }),
    ]);

    if (!chatbot) return err("Chatbot not found", 404);
    if (!chatbot.websiteUrl) return err("No website URL configured", 400);

    if (chatbot.scrapeStatus === "scraping") {
      // Allow re-scraping if the last status update is older than 10 minutes —
      // that means a previous run was killed (e.g. Vercel function timeout) and
      // never transitioned to "done" or "error".
      const stale = Date.now() - chatbot.updatedAt.getTime() > 2 * 60 * 1000;
      if (!stale) return err("Scraping already in progress", 409);
      // Fall through — will reset to "scraping" again below
    }

    const maxPages = getPlanConfig(subscription?.plan ?? "FREE").limits.scrapePages;

    // Mark as scraping before opening the stream
    await prisma.chatbot.update({
      where: { id: params.id, tenantId },
      data: { scrapeStatus: "scraping" },
    });

    const encoder = new TextEncoder();
    const websiteUrl = chatbot.websiteUrl;
    const chatbotId = chatbot.id;

    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: ScrapeEvent) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        };

        send({ type: "start", total: maxPages });

        try {
          const result = await scrapeAndIndex(
            websiteUrl,
            chatbotId,
            tenantId,
            maxPages,
            (progress) => send({ type: "page", ...progress })
          );

          await prisma.chatbot.update({
            where: { id: chatbotId, tenantId },
            data: { scrapeStatus: "done", lastScrapedAt: new Date() },
          });

          send({ type: "done", ...result });
        } catch (e) {
          console.error("[POST /api/chatbots/[id]/scrape] scrape error:", e);

          await prisma.chatbot.update({
            where: { id: chatbotId, tenantId },
            data: { scrapeStatus: "error" },
          }).catch(() => undefined);

          const openaiErr = e as Partial<APIError>;
          let message = "Scraping failed — check the URL and try again";
          if (openaiErr.status === 429) {
            message =
              openaiErr.code === "insufficient_quota"
                ? "OpenAI quota exceeded — add credits at platform.openai.com/settings/billing"
                : "OpenAI rate limit hit — please wait a minute and try again";
          } else if (openaiErr.status === 401) {
            message = "OpenAI API key is invalid — check OPENAI_API_KEY in your environment";
          }

          send({ type: "error", message });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no", // disable Nginx buffering if behind a proxy
      },
    });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[POST /api/chatbots/[id]/scrape]", e);
    return err("Internal server error", 500);
  }
}
