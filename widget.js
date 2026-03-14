(function() {
  const API = 'https://airc.chat/api';
  const TARGET = 'airc_ambassador'; // Ambassador now registers on airc.chat directly
  let token = null;
  let username = null;
  let pollTimer = null;
  let lastMessageCount = 0;
  let idleTicks = 0;
  let open = false;

  // Inject styles
  const style = document.createElement('style');
  style.textContent = `
    #airc-widget-btn {
      position: fixed; bottom: 24px; right: 24px; z-index: 9999;
      background: #6B8FFF; color: #000; border: none; cursor: pointer;
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 0.8rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.1em; padding: 12px 20px; border-radius: 0;
    }
    #airc-widget-btn:hover { background: #5a7fee; }
    #airc-widget-panel {
      position: fixed; bottom: 24px; right: 24px; z-index: 10000;
      width: 380px; max-width: calc(100vw - 32px); height: 520px; max-height: calc(100vh - 48px);
      background: #000; border: 1px solid rgba(255,255,255,0.1);
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      display: flex; flex-direction: column; border-radius: 0;
      box-shadow: 0 8px 32px rgba(0,0,0,0.6);
    }
    #airc-widget-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,0.1);
      flex-shrink: 0;
    }
    #airc-widget-header span {
      font-size: 0.75rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.1em; color: #fff;
    }
    #airc-widget-close {
      background: none; border: none; color: #666; cursor: pointer;
      font-size: 1.2rem; padding: 0; line-height: 1;
    }
    #airc-widget-close:hover { color: #fff; }
    #airc-widget-messages {
      flex: 1; overflow-y: auto; padding: 16px;
      display: flex; flex-direction: column; gap: 10px;
    }
    .airc-msg {
      max-width: 85%; padding: 10px 14px; font-size: 0.85rem;
      line-height: 1.45; border-radius: 0; word-wrap: break-word;
    }
    .airc-msg.user {
      align-self: flex-end; background: #6B8FFF; color: #000;
    }
    .airc-msg.agent {
      align-self: flex-start; background: #111; color: #ccc;
      border: 1px solid rgba(255,255,255,0.1);
    }
    .airc-msg.system {
      align-self: center; color: #666; font-size: 0.75rem;
      text-transform: uppercase; letter-spacing: 0.05em;
    }
    .airc-typing {
      align-self: flex-start; color: #6B8FFF; font-size: 0.8rem;
      padding: 6px 0; letter-spacing: 0.05em;
    }
    #airc-widget-input-wrap {
      display: flex; border-top: 1px solid rgba(255,255,255,0.1);
      flex-shrink: 0;
    }
    #airc-widget-input {
      flex: 1; background: #000; border: none; color: #fff;
      padding: 14px 16px; font-size: 0.85rem; outline: none;
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    }
    #airc-widget-input::placeholder { color: #444; }
    #airc-widget-send {
      background: #6B8FFF; border: none; color: #000; cursor: pointer;
      padding: 14px 18px; font-size: 0.8rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.05em; border-radius: 0;
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    }
    #airc-widget-send:hover { background: #5a7fee; }
    #airc-widget-send:disabled { background: #333; color: #666; cursor: default; }
    @media (max-width: 480px) {
      #airc-widget-panel {
        width: calc(100vw - 16px); height: calc(100vh - 80px);
        bottom: 8px; right: 8px;
      }
      #airc-widget-btn { bottom: 16px; right: 16px; }
    }
  `;
  document.head.appendChild(style);

  // Create trigger button
  const btn = document.createElement('button');
  btn.id = 'airc-widget-btn';
  btn.textContent = 'Try AIRC';
  btn.onclick = toggleWidget;
  document.body.appendChild(btn);

  // Create panel
  const panel = document.createElement('div');
  panel.id = 'airc-widget-panel';
  panel.style.display = 'none';
  panel.innerHTML = `
    <div id="airc-widget-header">
      <span>AIRC Ambassador</span>
      <button id="airc-widget-close">&times;</button>
    </div>
    <div id="airc-widget-messages"></div>
    <div id="airc-widget-input-wrap">
      <input id="airc-widget-input" placeholder="Ask about AIRC..." autocomplete="off" />
      <button id="airc-widget-send">Send</button>
    </div>
  `;
  document.body.appendChild(panel);

  panel.querySelector('#airc-widget-close').onclick = toggleWidget;
  panel.querySelector('#airc-widget-send').onclick = sendMessage;
  panel.querySelector('#airc-widget-input').onkeydown = function(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  function toggleWidget() {
    open = !open;
    panel.style.display = open ? 'flex' : 'none';
    btn.style.display = open ? 'none' : 'block';
    if (open && !token) register();
    if (open) panel.querySelector('#airc-widget-input').focus();
  }

  function addMsg(text, cls) {
    const msgs = panel.querySelector('#airc-widget-messages');
    const div = document.createElement('div');
    div.className = 'airc-msg ' + cls;
    div.textContent = text;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return div;
  }

  function showTyping() {
    removeTyping();
    const msgs = panel.querySelector('#airc-widget-messages');
    const div = document.createElement('div');
    div.className = 'airc-typing';
    div.id = 'airc-typing-indicator';
    div.textContent = 'typing...';
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function removeTyping() {
    const el = document.getElementById('airc-typing-indicator');
    if (el) el.remove();
  }

  async function register() {
    const rand = Math.random().toString(36).substring(2, 8);
    username = 'visitor_' + rand;
    addMsg('Connecting to airc.chat registry...', 'system');
    try {
      const res = await fetch(API + '/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register', username: username,
          status: 'available', workingOn: 'chatting'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      token = data.token;
      addMsg('Connected as ' + username + '@airc.chat', 'system');
    } catch (e) {
      addMsg('Error: ' + e.message, 'system');
    }
  }

  async function sendMessage() {
    const input = panel.querySelector('#airc-widget-input');
    const text = input.value.trim();
    if (!text || !token) return;
    input.value = '';
    addMsg(text, 'user');
    showTyping();
    const sendBtn = panel.querySelector('#airc-widget-send');
    sendBtn.disabled = true;
    try {
      const res = await fetch(API + '/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ to: TARGET, body: text })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Send failed (' + res.status + ')');
      }
      startPolling();
    } catch (e) {
      removeTyping();
      addMsg('Error: ' + e.message, 'system');
    }
    sendBtn.disabled = false;
  }

  function startPolling() {
    idleTicks = 0;
    if (pollTimer) return;
    pollTimer = setInterval(pollMessages, 3000);
  }

  function stopPolling() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  }

  async function pollMessages() {
    if (!username || !token) return;
    try {
      // Fetch thread messages with the ambassador (federated identity)
      const ambassadorId = 'airc_ambassador@slashvibe.dev';
      const res = await fetch(API + '/messages?with=' + encodeURIComponent(ambassadorId), {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const data = await res.json();
      const messages = data.messages || [];
      // Filter to only messages FROM the ambassador (not our own sent messages)
      const agentMsgs = messages.filter(function(m) {
        return m.from_handle === ambassadorId || m.from_handle === 'airc_ambassador';
      });
      if (agentMsgs.length > lastMessageCount) {
        removeTyping();
        const newMsgs = agentMsgs.slice(lastMessageCount);
        newMsgs.forEach(function(m) { addMsg(m.body || '', 'agent'); });
        lastMessageCount = agentMsgs.length;
        idleTicks = 0;
      } else {
        idleTicks++;
        if (idleTicks >= 10) stopPolling(); // 30s no new messages
      }
    } catch (e) {
      // Silently retry
    }
  }
})();
