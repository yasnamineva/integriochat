import { createHmac } from "crypto";
import { prisma } from "@/lib/db";

export type WebhookEventType =
  | "message.completed"
  | "conversation.started"
  | "lead.captured";

interface WebhookPayload {
  event: WebhookEventType;
  chatbotId: string;
  sessionId: string;
  timestamp: string;
  data: Record<string, unknown>;
}

function signPayload(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

/**
 * Dispatch a webhook event to all active, subscribed webhook endpoints
 * for a given chatbot. Fires concurrently and swallows individual delivery
 * failures — a single failing endpoint never blocks others.
 *
 * This function is fire-and-forget: call it with `void` so the caller
 * is not blocked while webhooks are delivered.
 */
export async function dispatchWebhookEvent(
  chatbotId: string,
  event: WebhookEventType,
  sessionId: string,
  data: Record<string, unknown> = {}
): Promise<void> {
  const webhooks = await prisma.webhook.findMany({
    where: { chatbotId, isActive: true, events: { has: event } },
    select: { id: true, url: true, secret: true },
  });

  if (webhooks.length === 0) return;

  const payload: WebhookPayload = {
    event,
    chatbotId,
    sessionId,
    timestamp: new Date().toISOString(),
    data,
  };
  const body = JSON.stringify(payload);

  await Promise.allSettled(
    webhooks.map(async (wh) => {
      const sig = signPayload(wh.secret, body);
      try {
        await fetch(wh.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Webhook-Signature": `sha256=${sig}`,
            "X-Webhook-Event": event,
          },
          body,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          signal: (AbortSignal as any).timeout(10_000),
        });
      } catch (e) {
        console.error(`[webhook] delivery failed for webhook ${wh.id}:`, e);
      }
    })
  );
}
