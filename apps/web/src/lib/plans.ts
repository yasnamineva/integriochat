/**
 * Plan configuration — single source of truth for limits, pricing, and Stripe price IDs.
 *
 * Chatbase-equivalent plan structure (monthly / annual pricing):
 *   FREE     — $0            — 100 msg/mo,    1 bot,  1 seat
 *   HOBBY    — $40  / $32    — 2 000 msg/mo,  2 bots, 1 seat
 *   STANDARD — $150 / $120   — 12 000 msg/mo, 5 bots, 3 seats  ← most popular
 *   PRO      — $500 / $400   — 40 000 msg/mo, 10 bots, 5 seats
 *   ENTERPRISE — custom      — unlimited
 *
 * Stripe setup (test mode):
 *   Create one Product per paid plan with TWO prices each (monthly + annual).
 *   Set env vars:
 *     STRIPE_PRICE_HOBBY          STRIPE_PRICE_HOBBY_ANNUAL
 *     STRIPE_PRICE_STANDARD       STRIPE_PRICE_STANDARD_ANNUAL
 *     STRIPE_PRICE_PRO            STRIPE_PRICE_PRO_ANNUAL
 *     STRIPE_PRICE_ENTERPRISE     (optional — usually handled manually)
 */

export type PlanId = "FREE" | "HOBBY" | "STANDARD" | "PRO" | "ENTERPRISE" | "USAGE";

export interface PlanFeatures {
  /** Access to all AI models (GPT-4o, etc.). false = gpt-4o-mini only. */
  allModels: boolean;
  /** REST API access via chatbot API key. */
  apiAccess: boolean;
  /** Remove "Powered by IntegrioChat" branding from widget. */
  removeBranding: boolean;
  /** Auto-retrain when website sources change. */
  autoRetrain: boolean;
  /** Advanced analytics dashboard. */
  advancedAnalytics: boolean;
  /** Priority email/chat support. */
  prioritySupport: boolean;
  /** Custom domain for widget & demo pages. */
  customDomain: boolean;
  /** SLA guarantees. */
  sla: boolean;
  /** Dedicated customer success manager. */
  dedicatedCsm: boolean;
  /** Outbound webhooks on chatbot events. */
  webhooks: boolean;
  /** Third-party integrations (Slack, WhatsApp, Zapier…). */
  integrations: boolean;
}

export interface PlanLimits {
  /** Max user messages per calendar month. -1 = unlimited. */
  messagesPerMonth: number;
  /** Max chatbots per tenant. -1 = unlimited. */
  chatbots: number;
  /** Max team seats per tenant. -1 = unlimited. */
  seats: number;
  /** Max pages crawled per scrape job. */
  scrapePages: number;
}

export interface PlanConfig {
  id: PlanId;
  name: string;
  /** USD/month billed monthly. 0 = free or custom. */
  monthlyPrice: number;
  /** USD/month when billed annually (20 % off). */
  annualPrice: number;
  /** True for Enterprise — show "Contact us" instead of a price. */
  custom: boolean;
  /** env var holding the monthly Stripe price ID. */
  stripePriceEnvKey: string;
  /** env var holding the annual Stripe price ID. */
  stripeAnnualPriceEnvKey?: string;
  limits: PlanLimits;
  features: PlanFeatures;
  /** Human-readable bullet points shown on pricing cards. */
  featureList: string[];
  highlighted?: boolean;
}

/** Multiplier applied to raw AI cost to derive the billed amount. Internal only. */
export const USAGE_MARGIN_MULTIPLIER = 20;

/** Published per-message rate for the USAGE plan (USD per AI response). */
export const USAGE_BILLED_PER_MESSAGE = 0.005; // $0.005 per message = $5 per 1,000 messages

export const PLANS: Record<PlanId, PlanConfig> = {
  USAGE: {
    id: "USAGE",
    name: "Pay as you go",
    monthlyPrice: 0,
    annualPrice: 0,
    custom: false,
    stripePriceEnvKey: "STRIPE_PRICE_USAGE",
    limits: { messagesPerMonth: -1, chatbots: -1, seats: 1, scrapePages: 15 },
    features: {
      allModels: true,
      apiAccess: true,
      removeBranding: true,
      autoRetrain: true,
      advancedAnalytics: true,
      prioritySupport: false,
      customDomain: false,
      sla: false,
      dedicatedCsm: false,
      webhooks: true,
      integrations: true,
    },
    featureList: [
      "Unlimited chatbots",
      "Pay per token — no monthly commitment",
      "Set per-chatbot message & spend caps",
      "All AI models",
      "Remove \"Powered by\" branding",
      "API access + webhooks",
      "Auto-retrain on source changes",
      "Advanced analytics",
    ],
  },

  FREE: {
    id: "FREE",
    name: "Free",
    monthlyPrice: 0,
    annualPrice: 0,
    custom: false,
    stripePriceEnvKey: "",
    limits: { messagesPerMonth: 100, chatbots: 1, seats: 1, scrapePages: 5 },
    features: {
      allModels: false,
      apiAccess: false,
      removeBranding: false,
      autoRetrain: false,
      advancedAnalytics: false,
      prioritySupport: false,
      customDomain: false,
      sla: false,
      dedicatedCsm: false,
      webhooks: false,
      integrations: false,
    },
    featureList: [
      "1 chatbot",
      "100 messages / month",
      "1 team seat",
      "GPT-4o Mini model",
      "Website embedding",
      "Lead capture",
      "Basic analytics",
      "Community support",
    ],
  },

  HOBBY: {
    id: "HOBBY",
    name: "Hobby",
    monthlyPrice: 40,
    annualPrice: 32,
    custom: false,
    stripePriceEnvKey: "STRIPE_PRICE_HOBBY",
    stripeAnnualPriceEnvKey: "STRIPE_PRICE_HOBBY_ANNUAL",
    limits: { messagesPerMonth: 2_000, chatbots: 2, seats: 1, scrapePages: 10 },
    features: {
      allModels: true,
      apiAccess: true,
      removeBranding: false,
      autoRetrain: false,
      advancedAnalytics: false,
      prioritySupport: false,
      customDomain: false,
      sla: false,
      dedicatedCsm: false,
      webhooks: true,
      integrations: true,
    },
    featureList: [
      "2 chatbots",
      "2,000 messages / month",
      "1 team seat",
      "All AI models (GPT-4o, etc.)",
      "API access",
      "Webhooks",
      "Slack & WhatsApp integrations",
      "Basic analytics",
    ],
  },

  STANDARD: {
    id: "STANDARD",
    name: "Standard",
    monthlyPrice: 150,
    annualPrice: 120,
    custom: false,
    stripePriceEnvKey: "STRIPE_PRICE_STANDARD",
    stripeAnnualPriceEnvKey: "STRIPE_PRICE_STANDARD_ANNUAL",
    highlighted: true,
    limits: { messagesPerMonth: 12_000, chatbots: 5, seats: 3, scrapePages: 20 },
    features: {
      allModels: true,
      apiAccess: true,
      removeBranding: true,
      autoRetrain: true,
      advancedAnalytics: true,
      prioritySupport: false,
      customDomain: false,
      sla: false,
      dedicatedCsm: false,
      webhooks: true,
      integrations: true,
    },
    featureList: [
      "5 chatbots",
      "12,000 messages / month",
      "3 team seats",
      "All AI models",
      "Remove \"Powered by\" branding",
      "Auto-retrain on source changes",
      "Advanced analytics",
      "All integrations",
    ],
  },

  PRO: {
    id: "PRO",
    name: "Pro",
    monthlyPrice: 500,
    annualPrice: 400,
    custom: false,
    stripePriceEnvKey: "STRIPE_PRICE_PRO",
    stripeAnnualPriceEnvKey: "STRIPE_PRICE_PRO_ANNUAL",
    limits: { messagesPerMonth: 40_000, chatbots: 10, seats: 5, scrapePages: 20 },
    features: {
      allModels: true,
      apiAccess: true,
      removeBranding: true,
      autoRetrain: true,
      advancedAnalytics: true,
      prioritySupport: true,
      customDomain: false,
      sla: false,
      dedicatedCsm: false,
      webhooks: true,
      integrations: true,
    },
    featureList: [
      "10 chatbots",
      "40,000 messages / month",
      "5 team seats",
      "All AI models",
      "Remove \"Powered by\" branding",
      "Auto-retrain on source changes",
      "Advanced analytics",
      "Priority support",
      "All integrations + webhooks",
    ],
  },

  ENTERPRISE: {
    id: "ENTERPRISE",
    name: "Enterprise",
    monthlyPrice: 0,
    annualPrice: 0,
    custom: true,
    stripePriceEnvKey: "STRIPE_PRICE_ENTERPRISE",
    limits: { messagesPerMonth: -1, chatbots: -1, seats: -1, scrapePages: 50 },
    features: {
      allModels: true,
      apiAccess: true,
      removeBranding: true,
      autoRetrain: true,
      advancedAnalytics: true,
      prioritySupport: true,
      customDomain: true,
      sla: true,
      dedicatedCsm: true,
      webhooks: true,
      integrations: true,
    },
    featureList: [
      "Unlimited chatbots",
      "Unlimited messages",
      "Unlimited team seats",
      "Full white-label & custom domain",
      "Custom AI models",
      "SLA guarantees",
      "Dedicated success manager",
      "Custom integrations",
      "Priority onboarding",
    ],
  },
};

export function getPlanConfig(planId: PlanId | string): PlanConfig {
  // Backward-compat mapping for old plan IDs stored in DB before migration
  const compat: Record<string, PlanId> = {
    STARTER: "HOBBY",
    GROWTH: "STANDARD",
    BUSINESS: "PRO",
  };
  const resolved = (compat[planId] ?? planId) as PlanId;
  return PLANS[resolved] ?? PLANS.FREE;
}

/** Resolve the Stripe price ID for a plan and billing period. */
export function getStripePriceId(
  planId: PlanId,
  annual = false
): string | undefined {
  const plan = PLANS[planId];
  if (!plan || plan.custom || !plan.stripePriceEnvKey) return undefined;
  if (annual && plan.stripeAnnualPriceEnvKey) {
    return process.env[plan.stripeAnnualPriceEnvKey];
  }
  return process.env[plan.stripePriceEnvKey];
}
