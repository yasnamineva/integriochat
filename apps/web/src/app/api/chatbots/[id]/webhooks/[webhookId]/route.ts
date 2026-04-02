import { type NextRequest } from "next/server";
import { prisma, requireTenantId } from "@/lib/db";
import { ok, err } from "@integriochat/utils";
import { z } from "zod";

interface Params {
  params: { id: string; webhookId: string };
}

const UpdateWebhookSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  url: z.string().url().optional(),
  events: z.array(z.string().min(1)).min(1).optional(),
  isActive: z.boolean().optional(),
});

/** PATCH /api/chatbots/[id]/webhooks/[webhookId] — update a webhook */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const tenantId = await requireTenantId();

    const webhook = await prisma.webhook.findFirst({
      where: { id: params.webhookId, chatbotId: params.id, tenantId },
    });
    if (!webhook) return err("Webhook not found", 404);

    const body: unknown = await req.json();
    const parsed = UpdateWebhookSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.message, 422);

    const updateData = Object.fromEntries(
      Object.entries(parsed.data).filter(([, v]) => v !== undefined)
    );

    const updated = await prisma.webhook.update({
      where: { id: params.webhookId, tenantId },
      data: updateData,
    });

    return ok(updated);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[PATCH /api/chatbots/[id]/webhooks/[webhookId]]", e);
    return err("Internal server error", 500);
  }
}

/** DELETE /api/chatbots/[id]/webhooks/[webhookId] — delete a webhook */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const tenantId = await requireTenantId();

    const webhook = await prisma.webhook.findFirst({
      where: { id: params.webhookId, chatbotId: params.id, tenantId },
    });
    if (!webhook) return err("Webhook not found", 404);

    await prisma.webhook.delete({ where: { id: params.webhookId } });

    return ok({ deleted: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[DELETE /api/chatbots/[id]/webhooks/[webhookId]]", e);
    return err("Internal server error", 500);
  }
}
