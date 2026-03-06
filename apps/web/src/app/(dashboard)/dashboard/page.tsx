import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.js";
import { prisma } from "@/lib/db.js";
import { Card, CardHeader, CardTitle, Badge } from "@integriochat/ui";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as Record<string, unknown> | undefined;
  const tenantId = user?.["tenantId"] as string | undefined;

  const [chatbotCount, messageCount] = await Promise.all([
    tenantId
      ? prisma.chatbot.count({ where: { tenantId } })
      : Promise.resolve(0),
    tenantId
      ? prisma.message.count({ where: { tenantId } })
      : Promise.resolve(0),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Overview</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Chatbots</CardTitle>
          </CardHeader>
          <p className="text-3xl font-bold text-brand-600">{chatbotCount}</p>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Messages</CardTitle>
          </CardHeader>
          <p className="text-3xl font-bold text-brand-600">{messageCount}</p>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
          </CardHeader>
          <Badge variant="success">Active</Badge>
          <p className="mt-1 text-xs text-gray-500">
            Billing details available in the Billing tab.
          </p>
        </Card>
      </div>
    </div>
  );
}
