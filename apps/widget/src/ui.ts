import type { ChatbotConfig } from "./api.js";

/**
 * Returns the HTML + CSS string for the Shadow DOM chat widget.
 * Injected into the shadow root — fully isolated from the host page styles.
 */
export function getWidgetHTML(config: ChatbotConfig): string {
  const { themeColor, chatTitle, chatAvatar, widgetTheme, initialMessage, suggestedQs, widgetPosition } = config;
  const isDark = widgetTheme === "dark";

  const bgPanel = isDark ? "#111827" : "#ffffff";
  const bgMsg   = isDark ? "#374151" : "#f3f4f6";
  const textMsg  = isDark ? "#f9fafb" : "#111827";
  const borderInput = isDark ? "#4b5563" : "#d1d5db";
  const bgInput  = isDark ? "#1f2937" : "#ffffff";
  const borderTop = isDark ? "#374151" : "#e5e7eb";

  const isLeft = widgetPosition === "bottom-left";
  const hPos = isLeft ? "left: 24px;" : "right: 24px;";
  const panelHPos = isLeft ? "left: 24px;" : "right: 24px;";

  const avatarHtml = chatAvatar
    ? `<img src="${escapeAttr(chatAvatar)}" alt="" style="height:28px;width:28px;border-radius:50%;object-fit:cover;flex-shrink:0;" onerror="this.style.display='none'" />`
    : "";

  const suggestionsHtml = suggestedQs.filter(Boolean).map((q) =>
    `<button class="sq-btn" data-q="${escapeAttr(q)}">${escapeHtml(q)}</button>`
  ).join("");

  return `
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :host {
    all: initial;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    color: ${textMsg};
  }

  #toggle-btn {
    position: fixed;
    bottom: 24px;
    ${hPos}
    width: 56px; height: 56px;
    border-radius: 50%;
    background: ${themeColor};
    border: none; cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    display: flex; align-items: center; justify-content: center;
    z-index: 2147483647;
    transition: transform 0.15s ease;
  }
  #toggle-btn:hover { transform: scale(1.05); }
  #toggle-btn svg { width: 24px; height: 24px; fill: white; }

  #chat-panel {
    position: fixed;
    bottom: 92px;
    ${panelHPos}
    width: 360px;
    max-width: calc(100vw - 48px);
    height: 480px;
    max-height: calc(100vh - 120px);
    background: ${bgPanel};
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.15);
    display: flex; flex-direction: column;
    z-index: 2147483646;
    overflow: hidden;
    transition: opacity 0.2s ease, transform 0.2s ease;
  }
  #chat-panel.hidden { opacity: 0; pointer-events: none; transform: translateY(8px); }

  #chat-header {
    background: ${themeColor};
    color: white;
    padding: 12px 16px;
    font-weight: 600;
    font-size: 15px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  #messages {
    flex: 1; overflow-y: auto; padding: 12px;
    display: flex; flex-direction: column; gap: 8px;
    background: ${bgPanel};
  }

  .msg {
    max-width: 80%; padding: 8px 12px;
    border-radius: 12px; font-size: 13px;
    line-height: 1.5; word-break: break-word;
  }
  .msg.user {
    background: ${themeColor}; color: white;
    align-self: flex-end; border-bottom-right-radius: 4px;
  }
  .msg.assistant {
    background: ${bgMsg}; color: ${textMsg};
    align-self: flex-start; border-bottom-left-radius: 4px;
  }
  .msg.error { background: #fee2e2; color: #991b1b; }

  #suggestions {
    display: flex; flex-wrap: wrap; gap: 6px;
    padding: 0 12px 8px;
    background: ${bgPanel};
  }
  #suggestions.hidden { display: none; }
  .sq-btn {
    border: 1px solid ${themeColor}; color: ${themeColor};
    background: transparent; border-radius: 999px;
    padding: 4px 10px; font-size: 12px; cursor: pointer;
    font-family: inherit; transition: opacity 0.15s;
  }
  .sq-btn:hover { opacity: 0.75; }

  #input-row {
    display: flex; gap: 8px; padding: 10px 12px;
    border-top: 1px solid ${borderTop}; flex-shrink: 0;
    background: ${bgPanel};
  }
  #user-input {
    flex: 1; border: 1px solid ${borderInput};
    background: ${bgInput}; color: ${textMsg};
    border-radius: 8px; padding: 8px 12px;
    font-size: 13px; outline: none; font-family: inherit;
  }
  #user-input:focus { border-color: ${themeColor}; box-shadow: 0 0 0 2px ${themeColor}33; }
  #send-btn {
    background: ${themeColor}; color: white; border: none;
    border-radius: 8px; padding: 8px 14px; cursor: pointer;
    font-size: 13px; font-weight: 500; flex-shrink: 0;
    transition: opacity 0.15s;
  }
  #send-btn:hover { opacity: 0.85; }
  #send-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  @media (max-width: 480px) {
    #chat-panel { right: 12px; left: 12px; bottom: 80px; width: auto; max-width: none; }
    #toggle-btn { ${isLeft ? "left: 12px;" : "right: 12px;"} bottom: 12px; }
  }
</style>

<button id="toggle-btn" aria-label="Open chat">
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M20 2H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4l4 4 4-4h4a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Z"/>
  </svg>
</button>

<div id="chat-panel" class="hidden" role="dialog" aria-modal="true" aria-label="Chat">
  <div id="chat-header">
    ${avatarHtml}
    <span>${escapeHtml(chatTitle)}</span>
  </div>
  <div id="messages" aria-live="polite" aria-label="Chat messages">
    <div class="msg assistant">${escapeHtml(initialMessage)}</div>
  </div>
  ${suggestionsHtml ? `<div id="suggestions">${suggestionsHtml}</div>` : '<div id="suggestions" class="hidden"></div>'}
  <div id="input-row">
    <input
      id="user-input" type="text"
      placeholder="Type a message…" maxlength="2000"
      aria-label="Message input"
    />
    <button id="send-btn" aria-label="Send message">Send</button>
  </div>
</div>
`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(s: string): string {
  return s.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
