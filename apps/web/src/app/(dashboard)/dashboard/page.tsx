import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardHeader, CardTitle, Badge } from "@integriochat/ui";
import { PLANS } from "@/lib/plans";
import type { PlanId } from "@/lib/plans";

const statusVariant = {
  TRIALING: "info",
  ACTIVE: "success",
  PAST_DUE: "warning",
  CANCELED: "danger",
} as const;

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as Record<string, unknown> | undefined;
  const tenantId = user?.["tenantId"] as string | undefined;

  const [chatbotCount, messageCount, subscription] = await Promise.all([
    tenantId
      ? prisma.chatbot.count({ where: { tenantId } })
      : Promise.resolve(0),
    tenantId
      ? prisma.message.count({ where: { tenantId } })
      : Promise.resolve(0),
    tenantId
      ? prisma.subscription.findFirst({ where: { tenantId }, orderBy: { createdAt: "desc" } })
      : Promise.resolve(null),
  ]);

  const planId: PlanId = (subscription?.plan as PlanId | undefined) ?? "FREE";
  const planName = PLANS[planId]?.name ?? "Free";

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Overview</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link href="/chatbots" className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
          <Card className="h-full transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle>Chatbots</CardTitle>
            </CardHeader>
            <p className="text-3xl font-bold text-brand-600">{chatbotCount}</p>
            <p className="mt-1 text-xs text-gray-500">View all chatbots →</p>
          </Card>
        </Link>

        <Link href="/analytics" className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
          <Card className="h-full transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle>Total Messages</CardTitle>
            </CardHeader>
            <p className="text-3xl font-bold text-brand-600">{messageCount}</p>
            <p className="mt-1 text-xs text-gray-500">View analytics →</p>
          </Card>
        </Link>

        <Link href="/billing" className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
          <Card className="h-full transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle>Subscription</CardTitle>
            </CardHeader>
            <div className="flex items-center gap-2">
              <Badge variant={statusVariant[subscription?.status as keyof typeof statusVariant] ?? "success"}>
                {subscription?.status ?? "ACTIVE"}
              </Badge>
              <span className="text-sm font-medium text-gray-700">{planName}</span>
            </div>
            <p className="mt-1 text-xs text-gray-500">Manage billing →</p>
          </Card>
        </Link>
      </div>
    </div>
  );
}
