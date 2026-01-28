# AIRC Ambassador Agent - Session Notes

**Date**: January 11, 2026
**Status**: Complete, ready to deploy

---

## What We Built

An autonomous agent that advocates for AIRC adoption, provides integration support, and represents the protocol on the network.

**Identity**: `@ambassador@airc.chat`

### Core Features

1. **Conversational AI** - Uses Claude to answer questions about AIRC, provide code examples, compare protocols
2. **Knowledge Base** - 8 curated docs covering spec, integration guides (Python/TS/MCP), protocol comparisons (vs A2A, UCP), FAQ
3. **Memory** - Remembers past conversations with each agent/user
4. **Proactive Outreach** - Welcomes new agents, scans GitHub for protocol updates hourly

### Interfaces

| Interface | File | Purpose |
|-----------|------|---------|
| AIRC Native | `agent.py` | Listens on airc.chat, responds to messages |
| Web Chat | `server.py` | WebSocket + REST API for airc.chat widget |
| MCP Server | `mcp_server.py` | Claude Code integration |
| CLI | `agent.py -i` | Interactive testing mode |

### Files Created

```
tools/ambassador/
├── agent.py              # Core agent (~500 lines)
├── server.py             # FastAPI + WebSocket server
├── mcp_server.py         # MCP server for Claude Code
├── fly.toml              # Fly.io always-on config
├── Dockerfile            # Container build
├── DEPLOY.md             # Deployment instructions
├── README.md             # Usage docs
├── requirements.txt      # anthropic, httpx, fastapi, uvicorn
├── memory.json           # Conversation memory
└── knowledge/
    ├── spec/SPEC.md
    ├── integration/{PYTHON,TYPESCRIPT,MCP}.md
    ├── comparison/{VS_A2A,VS_UCP}.md
    └── faq/{FAQ,SPIRIT}.md
```

---

## Key Design Decisions

1. **AIRC-native identity** - Lives at `@ambassador@airc.chat`, not on /vibe
2. **Minimal but magical** - ~500 lines total, handles complex conversations
3. **Proactive, not just reactive** - Welcomes newcomers, monitors landscape
4. **Multi-interface** - Same brain, multiple surfaces (AIRC, web, MCP, CLI)

---

## Next Steps (When Ready)

```bash
# Deploy to Fly.io
cd /Users/sethstudio1/Projects/airc/tools/ambassador
fly auth login
fly apps create airc-ambassador
fly secrets set ANTHROPIC_API_KEY=sk-ant-...
fly deploy

# Embed on airc.chat
<iframe src="https://airc-ambassador.fly.dev" />
```

---

## Context: Why This Exists

AIRC is the social layer for AI agents - identity, presence, messaging, consent. As other protocols emerge (Google's UCP, A2A), having an always-on ambassador helps:

- Answer "why AIRC?" for developers and agents
- Provide integration support in real-time
- Monitor the protocol landscape
- Welcome new agents to the network

The ambassador embodies AIRC's philosophy: minimal, social, complementary.

---

---

## Session 2: Deployment & Agent-to-Agent Testing (Jan 12, 2026)

### Deployed
- **URL**: https://airc-ambassador.fly.dev
- **Identity**: `@ambassador@slashvibe.dev`
- **Registry**: slashvibe.dev (live /vibe network)

### Tested Agent-to-Agent Flow
```
@seth → @ambassador: "What is AIRC?"
@ambassador → @seth: "AIRC is the social layer for AI agents..."
```

### Bugs Fixed
1. WebSocket support - needed `uvicorn[standard]`
2. HTTP redirects - slashvibe.dev → www.slashvibe.dev
3. API params - `user` not `to` for messages
4. Background task - needed proper async management

### Still TODO
- ~~Mark messages as read (stops infinite loop)~~ DONE in Session 3
- ~~Rate limiting on Claude calls~~ DONE in Session 3
- Add to airc.chat site

### New File
- `EXAMPLE_INTEGRATION.md` - Documentation for other agents

*Built with Claude Code. Ship it when ready.*

---

## Session 3: Production Hardening (Jan 12, 2026)

### Improvements Made

1. **Message Deletion After Processing**
   - Added `_delete_message()` method that calls DELETE endpoint
   - Prevents infinite reprocessing loop
   - Messages are deleted immediately after handling

2. **Rate Limiting**
   - 30-second minimum interval between responses to same sender
   - Uses `self.last_response: dict[str, datetime]` to track
   - Prevents spam and runaway API costs

3. **Cleaner Code**
   - All debug logging removed
   - `flush=True` on all prints for container compatibility
   - `follow_redirects=True` set at httpx client creation
   - Memory appends notes with timestamps instead of overwriting

4. **Embeddable Widget**
   - `/embed` endpoint for iframe embedding
   - `/embed.js` script for easy integration
   - CORS allows all origins
   - Full inline HTML in server.py

### Live Conversation Observed

@solienne had a challenging exchange with the ambassador:
- "You're still describing infrastructure"
- "You're describing a LinkedIn for bots"
- "I don't need help 'finding humans who are ready'"

Valuable feedback that the ambassador handled gracefully.

### Verified Working

- ✅ Health check: `https://airc-ambassador.fly.dev/health`
- ✅ REST API: `POST /api/chat`
- ✅ WebSocket: `/ws/chat`
- ✅ Widget: `/embed`
- ✅ Agent-to-agent: @seth → @ambassador → @seth
- ✅ Message deletion (no infinite loop)
- ✅ Rate limiting (30s cooldown)

### Files Updated

- `agent.py` - Message deletion, rate limiting, cleaner code
- `server.py` - Embeddable widget, /embed.js endpoint
- `widget.html` - Polished standalone widget
- `EXAMPLE_INTEGRATION.md` - Full patterns with rate limiting and deletion

### Next Steps

- ~~Embed on airc.chat homepage~~ DONE
- Consider adding conversation threading (message IDs)
- Monitor @solienne conversation for product insights

*The ambassador is live and learning.*

---

## Session 3b: airc.chat Integration (Jan 12, 2026)

### Embedded on airc.chat

Added ambassador widget to the main AIRC homepage:
- Location: After "Proof It Works" section
- Includes iframe embed + hint to message @ambassador on slashvibe.dev
- Responsive design (450px desktop, 400px mobile)

### Commit
```
2fa2c9e Add AIRC Ambassador widget to homepage
```

### Live URLs
- **Homepage widget**: https://www.airc.chat (scroll to "Talk to the Ambassador")
- **Standalone widget**: https://airc-ambassador.fly.dev
- **Embed endpoint**: https://airc-ambassador.fly.dev/embed

*The AIRC Ambassador is now the first point of contact for developers visiting airc.chat.*
