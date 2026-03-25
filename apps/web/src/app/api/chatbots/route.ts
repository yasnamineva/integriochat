import { type NextRequest } from "next/server";
import { prisma, requireTenantId } from "@/lib/db";
import { ok, err } from "@integriochat/utils";
import { CreateChatbotSchema } from "@integriochat/utils";
import { getPlanConfig } from "@/lib/plans";

export async function GET() {
  try {
    const tenantId = await requireTenantId();

    const chatbots = await prisma.chatbot.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        tone: true,
        isActive: true,
        leadCapture: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return ok(chatbots);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[GET /api/chatbots]", e);
    return err("Internal server error", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenantId = await requireTenantId();

    const body: unknown = await req.json();
    const parsed = CreateChatbotSchema.safeParse(body);
    if (!parsed.success) {
      return err(parsed.error.message, 422);
    }

    // ── Chatbot count limit ───────────────────────────────────────────────────
    const subscription = await prisma.subscription.findFirst({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      select: { plan: true },
    });
    const plan = getPlanConfig(subscription?.plan ?? "FREE");
    if (plan.limits.chatbots !== -1) {
      const count = await prisma.chatbot.count({ where: { tenantId } });
      if (count >= plan.limits.chatbots) {
        return err(
          `Your ${plan.name} plan allows ${plan.limits.chatbots} chatbot${plan.limits.chatbots === 1 ? "" : "s"}. Upgrade to add more.`,
          403
        );
      }
    }

    const {
      name, systemPrompt, tone, leadCapture, websiteUrl,
      aiModel, temperature, maxTokens, fallbackMsg,
      chatTitle, chatAvatar, themeColor, widgetPosition, widgetTheme,
      initialMessage, suggestedQs, autoRetrain,
    } = parsed.data;

    const chatbot = await prisma.chatbot.create({
      data: {
        tenantId,
        name,
        systemPrompt,
        tone,
        leadCapture,
        websiteUrl: websiteUrl ?? null,
        ...(aiModel !== undefined && { aiModel }),
        ...(temperature !== undefined && { temperature }),
        ...(maxTokens !== undefined && { maxTokens }),
        ...(fallbackMsg !== undefined && { fallbackMsg }),
        ...(chatTitle !== undefined && { chatTitle }),
        ...(chatAvatar !== undefined && { chatAvatar }),
        ...(themeColor !== undefined && { themeColor }),
        ...(widgetPosition !== undefined && { widgetPosition }),
        ...(widgetTheme !== undefined && { widgetTheme }),
        ...(initialMessage !== undefined && { initialMessage }),
        ...(suggestedQs !== undefined && { suggestedQs }),
        ...(autoRetrain !== undefined && { autoRetrain }),
      },
    });

    return ok(chatbot, 201);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[POST /api/chatbots]", e);
    return err("Internal server error", 500);
  }
}
