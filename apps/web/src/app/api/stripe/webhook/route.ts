import { type NextRequest } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/db";
import type { SubscriptionStatus, Plan } from "@integriochat/db";

/** Map Stripe subscription statuses to our DB enum. */
function toDbStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  const map: Partial<Record<Stripe.Subscription.Status, SubscriptionStatus>> = {
    active: "ACTIVE",
    trialing: "TRIALING",
    past_due: "PAST_DUE",
    canceled: "CANCELED",
    unpaid: "PAST_DUE",
    incomplete: "PAST_DUE",
    incomplete_expired: "CANCELED",
    paused: "PAST_DUE",
  };
  return map[status] ?? "ACTIVE";
}

/**
 * POST /api/stripe/webhook
 *
 * All events are verified via the Stripe-Signature header before processing.
 * tenantId is recovered from session metadata (checkout.session.completed)
 * or from our DB subscription record (invoice / subscription events).
 */
export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env["STRIPE_WEBHOOK_SECRET"];

  if (!sig || !webhookSecret) {
    return new Response(
      JSON.stringify({ success: false, error: "Missing stripe signature" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  let event: Stripe.Event;
  const stripe = new Stripe(process.env["STRIPE_SECRET_KEY"] ?? "");

  try {
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (e) {
    console.error("[Stripe webhook] Signature verification failed:", e);
    return new Response(
      JSON.stringify({ success: false, error: "Invalid signature" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    switch (event.type) {
      // ── New subscription created via Checkout ─────────────────────────────
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const tenantId = session.metadata?.["tenantId"];
        if (!tenantId) {
          console.error("[Stripe] checkout.session.completed missing tenantId in metadata");
          break;
        }

        const stripeSubscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : (session.subscription?.id ?? null);
        const stripeCustomerId =
          typeof session.customer === "string"
            ? session.customer
            : (session.customer?.id ?? null);

        let status: SubscriptionStatus = "ACTIVE";
        let trialEndsAt: Date | null = null;
        let currentPeriodEnd: Date | null = null;
        let stripeItemId: string | null = null;
        let stripeUsageItemId: string | null = null;

        // Resolve plan from metadata (defaults to FREE)
        const validPlans: Plan[] = ["FREE", "HOBBY", "STANDARD", "PRO", "ENTERPRISE", "USAGE"];
        const plan: Plan = validPlans.includes(session.metadata?.["plan"] as Plan)
          ? (session.metadata!["plan"] as Plan)
          : "FREE";
        const billingPeriod = session.metadata?.["annual"] === "true" ? "ANNUAL" : "MONTHLY";

        if (stripeSubscriptionId) {
          const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
          status = toDbStatus(sub.status);
          trialEndsAt = sub.trial_end ? new Date(sub.trial_end * 1000) : null;
          currentPeriodEnd = new Date(sub.current_period_end * 1000);

          // Identify flat-rate vs metered subscription items
          const usagePriceId = process.env["STRIPE_PRICE_USAGE"];
          for (const item of sub.items.data) {
            if (usagePriceId && item.price.id === usagePriceId) {
              stripeUsageItemId = item.id;
            } else {
              stripeItemId = item.id;
            }
          }
        }

        // Upsert: update the existing seed/dev subscription or create a new one
        const existing = await prisma.subscription.findFirst({ where: { tenantId } });
        if (existing) {
          await prisma.subscription.update({
            where: { id: existing.id },
            data: { status, stripeCustomerId, stripeSubscriptionId, trialEndsAt, currentPeriodEnd, plan, billingPeriod, stripeItemId, stripeUsageItemId },
          });
        } else {
          await prisma.subscription.create({
            data: { tenantId, status, stripeCustomerId, stripeSubscriptionId, trialEndsAt, currentPeriodEnd, plan, billingPeriod, stripeItemId, stripeUsageItemId },
          });
        }

        console.log(`[Stripe] checkout.session.completed — tenant ${tenantId} → ${status}`);
        break;
      }

      // ── Invoice paid → subscription renewed ──────────────────────────────
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const stripeSubscriptionId =
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : (invoice.subscription?.id ?? null);

        if (!stripeSubscriptionId) break;

        const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        const currentPeriodEnd = new Date(sub.current_period_end * 1000);

        await prisma.subscription.update({
          where: { stripeSubscriptionId },
          data: { status: "ACTIVE", currentPeriodEnd },
        });

        console.log(`[Stripe] invoice.paid — ${stripeSubscriptionId} renewed`);
        break;
      }

      // ── Payment failed → mark past due ───────────────────────────────────
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const stripeSubscriptionId =
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : (invoice.subscription?.id ?? null);

        if (!stripeSubscriptionId) break;

        await prisma.subscription.update({
          where: { stripeSubscriptionId },
          data: { status: "PAST_DUE" },
        });

        console.log(`[Stripe] invoice.payment_failed — ${stripeSubscriptionId} → PAST_DUE`);
        break;
      }

      // ── Subscription plan changed (upgrade/downgrade via portal) ─────────
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const dbSub = await prisma.subscription.findFirst({
          where: { stripeSubscriptionId: sub.id },
        });
        if (!dbSub) break;

        const status = toDbStatus(sub.status);
        const currentPeriodEnd = new Date(sub.current_period_end * 1000);

        // Identify flat-rate vs metered items and resolve plan from price ID
        const usagePriceId = process.env["STRIPE_PRICE_USAGE"];
        let stripeItemId: string | null = null;
        let stripeUsageItemId: string | null = null;
        for (const item of sub.items.data) {
          if (usagePriceId && item.price.id === usagePriceId) {
            stripeUsageItemId = item.id;
          } else {
            stripeItemId = item.id;
          }
        }

        await prisma.subscription.update({
          where: { id: dbSub.id },
          data: { status, currentPeriodEnd, stripeItemId, stripeUsageItemId },
        });

        console.log(`[Stripe] customer.subscription.updated — ${sub.id} → ${status}`);
        break;
      }

      // ── Subscription canceled ─────────────────────────────────────────────
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;

        await prisma.subscription.update({
          where: { stripeSubscriptionId: sub.id },
          data: { status: "CANCELED", canceledAt: new Date() },
        });

        console.log(`[Stripe] customer.subscription.deleted — ${sub.id} → CANCELED`);
        break;
      }

      default:
        console.log(`[Stripe] Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[Stripe webhook] Handler error:", e);
    return new Response(
      JSON.stringify({ success: false, error: "Webhook handler failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
