import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, err } from "@integriochat/utils";

interface Params {
  params: { token: string };
}

/**
 * GET /api/demo/:token
 *
 * Public endpoint — validates a demo link token and returns chatbot config
 * if the link has not expired.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    // Note: no tenantId filter — demo links are public by design.
    // We use the raw prisma client here to bypass tenant middleware.
    const demoLink = await prisma.demoLink.findUnique({
      where: { token: params.token },
      include: {
        chatbot: {
          select: {
            id: true,
            name: true,
            tone: true,
            isActive: true,
          },
        },
      },
    });

    if (!demoLink) {
      return err("Demo not found", 404);
    }

    if (demoLink.expiresAt < new Date()) {
      return err("Demo link has expired", 410);
    }

    if (!demoLink.chatbot.isActive) {
      return err("Chatbot is inactive", 403);
    }

    return ok({
      chatbotId: demoLink.chatbotId,
      chatbotName: demoLink.chatbot.name,
      tone: demoLink.chatbot.tone,
      expiresAt: demoLink.expiresAt.toISOString(),
    });
  } catch (e) {
    console.error("[GET /api/demo/[token]]", e);
    return err("Internal server error", 500);
  }
}
