import { type NextRequest } from "next/server";
import { prisma, requireTenantId } from "@/lib/db";
import { ok, err } from "@integriochat/utils";

interface Params {
  params: { id: string };
}

/** GET /api/chatbots/[id]/leads — list leads for a chatbot */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const tenantId = await requireTenantId();

    const chatbot = await prisma.chatbot.findFirst({
      where: { id: params.id, tenantId },
      select: { id: true },
    });
    if (!chatbot) return err("Chatbot not found", 404);

    const leads = await prisma.lead.findMany({
      where: { chatbotId: params.id, tenantId },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return ok(leads);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[GET /api/chatbots/[id]/leads]", e);
    return err("Internal server error", 500);
  }
}
