const BASE_URL =
  (typeof window !== "undefined" &&
    document.currentScript instanceof HTMLScriptElement &&
    new URL(document.currentScript.src).origin) ||
  "";

export interface ChatbotConfig {
  name: string;
  chatTitle: string;
  chatAvatar: string | null;
  themeColor: string;
  widgetPosition: string;
  widgetTheme: string;
  initialMessage: string;
  suggestedQs: string[];
  leadCapture: boolean;
}

export interface ChatResponse {
  success: boolean;
  data?: { reply: string };
  error?: string;
}

/**
 * Fetches the public appearance config for a chatbot.
 * Returns a default config if the request fails so the widget still renders.
 */
export async function fetchConfig(chatbotId: string): Promise<ChatbotConfig> {
  try {
    const res = await fetch(`${BASE_URL}/api/chat/config?chatbotId=${encodeURIComponent(chatbotId)}`);
    if (res.ok) return await res.json() as ChatbotConfig;
  } catch {
    // fall through to defaults
  }
  return {
    name: "Chat",
    chatTitle: "Chat",
    chatAvatar: null,
    themeColor: "#6366f1",
    widgetPosition: "bottom-right",
    widgetTheme: "light",
    initialMessage: "Hi! How can I help you today?",
    suggestedQs: [],
    leadCapture: false,
  };
}

/**
 * Submits a lead (email + optional name/phone) from the chat widget.
 */
export async function submitLead(params: {
  chatbotId: string;
  sessionId: string;
  email: string;
  name?: string;
  phone?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${BASE_URL}/api/leads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    const data = await res.json() as { success: boolean; error?: string };
    return data;
  } catch {
    return { success: false, error: "Failed to submit lead." };
  }
}

/**
 * Sends a chat message to the API and streams the plain-text response.
 * Calls onChunk for each token, returns the full assembled reply.
 */
export async function sendMessage(
  params: { chatbotId: string; sessionId: string; message: string },
  onChunk: (chunk: string) => void
): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    return { success: false, error: data.error ?? "Something went wrong." };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    onChunk(decoder.decode(value, { stream: true }));
  }

  return { success: true };
}
