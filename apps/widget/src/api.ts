const BASE_URL =
  (typeof window !== "undefined" &&
    document.currentScript instanceof HTMLScriptElement &&
    new URL(document.currentScript.src).origin) ||
  "";

export interface ChatResponse {
  success: boolean;
  data?: { reply: string };
  error?: string;
}

/**
 * Sends a chat message to the API and returns the response.
 * The Origin header is automatically set by the browser — the API validates it
 * against the tenant's allowed domains list.
 */
export async function sendMessage(params: {
  chatbotId: string;
  sessionId: string;
  message: string;
}): Promise<ChatResponse> {
  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  const data: unknown = await res.json();
  return data as ChatResponse;
}
