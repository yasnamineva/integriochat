import { type NextRequest } from "next/server";
import { prisma, requireTenantId } from "@/lib/db";
import { ok, err } from "@integriochat/utils";

interface Params {
  params: { id: string };
}

/**
 * POST /api/chatbots/[id]/api-key
 *
 * Regenerates the chatbot's API key. The old key is immediately invalidated.
 * Requires HOBBY plan or higher (apiAccess feature).
 */
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const tenantId = await requireTenantId();

    const chatbot = await prisma.chatbot.findFirst({
      where: { id: params.id, tenantId },
      select: { id: true },
    });
    if (!chatbot) return err("Chatbot not found", 404);

    // Generate a new API key via raw SQL so we can reuse the same DB-side expression
    const [{ apiKey }] = await prisma.$queryRawUnsafe<[{ apiKey: string }]>(
      `UPDATE chatbots
       SET "apiKey" = concat('cb_', replace(gen_random_uuid()::text, '-', '')),
           "updatedAt" = now()
       WHERE id = $1::uuid AND "tenantId" = $2::uuid
       RETURNING "apiKey"`,
      params.id,
      tenantId
    );

    return ok({ apiKey });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[POST /api/chatbots/[id]/api-key]", e);
    return err("Internal server error", 500);
  }
}
