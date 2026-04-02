"use client";

import { useState, useEffect, useRef } from "react";
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
  autoRetrain: boolean;
  // AI settings
  aiModel: string;
  temperature: number;
  maxTokens: number;
  fallbackMsg: string;
  // Appearance
  chatTitle: string | null;
  chatAvatar: string | null;
  themeColor: string;
  widgetPosition: string;
  widgetTheme: string;
  initialMessage: string;
  suggestedQs: string[];
  // API
  apiKey: string;
  // CORS
  allowedDomains: string[];
  // Per-chatbot spending caps (USAGE plan)
  monthlyMessageLimit: number | null;
  monthlySpendLimitCents: number | null;
  webSearchEnabled: boolean;
}

interface PlanFeatures {
  allModels: boolean;
  apiAccess: boolean;
  removeBranding: boolean;
  autoRetrain: boolean;
  webhooks: boolean;
}

interface WebhookRow {
  id: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
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
  planFeatures?: PlanFeatures;
  isUsagePlan?: boolean;
}

type Tab = "settings" | "appearance" | "training" | "integration" | "preview" | "leads";

const AI_MODELS = [
  { value: "gpt-4o-mini", label: "GPT-4o Mini — fast & cost-efficient (recommended)" },
  { value: "gpt-4o", label: "GPT-4o — most capable" },
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo — legacy" },
] as const;

const TONES = ["professional", "friendly", "casual", "formal"] as const;
const DEMO_DURATIONS = [1, 7, 14, 30] as const;

const SCRAPE_STATUS_LABEL: Record<string, { label: string; variant: "default" | "info" | "success" | "warning" | "danger" }> = {
  idle: { label: "Not trained", variant: "default" },
  scraping: { label: "Training…", variant: "info" },
  done: { label: "Trained", variant: "success" },
  error: { label: "Error", variant: "danger" },
};

function formFromChatbot(c: Chatbot) {
  return {
    name: c.name,
    systemPrompt: c.systemPrompt,
    tone: c.tone,
    leadCapture: c.leadCapture,
    isActive: c.isActive,
    autoRetrain: c.autoRetrain ?? false,
    websiteUrl: c.websiteUrl ?? "",
    aiModel: c.aiModel ?? "gpt-4o-mini",
    temperature: c.temperature ?? 0.7,
    maxTokens: c.maxTokens ?? 500,
    fallbackMsg: c.fallbackMsg ?? "",
    chatTitle: c.chatTitle ?? "",
    chatAvatar: c.chatAvatar ?? "",
    themeColor: c.themeColor ?? "#6366f1",
    widgetPosition: c.widgetPosition ?? "bottom-right",
    widgetTheme: c.widgetTheme ?? "light",
    initialMessage: c.initialMessage ?? "Hi! How can I help you today?",
    suggestedQs: [...(c.suggestedQs ?? []), "", "", "", ""].slice(0, 4),
    monthlyMessageLimit: c.monthlyMessageLimit ?? null,
    monthlySpendLimitCents: c.monthlySpendLimitCents ?? null,
    webSearchEnabled: c.webSearchEnabled ?? false,
  };
}

export function ChatbotDetail({ chatbot: initial, embedSnippet, baseUrl, planFeatures, isUsagePlan }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("settings");
  const [chatbot, setChatbot] = useState(initial);
  const [form, setForm] = useState(formFromChatbot(initial));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const savedFormRef = useRef(JSON.stringify(formFromChatbot(initial)));
  const isDirty = JSON.stringify(form) !== savedFormRef.current;

  // Demo link state
  const [demoDuration, setDemoDuration] = useState<number>(7);
  const [generatingDemo, setGeneratingDemo] = useState(false);
  const [demoLink, setDemoLink] = useState<{ url: string; expiresAt: string } | null>(null);
  const [demoError, setDemoError] = useState<string | null>(null);
  const [demoCopied, setDemoCopied] = useState(false);

  // Preview / test-chat state
  const [previewMessages, setPreviewMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [previewInput, setPreviewInput] = useState("");
  const [previewSending, setPreviewSending] = useState(false);
  const previewSessionId = useRef(`preview-${chatbot.id}-${Date.now()}`);
  const previewEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    previewEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [previewMessages]);

  async function handlePreviewSend() {
    const msg = previewInput.trim();
    if (!msg || previewSending) return;
    setPreviewInput("");
    setPreviewMessages((prev) => [...prev, { role: "user", content: msg }]);
    setPreviewSending(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatbotId: chatbot.id, sessionId: previewSessionId.current, message: msg }),
      });
      if (!res.ok || !res.body) {
        const errData = (await res.json().catch(() => ({}))) as { error?: string };
        setPreviewMessages((prev) => [
          ...prev,
          { role: "assistant", content: errData.error ?? "Error: could not get a response." },
        ]);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let reply = "";
      setPreviewMessages((prev) => [...prev, { role: "assistant", content: "" }]);
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        reply += decoder.decode(value, { stream: true });
        setPreviewMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: reply };
          return next;
        });
      }
    } catch {
      setPreviewMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Error: could not reach the chatbot." },
      ]);
    } finally {
      setPreviewSending(false);
    }
  }

  // Website training state
  const [scraping, setScraping] = useState(false);
  const [scrapeProgress, setScrapeProgress] = useState<{ done: number; total: number } | null>(null);
  const [scrapeResult, setScrapeResult] = useState<{ pagesScraped: number; chunksIndexed: number } | null>(null);
  const [scrapeError, setScrapeError] = useState<string | null>(null);

  // If the page loads with scrapeStatus already "scraping" (left over from a
  // previous killed session), poll the server for up to 30 s. After that,
  // treat it as stale so the user can retry — the /scrape route also accepts
  // re-scraping over a status older than 10 minutes.
  useEffect(() => {
    if (chatbot.scrapeStatus !== "scraping" || scraping) return;
    const start = Date.now();
    const intervalId = setInterval(async () => {
      if (Date.now() - start > 30_000) {
        clearInterval(intervalId);
        setChatbot((c) => ({ ...c, scrapeStatus: "error" }));
        setScrapeError("Previous training session did not complete. Click Re-train to try again.");
        return;
      }
      try {
        const res = await fetch(`/api/chatbots/${chatbot.id}`);
        if (!res.ok) return;
        const d = await res.json() as { data?: { scrapeStatus: string; lastScrapedAt: string | null } };
        if (!d.data || d.data.scrapeStatus === "scraping") return;
        setChatbot((c) => ({
          ...c,
          scrapeStatus: d.data!.scrapeStatus,
          lastScrapedAt: d.data!.lastScrapedAt ? new Date(d.data!.lastScrapedAt) : null,
        }));
      } catch { /* ignore */ }
    }, 5000);
    return () => clearInterval(intervalId);
  }, [chatbot.id, chatbot.scrapeStatus, scraping]);

  // Custom Q&A state
  const [qas, setQas] = useState<CustomQA[]>([]);
  const [qaLoaded, setQaLoaded] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [addingQa, setAddingQa] = useState(false);
  const [qaError, setQaError] = useState<string | null>(null);
  const [deletingQaId, setDeletingQaId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/chatbots/${chatbot.id}/qa`)
      .then((r) => r.json())
      .then((d: { data?: CustomQA[] }) => {
        if (d.data) setQas(d.data);
        setQaLoaded(true);
      })
      .catch(() => { setQaLoaded(true); });
  }, [chatbot.id]);

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    const payload = {
      ...form,
      websiteUrl: form.websiteUrl.trim() || null,
      chatTitle: form.chatTitle.trim() || null,
      chatAvatar: form.chatAvatar.trim() || null,
      fallbackMsg: form.fallbackMsg.trim() || undefined,
      suggestedQs: form.suggestedQs.map((q) => q.trim()).filter(Boolean),
    };
    const res = await fetch(`/api/chatbots/${chatbot.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json() as { error?: string };
      setSaveError(data.error ?? "Failed to save changes");
      return;
    }
    const data = await res.json() as { data: Chatbot };
    setChatbot(data.data);
    const newForm = formFromChatbot(data.data);
    setForm(newForm);
    savedFormRef.current = JSON.stringify(newForm);
    setSaveSuccess(true);
    setTimeout(() => { setSaveSuccess(false); }, 2500);
  }

  function handleDiscard() {
    const f = formFromChatbot(chatbot);
    setForm(f);
    setSaveError(null);
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${chatbot.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    setDeleteError(null);
    const res = await fetch(`/api/chatbots/${chatbot.id}`, { method: "DELETE" });
    if (!res.ok) {
      setDeleting(false);
      const data = await res.json() as { error?: string };
      setDeleteError(data.error ?? "Failed to delete chatbot");
      return;
    }
    router.push("/chatbots");
    router.refresh();
  }

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

  async function handleScrape() {
    setScraping(true);
    setScrapeError(null);
    setScrapeResult(null);
    setScrapeProgress(null);
    setChatbot((c) => ({ ...c, scrapeStatus: "scraping" }));
    try {
      const res = await fetch(`/api/chatbots/${chatbot.id}/scrape`, { method: "POST" });

      // Non-streaming error (e.g. 409 already in progress, 404, etc.)
      if (!res.ok || !res.body) {
        const data = await res.json() as { error?: string };
        setScrapeError(data.error ?? "Scraping failed");
        setChatbot((c) => ({ ...c, scrapeStatus: "error" }));
        return;
      }

      // Read the SSE stream
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let streamCompleted = false; // set to true when we receive "done" or "error"

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE events are separated by double newlines
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6)) as
              | { type: "start"; total: number }
              | { type: "page"; done: number; total: number }
              | { type: "done"; pagesScraped: number; chunksIndexed: number }
              | { type: "error"; message: string };

            if (event.type === "start") {
              setScrapeProgress({ done: 0, total: event.total });
            } else if (event.type === "page") {
              setScrapeProgress({ done: event.done, total: event.total });
            } else if (event.type === "done") {
              streamCompleted = true;
              setScrapeResult({ pagesScraped: event.pagesScraped, chunksIndexed: event.chunksIndexed });
              setChatbot((c) => ({ ...c, scrapeStatus: "done", lastScrapedAt: new Date() }));
            } else if (event.type === "error") {
              streamCompleted = true;
              setScrapeError(event.message ?? "Scraping failed");
              setChatbot((c) => ({ ...c, scrapeStatus: "error" }));
            }
          } catch { /* malformed event — skip */ }
        }
      }

      // Stream closed without a terminal event — the function was likely killed
      // (Vercel timeout). Surface it immediately; the /scrape route accepts
      // re-scraping over a stale status so the user can retry right away.
      if (!streamCompleted) {
        setScrapeError("Training was interrupted (function timeout). Click Re-train to try again.");
        setChatbot((c) => ({ ...c, scrapeStatus: "error" }));
      }
    } catch {
      setScrapeError("Network error — please try again");
      setChatbot((c) => ({ ...c, scrapeStatus: "error" }));
    } finally {
      setScraping(false);
      setScrapeProgress(null);
    }
  }

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

  // API Key state
  const [apiKey, setApiKey] = useState(initial.apiKey ?? "");
  const [regenLoading, setRegenLoading] = useState(false);
  const [apiKeyCopied, setApiKeyCopied] = useState(false);

  // Allowed domains state
  const [allowedDomains, setAllowedDomains] = useState<string[]>(initial.allowedDomains ?? []);
  const [newDomain, setNewDomain] = useState("");
  const [domainError, setDomainError] = useState<string | null>(null);
  const [domainSaving, setDomainSaving] = useState(false);

  function validateDomain(raw: string): string | null {
    const d = raw.trim().toLowerCase();
    if (!d) return "Enter a domain";
    if (!/^(\*\.)?[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(d))
      return "Enter a valid domain (e.g. example.com or *.example.com)";
    return null;
  }

  async function saveDomains(updated: string[]) {
    setDomainSaving(true);
    try {
      const res = await fetch(`/api/chatbots/${chatbot.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowedDomains: updated }),
      });
      if (res.ok) setAllowedDomains(updated);
    } finally {
      setDomainSaving(false);
    }
  }

  async function handleAddDomain(e: React.FormEvent) {
    e.preventDefault();
    const domain = newDomain.trim().toLowerCase();
    const err = validateDomain(domain);
    if (err) { setDomainError(err); return; }
    if (allowedDomains.includes(domain)) { setDomainError("Domain already added"); return; }
    setDomainError(null);
    await saveDomains([...allowedDomains, domain]);
    setNewDomain("");
  }

  // Webhooks state
  const [webhooks, setWebhooks] = useState<WebhookRow[]>([]);
  const [webhooksLoaded, setWebhooksLoaded] = useState(false);
  const [newWHName, setNewWHName] = useState("");
  const [newWHUrl, setNewWHUrl] = useState("");
  const [newWHEvents, setNewWHEvents] = useState("message.completed");
  const [addingWH, setAddingWH] = useState(false);

  type LeadRow = { id: string; email: string; name: string | null; phone: string | null; sessionId: string; createdAt: string };
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [leadsLoaded, setLeadsLoaded] = useState(false);

  useEffect(() => {
    if (activeTab === "leads" && !leadsLoaded) {
      fetch(`/api/chatbots/${chatbot.id}/leads`)
        .then((r) => r.json())
        .then((d: { data?: LeadRow[] }) => {
          if (d.data) setLeads(d.data);
          setLeadsLoaded(true);
        })
        .catch(() => { setLeadsLoaded(true); });
    }
  }, [activeTab, leadsLoaded, chatbot.id]);

  useEffect(() => {
    if (activeTab === "integration" && !webhooksLoaded) {
      fetch(`/api/chatbots/${chatbot.id}/webhooks`)
        .then((r) => r.json())
        .then((d: { data?: WebhookRow[] }) => {
          if (d.data) setWebhooks(d.data);
          setWebhooksLoaded(true);
        })
        .catch(() => { setWebhooksLoaded(true); });
    }
  }, [activeTab, webhooksLoaded, chatbot.id]);

  async function handleRegenApiKey() {
    if (!window.confirm("Regenerate API key? The old key will stop working immediately.")) return;
    setRegenLoading(true);
    try {
      const res = await fetch(`/api/chatbots/${chatbot.id}/api-key`, { method: "POST" });
      const data = await res.json() as { data?: { apiKey: string } };
      if (data.data?.apiKey) setApiKey(data.data.apiKey);
    } catch { /* ignore */ }
    finally { setRegenLoading(false); }
  }

  async function handleAddWebhook() {
    if (!newWHName.trim() || !newWHUrl.trim()) return;
    setAddingWH(true);
    try {
      const events = newWHEvents.split(",").map((e) => e.trim()).filter(Boolean);
      const res = await fetch(`/api/chatbots/${chatbot.id}/webhooks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newWHName, url: newWHUrl, events }),
      });
      const data = await res.json() as { data?: WebhookRow };
      if (res.ok && data.data) {
        setWebhooks((prev) => [...prev, data.data!]);
        setNewWHName(""); setNewWHUrl(""); setNewWHEvents("message.completed");
      }
    } catch { /* ignore */ }
    finally { setAddingWH(false); }
  }

  async function handleDeleteWebhook(webhookId: string) {
    await fetch(`/api/chatbots/${chatbot.id}/webhooks/${webhookId}`, { method: "DELETE" });
    setWebhooks((prev) => prev.filter((w) => w.id !== webhookId));
  }

  const scrapeStatusInfo = SCRAPE_STATUS_LABEL[chatbot.scrapeStatus] ?? SCRAPE_STATUS_LABEL["idle"]!;

  const TABS: { id: Tab; label: string }[] = [
    { id: "settings", label: "Settings" },
    { id: "appearance", label: "Appearance" },
    { id: "training", label: "Training" },
    { id: "integration", label: "Integration" },
    { id: "leads", label: "Leads" },
    { id: "preview", label: "Preview" },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-2xl font-bold truncate">{chatbot.name}</h1>
          <Badge variant={chatbot.isActive ? "success" : "danger"}>
            {chatbot.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {saveSuccess && (
            <span className="text-sm font-medium text-green-600">Saved!</span>
          )}
          {isDirty && (
            <>
              <Button size="sm" variant="secondary" onClick={handleDiscard}>
                Discard
              </Button>
              <Button size="sm" onClick={() => { void handleSave(); }} loading={saving}>
                Save changes
              </Button>
            </>
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

      {saveError && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{saveError}</div>}
      {deleteError && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{deleteError}</div>}

      {/* ── Tabs ── */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); }}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-brand-500 text-brand-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Settings tab ── */}
      {activeTab === "settings" && (
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader><CardTitle>General</CardTitle></CardHeader>
            <div className="flex flex-col gap-4">
              <Input
                label="Chatbot Name"
                id="name"
                value={form.name}
                onChange={(e) => { setField("name", e.target.value); }}
              />

              <div className="flex flex-col gap-1">
                <label htmlFor="systemPrompt" className="text-sm font-medium text-gray-700">
                  Instructions / System Prompt
                </label>
                <p className="text-xs text-gray-400">
                  Describe the bot&apos;s role, what it knows, and how it should behave.
                </p>
                <textarea
                  id="systemPrompt"
                  rows={7}
                  value={form.systemPrompt}
                  onChange={(e) => { setField("systemPrompt", e.target.value); }}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="tone" className="text-sm font-medium text-gray-700">Tone</label>
                <select
                  id="tone"
                  value={form.tone}
                  onChange={(e) => { setField("tone", e.target.value); }}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {TONES.map((t) => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="fallbackMsg" className="text-sm font-medium text-gray-700">
                  Fallback Message
                </label>
                <p className="text-xs text-gray-400">
                  What the bot says when it cannot find a relevant answer in its knowledge base.
                </p>
                <textarea
                  id="fallbackMsg"
                  rows={3}
                  value={form.fallbackMsg}
                  placeholder="I'm sorry, I don't have enough information to answer that."
                  onChange={(e) => { setField("fallbackMsg", e.target.value); }}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-6">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.leadCapture}
                    onChange={(e) => { setField("leadCapture", e.target.checked); }}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  Collect leads (ask for name/email)
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => { setField("isActive", e.target.checked); }}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  Active (accept chat messages)
                </label>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="webSearchEnabled"
                    checked={form.webSearchEnabled}
                    onChange={(e) => { setField("webSearchEnabled", e.target.checked); }}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300"
                  />
                  <div className="flex flex-col gap-0.5">
                    <label htmlFor="webSearchEnabled" className="text-sm font-medium text-gray-700 cursor-pointer">
                      Enable real-time web search
                    </label>
                    <p className="text-xs text-gray-500">
                      The bot can search the internet for live information — availability, prices, news, weather, and more. Requires <code className="rounded bg-gray-100 px-1 font-mono text-xs">TAVILY_API_KEY</code> to be set.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader><CardTitle>AI Model</CardTitle></CardHeader>
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <label htmlFor="aiModel" className="text-sm font-medium text-gray-700">Model</label>
                <select
                  id="aiModel"
                  value={form.aiModel}
                  onChange={(e) => { setField("aiModel", e.target.value); }}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {AI_MODELS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between">
                  <label htmlFor="temperature" className="text-sm font-medium text-gray-700">
                    Temperature
                  </label>
                  <span className="text-sm tabular-nums text-gray-500">{form.temperature.toFixed(1)}</span>
                </div>
                <p className="text-xs text-gray-400">
                  Lower = more precise and deterministic. Higher = more creative and varied.
                </p>
                <input
                  id="temperature"
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={form.temperature}
                  onChange={(e) => { setField("temperature", parseFloat(e.target.value)); }}
                  className="w-full accent-brand-500"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Precise (0)</span>
                  <span>Creative (1)</span>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="maxTokens" className="text-sm font-medium text-gray-700">
                  Max Response Length (tokens)
                </label>
                <p className="text-xs text-gray-400">
                  Roughly 1 token ≈ 4 characters. 500 tokens ≈ a short paragraph. Max 4000.
                </p>
                <input
                  id="maxTokens"
                  type="number"
                  min={100}
                  max={4000}
                  step={50}
                  value={form.maxTokens}
                  onChange={(e) => { setField("maxTokens", parseInt(e.target.value, 10) || 500); }}
                  className="w-32 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
          </Card>

          {/* ── Per-chatbot spending caps (USAGE plan only) ── */}
          {isUsagePlan && (
            <Card>
              <CardHeader>
                <CardTitle>Usage Limits</CardTitle>
              </CardHeader>
              <div className="flex flex-col gap-5">
                <p className="text-sm text-gray-500 leading-relaxed">
                  Optional caps applied to <strong>this chatbot</strong> each calendar month.
                  When a cap is hit the chatbot returns an error to the end user — your other chatbots are unaffected.
                  Leave blank for no limit.
                </p>

                <div className="flex flex-col gap-1">
                  <label htmlFor="monthlyMessageLimit" className="text-sm font-medium text-gray-700">
                    Monthly message limit
                  </label>
                  <p className="text-xs text-gray-400">
                    Max number of user messages this chatbot will accept per month.
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      id="monthlyMessageLimit"
                      type="number"
                      min={1}
                      step={100}
                      placeholder="No limit"
                      value={form.monthlyMessageLimit ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setField("monthlyMessageLimit", v === "" ? null : parseInt(v, 10) || null);
                      }}
                      className="w-36 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <span className="text-sm text-gray-400">messages / month</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="monthlySpendLimit" className="text-sm font-medium text-gray-700">
                    Monthly spend cap
                  </label>
                  <p className="text-xs text-gray-400">
                    Max amount (in USD) this chatbot may bill per month, based on token usage at our published rates.
                    ~$0.003 per typical exchange.
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">$</span>
                    <input
                      id="monthlySpendLimit"
                      type="number"
                      min={0.01}
                      step={1}
                      placeholder="No limit"
                      value={form.monthlySpendLimitCents !== null ? (form.monthlySpendLimitCents / 100).toFixed(2) : ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setField("monthlySpendLimitCents", v === "" ? null : Math.round(parseFloat(v) * 100) || null);
                      }}
                      className="w-36 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <span className="text-sm text-gray-400">USD / month</span>
                  </div>
                  {form.monthlySpendLimitCents !== null && (
                    <p className="text-xs text-gray-400">
                      ≈ {Math.floor(form.monthlySpendLimitCents / 0.3).toLocaleString()} typical exchanges
                    </p>
                  )}
                </div>

                <div className="rounded-md border border-amber-100 bg-amber-50 p-3 text-xs text-amber-700">
                  <strong>How costs accumulate:</strong> Each message triggers an AI completion.
                  Tokens are counted from the full conversation context (system prompt + history + reply).
                  Billed at $3.00/1M input tokens and $12.00/1M output tokens.
                  Usage records are reported to Stripe in real time; your invoice reflects actual consumption at month end.
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── Appearance tab ── */}
      {activeTab === "appearance" && (
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader><CardTitle>Widget Branding</CardTitle></CardHeader>
            <div className="flex flex-col gap-4">
              <Input
                label="Chat Title"
                id="chatTitle"
                placeholder={chatbot.name}
                value={form.chatTitle}
                onChange={(e) => { setField("chatTitle", e.target.value); }}
              />
              <p className="text-xs text-gray-400 -mt-2">
                Displayed in the widget header. Defaults to the chatbot&apos;s name if left blank.
              </p>

              <Input
                label="Avatar URL"
                id="chatAvatar"
                type="url"
                placeholder="https://yourcompany.com/logo.png"
                value={form.chatAvatar}
                onChange={(e) => { setField("chatAvatar", e.target.value); }}
              />
              <p className="text-xs text-gray-400 -mt-2">
                Image shown in the chat widget header and on bot messages.
              </p>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Theme Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.themeColor}
                    onChange={(e) => { setField("themeColor", e.target.value); }}
                    className="h-10 w-14 cursor-pointer rounded-md border border-gray-300 p-1"
                  />
                  <input
                    type="text"
                    value={form.themeColor}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setField("themeColor", v);
                    }}
                    maxLength={7}
                    className="w-28 rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <p className="text-xs text-gray-400">
                  Used for the chat bubble, send button, and accent elements.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label htmlFor="widgetPosition" className="text-sm font-medium text-gray-700">
                    Widget Position
                  </label>
                  <select
                    id="widgetPosition"
                    value={form.widgetPosition}
                    onChange={(e) => { setField("widgetPosition", e.target.value); }}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="bottom-right">Bottom Right</option>
                    <option value="bottom-left">Bottom Left</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="widgetTheme" className="text-sm font-medium text-gray-700">
                    Widget Theme
                  </label>
                  <select
                    id="widgetTheme"
                    value={form.widgetTheme}
                    onChange={(e) => { setField("widgetTheme", e.target.value); }}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader><CardTitle>Conversation Starters</CardTitle></CardHeader>
            <div className="flex flex-col gap-4">
              <Input
                label="Initial Greeting Message"
                id="initialMessage"
                value={form.initialMessage}
                placeholder="Hi! How can I help you today?"
                onChange={(e) => { setField("initialMessage", e.target.value); }}
              />
              <p className="text-xs text-gray-400 -mt-2">
                The first message users see when they open the chat widget.
              </p>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">
                  Suggested Questions
                </label>
                <p className="text-xs text-gray-400">
                  Up to 4 clickable prompts shown below the initial message to spark conversation.
                </p>
                {([0, 1, 2, 3] as const).map((i) => (
                  <Input
                    key={i}
                    placeholder={`Question ${i + 1}…`}
                    value={form.suggestedQs[i] ?? ""}
                    onChange={(e) => {
                      const next = [...form.suggestedQs] as [string, string, string, string];
                      next[i] = e.target.value;
                      setField("suggestedQs", next);
                    }}
                  />
                ))}
              </div>
            </div>
          </Card>

          {/* Live preview chip */}
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 flex flex-col items-center gap-3">
            <p className="text-sm font-medium text-gray-500">Widget Preview</p>
            <div
              className="flex w-72 flex-col overflow-hidden rounded-2xl shadow-xl text-sm"
              style={{ borderColor: form.themeColor }}
            >
              {/* Header */}
              <div
                className="flex items-center gap-2 px-4 py-3"
                style={{ backgroundColor: form.themeColor }}
              >
                {form.chatAvatar && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.chatAvatar}
                    alt="avatar"
                    className="h-7 w-7 rounded-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                )}
                <span className="font-semibold text-white truncate">
                  {form.chatTitle || chatbot.name}
                </span>
              </div>
              {/* Body */}
              <div
                className={`flex flex-col gap-2 px-4 py-4 min-h-[120px] ${form.widgetTheme === "dark" ? "bg-gray-900 text-white" : "bg-white text-gray-900"}`}
              >
                <div className="self-start rounded-2xl rounded-tl-none px-3 py-2 text-sm max-w-[80%]"
                  style={{ backgroundColor: form.widgetTheme === "dark" ? "#374151" : "#f3f4f6" }}>
                  {form.initialMessage || "Hi! How can I help you today?"}
                </div>
                {form.suggestedQs.filter(Boolean).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {form.suggestedQs.filter(Boolean).map((q, i) => (
                      <span
                        key={i}
                        className="rounded-full border px-2 py-0.5 text-xs cursor-pointer"
                        style={{ borderColor: form.themeColor, color: form.themeColor }}
                      >
                        {q}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-400">Live preview — updates as you type</p>
          </div>
        </div>
      )}

      {/* ── Training tab ── */}
      {activeTab === "training" && (
        <div className="flex flex-col gap-6">
          {/* Website URL field */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Website Training</CardTitle>
                <Badge variant={scrapeStatusInfo.variant}>{scrapeStatusInfo.label}</Badge>
              </div>
            </CardHeader>
            <p className="mb-4 text-sm text-gray-500">
              We will crawl pages starting from your website URL, extract their text, and train the
              bot so it can answer questions about your content.
            </p>

            <div className="mb-4">
              <Input
                label="Website URL"
                id="websiteUrl"
                type="url"
                placeholder="https://yourcompany.com"
                value={form.websiteUrl}
                onChange={(e) => { setField("websiteUrl", e.target.value); }}
              />
              <p className="mt-1 text-xs text-gray-400">
                Save changes first, then click Train Now.
              </p>
            </div>

            {chatbot.websiteUrl ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <code className="flex-1 truncate rounded bg-gray-100 px-3 py-1.5 text-sm text-gray-700">
                    {chatbot.websiteUrl}
                  </code>
                  <Button
                    onClick={() => { void handleScrape(); }}
                    loading={scraping}
                    disabled={scraping || chatbot.scrapeStatus === "scraping"}
                  >
                    {chatbot.scrapeStatus === "scraping"
                      ? "Training…"
                      : chatbot.scrapeStatus === "done"
                        ? "Re-train"
                        : "Train Now"}
                  </Button>
                </div>
                {chatbot.scrapeStatus === "scraping" && (
                  <div className="rounded-md border border-indigo-100 bg-indigo-50 px-3 py-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <svg className="h-4 w-4 animate-spin text-indigo-500" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span className="text-sm font-medium text-indigo-700">Training in progress…</span>
                      </div>
                      {scrapeProgress && (
                        <span className="font-mono text-xs text-indigo-600">
                          {scrapeProgress.done} / {scrapeProgress.total} pages
                        </span>
                      )}
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-indigo-100">
                      {scrapeProgress && scrapeProgress.total > 0 ? (
                        <div
                          className="h-full rounded-full bg-indigo-400 transition-all duration-500 ease-out"
                          style={{ width: `${Math.max(2, Math.round((scrapeProgress.done / scrapeProgress.total) * 100))}%` }}
                        />
                      ) : (
                        <div className="h-full animate-pulse rounded-full bg-indigo-400" />
                      )}
                    </div>
                    <p className="mt-2 text-xs text-indigo-500">Crawling pages and indexing content. This usually takes 1–2 minutes.</p>
                  </div>
                )}
                {chatbot.lastScrapedAt && chatbot.scrapeStatus !== "scraping" && (
                  <p className="text-xs text-gray-400">
                    Last trained: {new Date(chatbot.lastScrapedAt).toLocaleString()}
                  </p>
                )}
                {scrapeResult && (
                  <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
                    Done — {scrapeResult.pagesScraped} pages scraped, {scrapeResult.chunksIndexed} chunks indexed.
                  </div>
                )}
                {scrapeError && <p className="text-sm text-red-600">{scrapeError}</p>}
              </div>
            ) : (
              <p className="text-sm text-amber-600">
                No website URL saved yet. Add one above and save changes to enable training.
              </p>
            )}
            {planFeatures?.autoRetrain && (
              <label className="mt-2 flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.autoRetrain}
                  onChange={(e) => { setField("autoRetrain", e.target.checked); }}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Auto-retrain when website URL changes</span>
              </label>
            )}
          </Card>

          {/* Custom Q&A */}
          <Card>
            <CardHeader><CardTitle>Predetermined Answers</CardTitle></CardHeader>
            <p className="mb-4 text-sm text-gray-500">
              Specific question-and-answer pairs that always take priority over scraped website
              content. Useful for pricing, policies, or anything the website doesn&apos;t cover clearly.
            </p>

            <div className="mb-4 flex flex-col gap-2 rounded-md border border-dashed border-gray-300 p-4">
              <Input
                label="Question"
                placeholder="What are your business hours?"
                value={newQuestion}
                onChange={(e) => { setNewQuestion(e.target.value); }}
              />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Answer</label>
                <textarea
                  rows={3}
                  placeholder="We are open Monday–Friday, 9am–5pm EST."
                  value={newAnswer}
                  onChange={(e) => { setNewAnswer(e.target.value); }}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
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
        </div>
      )}

      {/* ── Integration tab ── */}
      {activeTab === "integration" && (
        <div className="flex flex-col gap-6">

          {/* Allowed embed domains */}
          <Card>
            <CardHeader><CardTitle>Allowed Embed Domains</CardTitle></CardHeader>
            <p className="mb-4 text-sm text-gray-500">
              Restrict which websites can embed this chatbot&apos;s widget. Leave empty to allow
              all origins (not recommended for production).
            </p>

            {allowedDomains.length > 0 ? (
              <ul className="mb-4 flex flex-col gap-2">
                {allowedDomains.map((domain) => (
                  <li
                    key={domain}
                    className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-2"
                  >
                    <code className="font-mono text-sm text-gray-700">{domain}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { void saveDomains(allowedDomains.filter((d) => d !== domain)); }}
                      loading={domainSaving}
                      className="text-red-500 hover:text-red-700"
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                No domains set — all origins are currently allowed.
              </p>
            )}

            <form onSubmit={(e) => { void handleAddDomain(e); }} className="flex items-end gap-3">
              <div className="flex-1">
                <Input
                  label="Add domain"
                  placeholder="example.com or *.example.com"
                  value={newDomain}
                  onChange={(e) => { setNewDomain(e.target.value); setDomainError(null); }}
                />
                {domainError && <p className="mt-1 text-xs text-red-600">{domainError}</p>}
              </div>
              <Button type="submit" size="sm" loading={domainSaving}>Add</Button>
            </form>
          </Card>

          <Card>
            <CardHeader><CardTitle>Embed Snippet</CardTitle></CardHeader>
            <p className="mb-2 text-sm text-gray-500">
              Add this script tag to your website to embed the chatbot widget.
            </p>
            <pre className="overflow-x-auto rounded-md bg-gray-900 p-4 text-sm text-green-400">
              {embedSnippet}
            </pre>
            <p className="mt-3 text-xs text-gray-400">
              The widget reads the chatbot&apos;s appearance settings (color, position, theme) automatically.
              No extra configuration needed on your site.
            </p>
          </Card>

          <Card>
            <CardHeader><CardTitle>Demo Link</CardTitle></CardHeader>
            <p className="mb-4 text-sm text-gray-500">
              Generate a shareable link to let others try this chatbot without embedding it.
            </p>

            <div className="flex items-end gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="demoDuration" className="text-sm font-medium text-gray-700">Expires after</label>
                <select
                  id="demoDuration"
                  value={demoDuration}
                  onChange={(e) => { setDemoDuration(Number(e.target.value)); setDemoLink(null); }}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {DEMO_DURATIONS.map((d) => (
                    <option key={d} value={d}>{d} {d === 1 ? "day" : "days"}</option>
                  ))}
                </select>
              </div>
              <Button onClick={() => { void handleGenerateDemo(); }} loading={generatingDemo}>
                Generate Demo Link
              </Button>
            </div>

            {demoError && <p className="mt-3 text-sm text-red-600">{demoError}</p>}

            {demoLink && (
              <div className="mt-4 flex flex-col gap-2 rounded-md bg-gray-50 p-4">
                <div className="flex items-center gap-2">
                  <code className="flex-1 overflow-x-auto text-sm text-gray-800">{demoLink.url}</code>
                  <Button size="sm" variant="secondary" onClick={() => { void handleCopyDemo(); }}>
                    {demoCopied ? "Copied!" : "Copy"}
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Expires: {new Date(demoLink.expiresAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
                </p>
              </div>
            )}
          </Card>

          {/* API Key — shown when plan has apiAccess */}
          {planFeatures?.apiAccess !== false && (
            <Card>
              <CardHeader><CardTitle>API Key</CardTitle></CardHeader>
              <p className="mb-4 text-sm text-gray-500">
                Use this key to send messages to this chatbot via the REST API. Treat it like a password.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-gray-100 px-3 py-2 font-mono text-sm text-gray-800 break-all">
                  {apiKey}
                </code>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    void navigator.clipboard.writeText(apiKey).then(() => {
                      setApiKeyCopied(true);
                      setTimeout(() => { setApiKeyCopied(false); }, 1500);
                    });
                  }}
                >
                  {apiKeyCopied ? "Copied!" : "Copy"}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => { void handleRegenApiKey(); }}
                  loading={regenLoading}
                  className="text-red-600 hover:border-red-300 hover:bg-red-50"
                >
                  Regenerate
                </Button>
              </div>
            </Card>
          )}

          {/* Webhooks — shown when plan has webhooks */}
          {planFeatures?.webhooks !== false && (
            <Card>
              <CardHeader><CardTitle>Webhooks</CardTitle></CardHeader>
              <p className="mb-4 text-sm text-gray-500">
                Receive HTTP POST requests when chatbot events fire. Supported events:{" "}
                <code className="text-xs">message.completed</code>,{" "}
                <code className="text-xs">conversation.started</code>,{" "}
                <code className="text-xs">lead.captured</code>.
              </p>

              <div className="mb-4 flex flex-col gap-2 rounded-md border border-dashed border-gray-300 p-4">
                <Input
                  label="Name"
                  placeholder="My webhook"
                  value={newWHName}
                  onChange={(e) => { setNewWHName(e.target.value); }}
                />
                <Input
                  label="URL"
                  type="url"
                  placeholder="https://your-server.com/webhook"
                  value={newWHUrl}
                  onChange={(e) => { setNewWHUrl(e.target.value); }}
                />
                <Input
                  label="Events (comma-separated)"
                  placeholder="message.completed, lead.captured"
                  value={newWHEvents}
                  onChange={(e) => { setNewWHEvents(e.target.value); }}
                />
                <Button
                  size="sm"
                  onClick={() => { void handleAddWebhook(); }}
                  loading={addingWH}
                  disabled={!newWHName.trim() || !newWHUrl.trim()}
                >
                  Add Webhook
                </Button>
              </div>

              {webhooksLoaded && webhooks.length === 0 && (
                <p className="text-sm text-gray-400">No webhooks yet.</p>
              )}
              <div className="flex flex-col gap-3">
                {webhooks.map((wh) => (
                  <div key={wh.id} className="flex items-start gap-3 rounded-md border border-gray-200 p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">{wh.name}</p>
                      <p className="truncate text-xs text-gray-500">{wh.url}</p>
                      <p className="mt-0.5 text-xs text-gray-400">{wh.events.join(", ")}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${wh.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {wh.isActive ? "Active" : "Paused"}
                      </span>
                      <button
                        type="button"
                        onClick={() => { void handleDeleteWebhook(wh.id); }}
                        className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── Leads tab ── */}
      {activeTab === "leads" && (
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Captured Leads</CardTitle>
            </CardHeader>
            {!chatbot.leadCapture && (
              <p className="text-sm text-amber-600 mb-4">
                Lead capture is currently disabled. Enable it in the Settings tab to start collecting leads.
              </p>
            )}
            {!leadsLoaded ? (
              <p className="text-sm text-gray-400">Loading…</p>
            ) : leads.length === 0 ? (
              <p className="text-sm text-gray-500">No leads captured yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                      <th className="pb-2 pr-4 font-medium">Email</th>
                      <th className="pb-2 pr-4 font-medium">Name</th>
                      <th className="pb-2 pr-4 font-medium">Session</th>
                      <th className="pb-2 font-medium">Captured</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => (
                      <tr key={lead.id} className="border-b border-gray-100">
                        <td className="py-2 pr-4 font-mono text-xs">{lead.email}</td>
                        <td className="py-2 pr-4 text-gray-600">{lead.name ?? "—"}</td>
                        <td className="py-2 pr-4 font-mono text-xs text-gray-400 max-w-[120px] truncate">{lead.sessionId}</td>
                        <td className="py-2 text-gray-500 whitespace-nowrap">
                          {new Date(lead.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── Preview tab ── */}
      {activeTab === "preview" && (
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Chat</CardTitle>
            </CardHeader>
            <p className="text-sm text-gray-500 mb-4">
              Send messages to your chatbot directly from the dashboard. This uses the same API as the embedded widget.
            </p>

            {/* Message list */}
            <div className="flex flex-col gap-3 rounded-lg bg-gray-50 p-4 min-h-[300px] max-h-[500px] overflow-y-auto">
              {previewMessages.length === 0 && (
                <p className="text-center text-sm text-gray-400 my-auto">
                  Send a message to start testing your chatbot.
                </p>
              )}
              {previewMessages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                      m.role === "user"
                        ? "bg-brand-500 text-white rounded-br-sm"
                        : "bg-white text-gray-800 border border-gray-200 rounded-bl-sm"
                    }`}
                  >
                    {m.content || <span className="italic text-gray-400">Thinking…</span>}
                  </div>
                </div>
              ))}
              <div ref={previewEndRef} />
            </div>

            {/* Input */}
            <div className="mt-3 flex gap-2">
              <Input
                value={previewInput}
                onChange={(e) => { setPreviewInput(e.target.value); }}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handlePreviewSend(); } }}
                placeholder="Type a message…"
                disabled={previewSending}
                className="flex-1"
              />
              <Button
                onClick={() => { void handlePreviewSend(); }}
                disabled={previewSending || !previewInput.trim()}
                size="sm"
              >
                {previewSending ? "…" : "Send"}
              </Button>
            </div>

            {previewMessages.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setPreviewMessages([]);
                  previewSessionId.current = `preview-${chatbot.id}-${Date.now()}`;
                }}
                className="mt-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Clear conversation
              </button>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
