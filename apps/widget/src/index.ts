import { getWidgetHTML } from "./ui.js";
import { fetchConfig, sendMessage } from "./api.js";

function newSessionId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `sess_${hex}`;
}

async function mountWidget(botId: string): Promise<void> {
  const config = await fetchConfig(botId);

  const host = document.createElement("div");
  host.setAttribute("data-chatbot-widget", "");
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = getWidgetHTML(config);

  const toggleBtn    = shadow.getElementById("toggle-btn") as HTMLButtonElement;
  const chatPanel    = shadow.getElementById("chat-panel") as HTMLDivElement;
  const messagesEl   = shadow.getElementById("messages") as HTMLDivElement;
  const suggestionsEl = shadow.getElementById("suggestions") as HTMLDivElement;
  const userInput    = shadow.getElementById("user-input") as HTMLInputElement;
  const sendBtn      = shadow.getElementById("send-btn") as HTMLButtonElement;

  const sessionId = newSessionId();
  let isOpen = false;

  function togglePanel(): void {
    isOpen = !isOpen;
    chatPanel.classList.toggle("hidden", !isOpen);
    toggleBtn.setAttribute("aria-expanded", String(isOpen));
    if (isOpen) userInput.focus();
  }

  function appendMessage(role: "user" | "assistant" | "error", text: string): HTMLDivElement {
    const div = document.createElement("div");
    div.className = `msg ${role}`;
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }

  async function handleSend(message: string): Promise<void> {
    message = message.trim();
    if (!message) return;

    // Hide suggested questions after first user message
    suggestionsEl.classList.add("hidden");

    userInput.value = "";
    sendBtn.disabled = true;
    userInput.disabled = true;

    appendMessage("user", message);

    const replyDiv = appendMessage("assistant", "");
    let accumulated = "";

    const result = await sendMessage(
      { chatbotId: botId, sessionId, message },
      (chunk) => {
        accumulated += chunk;
        replyDiv.textContent = accumulated;
        messagesEl.scrollTop = messagesEl.scrollHeight;
      }
    );

    if (!result.success) {
      replyDiv.className = "msg error";
      replyDiv.textContent = result.error ?? "Something went wrong. Please try again.";
    }

    sendBtn.disabled = false;
    userInput.disabled = false;
    userInput.focus();
  }

  // Wire up suggested question buttons
  suggestionsEl.querySelectorAll<HTMLButtonElement>(".sq-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const q = btn.getAttribute("data-q") ?? "";
      void handleSend(q);
    });
  });

  toggleBtn.addEventListener("click", togglePanel);
  sendBtn.addEventListener("click", () => { void handleSend(userInput.value); });
  userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void handleSend(userInput.value);
    }
  });
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

function bootstrap(): void {
  const script = document.currentScript as HTMLScriptElement | null;
  const botId = script?.getAttribute("data-bot");

  if (!botId) {
    console.warn("[ChatWidget] No data-bot attribute found on script tag. Aborting.");
    return;
  }

  void mountWidget(botId);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap);
} else {
  bootstrap();
}
