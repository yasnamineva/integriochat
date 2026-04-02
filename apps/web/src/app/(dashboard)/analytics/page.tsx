import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardHeader, CardTitle } from "@integriochat/ui";
import { getPlanConfig, USAGE_MARGIN_MULTIPLIER } from "@/lib/plans";
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

  const [
    subscription,
    chatbots,
    totalMessages,
    thisMonthMessages,
    lastMonthMessages,
    usageThisMonth,
    usageLastMonth,
    usageAllTime,
  ] = await Promise.all([
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
    prisma.usageLog.aggregate({
      where: { tenantId, createdAt: { gte: startOfMonth } },
      _sum: { tokensUsed: true, costUsd: true },
    }),
    prisma.usageLog.aggregate({
      where: { tenantId, createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
      _sum: { costUsd: true },
    }),
    prisma.usageLog.aggregate({
      where: { tenantId },
      _sum: { tokensUsed: true, costUsd: true },
    }),
  ]);

  const planConfig = getPlanConfig((subscription?.plan as PlanId | undefined) ?? "FREE");
  const msgLimit = planConfig.limits.messagesPerMonth;
  const isUsagePlan = subscription?.plan === "USAGE";

  // Token + cost aggregates
  const tokensThisMonth = usageThisMonth._sum.tokensUsed ?? 0;
  const tokensAllTime = usageAllTime._sum.tokensUsed ?? 0;
  const rawCostThisMonth = Number(usageThisMonth._sum.costUsd ?? 0);
  const rawCostLastMonth = Number(usageLastMonth._sum.costUsd ?? 0);
  const rawCostAllTime = Number(usageAllTime._sum.costUsd ?? 0);
  // Billed amount = raw AI cost × margin multiplier
  const billedThisMonth = rawCostThisMonth * USAGE_MARGIN_MULTIPLIER;
  const billedLastMonth = rawCostLastMonth * USAGE_MARGIN_MULTIPLIER;
  const billedAllTime = rawCostAllTime * USAGE_MARGIN_MULTIPLIER;

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

  // Per-bot token + cost breakdown (this month)
  const perBotUsageRaw = await prisma.usageLog.groupBy({
    by: ["chatbotId"],
    where: { tenantId, createdAt: { gte: startOfMonth } },
    _sum: { tokensUsed: true, costUsd: true },
  });
  const perBotUsageMap = Object.fromEntries(
    perBotUsageRaw.map((r) => [
      r.chatbotId,
      {
        tokens: r._sum.tokensUsed ?? 0,
        billedUsd: Number(r._sum.costUsd ?? 0) * USAGE_MARGIN_MULTIPLIER,
      },
    ])
  );

  // Daily message counts for the last 7 days
  const last7DaysMessages = await prisma.message.findMany({
    where: { tenantId, role: "user", createdAt: { gte: startOf7DaysAgo } },
    select: { createdAt: true },
  });

  // Build per-day data for the last 7 days
  const days: { weekday: string; date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const dayStr = d.toDateString();
    days.push({
      weekday: d.toLocaleDateString("en-US", { weekday: "short" }),   // "Thu"
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), // "Apr 3"
      count: last7DaysMessages.filter((m: { createdAt: Date }) => m.createdAt.toDateString() === dayStr).length,
    });
  }
  const maxDayCount = Math.max(...days.map((d) => d.count), 1);
  const weekTotal = days.reduce((s, d) => s + d.count, 0);

  const botNameMap = Object.fromEntries(chatbots.map((b: { id: string; name: string }) => [b.id, b.name]));
  const perBot = perBotRaw.map((row: { chatbotId: string; _count: { id: number } }) => ({
    name: botNameMap[row.chatbotId] ?? "Unknown",
    count: row._count.id,
    tokens: perBotUsageMap[row.chatbotId]?.tokens ?? 0,
    billedUsd: perBotUsageMap[row.chatbotId]?.billedUsd ?? 0,
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

      {/* Token usage summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">Tokens — This Month</CardTitle>
          </CardHeader>
          <p className="text-3xl font-bold text-gray-900">{tokensThisMonth.toLocaleString()}</p>
          <p className="mt-1 text-xs text-gray-400">estimated (input + output)</p>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">Tokens — All Time</CardTitle>
          </CardHeader>
          <p className="text-3xl font-bold text-gray-900">{tokensAllTime.toLocaleString()}</p>
          <p className="mt-1 text-xs text-gray-400">across all chatbots</p>
        </Card>

        {isUsagePlan ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-500">AI Cost — This Month</CardTitle>
            </CardHeader>
            <p className="text-3xl font-bold text-gray-900">${rawCostThisMonth.toFixed(4)}</p>
            <p className="mt-1 text-xs text-gray-400">raw OpenAI cost (before margin)</p>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-500">Avg Tokens / Message</CardTitle>
            </CardHeader>
            <p className="text-3xl font-bold text-gray-900">
              {thisMonthMessages === 0 ? "—" : Math.round(tokensThisMonth / thisMonthMessages).toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-gray-400">this month</p>
          </Card>
        )}
      </div>

      {/* Pay-as-you-go billing tracker */}
      {isUsagePlan && (
        <Card>
          <CardHeader>
            <CardTitle>Billing — Pay As You Go</CardTitle>
          </CardHeader>
          <div className="grid gap-6 sm:grid-cols-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">This Month</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">${billedThisMonth.toFixed(2)}</p>
              <p className="mt-0.5 text-xs text-gray-500">
                {thisMonthMessages.toLocaleString()} messages · {tokensThisMonth.toLocaleString()} tokens
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Last Month</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">${billedLastMonth.toFixed(2)}</p>
              <p className="mt-0.5 text-xs text-gray-500">
                {lastMonthMessages.toLocaleString()} messages
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">All Time</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">${billedAllTime.toFixed(2)}</p>
              <p className="mt-0.5 text-xs text-gray-500">since account creation</p>
            </div>
          </div>
          <div className="mt-4 rounded-lg bg-gray-50 px-3 py-2.5 text-xs text-gray-500">
            Billed amount = raw AI cost × {USAGE_MARGIN_MULTIPLIER}× margin.
            Raw AI cost this month: ${rawCostThisMonth.toFixed(4)}.
            Charges are invoiced by Stripe at the end of each billing period.
          </div>
        </Card>
      )}

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

        {/* Bars — key fix: give the bar container a concrete height (h-28) so
            that percentage heights on bar children resolve correctly. Using
            flex-1 (auto height) as parent breaks CSS % height resolution. */}
        <div className="flex gap-2">
          {days.map(({ weekday, date, count }, i) => {
            const barPct = Math.round((count / maxDayCount) * 100);
            const isToday = i === 6;
            return (
              <div key={date} className="flex flex-1 flex-col items-center gap-1">
                {/* Count label — reserve space even when empty so bars align */}
                <span className="h-5 flex items-end justify-center text-xs font-semibold text-gray-700">
                  {count > 0 ? count.toLocaleString() : ""}
                </span>

                {/* Bar container — fixed height so % works */}
                <div className="w-full h-28 flex items-end">
                  <div
                    className={`w-full rounded-t transition-all duration-300 ${
                      isToday ? "bg-indigo-500" : "bg-indigo-200"
                    }`}
                    style={{ height: count === 0 ? "3px" : `${Math.max(barPct, 4)}%` }}
                  />
                </div>

                {/* Day labels */}
                <div className="mt-0.5 text-center leading-tight">
                  <p className={`text-[11px] font-medium ${isToday ? "text-indigo-600" : "text-gray-500"}`}>
                    {weekday}
                  </p>
                  <p className="text-[10px] text-gray-400">{date}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-400">
          <span>
            <span className="inline-block h-2 w-2 rounded-sm bg-indigo-500 mr-1" />
            Today
            <span className="inline-block h-2 w-2 rounded-sm bg-indigo-200 ml-3 mr-1" />
            Previous days
          </span>
          <span className="font-medium text-gray-600">{weekTotal.toLocaleString()} total this week</span>
        </div>
      </Card>

      {/* Per-bot breakdown */}
      {perBot.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Per Chatbot — This Month</CardTitle>
          </CardHeader>
          <div className="flex flex-col gap-5">
            {perBot.map(({ name, count, tokens, billedUsd }) => {
              const pct =
                msgLimit === -1
                  ? thisMonthMessages === 0 ? 0 : Math.round((count / thisMonthMessages) * 100)
                  : Math.min(100, Math.round((count / msgLimit) * 100));
              return (
                <div key={name} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium text-gray-700">{name}</span>
                    <span className="flex shrink-0 gap-3 text-xs text-gray-500">
                      <span>{count.toLocaleString()} msg</span>
                      <span>{tokens.toLocaleString()} tok</span>
                      {isUsagePlan && (
                        <span className="font-medium text-gray-700">${billedUsd.toFixed(2)}</span>
                      )}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full transition-all ${
                        pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-400" : "bg-brand-500"
                      }`}
                      style={{ width: `${Math.max(pct, count > 0 ? 1 : 0)}%` }}
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
