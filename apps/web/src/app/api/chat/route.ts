import { type NextRequest } from "next/server";
import OpenAI from "openai";
import { OpenAIStream, StreamingTextResponse } from "ai";
import { prisma } from "@/lib/db";
import { err } from "@integriochat/utils";
import { ChatMessageSchema } from "@integriochat/utils";
import { retrieveContext } from "@/services/embedding.service";

/**
 * POST /api/chat
 *
 * Streams an AI response for an embedded chatbot.
 * Public endpoint — authenticated via chatbotId + validated Origin header.
 */
export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    const parsed = ChatMessageSchema.safeParse(body);
    if (!parsed.success) {
      return err(parsed.error.message, 422);
    }

    const { chatbotId, sessionId, message } = parsed.data;

    // ── Validate chatbot + subscription ──────────────────────────────────────
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

    if (!chatbot) return err("Chatbot not found", 404);

    const subscription = chatbot.tenant.subscriptions[0];
    if (
      !subscription ||
      (subscription.status !== "ACTIVE" && subscription.status !== "TRIALING")
    ) {
      return err("Subscription inactive", 403);
    }

    // ── CORS: validate Origin against tenant's allowed domains ───────────────
    // Also allow requests from our own domain (e.g. demo pages, dashboard preview).
    const origin = req.headers.get("origin") ?? "";
    const ownOrigin = process.env["NEXT_PUBLIC_BASE_URL"] ?? "http://localhost:3000";
    const allowedDomains = chatbot.tenant.allowedDomains;
    const originAllowed =
      allowedDomains.length === 0 ||
      origin === ownOrigin ||
      allowedDomains.some((d) => origin.includes(d));
    if (!originAllowed) {
      return err("Origin not allowed", 403);
    }

    // ── Log user message ─────────────────────────────────────────────────────
    await prisma.message.create({
      data: {
        tenantId: chatbot.tenantId,
        chatbotId,
        sessionId,
        role: "user",
        content: message,
      },
    });

    // ── Fetch conversation history (last 10 turns before this message) ───────
    const allPrev = await prisma.message.findMany({
      where: { chatbotId, sessionId },
      orderBy: { createdAt: "asc" },
      select: { role: true, content: true },
    });
    // Drop the message we just inserted (last item) — it's passed explicitly below
    const history = allPrev.slice(0, -1).slice(-10);

    // ── RAG: retrieve relevant context chunks from pgvector ──────────────────
    const chunks = await retrieveContext(chatbot.id, chatbot.tenantId, message);

    // ── Custom Q&A pairs (highest priority — prepended before website content) ─
    const customQAs = await prisma.customQA.findMany({
      where: { chatbotId, tenantId: chatbot.tenantId },
      select: { question: true, answer: true },
      orderBy: { createdAt: "asc" },
    });

    // ── Build system content ─────────────────────────────────────────────────
    // SECURITY: user input is NEVER interpolated into the system prompt.
    // It is always passed as a separate "user" message entry.
    let systemContent = chatbot.systemPrompt;

    if (customQAs.length > 0) {
      const qaBlock = customQAs
        .map((qa) => `Q: ${qa.question}\nA: ${qa.answer}`)
        .join("\n\n");
      systemContent +=
        "\n\n---\nUse the following predetermined answers for common questions (these take priority over other sources):\n\n" +
        qaBlock;
    }

    if (chunks.length > 0) {
      const contextBlock = chunks
        .map((c, i) => `[${i + 1}] (source: ${c.sourceUrl})\n${c.content}`)
        .join("\n\n");
      systemContent +=
        "\n\n---\nUse the following knowledge base excerpts to answer the user's question. " +
        "If the answer isn't in the excerpts, rely on your general knowledge.\n\n" +
        contextBlock;
    }

    // ── Stream via OpenAI ────────────────────────────────────────────────────
    const openai = new OpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      stream: true,
      messages: [
        { role: "system", content: systemContent },
        ...history.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        { role: "user", content: message },
      ],
    });

    const stream = OpenAIStream(completion, {
      async onFinal(assistantReply) {
        try {
          await prisma.message.create({
            data: {
              tenantId: chatbot.tenantId,
              chatbotId,
              sessionId,
              role: "assistant",
              content: assistantReply,
            },
          });
        } catch (e) {
          console.error("[POST /api/chat] failed to log assistant message", e);
        }
      },
    });

    return new StreamingTextResponse(stream);
  } catch (e) {
    console.error("[POST /api/chat]", e);
    return err("Internal server error", 500);
  }
}
