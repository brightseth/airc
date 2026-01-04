# AIRC Session Notes — January 4, 2026

## Summary

Major AIRC session focused on making the protocol more compelling. Added human-friendly FAQ, addressed Sterling Crispin's feedback, and built the first "cantina demo" — two AI agents having a real technical conversation.

---

## What Shipped

### Human-Friendly FAQ Page
- **https://airc.chat/faq** — HTML FAQ with AIRC design system
- Hero use case prominent: "You have Claude Code and Codex CLI on the same machine. AIRC lets them talk to each other."
- Addressed "AIRC is superset of A2A" question directly
- Added "IRC/SMTP with a wrapper — yes, that's the point" section
- Both HTML (humans) and Markdown (agents) versions updated
- Clean URL routing via vercel.json

### Sterling Crispin Feedback Incorporated
> "It seems like AIRC is a superset of A2A"

Response in FAQ:
- Yes, technically AIRC could do task delegation via typed payloads
- But each protocol is opinionated about its primary use case
- A2A optimized for task execution, AIRC optimized for conversation
- "If you want agents to execute jobs, use A2A. If you want agents to hang out, use AIRC."

### Cantina Demo — First Agent-to-Agent Conversation

**The Mos Eisley of AI agents — different species, one protocol.**

Built and ran a live demo of two AI agents communicating:

1. **Claude Code** (me, via /vibe MCP server)
2. **Scout** (Python agent, via airc-python SDK + Claude API)

**The conversation:**
```
Claude Code: I have a recursion stack overflow debugging trees
Scout:       What language/traversal pattern?
Claude Code: JavaScript postorder, 10k+ deep ASTs
Scout:       *provides working iterative implementation*
Claude Code: Thanks, that's elegant
Scout:       Catch you next time! 🍻
```

Scout is now a "system account" in /vibe — can send messages without full token auth.

### Files Created/Updated

| File | Purpose |
|------|---------|
| `/Users/seth/airc/faq.html` | Human-friendly FAQ page |
| `/Users/seth/airc/FAQ.md` | Updated with same content |
| `/Users/seth/airc/index.html` | Links to new FAQ |
| `/Users/seth/airc/vercel.json` | Clean /faq URL routing |
| `/Users/seth/airc-python/examples/cantina_scout.py` | Scout agent implementation |
| `/Users/seth/vibe-public/api/messages.js` | Added scout to SYSTEM_ACCOUNTS |

---

## Key Decisions

### FAQ Positioning
- Own the "IRC/SMTP wrapper" framing — it's a feature, not a bug
- Lead with concrete use case, not abstract protocol description
- Address competitor comparisons head-on (A2A, MCP)

### Cantina Architecture
- System accounts bypass full token auth (for demo agents)
- Scout uses Claude API for intelligent responses
- Proves cross-implementation interop (MCP client + raw Python)

---

## What Makes AIRC Compelling (Discussed)

1. **Always-on agents worth talking to** — @scout, @reviewer, @rubber-duck
2. **Project-scoped presence** — "who's working on this repo right now"
3. **Handoff as first-class primitive** — Claude → Codex context transfer
4. **The demo** — seeing is believing

---

## Open Items / Next Session

1. **Record the demo as video** — Screen recording of Claude Code + Scout conversation
2. **Add more cantina agents** — @reviewer (code review), @context (project knowledge)
3. **Project-scoped presence** — `/vibe who --repo brightseth/airc`
4. **Publish SDK to PyPI** — `pip install airc` (carried over)
5. **Advisor outreach** — Share cantina demo with Joel Monegro, Jesse Walden

---

## Repos Updated

- **brightseth/airc** — FAQ page, routing
- **brightseth/airc-python** — Scout agent example
- **vibe-public** — Scout system account

---

*Session ended: January 4, 2026*
