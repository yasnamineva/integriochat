import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/chat/config?chatbotId=UUID
 *
 * Public endpoint — returns the appearance configuration for an active chatbot.
 * Used by the embeddable widget to apply branding before showing the panel.
 */
export async function GET(req: NextRequest) {
  const chatbotId = req.nextUrl.searchParams.get("chatbotId");
  if (!chatbotId) {
    return NextResponse.json({ error: "Missing chatbotId" }, { status: 400 });
  }

  const chatbot = await prisma.chatbot.findFirst({
    where: { id: chatbotId, isActive: true },
    select: {
      name: true,
      chatTitle: true,
      chatAvatar: true,
      themeColor: true,
      widgetPosition: true,
      widgetTheme: true,
      initialMessage: true,
      suggestedQs: true,
    },
  });

  if (!chatbot) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    name: chatbot.name,
    chatTitle: chatbot.chatTitle ?? chatbot.name,
    chatAvatar: chatbot.chatAvatar ?? null,
    themeColor: chatbot.themeColor ?? "#6366f1",
    widgetPosition: chatbot.widgetPosition ?? "bottom-right",
    widgetTheme: chatbot.widgetTheme ?? "light",
    initialMessage: chatbot.initialMessage ?? "Hi! How can I help you today?",
    suggestedQs: chatbot.suggestedQs ?? [],
  });
}
