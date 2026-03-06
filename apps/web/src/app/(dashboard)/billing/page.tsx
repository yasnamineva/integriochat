import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.js";
import { prisma } from "@/lib/db.js";
import { Card, CardHeader, CardTitle, Badge, Button } from "@integriochat/ui";

const statusVariant = {
  TRIALING: "info",
  ACTIVE: "success",
  PAST_DUE: "warning",
  CANCELED: "danger",
} as const;

export default async function BillingPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as Record<string, unknown> | undefined;
  const tenantId = user?.["tenantId"] as string | undefined;

  const subscription = tenantId
    ? await prisma.subscription.findFirst({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
      })
    : null;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Billing</h1>

      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
        </CardHeader>

        {subscription ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Badge variant={statusVariant[subscription.status] ?? "default"}>
                {subscription.status}
              </Badge>
            </div>
            {subscription.currentPeriodEnd && (
              <p className="text-sm text-gray-500">
                Current period ends:{" "}
                {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </p>
            )}
            {subscription.trialEndsAt && subscription.status === "TRIALING" && (
              <p className="text-sm text-gray-500">
                Trial ends: {new Date(subscription.trialEndsAt).toLocaleDateString()}
              </p>
            )}
          </div>
        ) : (
          <p className="text-gray-500">No active subscription.</p>
        )}

        <div className="mt-6">
          {/* TODO: Wire up Stripe Checkout session creation */}
          <Button disabled>Manage Subscription (Coming Soon)</Button>
        </div>
      </Card>
    </div>
  );
}
