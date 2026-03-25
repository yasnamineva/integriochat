import { type NextRequest } from "next/server";
import { prisma, requireTenantId } from "@/lib/db";
import { ok, err } from "@integriochat/utils";
import { z } from "zod";

interface Params {
  params: { id: string };
}

const CreateWebhookSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url(),
  events: z.array(z.string().min(1)).min(1),
  isActive: z.boolean().default(true),
});

/** GET /api/chatbots/[id]/webhooks — list webhooks for a chatbot */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const tenantId = await requireTenantId();

    const chatbot = await prisma.chatbot.findFirst({
      where: { id: params.id, tenantId },
      select: { id: true },
    });
    if (!chatbot) return err("Chatbot not found", 404);

    const webhooks = await prisma.webhook.findMany({
      where: { chatbotId: params.id, tenantId },
      orderBy: { createdAt: "asc" },
    });

    return ok(webhooks);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[GET /api/chatbots/[id]/webhooks]", e);
    return err("Internal server error", 500);
  }
}

/** POST /api/chatbots/[id]/webhooks — create a webhook */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const tenantId = await requireTenantId();

    const chatbot = await prisma.chatbot.findFirst({
      where: { id: params.id, tenantId },
      select: { id: true },
    });
    if (!chatbot) return err("Chatbot not found", 404);

    const body: unknown = await req.json();
    const parsed = CreateWebhookSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.message, 422);

    const webhook = await prisma.webhook.create({
      data: {
        tenantId,
        chatbotId: params.id,
        name: parsed.data.name,
        url: parsed.data.url,
        events: parsed.data.events,
        isActive: parsed.data.isActive,
      },
    });

    return ok(webhook, 201);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[POST /api/chatbots/[id]/webhooks]", e);
    return err("Internal server error", 500);
  }
}
