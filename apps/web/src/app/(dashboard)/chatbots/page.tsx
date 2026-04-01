import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
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
        <Link href="/chatbots/new">
          <Button size="sm">New Chatbot</Button>
        </Link>
      </div>

      {chatbots.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 px-8 py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-50">
            <svg className="h-8 w-8 text-brand-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
            </svg>
          </div>
          <h2 className="mb-2 text-lg font-semibold text-gray-900">Create your first chatbot</h2>
          <p className="mb-6 text-sm text-gray-500">
            Build an AI assistant that knows your product. Train it on your website,<br />
            then embed it anywhere in minutes.
          </p>
          <div className="flex flex-col items-center gap-3">
            <Link href="/chatbots/new">
              <Button>Get started</Button>
            </Link>
            <p className="text-xs text-gray-400">Takes about 2 minutes to set up</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {chatbots.map((bot) => (
            <Link key={bot.id} href={`/chatbots/${bot.id}`}>
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
