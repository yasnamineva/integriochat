import { type NextRequest } from "next/server";
import { prisma, requireTenantId } from "@/lib/db.js";
import { ok, err } from "@integriochat/utils";
import { UpdateChatbotSchema } from "@integriochat/utils";

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
      select: { id: true },
    });
    if (!existing) return err("Chatbot not found", 404);

    // Strip undefined values so exactOptionalPropertyTypes doesn't conflict
    // with Prisma's update input types.
    const updateData = Object.fromEntries(
      Object.entries(parsed.data).filter(([, v]) => v !== undefined)
    );

    const updated = await prisma.chatbot.update({
      where: { id: params.id },
      data: updateData,
    });

    // TODO: If systemPrompt or source URLs changed, re-trigger embedding generation

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

    await prisma.chatbot.delete({ where: { id: params.id } });

    return ok({ deleted: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[DELETE /api/chatbots/[id]]", e);
    return err("Internal server error", 500);
  }
}
