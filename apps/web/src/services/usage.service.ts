import Stripe from "stripe";
import { prisma } from "@/lib/db";
import { getPlanConfig, USAGE_MARGIN_MULTIPLIER } from "@/lib/plans";
import type { PlanId } from "@/lib/plans";


/** Start of the current calendar month (UTC midnight on day 1). */
function startOfCurrentMonth(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

/** Count user-initiated messages sent by a tenant in the current calendar month. */
export async function getMonthlyMessageCount(tenantId: string): Promise<number> {
  return prisma.message.count({
    where: { tenantId, role: "user", createdAt: { gte: startOfCurrentMonth() } },
  });
}

export interface LimitCheck {
  /** Whether another message may be sent. */
  allowed: boolean;
  used: number;
  /** -1 = unlimited (metered plan). */
  limit: number;
}

/**
 * Check whether a tenant can send another chat message given their plan.
 * Call this BEFORE logging the new user message so the count is accurate.
 */
export async function checkMessageLimit(
  tenantId: string,
  planId: PlanId | string
): Promise<LimitCheck> {
  const plan = getPlanConfig(planId);
  const { messagesPerMonth } = plan.limits;

  if (messagesPerMonth === -1) {
    return { allowed: true, used: 0, limit: -1 };
  }

  const used = await getMonthlyMessageCount(tenantId);
  return { allowed: used < messagesPerMonth, used, limit: messagesPerMonth };
}

export interface ChatbotLimitCheck {
  allowed: boolean;
  reason?: string;
}

/**
 * Check per-chatbot caps set by the developer (USAGE plan).
 * Returns { allowed: false, reason } if either cap is exceeded this month.
 */
export async function checkChatbotLimits(chatbot: {
  id: string;
  tenantId: string;
  monthlyMessageLimit: number | null;
  monthlySpendLimitCents: number | null;
}): Promise<ChatbotLimitCheck> {
  const start = startOfCurrentMonth();

  // Message cap
  if (chatbot.monthlyMessageLimit !== null) {
    const used = await prisma.message.count({
      where: { chatbotId: chatbot.id, role: "user", createdAt: { gte: start } },
    });
    if (used >= chatbot.monthlyMessageLimit) {
      return {
        allowed: false,
        reason: `This chatbot has reached its monthly message limit (${chatbot.monthlyMessageLimit.toLocaleString()} messages).`,
      };
    }
  }

  // Spend cap — compare billed amount (AI cost × margin multiplier) against the cap
  if (chatbot.monthlySpendLimitCents !== null) {
    const result = await prisma.usageLog.aggregate({
      where: { chatbotId: chatbot.id, createdAt: { gte: start } },
      _sum: { costUsd: true },
    });
    const rawCostUsd = Number(result._sum.costUsd ?? 0);
    const billedCents = Math.ceil(rawCostUsd * USAGE_MARGIN_MULTIPLIER * 100);
    if (billedCents >= chatbot.monthlySpendLimitCents) {
      const limitDollars = (chatbot.monthlySpendLimitCents / 100).toFixed(2);
      return {
        allowed: false,
        reason: `This chatbot has reached its monthly spend cap ($${limitDollars}).`,
      };
    }
  }

  return { allowed: true };
}

/**
 * Check the tenant-level monthly spending cap for USAGE plan subscriptions.
 * Aggregates raw AI cost across all chatbots for the current calendar month,
 * applies the billing margin, and blocks further usage once the cap is hit.
 */
export async function checkTenantSpendCap(
  tenantId: string,
  usageCapCents: number | null
): Promise<ChatbotLimitCheck> {
  if (usageCapCents === null) return { allowed: true };

  const result = await prisma.usageLog.aggregate({
    where: { tenantId, createdAt: { gte: startOfCurrentMonth() } },
    _sum: { costUsd: true },
  });
  const rawCostUsd = Number(result._sum.costUsd ?? 0);
  const billedCents = Math.ceil(rawCostUsd * USAGE_MARGIN_MULTIPLIER * 100);

  if (billedCents >= usageCapCents) {
    const limitDollars = (usageCapCents / 100).toFixed(2);
    return {
      allowed: false,
      reason: `Monthly spending cap of $${limitDollars} reached. Please contact support to increase your limit.`,
    };
  }
  return { allowed: true };
}

/**
 * Report 1 message event to Stripe Meters for USAGE plan billing.
 * Uses the new Billing Meters API (event-based), not the legacy createUsageRecord.
 *
 * Requires:
 *   STRIPE_SECRET_KEY       — Stripe secret key
 *   STRIPE_METER_EVENT      — event_name set when creating the meter in Stripe dashboard
 *                             (default: "integriochat_message")
 *
 * Non-fatal — chat response is always returned even if this fails.
 */
export async function reportMessageUsage(stripeCustomerId: string): Promise<void> {
  const secretKey = process.env["STRIPE_SECRET_KEY"];
  const eventName = process.env["STRIPE_METER_EVENT"] ?? "integriochat_message";
  if (!secretKey) return;
  try {
    const stripe = new Stripe(secretKey);
    await stripe.billing.meterEvents.create({
      event_name: eventName,
      payload: {
        value: "1",
        stripe_customer_id: stripeCustomerId,
      },
    });
  } catch (e) {
    console.error("[usage] failed to report Stripe meter event:", e);
  }
}

/**
 * Write a UsageLog row after a chat completion.
 * Estimates token count from text length (~4 chars per token).
 * Cost estimate uses gpt-4o-mini pricing: $0.150/1M input + $0.600/1M output.
 */
export async function logUsage(
  tenantId: string,
  chatbotId: string,
  inputText: string,
  outputText: string
): Promise<void> {
  try {
    const inputTokens = Math.ceil(inputText.length / 4);
    const outputTokens = Math.ceil(outputText.length / 4);
    const tokensUsed = inputTokens + outputTokens;
    // gpt-4o-mini: $0.150/1M input + $0.600/1M output
    const costUsd = (inputTokens * 0.00000015) + (outputTokens * 0.0000006);

    await prisma.usageLog.create({
      data: { tenantId, chatbotId, tokensUsed, costUsd: String(costUsd.toFixed(6)) },
    });
  } catch (e) {
    console.error("[usage] failed to write UsageLog:", e);
  }
}
