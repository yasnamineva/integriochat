import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { DemoChat } from "@/components/DemoChat";

interface Props {
  params: { token: string };
}

/**
 * Public demo page — accessible without authentication.
 * Renders an inline chat component so visitors can try the bot directly.
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

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold text-gray-900">{demoLink.chatbot.name}</h1>
        <p className="mt-1 text-gray-500">Try out our AI assistant below.</p>
        <p className="text-xs text-gray-400 mt-1">
          Demo expires: {demoLink.expiresAt.toLocaleDateString()}
        </p>
      </div>

      <DemoChat chatbotId={demoLink.chatbot.id} />
    </div>
  );
}
