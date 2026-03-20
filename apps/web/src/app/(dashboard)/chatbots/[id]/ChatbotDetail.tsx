"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, Badge, Button, Input } from "@integriochat/ui";

interface Chatbot {
  id: string;
  name: string;
  systemPrompt: string;
  tone: string;
  leadCapture: boolean;
  isActive: boolean;
  websiteUrl: string | null;
  scrapeStatus: string;
  lastScrapedAt: Date | null;
}

interface CustomQA {
  id: string;
  question: string;
  answer: string;
}

interface Props {
  chatbot: Chatbot;
  embedSnippet: string;
  baseUrl: string;
}

const DEMO_DURATIONS = [1, 7, 14, 30] as const;
const TONES = ["professional", "friendly", "casual", "formal"] as const;

const SCRAPE_STATUS_LABEL: Record<string, { label: string; variant: "default" | "info" | "success" | "warning" | "danger" }> = {
  idle: { label: "Not trained", variant: "default" },
  scraping: { label: "Training…", variant: "info" },
  done: { label: "Trained", variant: "success" },
  error: { label: "Error", variant: "danger" },
};

export function ChatbotDetail({ chatbot: initial, embedSnippet, baseUrl }: Props) {
  const router = useRouter();
  const [chatbot, setChatbot] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: initial.name,
    systemPrompt: initial.systemPrompt,
    tone: initial.tone,
    leadCapture: initial.leadCapture,
    isActive: initial.isActive,
    websiteUrl: initial.websiteUrl ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Demo link state
  const [demoDuration, setDemoDuration] = useState<number>(7);
  const [generatingDemo, setGeneratingDemo] = useState(false);
  const [demoLink, setDemoLink] = useState<{ url: string; expiresAt: string } | null>(null);
  const [demoError, setDemoError] = useState<string | null>(null);
  const [demoCopied, setDemoCopied] = useState(false);

  // Website training state
  const [scraping, setScraping] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<{ pagesScraped: number; chunksIndexed: number } | null>(null);
  const [scrapeError, setScrapeError] = useState<string | null>(null);

  // Custom Q&A state
  const [qas, setQas] = useState<CustomQA[]>([]);
  const [qaLoaded, setQaLoaded] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [addingQa, setAddingQa] = useState(false);
  const [qaError, setQaError] = useState<string | null>(null);
  const [deletingQaId, setDeletingQaId] = useState<string | null>(null);

  // Load Q&A pairs on mount
  useEffect(() => {
    fetch(`/api/chatbots/${chatbot.id}/qa`)
      .then((r) => r.json())
      .then((d: { data?: CustomQA[] }) => {
        if (d.data) setQas(d.data);
        setQaLoaded(true);
      })
      .catch(() => { setQaLoaded(true); });
  }, [chatbot.id]);

  // --- Config handlers ---
  async function handleSave() {
    setSaving(true);
    setError(null);
    const websiteUrl = form.websiteUrl.trim() || null;
    const res = await fetch(`/api/chatbots/${chatbot.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, websiteUrl }),
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
      websiteUrl: chatbot.websiteUrl ?? "",
    });
    setEditing(false);
    setError(null);
  }

  // --- Demo link handlers ---
  async function handleGenerateDemo() {
    setGeneratingDemo(true);
    setDemoError(null);
    try {
      const res = await fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatbotId: chatbot.id, durationDays: demoDuration }),
      });
      const data = await res.json() as { data?: { token: string; expiresAt: string }; error?: string };
      if (!res.ok) { setDemoError(data.error ?? "Failed to generate demo link"); return; }
      if (data.data) {
        setDemoLink({ url: `${baseUrl}/demo/${data.data.token}`, expiresAt: data.data.expiresAt });
      }
    } catch { setDemoError("Network error — please try again"); }
    finally { setGeneratingDemo(false); }
  }

  async function handleCopyDemo() {
    if (!demoLink) return;
    await navigator.clipboard.writeText(demoLink.url);
    setDemoCopied(true);
    setTimeout(() => { setDemoCopied(false); }, 2000);
  }

  // --- Scrape handler ---
  async function handleScrape() {
    setScraping(true);
    setScrapeError(null);
    setScrapeResult(null);
    setChatbot((c) => ({ ...c, scrapeStatus: "scraping" }));
    try {
      const res = await fetch(`/api/chatbots/${chatbot.id}/scrape`, { method: "POST" });
      const data = await res.json() as { data?: { pagesScraped: number; chunksIndexed: number }; error?: string };
      if (!res.ok) {
        setScrapeError(data.error ?? "Scraping failed");
        setChatbot((c) => ({ ...c, scrapeStatus: "error" }));
        return;
      }
      setScrapeResult(data.data ?? null);
      setChatbot((c) => ({ ...c, scrapeStatus: "done", lastScrapedAt: new Date() }));
    } catch {
      setScrapeError("Network error — please try again");
      setChatbot((c) => ({ ...c, scrapeStatus: "error" }));
    } finally { setScraping(false); }
  }

  // --- Q&A handlers ---
  async function handleAddQa() {
    if (!newQuestion.trim() || !newAnswer.trim()) return;
    setAddingQa(true);
    setQaError(null);
    try {
      const res = await fetch(`/api/chatbots/${chatbot.id}/qa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: newQuestion.trim(), answer: newAnswer.trim() }),
      });
      const data = await res.json() as { data?: CustomQA; error?: string };
      if (!res.ok) { setQaError(data.error ?? "Failed to add"); return; }
      if (data.data) { setQas((prev) => [...prev, data.data!]); }
      setNewQuestion("");
      setNewAnswer("");
    } catch { setQaError("Network error"); }
    finally { setAddingQa(false); }
  }

  async function handleDeleteQa(qaId: string) {
    setDeletingQaId(qaId);
    try {
      await fetch(`/api/chatbots/${chatbot.id}/qa/${qaId}`, { method: "DELETE" });
      setQas((prev) => prev.filter((q) => q.id !== qaId));
    } catch { /* ignore */ }
    finally { setDeletingQaId(null); }
  }

  const scrapeStatusInfo = SCRAPE_STATUS_LABEL[chatbot.scrapeStatus] ?? SCRAPE_STATUS_LABEL["idle"]!;

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

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {/* Configuration */}
      <Card>
        <CardHeader><CardTitle>Configuration</CardTitle></CardHeader>
        {editing ? (
          <div className="flex flex-col gap-4">
            <Input label="Name" id="name" value={form.name}
              onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); }} />

            <div className="flex flex-col gap-1">
              <label htmlFor="systemPrompt" className="text-sm font-medium text-gray-700">System Prompt</label>
              <textarea id="systemPrompt" rows={6} value={form.systemPrompt}
                onChange={(e) => { setForm((f) => ({ ...f, systemPrompt: e.target.value })); }}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="tone" className="text-sm font-medium text-gray-700">Tone</label>
              <select id="tone" value={form.tone}
                onChange={(e) => { setForm((f) => ({ ...f, tone: e.target.value })); }}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                {TONES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="websiteUrl" className="text-sm font-medium text-gray-700">
                Website URL <span className="font-normal text-gray-400">(for training)</span>
              </label>
              <Input id="websiteUrl" type="url" placeholder="https://yourcompany.com"
                value={form.websiteUrl}
                onChange={(e) => { setForm((f) => ({ ...f, websiteUrl: e.target.value })); }} />
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.leadCapture}
                  onChange={(e) => { setForm((f) => ({ ...f, leadCapture: e.target.checked })); }}
                  className="h-4 w-4 rounded border-gray-300" />
                Lead Capture
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isActive}
                  onChange={(e) => { setForm((f) => ({ ...f, isActive: e.target.checked })); }}
                  className="h-4 w-4 rounded border-gray-300" />
                Active
              </label>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => { void handleSave(); }} loading={saving}>Save changes</Button>
              <Button variant="outline" onClick={handleCancel}>Cancel</Button>
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
            {chatbot.websiteUrl && (
              <div className="col-span-2">
                <dt className="font-medium text-gray-500">Website URL</dt>
                <dd className="truncate text-blue-600">{chatbot.websiteUrl}</dd>
              </div>
            )}
            <div className="col-span-2">
              <dt className="font-medium text-gray-500">System Prompt</dt>
              <dd className="mt-1 whitespace-pre-wrap rounded-md bg-gray-50 p-3 font-mono text-xs">
                {chatbot.systemPrompt}
              </dd>
            </div>
          </dl>
        )}
      </Card>

      {/* Website Training */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Website Training</CardTitle>
            <Badge variant={scrapeStatusInfo.variant}>{scrapeStatusInfo.label}</Badge>
          </div>
        </CardHeader>
        <p className="mb-4 text-sm text-gray-500">
          We will crawl up to 20 pages starting from your website URL, extract their text, and train
          the bot so it can answer questions about your content.
        </p>

        {!chatbot.websiteUrl ? (
          <p className="text-sm text-amber-600">
            No website URL set. Edit the configuration above to add one.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <code className="flex-1 truncate rounded bg-gray-100 px-3 py-1.5 text-sm text-gray-700">
                {chatbot.websiteUrl}
              </code>
              <Button onClick={() => { void handleScrape(); }} loading={scraping} disabled={scraping}>
                {chatbot.scrapeStatus === "done" ? "Re-train" : "Train Now"}
              </Button>
            </div>
            {chatbot.lastScrapedAt && (
              <p className="text-xs text-gray-400">
                Last trained: {new Date(chatbot.lastScrapedAt).toLocaleString()}
              </p>
            )}
            {scrapeResult && (
              <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
                Done — {scrapeResult.pagesScraped} pages scraped, {scrapeResult.chunksIndexed} chunks indexed.
              </div>
            )}
            {scrapeError && (
              <p className="text-sm text-red-600">{scrapeError}</p>
            )}
          </div>
        )}
      </Card>

      {/* Custom Q&A */}
      <Card>
        <CardHeader><CardTitle>Predetermined Answers</CardTitle></CardHeader>
        <p className="mb-4 text-sm text-gray-500">
          Add specific question-and-answer pairs that always take priority over the scraped website
          content. Useful for pricing, policies, or anything the website doesn&apos;t cover clearly.
        </p>

        {/* Add new Q&A */}
        <div className="mb-4 flex flex-col gap-2 rounded-md border border-dashed border-gray-300 p-4">
          <Input label="Question" placeholder="What are your business hours?" value={newQuestion}
            onChange={(e) => { setNewQuestion(e.target.value); }} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Answer</label>
            <textarea rows={3} placeholder="We are open Monday–Friday, 9am–5pm EST."
              value={newAnswer} onChange={(e) => { setNewAnswer(e.target.value); }}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          {qaError && <p className="text-sm text-red-600">{qaError}</p>}
          <Button
            size="sm"
            onClick={() => { void handleAddQa(); }}
            loading={addingQa}
            disabled={!newQuestion.trim() || !newAnswer.trim()}
          >
            Add Answer
          </Button>
        </div>

        {/* Q&A list */}
        {qaLoaded && qas.length === 0 && (
          <p className="text-sm text-gray-400">No predetermined answers yet.</p>
        )}
        <div className="flex flex-col gap-3">
          {qas.map((qa) => (
            <div key={qa.id} className="group flex gap-3 rounded-md border border-gray-200 p-3">
              <div className="flex-1 flex flex-col gap-1">
                <p className="text-sm font-medium text-gray-800">{qa.question}</p>
                <p className="text-sm text-gray-600">{qa.answer}</p>
              </div>
              <button
                onClick={() => { void handleDeleteQa(qa.id); }}
                disabled={deletingQaId === qa.id}
                className="self-start text-xs text-gray-400 hover:text-red-500 disabled:opacity-40 transition-colors"
              >
                {deletingQaId === qa.id ? "…" : "Remove"}
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* Embed Snippet */}
      <Card>
        <CardHeader><CardTitle>Embed Snippet</CardTitle></CardHeader>
        <p className="mb-2 text-sm text-gray-500">
          Add this script tag to your website to embed the chatbot.
        </p>
        <pre className="overflow-x-auto rounded-md bg-gray-900 p-4 text-sm text-green-400">
          {embedSnippet}
        </pre>
      </Card>

      {/* Demo Link */}
      <Card>
        <CardHeader><CardTitle>Demo Link</CardTitle></CardHeader>
        <p className="mb-4 text-sm text-gray-500">
          Generate a shareable link to let others try this chatbot without embedding it.
        </p>

        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="demoDuration" className="text-sm font-medium text-gray-700">Expires after</label>
            <select id="demoDuration" value={demoDuration}
              onChange={(e) => { setDemoDuration(Number(e.target.value)); setDemoLink(null); }}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
              {DEMO_DURATIONS.map((d) => (
                <option key={d} value={d}>{d} {d === 1 ? "day" : "days"}</option>
              ))}
            </select>
          </div>
          <div className="mt-5">
            <Button onClick={() => { void handleGenerateDemo(); }} loading={generatingDemo}>
              Generate Demo Link
            </Button>
          </div>
        </div>

        {demoError && <p className="mt-3 text-sm text-red-600">{demoError}</p>}

        {demoLink && (
          <div className="mt-4 flex flex-col gap-2 rounded-md bg-gray-50 p-4">
            <div className="flex items-center gap-2">
              <code className="flex-1 overflow-x-auto text-sm text-gray-800">{demoLink.url}</code>
              <Button size="sm" variant="outline" onClick={() => { void handleCopyDemo(); }}>
                {demoCopied ? "Copied!" : "Copy"}
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Expires: {new Date(demoLink.expiresAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
