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
  const startOf7DaysAgo = new Date(now);
  startOf7DaysAgo.setDate(now.getDate() - 6);
  startOf7DaysAgo.setHours(0, 0, 0, 0);

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

  // Unique conversations this month (distinct sessionIds)
  const uniqueSessionsRaw = await prisma.message.groupBy({
    by: ["sessionId"],
    where: { tenantId, role: "user", createdAt: { gte: startOfMonth } },
    _count: { id: true },
  });
  const uniqueSessionCount = uniqueSessionsRaw.length;
  const avgMsgPerSession =
    uniqueSessionCount === 0 ? 0 : Math.round(thisMonthMessages / uniqueSessionCount);

  // Per-bot breakdown (this month)
  const perBotRaw = await prisma.message.groupBy({
    by: ["chatbotId"],
    where: { tenantId, role: "user", createdAt: { gte: startOfMonth } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  });

  // Daily message counts for the last 7 days
  const last7DaysMessages = await prisma.message.findMany({
    where: { tenantId, role: "user", createdAt: { gte: startOf7DaysAgo } },
    select: { createdAt: true },
  });

  // Build a day → count map
  const dayLabels: string[] = [];
  const dayCounts: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const label = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    dayLabels.push(label);
    const dayStr = d.toDateString();
    dayCounts.push(last7DaysMessages.filter((m: { createdAt: Date }) => m.createdAt.toDateString() === dayStr).length);
  }
  const maxDayCount = Math.max(...dayCounts, 1);

  const botNameMap = Object.fromEntries(chatbots.map((b: { id: string; name: string }) => [b.id, b.name]));
  const perBot = perBotRaw.map((row: { chatbotId: string; _count: { id: number } }) => ({
    name: botNameMap[row.chatbotId] ?? "Unknown",
    count: row._count.id,
  }));

  const momChange =
    lastMonthMessages === 0
      ? null
      : Math.round(((thisMonthMessages - lastMonthMessages) / lastMonthMessages) * 100);

  const usagePct =
    msgLimit === -1 ? 0 : Math.min(100, Math.round((thisMonthMessages / msgLimit) * 100));

  // Active chatbots this month (had at least one message)
  const activeBotCount = perBotRaw.length;
  const avgPerBot =
    activeBotCount === 0 ? 0 : Math.round(thisMonthMessages / activeBotCount);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="mt-1 text-sm text-gray-500">
          Message usage and chatbot performance for your workspace.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">This Month</CardTitle>
          </CardHeader>
          <p className="text-3xl font-bold text-gray-900">{thisMonthMessages.toLocaleString()}</p>
          {momChange !== null ? (
            <p className={`mt-1 text-xs font-medium ${momChange >= 0 ? "text-green-600" : "text-red-500"}`}>
              {momChange >= 0 ? "+" : ""}{momChange}% vs last month
            </p>
          ) : (
            <p className="mt-1 text-xs text-gray-400">No data last month</p>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">Last Month</CardTitle>
          </CardHeader>
          <p className="text-3xl font-bold text-gray-900">{lastMonthMessages.toLocaleString()}</p>
          <p className="mt-1 text-xs text-gray-400">messages</p>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">All Time</CardTitle>
          </CardHeader>
          <p className="text-3xl font-bold text-gray-900">{totalMessages.toLocaleString()}</p>
          <p className="mt-1 text-xs text-gray-400">across {chatbots.length} chatbot{chatbots.length !== 1 ? "s" : ""}</p>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">Conversations</CardTitle>
          </CardHeader>
          <p className="text-3xl font-bold text-gray-900">{uniqueSessionCount.toLocaleString()}</p>
          <p className="mt-1 text-xs text-gray-400">
            ~{avgMsgPerSession} msg / session
          </p>
        </Card>
      </div>

      {/* Plan usage */}
      <Card>
        <CardHeader>
          <CardTitle>Plan Usage — {planConfig.name}</CardTitle>
        </CardHeader>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-3xl font-bold text-gray-900">
              {msgLimit === -1 ? "Unlimited" : `${usagePct}%`}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {thisMonthMessages.toLocaleString()} / {msgLimit === -1 ? "∞" : msgLimit.toLocaleString()} messages this month
            </p>
          </div>
          {msgLimit !== -1 && (
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              usagePct >= 90 ? "bg-red-100 text-red-700" :
              usagePct >= 70 ? "bg-amber-100 text-amber-700" :
              "bg-green-100 text-green-700"
            }`}>
              {msgLimit - thisMonthMessages > 0
                ? `${(msgLimit - thisMonthMessages).toLocaleString()} remaining`
                : "Limit reached"}
            </span>
          )}
        </div>
        {msgLimit !== -1 && (
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full transition-all ${
                usagePct >= 90 ? "bg-red-500" : usagePct >= 70 ? "bg-amber-400" : "bg-brand-500"
              }`}
              style={{ width: `${usagePct}%` }}
            />
          </div>
        )}
      </Card>

      {/* 7-day trend */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Messages — Last 7 Days</CardTitle>
        </CardHeader>
        <div className="flex items-end gap-2 h-32">
          {dayCounts.map((count, i) => {
            const barPct = Math.round((count / maxDayCount) * 100);
            const isToday = i === 6;
            return (
              <div key={dayLabels[i]} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs font-medium text-gray-600">{count > 0 ? count : ""}</span>
                <div className="w-full flex-1 flex items-end">
                  <div
                    className={`w-full rounded-t transition-all ${isToday ? "bg-brand-500" : "bg-brand-200"}`}
                    style={{ height: `${Math.max(barPct, count > 0 ? 4 : 0)}%` }}
                  />
                </div>
                <span className="text-[10px] text-gray-400 truncate w-full text-center">
                  {(dayLabels[i] ?? "").split(" ").slice(0, 2).join(" ")}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Per-bot breakdown */}
      {perBot.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Messages per Chatbot — This Month</CardTitle>
          </CardHeader>
          <div className="flex flex-col gap-4">
            {perBot.map(({ name, count }) => {
              // Bar shows usage relative to the plan limit (consistent with Plan Usage card).
              // For unlimited plans, fall back to share-of-total so bars are still meaningful.
              const pct =
                msgLimit === -1
                  ? thisMonthMessages === 0 ? 0 : Math.round((count / thisMonthMessages) * 100)
                  : Math.min(100, Math.round((count / msgLimit) * 100));
              const label =
                msgLimit === -1
                  ? `${count.toLocaleString()} msg`
                  : `${count.toLocaleString()} / ${msgLimit.toLocaleString()} (${pct}% of plan)`;
              return (
                <div key={name} className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-700">{name}</span>
                    <span className="text-gray-500">{label}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full transition-all ${
                        pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-400" : "bg-brand-500"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          {msgLimit !== -1 && (
            <p className="mt-4 text-xs text-gray-400">
              Bar shows each chatbot&apos;s messages as a percentage of your plan&apos;s monthly limit ({msgLimit.toLocaleString()} messages).
            </p>
          )}
        </Card>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-200 p-10 text-center text-sm text-gray-400">
          No messages yet this month. Embed a chatbot on your site to start seeing data here.
        </div>
      )}
    </div>
  );
}
