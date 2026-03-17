"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, Button, Input } from "@integriochat/ui";

export default function NewChatbotPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const body = {
      name: form.get("name") as string,
      systemPrompt: form.get("systemPrompt") as string,
      tone: form.get("tone") as string,
      leadCapture: form.get("leadCapture") === "on",
    };

    const res = await fetch("/api/chatbots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const json = await res.json() as { success: boolean; data?: { id: string }; error?: string };

    if (!json.success) {
      setError(json.error ?? "Failed to create chatbot");
      setLoading(false);
      return;
    }

    router.push(`/chatbots/${json.data!.id}`);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">New Chatbot</h1>
      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Name</label>
            <Input name="name" required placeholder="My Chatbot" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">System Prompt</label>
            <textarea
              name="systemPrompt"
              required
              rows={6}
              placeholder="You are a helpful assistant for..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Tone</label>
            <select
              name="tone"
              defaultValue="professional"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="professional">Professional</option>
              <option value="friendly">Friendly</option>
              <option value="casual">Casual</option>
              <option value="formal">Formal</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" name="leadCapture" id="leadCapture" />
            <label htmlFor="leadCapture" className="text-sm">Enable lead capture</label>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3">
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Chatbot"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => router.push("/chatbots")}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
