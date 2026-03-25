import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardHeader, CardTitle } from "@integriochat/ui";
import { getPlanConfig } from "@/lib/plans";
import type { PlanId } from "@/lib/plans";

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as Record<string, unknown> | undefined;
  const tenantId = user?.["tenantId"] as string | undefined;

  if (!tenantId) {
    return <div className="text-gray-500">Not authenticated.</div>;
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const [subscription, chatbots, totalMessages, thisMonthMessages, lastMonthMessages] =
    await Promise.all([
      prisma.subscription.findFirst({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        select: { plan: true },
      }),
      prisma.chatbot.findMany({
        where: { tenantId },
        select: { id: true, name: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.message.count({ where: { tenantId, role: "user" } }),
      prisma.message.count({
        where: { tenantId, role: "user", createdAt: { gte: startOfMonth } },
      }),
      prisma.message.count({
        where: {
          tenantId,
          role: "user",
          createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
        },
      }),
    ]);

  const planConfig = getPlanConfig((subscription?.plan as PlanId | undefined) ?? "FREE");
  const msgLimit = planConfig.limits.messagesPerMonth;

  // Per-bot breakdown (this month)
  const perBotRaw = await prisma.message.groupBy({
    by: ["chatbotId"],
    where: { tenantId, role: "user", createdAt: { gte: startOfMonth } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  });

  const botNameMap = Object.fromEntries(chatbots.map((b: { id: string; name: string }) => [b.id, b.name]));
  const perBot = perBotRaw.map((row) => ({
    name: botNameMap[row.chatbotId] ?? "Unknown",
    count: row._count.id,
  }));

  const momChange =
    lastMonthMessages === 0
      ? null
      : Math.round(((thisMonthMessages - lastMonthMessages) / lastMonthMessages) * 100);

  const usagePct =
    msgLimit === -1 ? 0 : Math.min(100, Math.round((thisMonthMessages / msgLimit) * 100));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="mt-1 text-sm text-gray-500">
          Message usage and chatbot performance for your workspace.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">Total Messages</CardTitle>
          </CardHeader>
          <p className="text-3xl font-bold text-gray-900">{totalMessages.toLocaleString()}</p>
          <p className="mt-1 text-xs text-gray-400">All time</p>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">This Month</CardTitle>
          </CardHeader>
          <p className="text-3xl font-bold text-gray-900">{thisMonthMessages.toLocaleString()}</p>
          {momChange !== null && (
            <p className={`mt-1 text-xs font-medium ${momChange >= 0 ? "text-green-600" : "text-red-500"}`}>
              {momChange >= 0 ? "+" : ""}{momChange}% vs last month
            </p>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">Plan Usage</CardTitle>
          </CardHeader>
          <p className="text-3xl font-bold text-gray-900">
            {msgLimit === -1 ? "∞" : `${usagePct}%`}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            {thisMonthMessages.toLocaleString()} / {msgLimit === -1 ? "unlimited" : msgLimit.toLocaleString()} messages
          </p>
          {msgLimit !== -1 && (
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full transition-all ${
                  usagePct >= 90 ? "bg-red-500" : usagePct >= 70 ? "bg-amber-400" : "bg-brand-500"
                }`}
                style={{ width: `${usagePct}%` }}
              />
            </div>
          )}
        </Card>
      </div>

      {/* Per-bot breakdown */}
      {perBot.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Messages per Chatbot (This Month)</CardTitle>
          </CardHeader>
          <div className="flex flex-col gap-3">
            {perBot.map(({ name, count }) => {
              const pct = thisMonthMessages === 0 ? 0 : Math.round((count / thisMonthMessages) * 100);
              return (
                <div key={name} className="flex flex-col gap-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-700">{name}</span>
                    <span className="text-gray-500">{count.toLocaleString()} ({pct}%)</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-brand-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {perBot.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-200 p-10 text-center text-sm text-gray-400">
          No messages yet. Embed a chatbot on your site to start seeing data here.
        </div>
      )}
    </div>
  );
}
