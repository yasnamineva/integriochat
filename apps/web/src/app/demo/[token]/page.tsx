import { notFound } from "next/navigation";
import { prisma } from "@/lib/db.js";

interface Props {
  params: { token: string };
}

/**
 * Public demo page — accessible without authentication.
 * Loads the chatbot widget inline for a prospect to try out the bot.
 */
export default async function DemoPage({ params }: Props) {
  const demoLink = await prisma.demoLink.findUnique({
    where: { token: params.token },
    include: {
      chatbot: {
        select: { id: true, name: true, isActive: true },
      },
    },
  });

  if (!demoLink) notFound();

  if (demoLink.expiresAt < new Date()) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800">Demo Expired</h1>
          <p className="mt-2 text-gray-500">
            This demo link has expired. Please contact us for a new demo.
          </p>
        </div>
      </div>
    );
  }

  if (!demoLink.chatbot.isActive) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800">Chatbot Unavailable</h1>
          <p className="mt-2 text-gray-500">This chatbot is currently inactive.</p>
        </div>
      </div>
    );
  }

  const baseUrl = process.env["NEXT_PUBLIC_BASE_URL"] ?? "";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900">
          {demoLink.chatbot.name}
        </h1>
        <p className="mt-2 text-gray-500">
          Try out our AI chatbot below.
        </p>
        <p className="text-xs text-gray-400">
          Demo expires: {demoLink.expiresAt.toLocaleDateString()}
        </p>
      </div>

      {/* Inline widget for demo page — loads the same widget script */}
      {/* eslint-disable-next-line @next/next/no-sync-scripts */}
      <script
        src={`${baseUrl}/widget.js`}
        data-bot={demoLink.chatbot.id}
        defer
      />

      <noscript>
        <p className="text-sm text-gray-500">
          Please enable JavaScript to use this chatbot demo.
        </p>
      </noscript>
    </div>
  );
}
