import Stripe from "stripe";
import { prisma, requireTenantId } from "@/lib/db";
import { ok, err } from "@integriochat/utils";

/**
 * DELETE /api/tenants/me
 *
 * Self-service account deletion. Cancels any active Stripe subscription,
 * then deletes the tenant and all cascaded data (users, chatbots, messages, etc.).
 *
 * This action is irreversible.
 */
export async function DELETE() {
  try {
    const tenantId = await requireTenantId();

    // Cancel active Stripe subscription before deleting tenant data
    const subscription = await prisma.subscription.findFirst({
      where: { tenantId, status: { in: ["ACTIVE", "TRIALING"] } },
      select: { stripeSubscriptionId: true },
    });

    if (subscription?.stripeSubscriptionId) {
      const stripe = new Stripe(process.env["STRIPE_SECRET_KEY"] ?? "", {
        apiVersion: "2025-01-27.acacia",
      });
      await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
    }

    // Cascade-delete the tenant and all related records
    await prisma.tenant.delete({ where: { id: tenantId } });

    return ok({ deleted: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[DELETE /api/tenants/me]", e);
    return err("Internal server error", 500);
  }
}
