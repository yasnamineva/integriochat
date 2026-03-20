import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardHeader, CardTitle, Badge } from "@integriochat/ui";
import { CheckoutButton } from "@/components/CheckoutButton";

const statusVariant = {
  TRIALING: "info",
  ACTIVE: "success",
  PAST_DUE: "warning",
  CANCELED: "danger",
} as const;

interface Props {
  searchParams: { success?: string };
}

export default async function BillingPage({ searchParams }: Props) {
  const session = await getServerSession(authOptions);
  const user = session?.user as Record<string, unknown> | undefined;
  const tenantId = user?.["tenantId"] as string | undefined;

  const subscription = tenantId
    ? await prisma.subscription.findFirst({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
      })
    : null;

  const hasActiveSubscription = !!(
    subscription?.stripeSubscriptionId &&
    (subscription.status === "ACTIVE" || subscription.status === "TRIALING")
  );

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Billing</h1>

      {searchParams.success && (
        <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700">
          Subscription activated — thank you!
        </div>
      )}

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
          <p className="mb-4 text-gray-500">No active subscription.</p>
        )}

        <div className="mt-6">
          <CheckoutButton hasActiveSubscription={hasActiveSubscription} />
        </div>
      </Card>
    </div>
  );
}
