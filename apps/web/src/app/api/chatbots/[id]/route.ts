import { type NextRequest } from "next/server";
import { prisma, requireTenantId } from "@/lib/db";
import { ok, err } from "@integriochat/utils";
import { UpdateChatbotSchema } from "@integriochat/utils";
import { getPlanConfig } from "@/lib/plans";
import { triggerScrapeInBackground } from "@/services/scraper.service";

interface Params {
  params: { id: string };
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const tenantId = await requireTenantId();

    const chatbot = await prisma.chatbot.findFirst({
      where: { id: params.id, tenantId },
    });

    if (!chatbot) return err("Chatbot not found", 404);

    return ok(chatbot);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[GET /api/chatbots/[id]]", e);
    return err("Internal server error", 500);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const tenantId = await requireTenantId();

    const body: unknown = await req.json();
    const parsed = UpdateChatbotSchema.safeParse(body);
    if (!parsed.success) {
      return err(parsed.error.message, 422);
    }

    // Verify ownership before updating
    const existing = await prisma.chatbot.findFirst({
      where: { id: params.id, tenantId },
      select: { id: true, websiteUrl: true },
    });
    if (!existing) return err("Chatbot not found", 404);

    // Strip undefined values so exactOptionalPropertyTypes doesn't conflict
    // with Prisma's update input types.
    const updateData = Object.fromEntries(
      Object.entries(parsed.data).filter(([, v]) => v !== undefined)
    );

    // If websiteUrl changed and autoRetrain is on, kick off a re-scrape
    const websiteChanged =
      parsed.data.websiteUrl !== undefined &&
      parsed.data.websiteUrl !== existing.websiteUrl;

    const updated = await prisma.chatbot.update({
      where: { id: params.id, tenantId },
      data: updateData,
    });

    // Re-scrape whenever the URL changes (regardless of autoRetrain)
    if (websiteChanged && updated.websiteUrl) {
      const subscription = await prisma.subscription.findFirst({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        select: { plan: true },
      });
      const maxPages = getPlanConfig(subscription?.plan ?? "FREE").limits.scrapePages;
      triggerScrapeInBackground(params.id, tenantId, updated.websiteUrl, maxPages);
    }

    return ok(updated);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[PATCH /api/chatbots/[id]]", e);
    return err("Internal server error", 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const tenantId = await requireTenantId();

    const existing = await prisma.chatbot.findFirst({
      where: { id: params.id, tenantId },
      select: { id: true },
    });
    if (!existing) return err("Chatbot not found", 404);

    await prisma.chatbot.delete({ where: { id: params.id, tenantId } });

    return ok({ deleted: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[DELETE /api/chatbots/[id]]", e);
    return err("Internal server error", 500);
  }
}
