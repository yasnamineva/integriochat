import { type NextRequest } from "next/server";
import { prisma, requireTenantId } from "@/lib/db";
import { ok, err } from "@integriochat/utils";
import { CreateChatbotSchema } from "@integriochat/utils";

export async function GET() {
  try {
    const tenantId = await requireTenantId();

    const chatbots = await prisma.chatbot.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        tone: true,
        isActive: true,
        leadCapture: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return ok(chatbots);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[GET /api/chatbots]", e);
    return err("Internal server error", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenantId = await requireTenantId();

    const body: unknown = await req.json();
    const parsed = CreateChatbotSchema.safeParse(body);
    if (!parsed.success) {
      return err(parsed.error.message, 422);
    }

    const { name, systemPrompt, tone, leadCapture, websiteUrl } = parsed.data;

    const chatbot = await prisma.chatbot.create({
      data: {
        tenantId,
        name,
        systemPrompt,
        tone,
        leadCapture,
        websiteUrl,
      },
    });

    return ok(chatbot, 201);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[POST /api/chatbots]", e);
    return err("Internal server error", 500);
  }
}
