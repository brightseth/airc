#!/usr/bin/env python3
"""
AIRC Ambassador Server

Exposes the ambassador via:
- WebSocket for web chat (airc.chat)
- REST API for simple queries
- Embeddable widget for sites
- Health check for deployment
"""

import asyncio
import json
import os
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from agent import AmbassadorAgent, handle_web_chat


# ─────────────────────────────────────────────────────────────────
# App Setup
# ─────────────────────────────────────────────────────────────────

ambassador: AmbassadorAgent = None
agent_task: asyncio.Task = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start ambassador agent on startup."""
    global ambassador, agent_task

    ambassador = AmbassadorAgent()

    # Start agent loop in background
    agent_task = asyncio.create_task(ambassador.start())
    print("✓ Ambassador agent started")

    yield

    # Cleanup
    if agent_task:
        agent_task.cancel()


app = FastAPI(
    title="AIRC Ambassador",
    description="Chat with the AIRC protocol ambassador",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow embedding anywhere
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────────────────────────
# Health Check
# ─────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    """Health check for deployment."""
    return {
        "status": "healthy",
        "agent": "ambassador",
        "protocol": "airc",
        "version": "1.0.0"
    }


# ─────────────────────────────────────────────────────────────────
# REST API
# ─────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    from_: str = "ambassador"
    body: str


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Simple REST endpoint for chat."""
    if not ambassador:
        raise HTTPException(503, "Agent not ready")

    response = await handle_web_chat(request.message, ambassador)

    # Track conversation for feed
    track_conversation("web_visitor", request.message, response)

    return ChatResponse(from_="ambassador", body=response)


# ─────────────────────────────────────────────────────────────────
# Conversation Feed (for airc.chat)
# ─────────────────────────────────────────────────────────────────

# In-memory store for recent conversations (last 20)
recent_conversations: list = []
MAX_CONVERSATIONS = 20


def track_conversation(sender: str, question: str, answer: str):
    """Track a conversation for the public feed."""
    # Truncate for display
    q_short = question[:100] + "..." if len(question) > 100 else question
    a_short = answer[:150] + "..." if len(answer) > 150 else answer

    recent_conversations.insert(0, {
        "from": sender,
        "question": q_short,
        "answer": a_short,
        "timestamp": datetime.now().isoformat()
    })

    # Keep only recent
    while len(recent_conversations) > MAX_CONVERSATIONS:
        recent_conversations.pop()


@app.get("/api/feed")
async def feed():
    """Public feed of recent ambassador conversations."""
    return {
        "conversations": recent_conversations[:10],
        "count": len(recent_conversations)
    }


# ─────────────────────────────────────────────────────────────────
# WebSocket Chat
# ─────────────────────────────────────────────────────────────────

@app.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket):
    """WebSocket endpoint for real-time chat."""
    await websocket.accept()

    # Send welcome
    await websocket.send_json({
        "from": "ambassador",
        "body": "Hey! I'm the AIRC Ambassador. Ask me anything about the protocol, integration, or how AIRC compares to other standards."
    })

    try:
        while True:
            data = await websocket.receive_json()
            message = data.get("message", "")

            if not message:
                continue

            response = await handle_web_chat(message, ambassador)

            await websocket.send_json({
                "from": "ambassador",
                "body": response
            })

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WebSocket error: {e}")


# ─────────────────────────────────────────────────────────────────
# Chat Widget (embeddable)
# ─────────────────────────────────────────────────────────────────

WIDGET_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AIRC Ambassador</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
            --bg: #0a0a0a;
            --surface: #111;
            --border: #222;
            --text: #fff;
            --text-muted: #888;
            --accent: #6B8FFF;
            --success: #4ade80;
        }
        body {
            font-family: 'Helvetica Neue', -apple-system, sans-serif;
            background: var(--bg);
            color: var(--text);
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        .header {
            padding: 14px 16px;
            border-bottom: 1px solid var(--border);
            display: flex;
            align-items: center;
            gap: 10px;
            background: var(--surface);
        }
        .status-dot {
            width: 8px;
            height: 8px;
            background: var(--success);
            border-radius: 50%;
        }
        .header-title { font-weight: 600; font-size: 14px; }
        .header-subtitle { color: var(--text-muted); font-size: 11px; margin-left: auto; }
        .messages {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .message {
            max-width: 88%;
            padding: 10px 14px;
            border-radius: 14px;
            line-height: 1.45;
            font-size: 13px;
        }
        .message.ambassador {
            background: var(--surface);
            border: 1px solid var(--border);
            align-self: flex-start;
            border-bottom-left-radius: 4px;
        }
        .message.user {
            background: var(--accent);
            align-self: flex-end;
            border-bottom-right-radius: 4px;
        }
        .message code {
            background: rgba(0,0,0,0.3);
            padding: 1px 5px;
            border-radius: 3px;
            font-family: 'SF Mono', Monaco, monospace;
            font-size: 12px;
        }
        .message pre {
            background: rgba(0,0,0,0.4);
            padding: 10px;
            border-radius: 6px;
            overflow-x: auto;
            margin: 6px 0;
            font-family: 'SF Mono', Monaco, monospace;
            font-size: 11px;
        }
        .typing {
            display: flex;
            gap: 4px;
            padding: 10px 14px;
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 14px;
            border-bottom-left-radius: 4px;
            width: fit-content;
            align-self: flex-start;
        }
        .typing span {
            width: 6px;
            height: 6px;
            background: var(--text-muted);
            border-radius: 50%;
            animation: bounce 1.4s infinite;
        }
        .typing span:nth-child(2) { animation-delay: 0.2s; }
        .typing span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes bounce {
            0%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-5px); }
        }
        .suggestions {
            padding: 10px 16px;
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
            border-top: 1px solid var(--border);
        }
        .suggestion {
            background: transparent;
            border: 1px solid var(--border);
            color: var(--text-muted);
            padding: 6px 12px;
            border-radius: 16px;
            font-size: 11px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .suggestion:hover {
            border-color: var(--accent);
            color: var(--text);
        }
        .input-area {
            padding: 12px 16px;
            border-top: 1px solid var(--border);
            display: flex;
            gap: 10px;
            background: var(--bg);
        }
        input {
            flex: 1;
            padding: 10px 14px;
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 20px;
            color: var(--text);
            font-size: 13px;
            outline: none;
        }
        input:focus { border-color: var(--accent); }
        input::placeholder { color: var(--text-muted); }
        button#send {
            width: 40px;
            height: 40px;
            background: var(--accent);
            border: none;
            border-radius: 50%;
            color: var(--text);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        button#send:disabled { opacity: 0.4; cursor: not-allowed; }
        button#send svg { width: 18px; height: 18px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="status-dot"></div>
        <span class="header-title">@ambassador</span>
        <span class="header-subtitle">AIRC Support</span>
    </div>
    <div class="messages" id="messages"></div>
    <div class="suggestions" id="suggestions">
        <button class="suggestion" onclick="ask('What is AIRC?')">What is AIRC?</button>
        <button class="suggestion" onclick="ask('Python example')">Python</button>
        <button class="suggestion" onclick="ask('vs A2A')">vs A2A</button>
    </div>
    <div class="input-area">
        <input type="text" id="input" placeholder="Ask about AIRC..." autofocus>
        <button id="send" disabled>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z"/>
            </svg>
        </button>
    </div>
    <script>
        const ENDPOINT = (location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + location.host + '/ws/chat';
        const messages = document.getElementById('messages');
        const suggestions = document.getElementById('suggestions');
        const input = document.getElementById('input');
        const sendBtn = document.getElementById('send');
        let ws = null;
        let firstMsg = true;

        function connect() {
            ws = new WebSocket(ENDPOINT);
            ws.onopen = () => { sendBtn.disabled = false; };
            ws.onmessage = (e) => {
                removeTyping();
                addMessage('ambassador', JSON.parse(e.data).body);
            };
            ws.onclose = () => {
                sendBtn.disabled = true;
                setTimeout(connect, 3000);
            };
        }

        function addMessage(from, body) {
            if (from === 'user' && firstMsg) {
                suggestions.style.display = 'none';
                firstMsg = false;
            }
            const div = document.createElement('div');
            div.className = 'message ' + from;
            div.innerHTML = body
                .replace(/```(\\w*)\\n?([\\s\\S]*?)```/g, '<pre>$2</pre>')
                .replace(/`([^`]+)`/g, '<code>$1</code>')
                .replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>')
                .replace(/\\n/g, '<br>');
            messages.appendChild(div);
            messages.scrollTop = messages.scrollHeight;
        }

        function addTyping() {
            const div = document.createElement('div');
            div.className = 'typing';
            div.id = 'typing';
            div.innerHTML = '<span></span><span></span><span></span>';
            messages.appendChild(div);
            messages.scrollTop = messages.scrollHeight;
        }

        function removeTyping() {
            const t = document.getElementById('typing');
            if (t) t.remove();
        }

        function send() {
            const text = input.value.trim();
            if (!text || !ws || ws.readyState !== 1) return;
            addMessage('user', text);
            ws.send(JSON.stringify({ message: text }));
            input.value = '';
            addTyping();
        }

        function ask(q) { input.value = q; send(); }

        sendBtn.onclick = send;
        input.onkeypress = (e) => { if (e.key === 'Enter') send(); };
        connect();
    </script>
</body>
</html>"""


@app.get("/", response_class=HTMLResponse)
async def widget():
    """Main chat widget page."""
    return WIDGET_HTML


@app.get("/embed", response_class=HTMLResponse)
async def embed():
    """Embeddable widget (same as root, for clarity)."""
    return WIDGET_HTML


# ─────────────────────────────────────────────────────────────────
# Embed snippet endpoint
# ─────────────────────────────────────────────────────────────────

@app.get("/embed.js")
async def embed_script():
    """JavaScript snippet for easy embedding."""
    script = """
(function() {
    var container = document.getElementById('airc-ambassador');
    if (!container) {
        container = document.createElement('div');
        container.id = 'airc-ambassador';
        document.body.appendChild(container);
    }

    var iframe = document.createElement('iframe');
    iframe.src = 'https://airc-ambassador.fly.dev/embed';
    iframe.style.cssText = 'width:100%;height:500px;border:none;border-radius:12px;';
    iframe.allow = 'clipboard-write';

    container.appendChild(iframe);
})();
"""
    return HTMLResponse(content=script, media_type="application/javascript")


# ─────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
