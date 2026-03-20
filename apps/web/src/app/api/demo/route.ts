import { type NextRequest } from "next/server";
import { prisma, requireTenantId } from "@/lib/db";
import { ok, err } from "@integriochat/utils";
import { CreateDemoLinkSchema } from "@integriochat/utils";

/**
 * POST /api/demo
 *
 * Creates a time-limited demo link for a chatbot owned by the current tenant.
 * Auth required — the demo page itself (/demo/[token]) is public.
 */
export async function POST(req: NextRequest) {
  try {
    const tenantId = await requireTenantId();

    const body: unknown = await req.json();
    const parsed = CreateDemoLinkSchema.safeParse(body);
    if (!parsed.success) {
      return err(parsed.error.message, 422);
    }

    const { chatbotId, durationDays } = parsed.data;

    // Verify chatbot belongs to this tenant
    const chatbot = await prisma.chatbot.findFirst({
      where: { id: chatbotId, tenantId },
      select: { id: true },
    });
    if (!chatbot) return err("Chatbot not found", 404);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    const demoLink = await prisma.demoLink.create({
      data: { tenantId, chatbotId, expiresAt },
      select: { id: true, token: true, chatbotId: true, expiresAt: true },
    });

    return ok(demoLink, 201);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[POST /api/demo]", e);
    return err("Internal server error", 500);
  }
}
