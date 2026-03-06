import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.js";
import { prisma } from "@/lib/db.js";
import { Card, Badge, Button } from "@integriochat/ui";

export default async function ChatbotsPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as Record<string, unknown> | undefined;
  const tenantId = user?.["tenantId"] as string | undefined;

  const chatbots = tenantId
    ? await prisma.chatbot.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Chatbots</h1>
        <Link href="/dashboard/chatbots/new">
          <Button size="sm">New Chatbot</Button>
        </Link>
      </div>

      {chatbots.length === 0 ? (
        <Card>
          <p className="text-center text-gray-500">
            No chatbots yet.{" "}
            <Link href="/dashboard/chatbots/new" className="text-brand-600 underline">
              Create your first one.
            </Link>
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {chatbots.map((bot) => (
            <Link key={bot.id} href={`/dashboard/chatbots/${bot.id}`}>
              <Card className="cursor-pointer transition-shadow hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{bot.name}</p>
                    <p className="text-sm text-gray-500">Tone: {bot.tone}</p>
                  </div>
                  <Badge variant={bot.isActive ? "success" : "danger"}>
                    {bot.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
