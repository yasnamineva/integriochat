import { type NextRequest } from "next/server";
import Stripe from "stripe";
import { prisma, requireTenantId } from "@/lib/db";
import { ok, err } from "@integriochat/utils";
import { getStripePriceId } from "@/lib/plans";
import type { PlanId } from "@/lib/plans";

/**
 * POST /api/stripe/checkout
 * Body: { plan?: PlanId, annual?: boolean }
 *
 * - FREE plan → no-op (just return success, no Stripe session needed)
 * - Existing customer with active Stripe subscription → Customer Portal
 * - New customer → Checkout Session for the requested plan (monthly or annual)
 */
export async function POST(req: NextRequest) {
  try {
    const tenantId = await requireTenantId();

    const secretKey = process.env["STRIPE_SECRET_KEY"];
    const baseUrl = process.env["NEXT_PUBLIC_BASE_URL"] ?? "http://localhost:3000";

    if (!secretKey) return err("Stripe is not configured", 503);

    const body = await req.json().catch(() => ({})) as { plan?: string; annual?: boolean };
    const validPaidPlans: PlanId[] = ["HOBBY", "STANDARD", "PRO", "USAGE"];
    const planId: PlanId = validPaidPlans.includes(body.plan as PlanId)
      ? (body.plan as PlanId)
      : "HOBBY";
    // Annual billing only applies to flat-rate plans (not USAGE which is metered)
    const annual = body.annual === true && planId !== "USAGE";

    const stripe = new Stripe(secretKey);

    const subscription = await prisma.subscription.findFirst({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });

    // ── Existing Stripe customer → Customer Portal for plan changes ──────────
    // The portal shows the prorated charge and requires the user to confirm
    // before any billing change takes effect.
    if (subscription?.stripeCustomerId) {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: subscription.stripeCustomerId,
        return_url: `${baseUrl}/billing`,
      });
      return ok({ url: portalSession.url });
    }

    // ── New or unlinked customer → Checkout Session ───────────────────────────
    const priceId = getStripePriceId(planId, annual);
    if (!priceId) {
      return err(
        `Stripe price for the ${planId} plan (${annual ? "annual" : "monthly"}) is not configured. ` +
          `Set STRIPE_PRICE_${planId}${annual ? "_ANNUAL" : ""} in .env`,
        503
      );
    }

    let customerId = subscription?.stripeCustomerId ?? undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({ metadata: { tenantId } });
      customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      // USAGE plan uses metered billing — no quantity
      line_items: planId === "USAGE"
        ? [{ price: priceId }]
        : [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/billing?success=true`,
      cancel_url: `${baseUrl}/billing`,
      metadata: { tenantId, plan: planId, annual: annual ? "true" : "false" },
    });

    return ok({ url: session.url });
  } catch (e) {
    if (e instanceof Response) return e;
    if (e instanceof Stripe.errors.StripeInvalidRequestError) {
      if (e.code === "resource_missing" && e.param?.includes("price")) {
        console.error("[POST /api/stripe/checkout]", e.message);
        return err(
          "The configured Stripe price does not exist. Make sure the STRIPE_PRICE_* env vars point to prices in the correct Stripe mode (test vs live).",
          503
        );
      }
    }
    console.error("[POST /api/stripe/checkout]", e);
    return err("Internal server error", 500);
  }
}
