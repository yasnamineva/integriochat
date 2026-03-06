import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.js";
import { prisma } from "@/lib/db.js";
import { Card, CardHeader, CardTitle, Badge } from "@integriochat/ui";

interface Props {
  params: { id: string };
}

export default async function ChatbotDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  const user = session?.user as Record<string, unknown> | undefined;
  const tenantId = user?.["tenantId"] as string | undefined;

  if (!tenantId) notFound();

  const chatbot = await prisma.chatbot.findFirst({
    where: { id: params.id, tenantId },
  });

  if (!chatbot) notFound();

  const baseUrl = process.env["NEXT_PUBLIC_BASE_URL"] ?? "https://yourdomain.com";
  const embedSnippet = `<script src="${baseUrl}/widget.js" data-bot="${chatbot.id}"></script>`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{chatbot.name}</h1>
        <Badge variant={chatbot.isActive ? "success" : "danger"}>
          {chatbot.isActive ? "Active" : "Inactive"}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
        </CardHeader>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="font-medium text-gray-500">Tone</dt>
            <dd>{chatbot.tone}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Lead Capture</dt>
            <dd>{chatbot.leadCapture ? "Enabled" : "Disabled"}</dd>
          </div>
          <div className="col-span-2">
            <dt className="font-medium text-gray-500">System Prompt</dt>
            <dd className="mt-1 whitespace-pre-wrap rounded-md bg-gray-50 p-3 font-mono text-xs">
              {chatbot.systemPrompt}
            </dd>
          </div>
        </dl>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Embed Snippet</CardTitle>
        </CardHeader>
        <p className="mb-2 text-sm text-gray-500">
          Add this script tag to your website to embed the chatbot.
        </p>
        <pre className="overflow-x-auto rounded-md bg-gray-900 p-4 text-sm text-green-400">
          {embedSnippet}
        </pre>
      </Card>
    </div>
  );
}
