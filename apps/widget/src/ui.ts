/**
 * Returns the HTML + CSS string for the Shadow DOM chat widget.
 * This is injected into the shadow root, fully isolated from the host page styles.
 */
export function getWidgetHTML(): string {
  return `
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :host {
    all: initial;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    color: #111827;
  }

  #toggle-btn {
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: #2563eb;
    border: none;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2147483647;
    transition: transform 0.15s ease;
  }
  #toggle-btn:hover { transform: scale(1.05); }
  #toggle-btn svg { width: 24px; height: 24px; fill: white; }

  #chat-panel {
    position: fixed;
    bottom: 92px;
    right: 24px;
    width: 360px;
    max-width: calc(100vw - 48px);
    height: 480px;
    max-height: calc(100vh - 120px);
    background: #ffffff;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.15);
    display: flex;
    flex-direction: column;
    z-index: 2147483646;
    overflow: hidden;
    transition: opacity 0.2s ease, transform 0.2s ease;
  }
  #chat-panel.hidden {
    opacity: 0;
    pointer-events: none;
    transform: translateY(8px);
  }

  #chat-header {
    background: #2563eb;
    color: white;
    padding: 16px;
    font-weight: 600;
    font-size: 15px;
    flex-shrink: 0;
  }

  #messages {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .msg {
    max-width: 80%;
    padding: 8px 12px;
    border-radius: 12px;
    font-size: 13px;
    line-height: 1.5;
    word-break: break-word;
  }
  .msg.user {
    background: #2563eb;
    color: white;
    align-self: flex-end;
    border-bottom-right-radius: 4px;
  }
  .msg.assistant {
    background: #f3f4f6;
    color: #111827;
    align-self: flex-start;
    border-bottom-left-radius: 4px;
  }
  .msg.error { background: #fee2e2; color: #991b1b; }

  #input-row {
    display: flex;
    gap: 8px;
    padding: 12px;
    border-top: 1px solid #e5e7eb;
    flex-shrink: 0;
  }

  #user-input {
    flex: 1;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    padding: 8px 12px;
    font-size: 13px;
    outline: none;
    font-family: inherit;
  }
  #user-input:focus { border-color: #2563eb; box-shadow: 0 0 0 2px rgba(37,99,235,0.2); }

  #send-btn {
    background: #2563eb;
    color: white;
    border: none;
    border-radius: 8px;
    padding: 8px 14px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    flex-shrink: 0;
    transition: background 0.15s;
  }
  #send-btn:hover { background: #1d4ed8; }
  #send-btn:disabled { background: #93c5fd; cursor: not-allowed; }

  @media (max-width: 480px) {
    #chat-panel { right: 12px; bottom: 80px; width: calc(100vw - 24px); }
    #toggle-btn { right: 12px; bottom: 12px; }
  }
</style>

<button id="toggle-btn" aria-label="Open chat">
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M20 2H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4l4 4 4-4h4a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Z"/>
  </svg>
</button>

<div id="chat-panel" class="hidden" role="dialog" aria-modal="true" aria-label="Chat">
  <div id="chat-header">Chat with us</div>
  <div id="messages" aria-live="polite" aria-label="Chat messages"></div>
  <div id="input-row">
    <input
      id="user-input"
      type="text"
      placeholder="Type a message…"
      maxlength="2000"
      aria-label="Message input"
    />
    <button id="send-btn" aria-label="Send message">Send</button>
  </div>
</div>
`;
}
