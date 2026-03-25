"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  chatbotId: string;
  chatTitle: string;
  chatAvatar: string | null;
  themeColor: string;
  widgetTheme: string;
  initialMessage: string;
  suggestedQs: string[];
}

export function DemoChat({
  chatbotId,
  chatTitle,
  chatAvatar,
  themeColor,
  widgetTheme,
  initialMessage,
  suggestedQs,
}: Props) {
  const [sessionId] = useState(() => crypto.randomUUID());
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Hide suggested questions once the user has sent their first message
  const [showSuggestions, setShowSuggestions] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const isDark = widgetTheme === "dark";
  const filledSuggestions = suggestedQs.filter(Boolean);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(text: string) {
    text = text.trim();
    if (!text || streaming) return;

    setInput("");
    setError(null);
    setShowSuggestions(false);
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatbotId, sessionId, message: text }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setError(data.error ?? "Something went wrong. Please try again.");
        setStreaming(false);
        return;
      }

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "assistant", content: accumulated },
        ]);
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setStreaming(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend(input);
    }
  }

  return (
    <div
      className="flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl shadow-xl text-sm"
      style={{ height: 600 }}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ backgroundColor: themeColor }}
      >
        {chatAvatar && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={chatAvatar}
            alt=""
            className="h-8 w-8 rounded-full object-cover flex-shrink-0"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        )}
        <span className="font-semibold text-white text-base truncate">{chatTitle}</span>
      </div>

      {/* ── Messages ── */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-3"
        style={{ backgroundColor: isDark ? "#111827" : "#ffffff" }}
      >
        {/* Initial greeting from the bot */}
        <div className="flex justify-start">
          <div
            className="max-w-[80%] rounded-2xl rounded-tl-none px-4 py-2 text-sm whitespace-pre-wrap"
            style={{
              backgroundColor: isDark ? "#374151" : "#f3f4f6",
              color: isDark ? "#f9fafb" : "#111827",
            }}
          >
            {initialMessage}
          </div>
        </div>

        {/* Suggested questions — hidden once user has chatted */}
        {showSuggestions && filledSuggestions.length > 0 && (
          <div className="flex flex-wrap gap-2 pl-1">
            {filledSuggestions.map((q, i) => (
              <button
                key={i}
                onClick={() => { void handleSend(q); }}
                className="rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:opacity-80"
                style={{ borderColor: themeColor, color: themeColor, backgroundColor: "transparent" }}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Conversation */}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className="max-w-[80%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap"
              style={
                msg.role === "user"
                  ? { backgroundColor: themeColor, color: "#ffffff", borderBottomRightRadius: 4 }
                  : {
                      backgroundColor: isDark ? "#374151" : "#f3f4f6",
                      color: isDark ? "#f9fafb" : "#111827",
                      borderBottomLeftRadius: 4,
                    }
              }
            >
              {msg.content}
              {streaming && i === messages.length - 1 && msg.role === "assistant" && (
                <span className="ml-1 inline-block h-3 w-1 animate-pulse bg-gray-400 align-middle" />
              )}
            </div>
          </div>
        ))}

        {error && (
          <p className="text-center text-xs text-red-500">{error}</p>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Input ── */}
      <div
        className="flex gap-2 items-end p-3 flex-shrink-0"
        style={{
          borderTop: `1px solid ${isDark ? "#374151" : "#e5e7eb"}`,
          backgroundColor: isDark ? "#111827" : "#ffffff",
        }}
      >
        <textarea
          rows={1}
          value={input}
          onChange={(e) => { setInput(e.target.value); }}
          onKeyDown={handleKeyDown}
          placeholder="Type a message…"
          disabled={streaming}
          className="flex-1 resize-none rounded-xl border px-3 py-2 text-sm focus:outline-none disabled:opacity-50"
          style={{
            borderColor: isDark ? "#4b5563" : "#d1d5db",
            backgroundColor: isDark ? "#1f2937" : "#ffffff",
            color: isDark ? "#f9fafb" : "#111827",
          }}
        />
        <button
          onClick={() => { void handleSend(input); }}
          disabled={streaming || !input.trim()}
          className="rounded-xl px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-40"
          style={{ backgroundColor: themeColor }}
        >
          {streaming ? "…" : "Send"}
        </button>
      </div>
    </div>
  );
}
