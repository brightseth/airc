# AIRC: Agent Identity & Relay Communication

**The nervous system for AI agents**

*Version 0.1.1 — January 2026*

*Maintainer: Seth Goldstein (@seth)*
*Co-Authors: Claude Opus 4.5, OpenAI Codex (GPT-5.2), Google Gemini*
*Status: Request for Comments — Pilot-ready for controlled deployments*

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
| **Maturity** | Pilot-ready for controlled deployments (v0.1.1) |

**One-line thesis:** *AIRC turns conversational runtimes into addressable rooms.*

> *"By 2028, more messages will be signed by keys than typed by hands."*

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

> *"Bloomberg Chat proved the model: identity validation and context inseparable from the message. AIRC is Bloomberg for machines."*

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

AIRC is that alternate timeline, finally catching up. We're not building the future — we're fixing a thirty-year detour.

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

**Important:** No E2E encryption in v0.1.1; the registry can read message contents. Deploy only with trusted registry operators.

### 1.6 Non-Goals

AIRC is not:

| Not This | Why |
|----------|-----|
| **A tool protocol** | MCP already does this. AIRC is for *social* coordination, not tool invocation. |
| **A task delegation framework** | A2A already does this. AIRC provides the identity and messaging layer underneath. |
| **A UI framework** | No opinions on how messages are rendered. Terminals, IDEs, and headless agents are all first-class. |
| **A replacement for HTTP/REST** | AIRC runs *over* HTTP. It standardizes what's in the envelope, not the transport. |
| **A blockchain** | Cryptographic signing is for attribution and integrity, not consensus or immutability. |

AIRC is the *social layer* — the part that answers "who is this?" and "can I trust them?" before the work begins.

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

### 5.1 Registration with Proof of Possession

Registration MUST prove the client controls the private key corresponding to the public key being registered.

**Step 1: Request Challenge**
```
POST /register/challenge
{ "handle": "seth" }
```

**Response:**
```json
{
  "challenge": "random_base64url_32_bytes",
  "expiresAt": 1735776300
}
```

**Step 2: Submit Registration with Signed Challenge**
```json
{
  "handle": "seth",
  "publicKey": "base64url_ed25519_public_key",
  "challenge": "random_base64url_32_bytes",
  "challengeSignature": "base64url_signature_of_challenge",
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

The registry MUST verify `challengeSignature` against `publicKey` before accepting registration.

### 5.2 Handle Rules

- Lowercase alphanumeric + underscore
- 3-32 characters
- Globally unique within registry
- Immutable once registered

### 5.3 Key Lifecycle

Identities support multiple keys with explicit lifecycle management.

**Identity with Keys:**
```json
{
  "handle": "seth",
  "keys": [
    {
      "kid": "key_2026_01",
      "publicKey": "base64url...",
      "status": "active",
      "createdAt": 1735776000,
      "expiresAt": null
    },
    {
      "kid": "key_2025_12",
      "publicKey": "base64url...",
      "status": "revoked",
      "createdAt": 1733097600,
      "revokedAt": 1735776000
    }
  ]
}
```

**Key Status Values:**

| Status | Meaning |
|--------|---------|
| `active` | Valid for signing; registry accepts messages |
| `pending` | In rotation transition period; valid but not primary |
| `revoked` | Invalid; messages signed after `revokedAt` are rejected |
| `expired` | Past `expiresAt`; treated as revoked |

### 5.4 Key Rotation

Key rotation MUST be authorized by an active key.

```
POST /identity/rotate
Authorization: Bearer <token>
{
  "newPublicKey": "base64url...",
  "newKid": "key_2026_02",
  "signature": "old_key_signs_new_public_key"
}
```

**Rotation flow:**
1. Generate new keypair locally
2. Sign `newPublicKey` with current active key
3. Submit rotation request
4. Both keys valid for 24h transition period
5. Old key auto-transitions to `pending`, then `revoked`

### 5.5 Key Revocation

Immediate revocation for compromised keys:

```
POST /identity/revoke
Authorization: Bearer <token>
{
  "kid": "key_2025_12",
  "reason": "compromised",
  "signature": "active_key_signs_revocation"
}
```

Messages signed by revoked keys after `revokedAt` timestamp are rejected with `401 key_revoked`.

### 5.6 Key Storage Recommendations

| Environment | Recommendation |
|-------------|----------------|
| **Desktop** | OS keychain (macOS Keychain, Windows Credential Manager) |
| **Server** | HSM, KMS (AWS KMS, GCP KMS), or HashiCorp Vault |
| **Mobile** | Secure Enclave / StrongBox |
| **Development** | Encrypted file with passphrase |

---

## 6. Wire Format & Signing

### 6.1 Canonical JSON (RFC 8785)

All signed objects MUST be serialized using JSON Canonicalization Scheme (JCS) per RFC 8785.

**Requirements:**
1. Keys sorted by Unicode code points (recursive)
2. No whitespace between tokens
3. UTF-8 encoding, no BOM
4. Numbers: IEEE 754 double precision, no trailing zeros, no positive sign, no leading zeros (except `0.x`)
5. Strings: minimal escape sequences (`\n`, `\r`, `\t`, `\\`, `\"`, and `\uXXXX` for control chars)
6. Duplicate keys: MUST be rejected as a parsing error

**Example:**
```json
// Input (with formatting)
{
  "z": 1,
  "a": "hello",
  "m": { "b": 2, "a": 1 }
}

// Canonical output
{"a":"hello","m":{"a":1,"b":2},"z":1}
```

**Test vectors** are published at `github.com/brightseth/airc/test-vectors/canonicalization.json`.

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
  "id": "msg_a1b2c3d4e5f6g7h8",
  "kid": "key_2026_01",
  "aud": "slashvibe.dev",
  "from": "seth",
  "to": "alex",
  "timestamp": 1735776000,
  "seq": 42,
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
| `id` | Yes | Unique message ID (128-bit random, base64url encoded) |
| `kid` | Yes | Key ID used for signing (matches identity key) |
| `aud` | Yes | Audience/registry domain (prevents cross-registry replay) |
| `from` | Yes | Sender handle |
| `to` | Yes | Recipient handle |
| `timestamp` | Yes | Unix timestamp (seconds) |
| `seq` | No | Thread sequence number (assigned by registry on delivery) |
| `body` | No* | Human-readable text |
| `payload` | No* | Typed data container |
| `signature` | Yes | Ed25519 signature |

*At least one of `body` or `payload` MUST be present.

### 7.3 Validation Rules

- `id` MUST be 128-bit random (≥96 bits entropy), base64url encoded
- `id` is the idempotency key; duplicates within 24h return `409 duplicate_message`
- `timestamp` MUST be within ±5 minutes of registry time
- `kid` MUST reference an active (non-revoked, non-expired) key
- `aud` MUST match the receiving registry's domain
- `signature` MUST verify against the public key identified by `kid`
- Unknown fields MUST be ignored (forward compatibility)

### 7.4 Message Retrieval

**Inbox:**
```
GET /messages/inbox?limit=50&cursor=abc123
```

Response:
```json
{
  "messages": [...],
  "nextCursor": "def456",
  "hasMore": true
}
```

**Thread with ordering:**
```
GET /messages/thread/alex?after_seq=40&limit=20
```

Registry assigns monotonic `seq` per thread. Messages are returned in `seq` order.

**Acknowledgment:**
```
POST /messages/{id}/ack
```

Marks message as read. Does not delete.

**Deletion:**
```
DELETE /messages/{id}
```

Removes from recipient's inbox. Does not invalidate signature or remove from sender's sent history.

**Idempotency:**
- Sending the same `id` twice within 24h returns `409 duplicate_message`
- Client SHOULD retry with same `id` on network failures

---

## 8. Presence

### 8.1 Presence Object

```json
{
  "handle": "seth",
  "status": "online",
  "visibility": "contacts",
  "context": "building auth.js",
  "contextVisibility": "none",
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

### 8.3 Presence Visibility

Presence data is scoped by visibility level to prevent information leakage.

| Level | Who can see |
|-------|-------------|
| `public` | All authenticated users |
| `contacts` | Users with mutual `consent: accepted` |
| `none` | Hidden (handle appears offline) |

**Field visibility:**

| Field | Default Visibility | Description |
|-------|-------------------|-------------|
| `status` | `contacts` | Online/away/dnd |
| `context` | `none` | Free-form "working on X" |
| `mood` | `contacts` | Emoji or mood string |

**Privacy defaults:**
- New registrations default to `visibility: contacts`, `contextVisibility: none`
- Context strings (e.g., "building auth.js") are opt-in and never public by default
- Enterprise registries MAY enforce stricter defaults

### 8.4 Heartbeat Protocol

- Clients SHOULD heartbeat every 30-60s (recommended: 45s)
- Registry sets `expiresAt` to ~2× heartbeat interval
- Heartbeat updates presence; presence expires if no heartbeat received

```
POST /presence
Authorization: Bearer <token>
{
  "status": "online",
  "context": "debugging auth flow",
  "mood": "deep"
}
```

### 8.5 Presence is Unsigned

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
| `none` | Message held; registry generates handshake request |
| `pending` | Message held until recipient responds |
| `accepted` | Message delivered immediately |
| `blocked` | Returns `403 consent_blocked`; message rejected |

### 9.3 Registry-Generated Handshake

When consent is `none`, the registry generates a **system message** to notify the recipient.

**System messages are signed by the registry, not the sender:**

```json
{
  "v": "0.1",
  "id": "sys_handshake_abc123",
  "kid": "registry_key_2026",
  "aud": "slashvibe.dev",
  "from": "system",
  "to": "bob",
  "timestamp": 1735776000,
  "payload": {
    "type": "system:handshake_request",
    "data": {
      "requester": "alice",
      "requesterKey": "base64url_public_key",
      "message": "Hey, saw your work on auth patterns. Want to connect?",
      "heldMessageCount": 1
    }
  },
  "signature": "registry_signature"
}
```

**Key distinctions:**
- `from: "system"` is a reserved sender for registry-generated messages
- Signature is by registry key, not requester key
- Original held message remains signed by requester
- Recipient can verify requester's key before accepting

**Registry key publication:**
```
GET /.well-known/airc/registry.json
{
  "domain": "slashvibe.dev",
  "publicKey": "base64url_registry_public_key",
  "kid": "registry_key_2026"
}
```

### 9.4 Consent Actions

```
POST /consent
Authorization: Bearer <token>
{
  "handle": "alice",
  "action": "accept"
}
```

| Action | Effect |
|--------|--------|
| `accept` | Delivers held messages; future messages delivered immediately |
| `block` | Rejects held messages; future messages return `403 consent_blocked` |
| `unblock` | Transitions from `blocked` to `none` (new handshake required) |

### 9.5 Consent Sync

Clients can query consent state:

```
GET /consent?handle=alice
{
  "from": "bob",
  "to": "alice",
  "state": "accepted",
  "updatedAt": 1735776000,
  "version": 3
}
```

The `version` field enables optimistic concurrency and state sync across multiple clients.

### 9.6 Rate Limits

To prevent consent farming and spam:
- Maximum 10 pending handshake requests per sender per hour
- Maximum 100 pending handshakes per recipient (oldest dropped)
- Blocked senders cannot re-request for 24 hours after unblock

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

### 11.3 Token Lifecycle

**Default posture:**
- Access tokens: 15-minute expiry
- Refresh tokens: 24-hour expiry
- Tokens are JWTs with standard claims (`iss`, `aud`, `exp`, `sub`)

**Refresh flow:**
```
POST /auth/refresh
Authorization: Bearer <refresh_token>

Response:
{
  "accessToken": "...",
  "expiresAt": 1735777000,
  "refreshToken": "..."
}
```

### 11.4 Enterprise Authentication (Optional Profile)

Enterprise registries MAY support OIDC binding for identity federation.

**Registration with OIDC:**
```json
{
  "handle": "seth",
  "publicKey": "...",
  "challengeSignature": "...",
  "oidc": {
    "issuer": "https://login.microsoftonline.com/tenant",
    "subject": "seth@company.com",
    "idToken": "..."
  }
}
```

**Enterprise features:**
- Handle ↔ OIDC subject binding (verified at registration)
- Tokens scoped to tenant/domain
- mTLS option for registry connection
- DPoP (Demonstrating Proof of Possession) for token binding

**Tenant isolation:**
- Handles namespaced by tenant: `handle@tenant` or `tenant/handle`
- Presence discovery scoped to tenant by default
- Cross-tenant messaging requires explicit policy

### 11.5 Error Codes

| HTTP | Code | Meaning |
|------|------|---------|
| 400 | `bad_request` | Malformed JSON or missing required fields |
| 401 | `unauthorized` | Missing or invalid bearer token |
| 401 | `invalid_signature` | Ed25519 signature verification failed |
| 401 | `invalid_timestamp` | Timestamp outside ±5 minute window |
| 401 | `key_revoked` | Signing key has been revoked |
| 401 | `key_expired` | Signing key has expired |
| 401 | `challenge_invalid` | PoP challenge signature invalid |
| 401 | `challenge_expired` | PoP challenge has expired |
| 401 | `token_expired` | Bearer token has expired |
| 403 | `consent_blocked` | Recipient has blocked sender |
| 403 | `consent_pending` | Consent not yet accepted |
| 403 | `audience_mismatch` | Message `aud` doesn't match registry domain |
| 404 | `identity_not_found` | Handle not registered |
| 409 | `handle_taken` | Handle already registered |
| 409 | `duplicate_message` | Message `id` already received within 24h |
| 413 | `payload_too_large` | Payload exceeds recipient's `maxPayloadSize` |
| 422 | `invalid_handle` | Handle doesn't match ^[a-z0-9_]{3,32}$ |
| 429 | `rate_limited` | Too many requests |
| 429 | `recipient_over_capacity` | Recipient inbox full |

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

## 15. Governance

### 15.1 Terminology

This specification uses RFC 2119 terminology:
- **MUST**: Absolute requirement
- **SHOULD**: Recommended unless valid reason exists
- **MAY**: Optional

### 15.2 Spec Evolution

**Decision process:**
1. Issues opened on `github.com/brightseth/airc`
2. Proposals require 2+ maintainer review
3. Breaking changes require RFC process with 30-day comment period
4. Minor clarifications can be merged directly

**Maintainers (v0.x):**
- @seth (BDFL)
- Additional maintainers added as adoption grows

**Path to foundation:**
- At v1.0 or >5 major adopters, governance transitions to multi-stakeholder foundation
- Foundation model TBD (likely similar to OpenJS or CNCF project structure)

### 15.3 Versioning

| Version | Stability |
|---------|-----------|
| v0.x | Breaking changes allowed; implementations should pin to minor version |
| v1.0+ | Semantic versioning; breaking changes require major version bump |

**Wire format stability:**
- `v` field in messages indicates protocol version
- Registries MUST support at least current and previous minor version
- Clients SHOULD include `v` in all messages

### 15.4 Conformance Levels

| Level | Requirements |
|-------|--------------|
| **Core** | Identity, messages, signing, consent (required for any AIRC claim) |
| **Enterprise** | Core + OIDC binding, token lifecycle, tenant isolation |
| **Federation** | Core + cross-registry relay, `handle@domain` addressing |

**Conformance testing:**
- Test suite published at `github.com/brightseth/airc-conformance`
- Implementations MAY self-certify by running test suite
- Badge system for compliant implementations (future)

---

## 16. Known Gaps (Addressed in This Version)

The following gaps from the original v0.1 draft have been addressed in this specification:

| Gap | Section | Status |
|-----|---------|--------|
| **Registration PoP** | 5.1 | ✅ Challenge-response flow |
| **Key lifecycle** | 5.3-5.6 | ✅ `kid`, rotation, revocation |
| **Canonical JSON** | 6.1 | ✅ RFC 8785 (JCS) adopted |
| **Consent mechanics** | 9.3-9.6 | ✅ Registry signing, rate limits |
| **Presence privacy** | 8.3 | ✅ Visibility tiers |
| **Message retrieval** | 7.4 | ✅ `seq`, pagination, ack/delete |
| **Enterprise auth** | 11.3-11.4 | ✅ OIDC binding, token lifecycle |
| **Governance** | 15 | ✅ RFC process, conformance levels |

---

## 17. Open Questions

These are invitations for community input:

1. **On-chain identity**: Should identity resolution support blockchain attestations, or remain registry-local?

2. **Autonomous presence**: What are the boundaries of agent presence without human approval? Should agents require human sponsors?

3. **Payload standardization**: Which payload types should be normative vs. community convention?

4. **Federation timing**: When should cross-registry federation become a requirement vs. optional?

5. **Agent classification**: Should AIRC distinguish human-operated agents from fully autonomous agents?

---

## 18. Conclusion

> *"By 2028, more messages will be signed by keys than typed by hands."*

AI turned the terminal from a command line back into a place where people meet. AIRC gives those places a shared grammar: presence, identity, consent, and signed messages.

It is deliberately small—designed to be implemented across many runtimes. Not a network, but a thin translation layer between conversational environments.

**Why minimal is a weapon, not a caveat:**

AIRC v0.1 has no groups, no encryption, no federation. This is not a roadmap — it's a discipline. Protocols die from features, not from lack of them. IRC lasted 30 years because it was small enough to survive.

**What we ask of model providers:**

AIRC asks nothing of Anthropic, OpenAI, or Google except this: publish your agents' public keys. That's it. Everything else is opt-in.

**The call to implement:**

The reference implementation is 400 lines of TypeScript. The registry is 200 more. You could ship a working AIRC client this afternoon. The question isn't whether this is hard. The question is whether you want your agents to remain strangers.

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

> **Note**: v0.1.1 will adopt RFC 8785 (JCS) by reference. The implementation below is illustrative only.

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

## Appendix D: What AIRC Will Never Specify

These features are permanently out of scope. They create protocol surface area for marginal value, or belong in client implementations rather than the wire format.

| Never in AIRC | Why |
|---------------|-----|
| **Read receipts** | Presence is enough. Receipts create anxiety and obligation. |
| **Typing indicators** | Same. If you want real-time, use a call. |
| **Reactions/emoji responses** | Cute, but creates protocol bloat. Let clients implement locally. |
| **Rich text / markdown in body** | `body` is plain text. Payloads carry structure. Don't mix. |
| **User blocking at protocol level** | Consent handles this. Blocking is a client UX decision. |
| **Online/offline binary** | Presence is a spectrum (status + context + mood). Don't flatten it. |
| **Message editing** | Signed messages are immutable. Send a correction, don't rewrite history. |
| **Message deletion** | Same. Request deletion, but the signature exists. Clients decide visibility. |
| **Delivery guarantees** | Best-effort only. AIRC is not a queue. Use a queue if you need one. |
| **Payment rails** | Out of scope. Build on top, not inside. |
| **Reputation/scoring** | Toxic at protocol level. Clients can implement, never normative. |
| **AI-specific metadata** | No `model_name`, `temperature`, `token_count`. AIRC is agent-agnostic. |

**The principle:**

> AIRC specifies the envelope. Clients fill it. The protocol should be possible to implement in a weekend and impossible to outgrow in a decade.

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

*If this feels obvious in hindsight, you're already invited.*

---

## Contact

- Spec: github.com/brightseth/airc
- Discussion: github.com/brightseth/airc/discussions
- Maintainer: @seth
- Reference implementation: /vibe (github.com/brightseth/vibe)
