import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { dispatchWebhookEvent } from "@/services/webhook.service";

const CreateLeadSchema = z.object({
  chatbotId: z.string().uuid(),
  sessionId: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1).max(100).optional(),
  phone: z.string().max(30).optional(),
});

/**
 * POST /api/leads — public endpoint, called by the widget
 * Captures a lead from a chat session when leadCapture is enabled on the chatbot.
 */
export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = CreateLeadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.message }, { status: 422 });
    }

    const { chatbotId, sessionId, email, name, phone } = parsed.data;

    // Verify chatbot exists and has leadCapture enabled
    const chatbot = await prisma.chatbot.findFirst({
      where: { id: chatbotId, isActive: true },
      select: { id: true, tenantId: true, leadCapture: true },
    });

    if (!chatbot) {
      return NextResponse.json({ success: false, error: "Chatbot not found" }, { status: 404 });
    }

    if (!chatbot.leadCapture) {
      return NextResponse.json({ success: false, error: "Lead capture is not enabled" }, { status: 403 });
    }

    const lead = await prisma.lead.create({
      data: {
        tenantId: chatbot.tenantId,
        chatbotId,
        sessionId,
        email,
        name: name ?? null,
        phone: phone ?? null,
      },
    });

    // Fire lead.captured webhook (fire-and-forget)
    void dispatchWebhookEvent(chatbotId, "lead.captured", sessionId, {
      leadId: lead.id,
      email,
      name: name ?? null,
    });

    return NextResponse.json({ success: true, data: { id: lead.id } }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/leads]", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
