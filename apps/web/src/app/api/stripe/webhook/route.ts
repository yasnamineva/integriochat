import { type NextRequest } from "next/server";
import Stripe from "stripe";
// TODO: import { prisma } from "@/lib/db"; — needed when implementing webhook handlers

/**
 * POST /api/stripe/webhook
 *
 * Handles Stripe webhook events. Signature is verified before any processing.
 *
 * TODO: Implement full handlers for each event type.
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

  try {
    const rawBody = await req.text();
    const stripe = new Stripe(process.env["STRIPE_SECRET_KEY"] ?? "");
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
      case "checkout.session.completed": {
        // TODO: Create or update subscription record, set status to ACTIVE/TRIALING
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("[Stripe] checkout.session.completed", session.id);
        break;
      }

      case "invoice.paid": {
        // TODO: Update subscription.currentPeriodEnd, set status to ACTIVE
        const invoice = event.data.object as Stripe.Invoice;
        console.log("[Stripe] invoice.paid", invoice.id);
        break;
      }

      case "invoice.payment_failed": {
        // TODO: Set subscription status to PAST_DUE, notify tenant
        const invoice = event.data.object as Stripe.Invoice;
        console.log("[Stripe] invoice.payment_failed", invoice.id);
        break;
      }

      case "customer.subscription.deleted": {
        // TODO: Set subscription status to CANCELED, disable chatbots
        const subscription = event.data.object as Stripe.Subscription;
        console.log("[Stripe] customer.subscription.deleted", subscription.id);
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
