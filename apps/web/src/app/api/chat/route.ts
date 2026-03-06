import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db.js";
import { err } from "@integriochat/utils";
import { ChatMessageSchema } from "@integriochat/utils";

/**
 * POST /api/chat
 *
 * Streams an AI response for an embedded chatbot.
 * Public endpoint — authenticated via chatbotId + validated Origin header.
 *
 * TODO: Replace stub stream with actual OpenAI streaming via Vercel AI SDK.
 * TODO: Add Upstash rate limiting before processing.
 * TODO: Perform pgvector similarity search for relevant context chunks.
 */
export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    const parsed = ChatMessageSchema.safeParse(body);
    if (!parsed.success) {
      return err(parsed.error.message, 422);
    }

    const { chatbotId, sessionId, message } = parsed.data;

    // Validate chatbot exists and subscription allows access
    const chatbot = await prisma.chatbot.findFirst({
      where: { id: chatbotId, isActive: true },
      include: {
        tenant: {
          include: {
            subscriptions: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    if (!chatbot) {
      return err("Chatbot not found", 404);
    }

    // Check subscription status — only active/trialing tenants can use chat
    const subscription = chatbot.tenant.subscriptions[0];
    if (
      !subscription ||
      (subscription.status !== "ACTIVE" && subscription.status !== "TRIALING")
    ) {
      return err("Subscription inactive", 403);
    }

    // Validate CORS origin against tenant's allowed domains
    const origin = req.headers.get("origin") ?? "";
    const allowedDomains = chatbot.tenant.allowedDomains;
    if (allowedDomains.length > 0 && !allowedDomains.some((d) => origin.includes(d))) {
      return err("Origin not allowed", 403);
    }

    // Log the incoming user message
    await prisma.message.create({
      data: {
        tenantId: chatbot.tenantId,
        chatbotId,
        sessionId,
        role: "user",
        content: message, // stored as-is; never interpolated into system prompt
      },
    });

    // TODO: Retrieve top-k relevant chunks from pgvector using cosine similarity
    // const context = await retrieveContext(chatbotId, message);

    // TODO: Build prompt with system prompt + context + conversation history
    // SECURITY: System prompt and user input are kept strictly separate — never
    // interpolate user content into the system prompt string.

    // TODO: Stream response using Vercel AI SDK + OpenAI
    // const result = await streamText({
    //   model: openai("gpt-4o-mini"),
    //   system: chatbot.systemPrompt,  // ← separate from user message
    //   messages: [{ role: "user", content: message }],
    // });
    // return result.toDataStreamResponse();

    // ── STUB RESPONSE (replace with real AI stream) ──────────────────────────
    const stubReply = `[STUB] This is a placeholder response for chatbot "${chatbot.name}". OpenAI integration is pending.`;

    // Log the stub assistant message
    await prisma.message.create({
      data: {
        tenantId: chatbot.tenantId,
        chatbotId,
        sessionId,
        role: "assistant",
        content: stubReply,
      },
    });

    return new Response(
      JSON.stringify({ success: true, data: { reply: stubReply } }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[POST /api/chat]", e);
    return err("Internal server error", 500);
  }
}
