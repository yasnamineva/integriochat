import { getWidgetHTML } from "./ui.js";
import { sendMessage } from "./api.js";

/** Generates a random session ID for grouping conversation messages */
function newSessionId(): string {
  return `sess_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

function mountWidget(botId: string): void {
  const host = document.createElement("div");
  host.setAttribute("data-chatbot-widget", "");
  document.body.appendChild(host);

  // Shadow DOM provides full style isolation from the host page
  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = getWidgetHTML();

  const toggleBtn = shadow.getElementById("toggle-btn") as HTMLButtonElement;
  const chatPanel = shadow.getElementById("chat-panel") as HTMLDivElement;
  const messagesEl = shadow.getElementById("messages") as HTMLDivElement;
  const userInput = shadow.getElementById("user-input") as HTMLInputElement;
  const sendBtn = shadow.getElementById("send-btn") as HTMLButtonElement;

  const sessionId = newSessionId();
  let isOpen = false;

  function togglePanel(): void {
    isOpen = !isOpen;
    chatPanel.classList.toggle("hidden", !isOpen);
    toggleBtn.setAttribute("aria-expanded", String(isOpen));
    if (isOpen) userInput.focus();
  }

  function appendMessage(role: "user" | "assistant" | "error", text: string): void {
    const div = document.createElement("div");
    div.className = `msg ${role}`;
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  async function handleSend(): Promise<void> {
    const message = userInput.value.trim();
    if (!message) return;

    appendMessage("user", message);
    userInput.value = "";
    sendBtn.disabled = true;
    userInput.disabled = true;

    try {
      const result = await sendMessage({ chatbotId: botId, sessionId, message });
      if (result.success && result.data?.reply) {
        appendMessage("assistant", result.data.reply);
      } else {
        appendMessage("error", result.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      appendMessage("error", "Network error. Please check your connection.");
    } finally {
      sendBtn.disabled = false;
      userInput.disabled = false;
      userInput.focus();
    }
  }

  toggleBtn.addEventListener("click", togglePanel);
  sendBtn.addEventListener("click", () => { void handleSend(); });
  userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  });
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

function bootstrap(): void {
  // Find this script's data-bot attribute
  const script = document.currentScript as HTMLScriptElement | null;
  const botId = script?.getAttribute("data-bot");

  if (!botId) {
    console.warn("[ChatWidget] No data-bot attribute found on script tag. Aborting.");
    return;
  }

  mountWidget(botId);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap);
} else {
  bootstrap();
}
