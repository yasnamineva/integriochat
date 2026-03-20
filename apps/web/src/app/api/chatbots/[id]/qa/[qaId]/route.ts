import { type NextRequest } from "next/server";
import { prisma, requireTenantId } from "@/lib/db";
import { ok, err } from "@integriochat/utils";

interface Params {
  params: { id: string; qaId: string };
}

/** DELETE /api/chatbots/[id]/qa/[qaId] — remove a Q&A pair. */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const tenantId = await requireTenantId();

    const qa = await prisma.customQA.findFirst({
      where: { id: params.qaId, chatbotId: params.id, tenantId },
      select: { id: true },
    });
    if (!qa) return err("Q&A not found", 404);

    await prisma.customQA.delete({ where: { id: params.qaId } });

    return ok({ deleted: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[DELETE /api/chatbots/[id]/qa/[qaId]]", e);
    return err("Internal server error", 500);
  }
}
