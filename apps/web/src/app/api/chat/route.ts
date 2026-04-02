import { type NextRequest } from "next/server";
import OpenAI from "openai";
import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions";
import { prisma } from "@/lib/db";
import { err } from "@integriochat/utils";
import { ChatMessageSchema } from "@integriochat/utils";
import { retrieveContext } from "@/services/embedding.service";
import { webSearch } from "@/services/search.service";
import { checkMessageLimit, checkChatbotLimits, reportMessageUsage, logUsage } from "@/services/usage.service";
import { dispatchWebhookEvent } from "@/services/webhook.service";

/**
 * POST /api/chat
 *
 * Streams an AI response for an embedded chatbot.
 * Public endpoint — authenticated via chatbotId + validated Origin header.
 *
 * When webSearchEnabled is true on the chatbot, the model may call the
 * built-in `web_search` tool (backed by Tavily) to look up real-time
 * information before composing its final reply.
 *
 * Returns a plain text/event-stream response — each chunk is raw text, NOT
 * the Vercel AI SDK data-stream format (which encodes as `0:"token"`).
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

    // ── Plan-level limit check ────────────────────────────────────────────────
    const limitCheck = await checkMessageLimit(chatbot.tenantId, subscription.plan);
    if (!limitCheck.allowed) {
      return err(
        `Monthly message limit reached (${limitCheck.used.toLocaleString()} / ${limitCheck.limit.toLocaleString()}). ` +
          "Upgrade your plan to continue.",
        429
      );
    }

    // ── Per-chatbot caps (USAGE plan) ─────────────────────────────────────────
    const chatbotLimitCheck = await checkChatbotLimits({
      id: chatbot.id,
      tenantId: chatbot.tenantId,
      monthlyMessageLimit: chatbot.monthlyMessageLimit,
      monthlySpendLimitCents: chatbot.monthlySpendLimitCents,
    });
    if (!chatbotLimitCheck.allowed) {
      return err(chatbotLimitCheck.reason ?? "Chatbot limit reached", 429);
    }

    // ── CORS: validate Origin against tenant's allowed domains ───────────────
    const origin = req.headers.get("origin") ?? "";
    // Derive own origin from request headers so the check works on any
    // deployment URL without needing NEXT_PUBLIC_BASE_URL to be set.
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
    const proto = req.headers.get("x-forwarded-proto") ?? "https";
    const ownOrigin = host ? `${proto}://${host}` : (process.env["NEXT_PUBLIC_BASE_URL"] ?? "http://localhost:3000");
    const allowedDomains = chatbot.allowedDomains;
    const originAllowed =
      !origin ||                   // no Origin header = same-origin curl/server request
      allowedDomains.length === 0 || // no domain restriction — allow all
      origin === ownOrigin ||      // dashboard preview (same app)
      allowedDomains.some((d) => {
        if (d.startsWith("*.")) {
          const base = d.slice(2);
          try {
            const { hostname } = new URL(origin);
            return hostname === base || hostname.endsWith(`.${base}`);
          } catch { return false; }
        }
        try {
          return new URL(origin).hostname === d;
        } catch { return false; }
      });
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
    const history = allPrev.slice(0, -1).slice(-10);

    // First message in this session → fire conversation.started webhook
    const isFirstMessage = allPrev.length === 1;
    if (isFirstMessage) {
      void dispatchWebhookEvent(chatbotId, "conversation.started", sessionId, {
        chatbotId,
      });
    }

    // ── RAG: retrieve relevant context chunks from pgvector ──────────────────
    const chunks = await retrieveContext(chatbot.id, chatbot.tenantId, message);

    // ── Custom Q&A pairs (highest priority) ──────────────────────────────────
    const customQAs = await prisma.customQA.findMany({
      where: { chatbotId, tenantId: chatbot.tenantId },
      select: { question: true, answer: true },
      orderBy: { createdAt: "asc" },
    });

    // ── Build system prompt ───────────────────────────────────────────────────
    // SECURITY: user input is NEVER interpolated into the system prompt.
    let systemContent = chatbot.systemPrompt;

    if (chatbot.webSearchEnabled) {
      systemContent +=
        "\n\nYou have access to a `web_search` tool. Use it whenever the user's question requires up-to-date or real-time information (e.g. news, prices, availability, schedules, weather). Do NOT search for information that you already know with confidence or that is in the knowledge base below.";
    }

    if (chatbot.fallbackMsg) {
      systemContent +=
        `\n\nIf you cannot find a relevant answer in the provided context, respond with exactly: "${chatbot.fallbackMsg}"`;
    }

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

    // ── Assemble message history ──────────────────────────────────────────────
    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: systemContent },
      ...history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    const openai = new OpenAI();
    const model = chatbot.aiModel ?? "gpt-4o-mini";
    const temperature = chatbot.temperature ?? 0.7;
    const max_tokens = chatbot.maxTokens ?? 500;

    const tenantId = chatbot.tenantId;
    const stripeCustomerId =
      subscription.plan === "USAGE" ? (subscription.stripeCustomerId ?? null) : null;
    const encoder = new TextEncoder();

    // ── Web-search path (tool-calling) ────────────────────────────────────────
    if (chatbot.webSearchEnabled) {
      const tools: ChatCompletionTool[] = [
        {
          type: "function",
          function: {
            name: "web_search",
            description:
              "Search the internet for real-time information. Use this for current events, live availability, prices, news, weather, and any other time-sensitive queries.",
            parameters: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "The search query to look up.",
                },
              },
              required: ["query"],
            },
          },
        },
      ];

      const stream = new ReadableStream({
        async start(controller) {
          let fullReply = "";

          try {
            // ── Phase 1: let the model decide whether to search ─────────────
            // Buffer this pass silently — we need to inspect finish_reason.
            const pass1 = await openai.chat.completions.create({
              model,
              temperature,
              max_tokens,
              stream: true,
              tools,
              tool_choice: "auto",
              messages,
            });

            let phase1Content = "";
            let finishReason: string | null = null;
            const toolCallMap: Record<
              number,
              { id: string; name: string; argsRaw: string }
            > = {};

            for await (const chunk of pass1) {
              const choice = chunk.choices[0];
              if (!choice) continue;

              const delta = choice.delta;

              if (delta.content) {
                phase1Content += delta.content;
              }

              if (delta.tool_calls) {
                for (const tc of delta.tool_calls) {
                  const idx = tc.index;
                  if (!toolCallMap[idx]) {
                    toolCallMap[idx] = { id: "", name: "", argsRaw: "" };
                  }
                  if (tc.id) toolCallMap[idx]!.id = tc.id;
                  if (tc.function?.name) toolCallMap[idx]!.name += tc.function.name;
                  if (tc.function?.arguments) toolCallMap[idx]!.argsRaw += tc.function.arguments;
                }
              }

              if (choice.finish_reason) finishReason = choice.finish_reason;
            }

            // ── Tool call execution ─────────────────────────────────────────
            if (finishReason === "tool_calls" && Object.keys(toolCallMap).length > 0) {
              // Build assistant message with tool_calls for the follow-up
              const assistantToolCallMsg: ChatCompletionMessageParam = {
                role: "assistant",
                content: phase1Content || null,
                tool_calls: Object.values(toolCallMap).map((tc) => ({
                  id: tc.id,
                  type: "function" as const,
                  function: { name: tc.name, arguments: tc.argsRaw },
                })),
              };

              // Execute each tool call (in parallel when there are multiple)
              const toolResultMsgs: ChatCompletionMessageParam[] = await Promise.all(
                Object.values(toolCallMap).map(async (tc) => {
                  let resultContent: string;
                  try {
                    if (tc.name === "web_search") {
                      const args = JSON.parse(tc.argsRaw) as { query: string };
                      const { answer, results } = await webSearch(args.query, 5);

                      const parts: string[] = [];
                      if (answer) parts.push(`Summary: ${answer}`);
                      results.forEach((r, i) => {
                        parts.push(`[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.snippet}`);
                      });
                      resultContent = parts.join("\n\n");
                    } else {
                      resultContent = `Unknown tool: ${tc.name}`;
                    }
                  } catch (e) {
                    console.error(`[web_search] tool error:`, e);
                    resultContent = "Search failed. Please try again.";
                  }

                  return {
                    role: "tool" as const,
                    tool_call_id: tc.id,
                    content: resultContent,
                  };
                })
              );

              // ── Phase 2: stream final answer with search results ───────────
              const pass2 = await openai.chat.completions.create({
                model,
                temperature,
                max_tokens,
                stream: true,
                messages: [...messages, assistantToolCallMsg, ...toolResultMsgs],
              });

              for await (const chunk of pass2) {
                const delta = chunk.choices[0]?.delta?.content ?? "";
                if (delta) {
                  fullReply += delta;
                  controller.enqueue(encoder.encode(delta));
                }
              }
            } else {
              // No tool calls — flush the buffered phase-1 content
              fullReply = phase1Content;
              if (fullReply) {
                controller.enqueue(encoder.encode(fullReply));
              }
            }
          } finally {
            controller.close();
          }

          // Post-stream: log + usage
          try {
            await prisma.message.create({
              data: { tenantId, chatbotId, sessionId, role: "assistant", content: fullReply },
            });
          } catch (e) {
            console.error("[POST /api/chat] failed to log assistant message", e);
          }

          void logUsage(tenantId, chatbotId, systemContent + message, fullReply);
          if (stripeCustomerId) void reportMessageUsage(stripeCustomerId);
          void dispatchWebhookEvent(chatbotId, "message.completed", sessionId, {
            message,
            reply: fullReply,
          });
        },
      });

      return new Response(stream, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    // ── Standard streaming path (no web search) ───────────────────────────────
    const completion = await openai.chat.completions.create({
      model,
      temperature,
      max_tokens,
      stream: true,
      messages,
    });

    const stream = new ReadableStream({
      async start(controller) {
        let fullReply = "";
        try {
          for await (const chunk of completion) {
            const delta = chunk.choices[0]?.delta?.content ?? "";
            if (delta) {
              fullReply += delta;
              controller.enqueue(encoder.encode(delta));
            }
          }
        } finally {
          controller.close();
        }

        try {
          await prisma.message.create({
            data: { tenantId, chatbotId, sessionId, role: "assistant", content: fullReply },
          });
        } catch (e) {
          console.error("[POST /api/chat] failed to log assistant message", e);
        }

        void logUsage(tenantId, chatbotId, systemContent + message, fullReply);
        if (stripeCustomerId) void reportMessageUsage(stripeCustomerId);
        void dispatchWebhookEvent(chatbotId, "message.completed", sessionId, {
          message,
          reply: fullReply,
        });
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (e) {
    console.error("[POST /api/chat]", e);
    return err("Internal server error", 500);
  }
}

/**
 * OPTIONS /api/chat
 *
 * Handles CORS preflight requests from the widget on third-party domains.
 * The actual origin validation happens in POST; here we just allow the
 * browser to proceed to the real request.
 */
export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}
