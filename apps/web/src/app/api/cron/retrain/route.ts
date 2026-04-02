import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { triggerScrapeInBackground } from "@/services/scraper.service";
import { PLANS } from "@/lib/plans";

/**
 * GET /api/cron/retrain
 *
 * Vercel Cron job — runs daily at 03:00 UTC.
 * Re-scrapes all chatbots that have autoRetrain enabled and a websiteUrl,
 * provided their tenant's plan supports autoRetrain.
 *
 * Protected by the CRON_SECRET env var (set in Vercel > Settings > Environment Variables).
 */
export async function GET(req: NextRequest) {
  const secret = process.env["CRON_SECRET"];
  const authHeader = req.headers.get("authorization");

  // Verify cron secret (Vercel sends it as Bearer token when configured)
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find all chatbots with autoRetrain enabled that have a website to scrape
  const chatbots = await prisma.$queryRaw<{
    id: string;
    tenantId: string;
    websiteUrl: string;
    plan: string | null;
    monthlyMessageLimit: number | null;
  }[]>`
    SELECT c.id, c."tenantId", c."websiteUrl",
           s.plan, c."monthlyMessageLimit"
    FROM chatbots c
    LEFT JOIN subscriptions s ON s."tenantId" = c."tenantId"
      AND s.status IN ('ACTIVE', 'TRIALING')
    WHERE c."autoRetrain" = true
      AND c."websiteUrl" IS NOT NULL
      AND c."isActive" = true
    ORDER BY c."lastScrapedAt" NULLS FIRST
    LIMIT 50
  `;

  let triggered = 0;
  for (const bot of chatbots) {
    const planId = (bot.plan as keyof typeof PLANS) ?? "FREE";
    const planConfig = PLANS[planId] ?? PLANS["FREE"]!;
    const maxPages = planConfig.limits.scrapePages ?? 20;

    triggerScrapeInBackground(bot.id, bot.tenantId, bot.websiteUrl, maxPages);
    triggered++;
  }

  console.log(`[cron/retrain] Triggered ${triggered} re-scrapes`);

  return NextResponse.json({ ok: true, triggered });
}
