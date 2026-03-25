import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPlanConfig } from "@/lib/plans";
import { ChatbotDetail } from "./ChatbotDetail";

interface Props {
  params: { id: string };
}

export default async function ChatbotDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  const user = session?.user as Record<string, unknown> | undefined;
  const tenantId = user?.["tenantId"] as string | undefined;

  if (!tenantId) notFound();

  const [chatbot, subscription] = await Promise.all([
    prisma.chatbot.findFirst({ where: { id: params.id, tenantId } }),
    prisma.subscription.findFirst({ where: { tenantId }, orderBy: { createdAt: "desc" }, select: { plan: true } }),
  ]);

  if (!chatbot) notFound();

  const planConfig = getPlanConfig(subscription?.plan ?? "FREE");
  const baseUrl = process.env["NEXT_PUBLIC_BASE_URL"] ?? "https://yourdomain.com";
  const embedSnippet = `<script src="${baseUrl}/widget.js" data-bot="${chatbot.id}"></script>`;

  return (
    <ChatbotDetail
      chatbot={chatbot}
      embedSnippet={embedSnippet}
      baseUrl={baseUrl}
      planFeatures={planConfig.features}
      isUsagePlan={subscription?.plan === "USAGE"}
    />
  );
}
