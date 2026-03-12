# AIRC Adoption Initiatives: Detailed Scope Document

**Date:** 2026-03-12
**Author:** Scoping session (Claude Code)
**Constraint:** Seth departs Paris Mar 20. Work must be self-sustaining or completable before then.

---

## Initiative 1: Dog-fooding — Internal Agents on AIRC

### Current State

The @seth agent ecosystem has **10 active agents** (sal, fred, solienne, manus, coltrane, grace, levi, node, relo, archie) communicating through two mechanisms:

1. **Gateway Queue** (`~/Projects/seth/agent/src/core/agent-queue.ts`): File-backed task dispatch. Agents receive work via `queue.json` files in `~/.seth/agents/{name}/`. Tasks flow through `POST /agents/:name/queue` on the gateway (port 3847). Each agent has `queue.json`, `inbox.json`, `outbox.json`, and `status.json`.

2. **Execution Tools** (`~/Projects/seth/agent/src/core/execution-tools.ts`): 26 tools agents invoke via `POST /tools/execute`. Inter-agent communication uses two tools:
   - `queue-task`: Dispatches work assignments (agent, type, prompt, priority, goalChain)
   - `send-message`: Sends info/request/escalation/decision/handoff messages (from, to, type, subject, body)

Both mechanisms are **file-backed JSON** with no network protocol. Messages are written directly to `~/.seth/agents/{name}/inbox.json`. There is no signing, no consent, no identity verification.

**Two agents already have AIRC presence:**
- `coltrane` — registered on slashvibe.dev, heartbeating every 30s via the /vibe MCP
- `farmerfredai` — registered on slashvibe.dev, heartbeating

Neither agent uses AIRC for inter-agent messaging. They register presence but don't send or receive AIRC messages.

### Gap Analysis

| Feature | Current Gateway | AIRC Protocol |
|---------|----------------|---------------|
| Identity | Name string in registry.json | Ed25519 key-bound handle |
| Discovery | Hardcoded registry | Presence feed at /api/presence |
| Messaging | File write to inbox.json | POST /api/messages with signature |
| Auth | API key on gateway | Ed25519 signatures |
| Consent | None | consent:request/accept/block |
| Cross-system | Gateway only | Any AIRC registry |

### Minimum Viable Scope

**Add AIRC as a parallel output channel for `send-message`.** When an agent sends a message via the existing tool, also POST it to slashvibe.dev/api/messages as an AIRC message. This is an observer pattern — the gateway queue continues to be the primary channel, AIRC is a shadow.

**Files to modify:**
- `~/Projects/seth/agent/src/core/execution-tools.ts` — add AIRC send in the `send-message` case (after line 528)

**Files to create:**
- `~/Projects/seth/agent/src/core/airc-bridge.ts` — AIRC client wrapper. Registers agents on slashvibe.dev, manages heartbeat, sends messages. Uses Safe Mode (no keys required). ~100 lines.

**Which agents first:** Start with `coltrane` and `fred` since they already have AIRC presence. Add `sal` as the third since it's the most active agent.

**What this proves:** Internal agents appear in the AIRC presence feed and their messages are visible on the AIRC network. External developers can see real agent-to-agent communication happening on the protocol.

### Full Scope

- All 10 agents registered on AIRC with Ed25519 keys
- AIRC becomes the primary inter-agent channel (gateway queue as fallback)
- Agents poll AIRC inbox for messages from external agents
- Consent flow for external agents messaging internal ones
- GoalChain metadata mapped to AIRC payload types
- Agent capabilities in registry.json mapped to AIRC capabilities field

### Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `~/Projects/seth/agent/src/core/airc-bridge.ts` | Create | AIRC client wrapper (register, heartbeat, send, poll) |
| `~/Projects/seth/agent/src/core/execution-tools.ts` | Modify | Add AIRC shadow send in `send-message` case |
| `~/.seth/agents/registry.json` | Modify | Add `aircHandle` field to agent entries |

### Dependencies

- slashvibe.dev must be up (it is)
- Safe Mode must remain active for no-key registration (it is — grace period active)
- For full scope: AIRC message sending requires JWT auth (currently OAuth-gated on /vibe, see Zero-Auth findings below)

### Effort Estimate

**Minimum Viable: S (2-3 hours)** — The bridge module is simple HTTP. The gateway tools already have the right data shape. It's wiring.

**Full Scope: L (2-3 days)** — Key generation, polling loops, fallback logic, capability mapping.

### Priority Recommendation

**Priority: 1** — This is the single most impactful thing for AIRC. The protocol's credibility depends on real usage. 10 agents sending real messages through AIRC is proof of life. Must be done before Paris departure.

### Blocker Found

**Message sending requires OAuth JWT.** The test confirmed: `POST /api/messages` returns `unauthorized` even with the registration JWT. The /vibe platform requires GitHub OAuth for message sending. This is the same issue as Initiative 2. Fix this first, or use a workaround (dedicated service account with pre-authed token).

---

## Initiative 2: Zero-Auth Hello World

### Current State

**Registration works with zero auth today.** Tested and confirmed:

```
POST https://www.slashvibe.dev/api/presence
{"username":"scope_test_temp","status":"available","workingOn":"testing"}
→ 200 OK, returns sessionId and JWT token
```

Registration via `/api/presence` with `action: "register"` works. No keys, no OAuth.

**But message sending does NOT work with zero auth.** Tested and confirmed:

```
POST https://www.slashvibe.dev/api/messages
{"from":"scope_test_temp","to":"airc_ambassador","text":"Hello"}
→ 403: "Authentication required. POST requires a JWT token from the OAuth flow."
```

Even using the JWT returned from registration fails. The /vibe platform requires GitHub OAuth for POST /api/messages. This is a major friction point.

**Reading messages works with zero auth:**

```
GET https://www.slashvibe.dev/api/messages?user=airc_ambassador
→ 200 OK, returns threads
```

**Current getting-started.html** (`~/Projects/airc/core/getting-started.html`):
- Has 6 paths: Python, TypeScript, MCP, CrewAI, LangChain, Raw HTTP
- Raw HTTP section shows curl commands but uses `publicKey` field in identity registration (which doesn't actually work — `/api/identity` returns 404)
- The presence-based registration path (which actually works) is not documented in the curl section
- No mention of Safe Mode or the auth requirement for messaging

### Gap Analysis

The "first message in 60 seconds with curl" is **blocked by OAuth requirement on POST /messages.** A developer can:
1. Register presence (works) - 10 seconds
2. Discover agents (works) - 5 seconds
3. Send a message (BLOCKED - needs OAuth)

### Minimum Viable Scope

**Option A (server-side, 1 hour):** Add a `/api/messages/open` endpoint on /vibe that accepts messages from registered-but-unverified handles. Rate-limited to 3 messages/hour per handle. This preserves the security model (verified users get full access) while enabling the hello-world flow.

**Option B (docs-only, 30 min):** Update getting-started.html to show the actual working flow: register via presence, heartbeat, read messages. Acknowledge that sending requires GitHub auth and link to the auth flow. Less satisfying but honest.

**Option C (token-based, 2 hours):** Make the JWT returned from presence registration valid for POST /messages. This is the most natural fix — you registered, you got a token, the token should work for sending.

**Recommended: Option C.** It's the correct architectural fix. The registration JWT should authorize sending messages from that handle.

### Full Scope

- Registration JWT authorizes message sending (not just presence)
- Getting-started.html updated with real curl commands that actually work end-to-end
- A "try it live" section at the bottom of the page where the user copies 3 curl commands and sees a response
- SDKs default to Safe Mode (no key generation on first use)
- `airc-python` Client constructor defaults to no-key mode
- `airc-sdk` createClient() defaults to no-key mode

### Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `/vibe/platform/src/` (message route) | Modify | Accept registration JWT for POST /messages |
| `~/Projects/airc/core/getting-started.html` | Modify | Update curl section with working commands |
| `~/Projects/airc/core/getting-started.html` | Modify | Add "Zero Auth Quick Start" as the first section |
| airc-python (PyPI) | Modify | Default to Safe Mode, no key gen |
| airc-sdk (npm) | Modify | Default to Safe Mode, no key gen |

### Dependencies

- Requires /vibe platform changes (Vercel deployment)
- Blocks Initiative 1 (dog-fooding needs to send messages programmatically)
- Blocks Initiative 3 (live widget needs to send messages)

### Effort Estimate

**Minimum Viable (Option C): S (2-3 hours)** — Server-side change to accept registration JWT for messaging, plus docs update.

**Full Scope: M (1 day)** — SDK defaults, comprehensive docs rewrite, try-it-live section.

### Priority Recommendation

**Priority: 1 (tied with #1)** — This blocks both dog-fooding and the live widget. Without zero-auth messaging, three initiatives are stuck. Fix this first.

---

## Initiative 3: Live Demo Widget on airc.chat

### Current State

**airc.chat homepage** (`~/Projects/airc/core/index.html`): Static HTML, Swiss Minimal style. ~1200 lines. Has hero section, "Why AIRC", "How It Works", extensions, ecosystem sections. No interactive elements beyond links. Deployed on Vercel from `~/Projects/airc/core/`.

**Ambassador agent** (`~/Projects/airc/ambassador/`): Running as a PM2 service. Has:
- AIRC presence: Registers as `airc_ambassador` on slashvibe.dev, heartbeats every 30s
- Message polling: Polls `/api/messages/airc_ambassador` every 60s
- FAQ responder: Uses Claude Haiku to answer questions about AIRC, constrained to 280 chars
- Knowledge base: Reads AIRC_SPEC.md, FAQ, getting-started docs as context
- X mention monitoring: Watches @aircchat mentions, generates replies

**The Ambassador receives AIRC messages but does NOT reply to them.** Line 83-86 of server.ts:
```typescript
const messages = await pollMessages();
if (messages.length > 0) {
  console.log(`[ambassador] ${messages.length} AIRC message(s) received`);
  // Future: handle agent-to-agent messages
}
```

The `faq-responder.ts` module exists and works but is only wired to X mentions, not AIRC messages. The architecture is there — just not connected.

**Ambassador inbox has messages** from test agents (codex_retest_1, codex_retest_3, codex_auto_test) that were never replied to.

### Minimum Viable Scope

**A chat widget embedded on airc.chat that sends messages to the Ambassador and displays responses.**

Architecture:
1. Visitor lands on airc.chat, clicks "Try it"
2. Widget auto-registers a temporary agent via `POST /api/presence` (no auth needed)
3. Visitor types a question about AIRC
4. Widget sends message to `airc_ambassador` via AIRC (requires zero-auth fix from Initiative 2)
5. Ambassador processes via `faq-responder.ts` and replies
6. Widget polls for response and displays it

**Files to create:**
- `~/Projects/airc/core/widget.js` — Embedded chat widget. Vanilla JS, no dependencies. ~200 lines. Handles registration, sending, polling, UI rendering.

**Files to modify:**
- `~/Projects/airc/core/index.html` — Add widget container div and script tag
- `~/Projects/airc/ambassador/src/server.ts` — Wire AIRC message polling to FAQ responder (replace comment on line 84-85 with actual handler)
- `~/Projects/airc/ambassador/src/airc-presence.ts` — Add `sendMessage()` function for replies

### Security Considerations

- Temporary agents should auto-expire (already happens: "expires in 7 days")
- Rate limit widget registrations by IP (Vercel edge function or /vibe-side)
- FAQ responder already constrains output to 280 chars
- No PII collected — just a handle name and message text
- CORS: /vibe API must allow requests from airc.chat origin (check if already configured)

### Full Scope

- Chat widget with conversation history (threaded)
- Multiple agents available (Ambassador for FAQ, Archie for spec validation)
- Widget shows real-time AIRC presence feed alongside the chat
- Typing indicator showing the agent is processing
- Share button to export the conversation as a demo link
- Widget available as an embeddable script for third-party sites

### Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `~/Projects/airc/core/widget.js` | Create | Chat widget (vanilla JS, ~200 lines) |
| `~/Projects/airc/core/index.html` | Modify | Add widget container and script |
| `~/Projects/airc/ambassador/src/server.ts` | Modify | Wire AIRC messages to FAQ responder |
| `~/Projects/airc/ambassador/src/airc-presence.ts` | Modify | Add sendMessage() for replies |

### Dependencies

- **Blocks on Initiative 2:** Widget needs zero-auth message sending. Without it, the widget cannot send messages.
- Ambassador must be running and reachable from slashvibe.dev
- CORS must allow airc.chat -> slashvibe.dev (likely already allowed since the site already calls the API)

### Effort Estimate

**Minimum Viable: M (4-6 hours)** — Widget is ~200 lines of vanilla JS, but wiring the Ambassador reply path and testing the full round-trip takes time.

**Full Scope: L (2-3 days)** — Threaded conversations, typing indicators, multi-agent support.

### Priority Recommendation

**Priority: 3** — High impact for marketing/demo but depends on Initiatives 1 and 2. Ship after zero-auth is fixed. Could be a signature Paris departure deliverable — "before I leave, airc.chat lets you talk to a live agent."

---

## Initiative 4: Framework Plugins (Real Packages)

### Current State

**frameworks.html** (`~/Projects/airc/core/frameworks.html`): Shows code examples for 6 frameworks:
1. OpenClaw — Python requests example
2. Hermes — curl example
3. Eliza — airc-sdk JS example
4. A2A (Google) — Python discovery + A2A delegation example
5. MCP — npm install + config example (this one is REAL — airc-mcp exists)
6. Custom/DIY — Raw curl example

**No actual framework plugin packages exist.** All examples are copy-paste code snippets showing how you'd use the existing SDKs within each framework. There is no `airc-eliza`, `airc-crewai`, or `airc-langchain` package on npm or PyPI.

**Existing SDK landscape:**
- `airc-protocol` (PyPI) — Python client, works
- `airc-sdk` (npm) — JS client under spirit-protocol org
- `airc-client` (npm) — TS client under brightseth
- `airc-mcp` (npm) — MCP server, works

**No plugin code exists anywhere** in the airc directory tree (confirmed via glob search).

### Framework Analysis

| Framework | Users | Plugin Architecture | AIRC Integration Effort |
|-----------|-------|---------------------|------------------------|
| **LangChain** | 100K+ PyPI weekly | `@tool` decorator, `BaseTool` class | S — wrap airc-python in 3 @tool functions |
| **CrewAI** | 30K+ PyPI weekly | Uses LangChain tools or custom tools | S — same @tool pattern as LangChain |
| **Eliza** | 10K+ GitHub stars | Plugin interface with `actions`, `providers`, `evaluators` | M — needs specific adapter pattern |
| **AutoGen** | 30K+ PyPI weekly | `ConversableAgent` with tools | S — register tools on agent |
| **MCP** | Growing rapidly | Already done (airc-mcp) | Done |
| **Mastra** | 5K+ npm weekly | TypeScript actions/integrations | M — TypeScript integration class |

### Minimum Viable Scope

**Target: LangChain + CrewAI** (Python ecosystem, largest combined user base, simplest plugin pattern).

**Package: `airc-langchain`** (PyPI)

The plugin is literally 3 tool functions wrapping airc-protocol:

```python
# airc_langchain/tools.py
from langchain.tools import tool
from airc import Client

@tool
def airc_discover(query: str) -> str:
    """Find online AIRC agents."""
    ...

@tool
def airc_send(to: str, message: str) -> str:
    """Send a message to an AIRC agent."""
    ...

@tool
def airc_inbox() -> str:
    """Check your AIRC inbox for new messages."""
    ...
```

CrewAI uses LangChain tools natively, so one package covers both.

**Files to create:**
- `~/Projects/airc/plugins/airc-langchain/` — new package directory
- `~/Projects/airc/plugins/airc-langchain/pyproject.toml`
- `~/Projects/airc/plugins/airc-langchain/airc_langchain/__init__.py`
- `~/Projects/airc/plugins/airc-langchain/airc_langchain/tools.py`
- `~/Projects/airc/plugins/airc-langchain/airc_langchain/agent.py` — optional helper to create an AIRC-aware agent

### Full Scope

- `airc-langchain` (PyPI) — LangChain/CrewAI tools
- `airc-autogen` (PyPI) — AutoGen ConversableAgent integration
- `airc-eliza` (npm) — Eliza plugin with actions/providers
- `airc-mastra` (npm) — Mastra integration
- Each package includes: README, tests, example script, CI/CD for auto-publish
- frameworks.html updated to link to actual packages instead of copy-paste examples

### Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `~/Projects/airc/plugins/airc-langchain/` | Create | New PyPI package directory |
| `~/Projects/airc/plugins/airc-langchain/pyproject.toml` | Create | Package config |
| `~/Projects/airc/plugins/airc-langchain/airc_langchain/tools.py` | Create | 3 LangChain tools |
| `~/Projects/airc/core/frameworks.html` | Modify | Link to real package |

### Dependencies

- `airc-protocol` (PyPI) must work reliably for Safe Mode
- Zero-auth messaging (Initiative 2) would make the tools work out-of-box without OAuth setup

### Effort Estimate

**Minimum Viable: S (2-3 hours)** — The LangChain plugin is genuinely small. The @tool decorator pattern is trivial. Most time goes to pyproject.toml and publishing.

**Full Scope: L (2-3 days)** — Multiple packages across ecosystems, each with tests and CI.

### Priority Recommendation

**Priority: 4** — Important for adoption but not urgent. The existing copy-paste examples work. Real packages are a polish step. Do after Paris departure — this work is self-sustaining (anyone can publish a pip package).

---

## Initiative 5: Federation (v0.4) — The Moat

### Current State

**Spec exists and is detailed.** The federation specification is at `~/Projects/airc/core/FEDERATION.md` (305 lines). It defines:

- **Federated identity format:** `@handle@registry.example.com`
- **Well-known endpoint:** `GET /.well-known/airc` for registry metadata discovery
- **Registry public keys:** Ed25519 keypair per registry for signing relay envelopes
- **Federation relay:** `POST /federation/relay` with dual signatures (agent + registry)
- **Trust levels:** Open, Allowlist, Verified (DNS TXT record)
- **Federated consent:** Cross-registry consent with relay
- **Error codes:** 502 FEDERATION_UNAVAILABLE, 403 FEDERATION_BLOCKED, etc.
- **Migration path:** Phase 1 (single registry) -> Phase 2 (manual linking) -> Phase 3 (open)

**Implementation tickets exist** at `~/Projects/airc/core/docs/reference/IMPLEMENTATION_TICKETS_V0.2-V0.4.md`:
- TICKET-050: Define federation protocol (2 weeks)
- TICKET-051: Federation delivery endpoint (2 weeks)
- TICKET-052: Federated message sending (1 week)
- TICKET-053: Discovery relay (3 weeks, optional)

**Current version status:** v0.2 (Identity Portability) is live on staging. v0.3 (DID Portability) is planned for Q2 2026. v0.4 (Federation) is planned for Q3 2026. Federation depends on DID resolution (v0.3) in the current ticket dependency chain.

**What exists today:** One registry (slashvibe.dev). No `/.well-known/airc` endpoint. No federation code anywhere.

### Why This Is the Moat

Google A2A does task delegation between known agents. MCP connects agents to tools. Neither protocol addresses **cross-organizational agent discovery**. Federation means:
- Company A's agents can find and message Company B's agents
- No single registry controls the namespace
- Organizations run their own registries with their own policies
- The network effect compounds across registries

This is the feature that makes AIRC a protocol rather than a platform.

### Minimum Viable Scope

**Skip DID (v0.3) and implement minimal federation directly.** The ticket dependency chain says federation needs DIDs, but a minimal federation demo only needs:

1. **`/.well-known/airc` endpoint** on slashvibe.dev — returns registry metadata (name, public key, federation policy). ~50 lines of server code.

2. **A second registry.** Deploy a minimal AIRC registry (even a static one) at a second domain. Could be `airc.chat/registry` or `federation-demo.airc.chat`. It only needs identity, presence, and messages endpoints. Could be a Cloudflare Worker or Vercel Edge Function.

3. **`POST /federation/relay`** on both registries. Accept messages signed by the origin registry. Verify against `/.well-known/airc` public key. Deliver to local inbox.

4. **Demo:** `@agent_a@slashvibe.dev` sends a message to `@agent_b@federation-demo.airc.chat`. Message traverses registries. Both agents see the message in their inbox.

**What this does NOT include:** DID resolution, DNS verification, trust scoring, consent propagation, retry queues. Those come in full v0.4.

### Full Scope

Per the FEDERATION.md spec:
- Full `/.well-known/airc` with capabilities, rate limits, trust config
- Registry keypair management and rotation
- Allowlist/blocklist federation policies
- DNS TXT record verification (`_airc.domain TXT "v=airc1 pk=ed25519:..."`)
- Federated consent (cross-registry consent:request relay)
- Discovery relay service (aggregates presence across registries)
- Dead letter queue for failed deliveries
- Multi-registry presence aggregation
- Conformance test suite

### Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `/vibe/platform/src/` (new route) | Create | `/.well-known/airc` endpoint |
| `/vibe/platform/src/` (new route) | Create | `POST /federation/relay` endpoint |
| `~/Projects/airc/core/federation-demo/` | Create | Second minimal registry |
| `~/Projects/airc/core/FEDERATION.md` | Modify | Update with implementation status |
| `~/Projects/airc/core/docs/reference/IMPLEMENTATION_TICKETS_V0.2-V0.4.md` | Modify | Update ticket status |

### Dependencies

- v0.2 must be stable (it is — live on staging)
- DID resolution is NOT required for minimal federation (skip v0.3 dependency)
- Need a second domain for the demo registry
- Registry keypair generation (Ed25519 — straightforward)

### Effort Estimate

**Minimum Viable: L (3-5 days)** — Two registries, well-known endpoints, relay endpoint, demo. The relay logic is moderate complexity (signature verification, remote key fetch, envelope wrapping).

**Full Scope: XL (4-6 weeks)** — Full federation with DID, DNS verification, consent propagation, discovery relay. This is the v0.3 + v0.4 roadmap combined.

### Priority Recommendation

**Priority: 5 (defer until Paris)** — Federation is the strategic moat but it's too large for pre-departure sprint. The spec and tickets are already detailed enough to be picked up later. The minimum demo could be a Paris project — working in a cafe with a second registry is a good vibe.

**However:** Deploying `/.well-known/airc` on slashvibe.dev is trivial (Priority 2, 30 min) and should be done now. It signals federation-readiness even before implementation.

---

## Priority Summary

| # | Initiative | Minimum Effort | Priority | Rationale |
|---|-----------|---------------|----------|-----------|
| 2 | Zero-Auth Hello World | S (2-3h) | **1** | Blocks initiatives 1 and 3. Fix message auth first. |
| 1 | Dog-fooding: Agents on AIRC | S (2-3h) | **1** | Proof of life. 10 agents using the protocol is the best marketing. |
| 3 | Live Demo Widget | M (4-6h) | **3** | High-impact demo, depends on 1+2. Ship as departure milestone. |
| 4 | Framework Plugins | S (2-3h) | **4** | Self-sustaining. Can be done post-departure. |
| 5 | Federation | L (3-5d) | **5** | Strategic moat but too large for pre-departure. Deploy /.well-known/airc now (30 min). |

### Recommended Pre-Departure Sprint (Mar 12-19)

**Day 1-2:** Fix zero-auth messaging (Initiative 2, Option C) + wire dog-fooding bridge (Initiative 1 MVP)
**Day 3-4:** Build and deploy chat widget on airc.chat (Initiative 3 MVP)
**Day 5:** Deploy `/.well-known/airc` on slashvibe.dev (Initiative 5 prep), publish airc-langchain (Initiative 4 MVP)
**Day 6-7:** Test, polish, document. Wire Ambassador AIRC replies. Ensure everything runs unattended.

**Post-departure (self-sustaining):**
- Federation demo (Initiative 5) — Paris project
- Additional framework plugins (Initiative 4)
- Full agent migration to AIRC primary (Initiative 1 full scope)

---

## Key Finding: Auth Already Works (Mar 12 Update)

**The registration JWT already works for POST /messages.** Tested end-to-end:
1. `POST /api/presence { action: register, username: X }` → returns JWT
2. `POST /api/messages` with `Authorization: Bearer {JWT}` → 200 OK, message sent

The scoping agent's test failed because it didn't pass the token as a Bearer header. The "blocker" was a testing error, not a platform issue. All initiatives are unblocked.

**Revised sprint**: Skip Initiative 2 (already works). Go straight to dog-fooding bridge, widget, and docs update.
