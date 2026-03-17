"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, Badge, Button, Input } from "@integriochat/ui";

interface Chatbot {
  id: string;
  name: string;
  systemPrompt: string;
  tone: string;
  leadCapture: boolean;
  isActive: boolean;
}

interface Props {
  chatbot: Chatbot;
  embedSnippet: string;
}

const TONES = ["professional", "friendly", "casual", "formal"] as const;

export function ChatbotDetail({ chatbot: initial, embedSnippet }: Props) {
  const router = useRouter();
  const [chatbot, setChatbot] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: initial.name,
    systemPrompt: initial.systemPrompt,
    tone: initial.tone,
    leadCapture: initial.leadCapture,
    isActive: initial.isActive,
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/chatbots/${chatbot.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json() as { error?: string };
      setError(data.error ?? "Failed to save changes");
      return;
    }
    const data = await res.json() as { data: Chatbot };
    setChatbot(data.data);
    setEditing(false);
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${chatbot.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    const res = await fetch(`/api/chatbots/${chatbot.id}`, { method: "DELETE" });
    if (!res.ok) {
      setDeleting(false);
      const data = await res.json() as { error?: string };
      setError(data.error ?? "Failed to delete chatbot");
      return;
    }
    router.push("/chatbots");
    router.refresh();
  }

  function handleCancel() {
    setForm({
      name: chatbot.name,
      systemPrompt: chatbot.systemPrompt,
      tone: chatbot.tone,
      leadCapture: chatbot.leadCapture,
      isActive: chatbot.isActive,
    });
    setEditing(false);
    setError(null);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{chatbot.name}</h1>
        <div className="flex items-center gap-3">
          <Badge variant={chatbot.isActive ? "success" : "danger"}>
            {chatbot.isActive ? "Active" : "Inactive"}
          </Badge>
          {!editing && (
            <Button size="sm" variant="outline" onClick={() => { setEditing(true); }}>
              Edit
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => { void handleDelete(); }}
            loading={deleting}
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            Delete
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
        </CardHeader>

        {editing ? (
          <div className="flex flex-col gap-4">
            <Input
              label="Name"
              id="name"
              value={form.name}
              onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); }}
            />

            <div className="flex flex-col gap-1">
              <label htmlFor="systemPrompt" className="text-sm font-medium text-gray-700">
                System Prompt
              </label>
              <textarea
                id="systemPrompt"
                rows={6}
                value={form.systemPrompt}
                onChange={(e) => { setForm((f) => ({ ...f, systemPrompt: e.target.value })); }}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="tone" className="text-sm font-medium text-gray-700">
                Tone
              </label>
              <select
                id="tone"
                value={form.tone}
                onChange={(e) => { setForm((f) => ({ ...f, tone: e.target.value })); }}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {TONES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.leadCapture}
                  onChange={(e) => { setForm((f) => ({ ...f, leadCapture: e.target.checked })); }}
                  className="h-4 w-4 rounded border-gray-300"
                />
                Lead Capture
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => { setForm((f) => ({ ...f, isActive: e.target.checked })); }}
                  className="h-4 w-4 rounded border-gray-300"
                />
                Active
              </label>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => { void handleSave(); }} loading={saving}>
                Save changes
              </Button>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
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
        )}
      </Card>

      {/* Embed Snippet */}
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
