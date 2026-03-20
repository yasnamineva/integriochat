import { type NextRequest } from "next/server";
import Stripe from "stripe";
import { prisma, requireTenantId } from "@/lib/db";
import { ok, err } from "@integriochat/utils";

/**
 * POST /api/stripe/checkout
 *
 * - New customers (no Stripe subscription yet): creates a Checkout Session
 *   for the configured price, redirects to Stripe-hosted checkout.
 * - Existing customers with an active subscription: creates a Customer Portal
 *   session so they can update payment details, cancel, etc.
 *
 * Returns: { url: string } — the frontend should redirect to this URL.
 */
export async function POST(_req: NextRequest) {
  try {
    const tenantId = await requireTenantId();

    const secretKey = process.env["STRIPE_SECRET_KEY"];
    const priceId = process.env["STRIPE_PRICE_ID"];
    const baseUrl = process.env["NEXT_PUBLIC_BASE_URL"] ?? "http://localhost:3000";

    if (!secretKey) return err("Stripe is not configured", 503);

    const stripe = new Stripe(secretKey);

    const subscription = await prisma.subscription.findFirst({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });

    // ── Existing Stripe customer with a subscription → Customer Portal ────────
    if (subscription?.stripeCustomerId && subscription?.stripeSubscriptionId) {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: subscription.stripeCustomerId,
        return_url: `${baseUrl}/billing`,
      });
      return ok({ url: portalSession.url });
    }

    // ── New or unlinked customer → Checkout Session ───────────────────────────
    if (!priceId) return err("Stripe price is not configured", 503);

    let customerId = subscription?.stripeCustomerId ?? undefined;

    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { tenantId },
      });
      customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/billing?success=true`,
      cancel_url: `${baseUrl}/billing`,
      metadata: { tenantId },
    });

    return ok({ url: session.url });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[POST /api/stripe/checkout]", e);
    return err("Internal server error", 500);
  }
}
