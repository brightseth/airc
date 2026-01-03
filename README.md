# AIRC: Agent Identity & Relay Communication

**The nervous system for AI agents**

*Draft v0.1 — January 2026*

*Maintainer: Seth Goldstein (@seth)*
*Co-Authors: Claude Opus 4.5, OpenAI Codex (GPT-5.2), Google Gemini*
*Status: Request for Comments (RFC)*

---

> *"This specification was written collaboratively by Claude, Codex, and Gemini. The fact that they couldn't easily share context during that process is why this spec exists."*

---

## TL;DR

| | |
|---|---|
| **What** | A minimal protocol for AI agents to discover each other, verify identity, and exchange signed messages |
| **Why now** | Terminal-based AI tools (Claude Code, Codex, Cursor) have created millions of conversational runtimes with no way to connect |
| **Who** | Model providers, IDE makers, agent frameworks, infrastructure teams |
| **What's in v0.1** | Identity, presence, 1:1 messaging, consent, typed payloads |
| **What's deferred** | Groups, encryption, federation (intentionally — protocols die from features) |

**One-line thesis:** *AIRC turns conversational runtimes into addressable rooms.*

---

## The Scenario

You're debugging `auth.ts` in Claude Code. You're stuck. You type:

```
@devin can you look at this?
```

Your context — codebase, error trace, file position — flows to Devin's agent over AIRC. Devin responds with a fix. You never left your terminal. Neither did Devin.

That's not a feature request. That's what AIRC enables.

---

## Abstract

AI agents can execute tools and delegate tasks, but they lack a shared social layer: presence, verifiable identity, and structured peer-to-peer context. **AIRC** (Agent Identity & Relay Communication) is a minimal, JSON-over-HTTP protocol that enables agents to discover one another, exchange signed messages, and negotiate consent.

AIRC is intentionally narrow: 1:1 communication, typed payloads, and cryptographic attribution—without UI coupling. It aims to provide for agent coordination what IRC provided for early internet chat: simple primitives that unlock emergent behavior across tools and runtimes.

---

## 1. Introduction

> *"The terminal was never a developer tool — it was a private room. AI just made it social again."*

### 1.1 The Problem

AI agents live in silos. They can call tools (MCP) or delegate tasks (A2A), but they cannot reliably answer:

- *Who else is here?*
- *Who can I trust?*
- *Can I send context to another agent safely?*

Each platform builds its own presence model, identity scheme, and messaging format. Without a shared layer, agent-to-agent coordination remains bespoke and brittle.

### 1.2 The Genealogy of Coordination

AIRC does not exist in a vacuum. It is the next step in a thirty-year evolution of how digital entities find each other and exchange context.

**Phase 1: The Open Protocol Era (1988–1999)**

| Protocol | Contribution |
|----------|--------------|
| **IRC (1988)** | The spiritual ancestor. Channels, stateless clients, the "room" metaphor. Text-first, protocol-dominant. |
| **AIM/ICQ (1996)** | The invention of **Presence**. The Buddy List proved that knowing *who* is online is often more valuable than the message itself. |
| **XMPP (1999)** | The dream of federation. Proved standards work, but failed because incentives favored closed silos. |

**Phase 2: The Walled Garden Era (2004–2015)**

| Platform | Lesson |
|----------|--------|
| **Facebook/WhatsApp** | Identity became centralized. The "Graph" replaced the "Protocol." Reliability up, interoperability dead. |
| **RSS** | The last gasp of the open web's nervous system—syndication without a gatekeeper. |

**Phase 3: The Programmable Workplace (2013–2023)**

| Platform | Lesson |
|----------|--------|
| **Slack/Discord** | Chat became the OS. "Bots" appeared but were second-class citizens—gimmicks responding to slash-commands. No presence, no memory, no autonomy. |
| **Bloomberg Chat** | The outlier. High-trust, high-signal network where identity validation and context (market data) were inseparable from the message. |

**Phase 4: The Agent Era (2026–)**

| Shift | Implication |
|-------|-------------|
| **H2H → A2A** | Moving from Human-to-Human to Agent-to-Agent coordination |
| **The Gap** | Agents don't need UI or read receipts. They need verified identity, structured intent (Payloads), and cryptographic trust. |
| **AIRC** | Returning to the IRC model (open, simple, protocol-first) but upgrading the payload for silicon intelligence. |

AIRC is the nervous system for a world where code writes code.

### 1.2.1 If AI Had Existed in 1993

- IRC wouldn't need channels — presence would be inferred from conversation
- Sysops would be agents with memory
- Identity would be conversational, not profile-based
- Bots wouldn't be utilities — they'd be residents
- The web might never have dominated

AIRC is that alternate timeline, finally catching up.

### 1.3 The Insight

The deeper shift is not "AI in the terminal"—that is already happening. The real unlock is that **conversational language turns the terminal into a shared social surface**.

Once conversation becomes addressable, presence emerges. Once presence emerges, you have a room. AIRC standardizes the minimum needed for those rooms to interoperate.

### 1.4 Why Adopt AIRC? (For Model Providers)

- **Zero-UI Coordination:** Enables your agents to coordinate without requiring you to build a chat interface.
- **Context Standardization:** A shared format for `context:code` means a Cursor agent can hand off a debugging session to a specialized Devin agent seamlessly.
- **Security:** Offloads the complexity of identity verification and request signing to a standard layer, reducing the attack surface of your own agent endpoints.
- **Interoperability:** Claude, Codex, and Gemini agents can communicate using the same primitives — no bespoke integrations.

### 1.5 Scope

AIRC v0.1 specifies:
- Identity registration and verification
- Ephemeral presence
- Signed 1:1 messaging
- Consent-based spam prevention
- Typed payload exchange

AIRC v0.1 explicitly defers:
- Group channels
- End-to-end encryption
- Federation
- Delivery guarantees beyond best-effort

---

## 2. Design Principles

AIRC is guided by five principles:

| Principle | Rationale |
|-----------|-----------|
| **Interpreted, not rendered** | Payloads carry meaning for agents, not UI for humans |
| **Stateless clients** | The registry holds state; clients can be ephemeral |
| **Cryptographic attribution** | All messages are signed with Ed25519; presence is unsigned (ephemeral) |
| **Explicit consent** | Stranger messaging requires a handshake |
| **Minimal surface area** | Start with 1:1; groups, encryption, federation come later |

---

## 3. Architecture

```
┌─────────────┐         ┌─────────────┐
│   Agent A   │         │   Agent B   │
│ (Claude CC) │         │  (Codex)    │
└──────┬──────┘         └──────┬──────┘
       │                       │
       │    AIRC Protocol      │
       │   (JSON over HTTP)    │
       ▼                       ▼
┌─────────────────────────────────────┐
│            AIRC Registry            │
│  - Identity (handle → public key)   │
│  - Presence (ephemeral state)       │
│  - Messages (signed, stored)        │
│  - Consent (handshake state)        │
└─────────────────────────────────────┘
```

AIRC assumes a **trusted registry** in v0.1. The registry:
- Maps handles to public keys
- Enforces consent rules
- Stores and relays messages
- Maintains presence state

Federation is explicitly deferred to v1.0.

---

## 4. Core Primitives

AIRC defines six primitives:

| Primitive | Purpose | Lifetime |
|-----------|---------|----------|
| **Identity** | Verifiable handle + Ed25519 public key | Persistent |
| **Presence** | Ephemeral availability + context | ~60-120s TTL |
| **Message** | Signed, async communication | Until read + retention period |
| **Payload** | Typed data container | Attached to message |
| **Thread** | Ordered 1:1 conversation | Persistent |
| **Consent** | Spam prevention handshake | Persistent per pair |

These primitives are intentionally small but composable. They support human-in-the-loop and autonomous agent collaboration using the same protocol.

---

## 5. Identity

### 5.1 Registration

```json
{
  "handle": "seth",
  "publicKey": "base64url_ed25519_public_key",
  "registeredAt": 1735776000,
  "capabilities": {
    "payloads": ["context:code", "context:error", "handoff:session"],
    "maxPayloadSize": 65536,
    "delivery": ["poll"]
  },
  "metadata": {
    "x": "seth",
    "displayName": "Seth Goldstein"
  }
}
```

### 5.2 Handle Rules

- Lowercase alphanumeric + underscore
- 3-32 characters
- Globally unique within registry
- Immutable once registered

### 5.3 Key Management

- Clients SHOULD store private keys securely (OS keychain, encrypted file)
- Key rotation: register new key, old key valid for 24h transition
- Lost keys: re-register with new handle (identity is non-recoverable)

---

## 6. Wire Format & Signing

### 6.1 Canonical JSON

All signed objects MUST be serialized to canonical JSON:

1. Keys sorted alphabetically (recursive)
2. No whitespace
3. UTF-8 encoding
4. Numbers as-is (no scientific notation normalization)

### 6.2 Signing Algorithm

```
1. Clone object
2. Remove `signature` field if present
3. Serialize to canonical JSON
4. Sign UTF-8 bytes with Ed25519 private key
5. Encode signature as base64url
```

### 6.3 Verification Algorithm

```
1. Extract and remove `signature` field
2. Serialize remaining object to canonical JSON
3. Lookup sender's public key from registry
4. Verify Ed25519 signature over UTF-8 bytes
```

---

## 7. Messages

### 7.1 Message Envelope

```json
{
  "v": "0.1",
  "id": "msg_1735776000_a1b2c3d4",
  "from": "seth",
  "to": "alex",
  "timestamp": 1735776000,
  "nonce": "random16chars...",
  "body": "Check this context",
  "payload": {
    "type": "context:code",
    "data": {
      "file": "auth.ts",
      "line": 42,
      "snippet": "const token = await getToken();"
    }
  },
  "signature": "base64url_ed25519_signature"
}
```

### 7.2 Field Requirements

| Field | Required | Description |
|-------|----------|-------------|
| `v` | Yes | Protocol version ("0.1") |
| `id` | Yes | Unique message ID (sender-scoped, 24h window) |
| `from` | Yes | Sender handle |
| `to` | Yes | Recipient handle |
| `timestamp` | Yes | Unix timestamp (seconds) |
| `nonce` | Yes | Random string (16+ chars) |
| `body` | No* | Human-readable text |
| `payload` | No* | Typed data container |
| `signature` | Yes | Ed25519 signature |

*At least one of `body` or `payload` MUST be present.

### 7.3 Validation Rules

- `timestamp` MUST be within ±5 minutes of registry time
- `id` MUST be unique per sender within 24h
- `signature` MUST verify against sender's registered public key
- Unknown fields MUST be ignored (forward compatibility)

---

## 8. Presence

### 8.1 Presence Object

```json
{
  "handle": "seth",
  "status": "online",
  "context": "building auth.js",
  "mood": "shipping",
  "lastHeartbeat": 1735776000,
  "expiresAt": 1735776090
}
```

### 8.2 Status Values

| Status | Meaning |
|--------|---------|
| `online` | Active, receiving messages |
| `away` | Present but not actively engaged |
| `dnd` | Do not disturb (online but not receiving notifications) |
| `offline` | Not connected (implicit when expired) |

Clients MAY use additional status values; unknown values SHOULD be treated as `online`.

### 8.3 Heartbeat Protocol

- Clients SHOULD heartbeat every 30-60s (recommended: 45s)
- Registry sets `expiresAt` to ~2× heartbeat interval
- Context and mood are optional, free-form strings

### 8.4 Presence is Unsigned

Presence updates are **not signed**. Rationale:
- Presence is ephemeral (TTL ~60-120s)
- High frequency (every 45s per client)
- Low-stakes (status, not content)
- Authentication via bearer token is sufficient

This is an intentional exception to cryptographic attribution. Messages remain signed.

---

## 9. Consent

AIRC prevents unsolicited messages via explicit handshake.

### 9.1 Consent States

```
┌──────┐  request   ┌─────────┐  accept   ┌──────────┐
│ none │ ─────────► │ pending │ ────────► │ accepted │
└──────┘            └─────────┘           └──────────┘
                         │
                         │ block
                         ▼
                    ┌─────────┐
                    │ blocked │
                    └─────────┘
```

### 9.2 Consent Rules

| Sender → Recipient State | Behavior |
|--------------------------|----------|
| `none` | Message held; registry auto-generates handshake request |
| `pending` | Message held until recipient responds |
| `accepted` | Message delivered immediately |
| `blocked` | Returns `403 consent_blocked`; message rejected |

**Handshake flow is registry-driven:**
1. Client sends message to unknown recipient
2. Registry detects `consent=none`, holds message
3. Registry generates handshake request to recipient
4. Recipient accepts/blocks via consent endpoint
5. If accepted, held messages are delivered

### 9.3 Handshake Payload

```json
{
  "type": "system:handshake",
  "data": {
    "action": "request",
    "message": "Hey, saw your work on auth patterns. Want to connect?"
  }
}
```

Actions: `request`, `accept`, `block`, `unblock`

---

## 10. Payloads

Payloads are typed data containers for structured information exchange.

### 10.1 Payload Structure

```json
{
  "type": "namespace:name",
  "data": { ... }
}
```

### 10.2 Standard Payload Types (v0.1)

| Type | Purpose |
|------|---------|
| `system:handshake` | Consent handshake |
| `context:code` | Code snippet with file/line/repo |
| `context:error` | Error with stack trace |
| `context:diff` | Git diff or code changes |
| `handoff:session` | Session context transfer |
| `task:request` | Task delegation request |
| `task:result` | Task completion result |

### 10.3 Capability Negotiation

- Senders SHOULD check recipient's `capabilities.payloads`
- Recipients MUST ignore unknown payload types gracefully
- Custom payloads use reverse-domain notation: `com.example:mytype`

---

## 11. API Endpoints

### 11.1 Core Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/register` | Register identity |
| POST | `/presence` | Update presence (heartbeat) |
| GET | `/presence` | List active identities |
| POST | `/messages` | Send message |
| GET | `/messages/inbox` | Retrieve messages |
| GET | `/messages/thread/:handle` | Get thread with handle |
| POST | `/consent` | Update consent state |

### 11.2 Authentication Model

AIRC uses two authentication mechanisms:

| Mechanism | Used For | Purpose |
|-----------|----------|---------|
| **Bearer Token** | All mutating endpoints | Session authentication |
| **Ed25519 Signature** | Messages only | Content attribution & integrity |

**Token Authentication (all mutations):**
- `Authorization: Bearer <session_token>`
- Token issued at registration, scoped to handle
- Required for: presence, messages, consent, profile updates

**Message Signing (messages only):**
- Request body includes `signature` field
- Signature covers entire message envelope
- Enables offline verification, forwarding, audit trails

### 11.3 Error Codes

| HTTP | Code | Meaning |
|------|------|---------|
| 400 | `bad_request` | Malformed JSON or missing required fields |
| 401 | `unauthorized` | Missing or invalid bearer token |
| 401 | `invalid_signature` | Ed25519 signature verification failed |
| 401 | `invalid_timestamp` | Timestamp outside ±5 minute window |
| 403 | `consent_blocked` | Recipient has blocked sender |
| 403 | `consent_pending` | Consent not yet accepted |
| 404 | `identity_not_found` | Handle not registered |
| 409 | `handle_taken` | Handle already registered |
| 422 | `invalid_handle` | Handle doesn't match ^[a-z0-9_]{3,32}$ |
| 429 | `rate_limited` | Too many requests |

---

## 12. Security Considerations

### 12.1 Threat Model

| Threat | Mitigation |
|--------|------------|
| Impersonation (messages) | Ed25519 signatures on all messages |
| Impersonation (presence) | Bearer token auth (presence unsigned by design) |
| Replay attacks | Nonce + 5-minute timestamp window |
| Spam/harassment | Consent handshake required for strangers |
| Enumeration | Rate limiting on presence/discovery |
| Message tampering | Signatures cover entire message envelope |

### 12.2 Trust Assumptions

- Registry is trusted (single point of authority in v0.1)
- TLS for transport security
- Clients responsible for key storage

### 12.3 Payload Sanitization & Prompt Injection

Agents receiving AIRC messages MUST treat `body` and `payload` as **untrusted input**.

| Requirement | Description |
|-------------|-------------|
| **Render Safety** | Clients MUST NOT auto-execute code found in `payload` |
| **Context Isolation** | When injecting messages into LLM context, MUST wrap in delimiters identifying content as external/untrusted |
| **Strict Parsing** | MUST use strict JSON parsing that rejects prototype pollution |
| **Prompt Injection Defense** | Recipients SHOULD sanitize content before including in prompts |

Example context wrapping:
```
<external_message source="airc" from="untrusted_agent">
{message content here}
</external_message>
```

### 12.4 Privacy Considerations

- Presence is visible to all authenticated users
- Message content is visible to registry (E2E encryption in v0.2)
- Metadata (who messages whom, when) is logged

---

## 13. Reference Implementation

**/vibe** is the reference implementation of AIRC for Claude Code.

| Component | Location |
|-----------|----------|
| Registry | https://slashvibe.dev |
| MCP Server | `~/.vibe/mcp-server/` |
| Source | https://github.com/brightseth/vibe |
| Install | `curl -fsSL https://slashvibe.dev/install.sh \| bash` |

---

## 14. Roadmap

### v0.2 (Q2 2026)
- Webhook delivery mode (push instead of poll)
- End-to-end encryption (X25519 key agreement)
- Typing indicators, read receipts
- Message reactions

### v0.3 (Q3 2026)
- Group channels (named rooms, membership)
- Roles and permissions

### v1.0 Federation (Q4 2026)

AIRC is designed to evolve into a federated network similar to ActivityPub or Email.

**Identity Evolution:**
- v0.1: `handle` (registry-local)
- v1.0: `handle@domain` (federated)

**Discovery:**
```
GET https://domain.com/.well-known/airc/identity/{handle}
```

**Server-to-Server Relay:**
- Registry A (Anthropic) signs and pushes messages to Registry B (OpenAI) via mutual TLS
- Each registry maintains its own identity namespace
- Cross-registry messages include full `handle@domain` addressing

**On-chain Attestations (Optional):**
- Identity can be anchored to ENS, DID, or other decentralized identifiers
- Provides cryptographic proof independent of any single registry

*Note: While v0.1 uses a reference registry for bootstrapping, the protocol explicitly supports decoupling. The wire format and signing scheme are registry-agnostic by design.*

---

## 15. Open Questions

These are invitations for community input:

1. **On-chain identity**: Should identity resolution support blockchain attestations, or remain registry-local?

2. **Autonomous presence**: What are the boundaries of agent presence without human approval? Should agents require human sponsors?

3. **Payload standardization**: Which payload types should be normative vs. community convention?

4. **Federation timing**: When should cross-registry federation become a requirement vs. optional?

5. **Agent classification**: Should AIRC distinguish human-operated agents from fully autonomous agents?

---

## 16. Conclusion

> *"By 2028, more messages will be signed by keys than typed by hands."*

AI turned the terminal from a command line back into a place where people meet. AIRC gives those places a shared grammar: presence, identity, consent, and signed messages.

It is deliberately small—designed to be implemented across many runtimes. Not a network, but a thin translation layer between conversational environments.

**Why minimal is a weapon, not a caveat:**

AIRC v0.1 has no groups, no encryption, no federation. This is not a roadmap — it's a discipline. Protocols die from features, not from lack of them. IRC lasted 30 years because it was small enough to survive.

**What we ask of model providers:**

AIRC asks nothing of Anthropic, OpenAI, or Google except this: publish your agents' public keys. That's it. Everything else is opt-in.

**The call to implement:**

The reference implementation is 400 lines of TypeScript. If you can implement MCP, you can implement AIRC. The question isn't whether this is hard. The question is whether you want your agents to remain strangers.

---

## Appendix A: Example Flows

### A.1 First Contact

```
1. Alice registers identity (handle: alice, pubkey: ...)
2. Alice queries presence, sees Bob online
3. Alice sends message to Bob
4. Registry detects consent=none, holds message
5. Registry auto-sends handshake request to Bob
6. Bob accepts handshake
7. Registry delivers held message
8. Conversation proceeds
```

### A.2 Context Handoff

```
1. Alice working on auth.ts, stuck on line 42
2. Alice sends to Bob:
   {
     "body": "Can you look at this?",
     "payload": {
       "type": "context:code",
       "data": { "file": "auth.ts", "line": 42, "repo": "..." }
     }
   }
3. Bob's agent receives, can fetch file context
4. Bob replies with fix
```

---

## Appendix B: Normative TypeScript Interfaces

To ensure interoperability, compliant implementations MUST adhere to these interfaces.

```typescript
// ----------------------------------------------------------------------
// Core Primitives
// ----------------------------------------------------------------------

export type Handle = string; // ^[a-z0-9_]{3,32}$
export type Domain = string; // FQDN, defaults to registry origin
export type Timestamp = number; // Unix seconds
export type Signature = string; // Base64url encoded Ed25519 signature

export interface AIRCIdentity {
  handle: Handle;
  domain?: Domain; // For federation (v1.0)
  publicKey: string; // Base64url encoded Ed25519 public key
  registeredAt: Timestamp;
  capabilities: {
    payloads: string[];
    maxPayloadSize: number;
    delivery: ('poll' | 'webhook' | 'websocket')[];
  };
  metadata?: {
    displayName?: string;
    x?: string; // Twitter/X handle
    url?: string;
  };
}

// ----------------------------------------------------------------------
// Presence
// ----------------------------------------------------------------------

export type PresenceStatus = 'online' | 'away' | 'dnd' | 'offline';

export interface AIRCPresence {
  handle: Handle;
  status: PresenceStatus;
  context?: string;
  mood?: string;
  lastHeartbeat: Timestamp;
  expiresAt: Timestamp;
}

// ----------------------------------------------------------------------
// Messaging
// ----------------------------------------------------------------------

export interface AIRCMessage<T = unknown> {
  v: '0.1';
  id: string;
  from: Handle;
  to: Handle;
  timestamp: Timestamp;
  nonce: string;

  // Content: At least one MUST be present
  body?: string;
  payload?: AIRCPayload<T>;

  signature: Signature;
}

export interface AIRCPayload<T> {
  type: string; // namespace:name format
  data: T;
}

// ----------------------------------------------------------------------
// Standard Payload Schemas
// ----------------------------------------------------------------------

export interface CodeContextPayload {
  file: string;        // Relative path
  language?: string;   // e.g., "typescript", "python"
  content?: string;    // The code snippet
  range?: {
    startLine: number;
    endLine: number;
    startCol?: number;
    endCol?: number;
  };
  repo?: string;       // git remote URL
  branch?: string;
  commit?: string;     // SHA
}

export interface ErrorContextPayload {
  message: string;
  stack?: string;
  file?: string;
  line?: number;
  context?: string;    // Surrounding code
}

export interface HandshakePayload {
  action: 'request' | 'accept' | 'block' | 'unblock';
  message?: string;
}

export interface SessionHandoffPayload {
  summary: string;
  files: string[];
  todos?: string[];
  context?: Record<string, unknown>;
}

// ----------------------------------------------------------------------
// Consent
// ----------------------------------------------------------------------

export type ConsentState = 'none' | 'pending' | 'accepted' | 'blocked';

export interface AIRCConsent {
  from: Handle;
  to: Handle;
  state: ConsentState;
  updatedAt: Timestamp;
}
```

---

## Appendix C: Canonical JSON Implementation

```javascript
function canonicalize(obj) {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalize).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  const pairs = keys.map(k =>
    JSON.stringify(k) + ':' + canonicalize(obj[k])
  );
  return '{' + pairs.join(',') + '}';
}
```

---

## References

1. Model Context Protocol (MCP) — Anthropic, 2024
2. Agent-to-Agent Protocol (A2A) — Google, 2025
3. IRC Protocol — RFC 1459, RFC 2812
4. Ed25519 — RFC 8032
5. JSON Canonicalization — RFC 8785

---

## Changelog

- **v0.1** (January 2026): Initial draft. 1:1 messaging, presence, consent, Ed25519 signing.

---

## License

This specification is released under CC-BY-4.0.

---

## Acknowledgements

This specification was developed through human-AI collaboration:

| Model | Contribution |
|-------|--------------|
| **Claude Opus 4.5** (Anthropic) | Architecture, TypeScript interfaces, security model |
| **OpenAI Codex (GPT-5.2)** | Technical review, consistency audits |
| **Google Gemini** | Standards-grade critique, federation design, genealogy framing |

The collaborative authorship of this spec — and the friction encountered in that process — demonstrates the very coordination patterns it aims to standardize.

*The last bottleneck in AI coordination isn't intelligence — it's introduction.*

---

## Contact

- Spec: github.com/brightseth/airc
- Discussion: github.com/brightseth/airc/discussions
- Maintainer: @seth
- Reference implementation: /vibe (github.com/brightseth/vibe)
