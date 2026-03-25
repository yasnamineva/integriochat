import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardHeader, CardTitle, Badge } from "@integriochat/ui";
import { PlanSelector } from "@/components/PlanSelector";
import { PLANS } from "@/lib/plans";
import type { PlanId } from "@/lib/plans";

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

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [subscription, messageCount, chatbotCount] = await Promise.all([
    tenantId
      ? prisma.subscription.findFirst({ where: { tenantId }, orderBy: { createdAt: "desc" } })
      : null,
    tenantId
      ? prisma.message.count({ where: { tenantId, role: "user", createdAt: { gte: startOfMonth } } })
      : 0,
    tenantId ? prisma.chatbot.count({ where: { tenantId } }) : 0,
  ]);

  const currentPlanId: PlanId = (subscription?.plan as PlanId | undefined) ?? "FREE";
  const currentPlan = PLANS[currentPlanId];
  const hasStripeSubscription = !!(subscription?.stripeSubscriptionId);

  const msgLimit = currentPlan.limits.messagesPerMonth;
  const botLimit = currentPlan.limits.chatbots;
  const msgPct = msgLimit === -1 ? 0 : Math.min(100, Math.round((messageCount / msgLimit) * 100));
  const botPct = botLimit === -1 ? 0 : Math.min(100, Math.round((chatbotCount / botLimit) * 100));

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold">Billing</h1>

      {searchParams.success && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
          Subscription activated — thank you!
        </div>
      )}

      {/* Current Plan + Usage */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Current Plan</CardTitle>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-brand-100 px-3 py-0.5 text-sm font-semibold text-brand-700">
                {currentPlan.name}
              </span>
              {subscription && (
                <Badge variant={statusVariant[subscription.status as keyof typeof statusVariant] ?? "success"}>
                  {subscription.status}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <div className="flex flex-col gap-5">
          {/* Messages usage */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-gray-700">Messages this month</span>
              <span className="text-gray-500">
                {messageCount.toLocaleString()}
                {msgLimit !== -1 ? ` / ${msgLimit.toLocaleString()}` : " (unlimited)"}
              </span>
            </div>
            {msgLimit !== -1 && (
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full transition-all ${msgPct >= 90 ? "bg-red-500" : msgPct >= 70 ? "bg-amber-400" : "bg-brand-500"}`}
                  style={{ width: `${msgPct}%` }}
                />
              </div>
            )}
          </div>

          {/* Chatbots usage */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-gray-700">Chatbots</span>
              <span className="text-gray-500">
                {chatbotCount}
                {botLimit !== -1 ? ` / ${botLimit}` : " (unlimited)"}
              </span>
            </div>
            {botLimit !== -1 && (
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full transition-all ${botPct >= 90 ? "bg-red-500" : "bg-brand-500"}`}
                  style={{ width: `${botPct}%` }}
                />
              </div>
            )}
          </div>

          {/* Period / trial info */}
          {subscription?.currentPeriodEnd && (
            <p className="text-sm text-gray-500">
              Current period ends: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
            </p>
          )}
          {subscription?.trialEndsAt && subscription.status === "TRIALING" && (
            <p className="text-sm text-amber-600">
              Trial ends: {new Date(subscription.trialEndsAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </Card>

      {/* Plan cards */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Plans</h2>
        <PlanSelector currentPlanId={currentPlanId} hasStripeSubscription={hasStripeSubscription} />
      </div>
    </div>
  );
}
