"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, Button } from "@integriochat/ui";

function InfoTip({ text }: { text: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <span className="relative ml-1 inline-flex">
      <button
        type="button"
        className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-gray-200 text-gray-500 hover:bg-gray-300 focus:outline-none"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        aria-label="More information"
        tabIndex={-1}
      >
        <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {visible && (
        <span className="absolute bottom-full left-1/2 z-20 mb-2 w-64 -translate-x-1/2 rounded-md bg-gray-900 px-3 py-2 text-xs leading-relaxed text-white shadow-lg">
          {text}
          <span className="absolute left-1/2 top-full -translate-x-1/2 border-[5px] border-transparent border-t-gray-900" />
        </span>
      )}
    </span>
  );
}

const inputCls =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";
const selectCls = inputCls;

export default function NewChatbotPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [temperature, setTemperature] = useState(0.7);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const websiteUrlRaw = (form.get("websiteUrl") as string).trim();
    const nameRaw = (form.get("name") as string).trim();
    const systemPromptRaw = (form.get("systemPrompt") as string).trim();
    const fallbackMsgRaw = (form.get("fallbackMsg") as string).trim();
    const initialMessageRaw = (form.get("initialMessage") as string).trim();

    const body = {
      ...(nameRaw ? { name: nameRaw } : {}),
      ...(systemPromptRaw ? { systemPrompt: systemPromptRaw } : {}),
      ...(fallbackMsgRaw ? { fallbackMsg: fallbackMsgRaw } : {}),
      ...(initialMessageRaw ? { initialMessage: initialMessageRaw } : {}),
      websiteUrl: websiteUrlRaw,
      tone: form.get("tone") as string,
      aiModel: form.get("aiModel") as string,
      temperature,
      leadCapture: form.get("leadCapture") === "on",
    };

    const res = await fetch("/api/chatbots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const json = (await res.json()) as {
      success: boolean;
      data?: { id: string };
      error?: string;
    };

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
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">

        {/* ── Identity ─────────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Identity</CardTitle>
          </CardHeader>
          <div className="flex flex-col gap-4">
            <div>
              <label className="mb-1 flex items-center text-sm font-medium text-gray-700">
                Name
                <InfoTip text="A label to identify this chatbot in your dashboard. Leave blank to use the default 'My Chatbot'." />
                <span className="ml-2 text-xs font-normal text-gray-400">optional</span>
              </label>
              <input
                name="name"
                type="text"
                maxLength={100}
                placeholder="My Support Bot"
                className={inputCls}
              />
            </div>

            <div>
              <label className="mb-1 flex items-center text-sm font-medium text-gray-700">
                Initial Message
                <InfoTip text="The first message visitors see when they open the chat widget. Leave blank for the default greeting." />
                <span className="ml-2 text-xs font-normal text-gray-400">optional</span>
              </label>
              <input
                name="initialMessage"
                type="text"
                maxLength={500}
                placeholder="Hi! How can I help you today?"
                className={inputCls}
              />
            </div>

            <div>
              <label className="mb-1 flex items-center text-sm font-medium text-gray-700">
                Tone
                <InfoTip text="Sets the language style of the AI's responses. Professional is formal and concise. Friendly is warm and approachable. Casual is relaxed and informal. Formal is highly structured." />
              </label>
              <select name="tone" defaultValue="professional" className={selectCls}>
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
                <option value="casual">Casual</option>
                <option value="formal">Formal</option>
              </select>
            </div>
          </div>
        </Card>

        {/* ── Behavior ─────────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Behavior</CardTitle>
          </CardHeader>
          <div className="flex flex-col gap-4">
            <div>
              <label className="mb-1 flex items-center text-sm font-medium text-gray-700">
                System Prompt
                <InfoTip text="Instructions that tell the AI how to behave and what it knows. Example: 'You are a support agent for Acme Corp. Only answer questions about our products and pricing. Always be polite and direct users to support@acme.com for billing issues.'" />
                <span className="ml-2 text-xs font-normal text-gray-400">optional</span>
              </label>
              <textarea
                name="systemPrompt"
                rows={5}
                maxLength={4000}
                placeholder="You are a helpful assistant for..."
                className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="mb-1 flex items-center text-sm font-medium text-gray-700">
                Fallback Message
                <InfoTip text="What the bot says when it doesn't have enough information to answer. A good fallback message redirects users to human support." />
                <span className="ml-2 text-xs font-normal text-gray-400">optional</span>
              </label>
              <textarea
                name="fallbackMsg"
                rows={2}
                maxLength={500}
                placeholder="I'm sorry, I don't have enough information to answer that. Please contact our support team for help."
                className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="leadCapture"
                name="leadCapture"
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="leadCapture" className="flex items-center text-sm font-medium text-gray-700">
                Enable Lead Capture
                <InfoTip text="When enabled, visitors must provide their name and email before the chat starts. Useful for collecting sales leads or support contact info." />
              </label>
            </div>
          </div>
        </Card>

        {/* ── AI Settings ──────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>AI Settings</CardTitle>
          </CardHeader>
          <div className="flex flex-col gap-4">
            <div>
              <label className="mb-1 flex items-center text-sm font-medium text-gray-700">
                AI Model
                <InfoTip text="The language model powering your chatbot. GPT-4o mini is fast and cost-effective — ideal for most support use cases. GPT-4o is our most capable model, better for complex or nuanced questions. Switching to a non-default model may require a plan upgrade." />
              </label>
              <select name="aiModel" defaultValue="gpt-4o-mini" className={selectCls}>
                <option value="gpt-4o-mini">GPT-4o mini — fast &amp; affordable (recommended)</option>
                <option value="gpt-4o">GPT-4o — most capable</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo — most economical</option>
              </select>
            </div>

            <div>
              <label className="mb-1 flex items-center text-sm font-medium text-gray-700">
                Temperature
                <InfoTip text="Controls how creative or focused the AI's responses are. Lower values (0.1–0.3) produce consistent, predictable answers — great for FAQs. Higher values (0.8–1.5) produce more varied, creative responses. 0.7 is the recommended default." />
                <span className="ml-2 text-xs font-normal text-gray-400">
                  current: {temperature.toFixed(1)}
                </span>
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
                className="w-full accent-brand-500"
              />
              <div className="mt-1 flex justify-between text-xs text-gray-400">
                <span>Focused (0.0)</span>
                <span>Balanced (1.0)</span>
                <span>Creative (2.0)</span>
              </div>
            </div>
          </div>
        </Card>

        {/* ── Training ─────────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Training</CardTitle>
          </CardHeader>
          <div className="flex flex-col gap-4">
            <div>
              <label className="mb-1 flex items-center text-sm font-medium text-gray-700">
                Website URL
                <InfoTip text="We'll crawl this URL and train your chatbot on the text content found across your site. The bot will be able to answer questions based on your website." />
              </label>
              <input
                name="websiteUrl"
                type="url"
                placeholder="https://yourcompany.com"
                required
                className={inputCls}
              />
            </div>
          </div>
        </Card>

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
    </div>
  );
}
