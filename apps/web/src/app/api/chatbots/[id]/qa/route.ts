import { type NextRequest } from "next/server";
import { prisma, requireTenantId } from "@/lib/db";
import { ok, err } from "@integriochat/utils";
import { CreateCustomQASchema } from "@integriochat/utils";

interface Params {
  params: { id: string };
}

/** GET /api/chatbots/[id]/qa — list all Q&A pairs for a chatbot. */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const tenantId = await requireTenantId();

    const chatbot = await prisma.chatbot.findFirst({
      where: { id: params.id, tenantId },
      select: { id: true },
    });
    if (!chatbot) return err("Chatbot not found", 404);

    const qas = await prisma.customQA.findMany({
      where: { chatbotId: params.id, tenantId },
      orderBy: { createdAt: "asc" },
      select: { id: true, question: true, answer: true, createdAt: true },
    });

    return ok(qas);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[GET /api/chatbots/[id]/qa]", e);
    return err("Internal server error", 500);
  }
}

/** POST /api/chatbots/[id]/qa — add a new Q&A pair. */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const tenantId = await requireTenantId();

    const chatbot = await prisma.chatbot.findFirst({
      where: { id: params.id, tenantId },
      select: { id: true },
    });
    if (!chatbot) return err("Chatbot not found", 404);

    const body: unknown = await req.json();
    const parsed = CreateCustomQASchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.message, 422);

    const qa = await prisma.customQA.create({
      data: {
        tenantId,
        chatbotId: params.id,
        question: parsed.data.question,
        answer: parsed.data.answer,
      },
      select: { id: true, question: true, answer: true, createdAt: true },
    });

    return ok(qa, 201);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[POST /api/chatbots/[id]/qa]", e);
    return err("Internal server error", 500);
  }
}
