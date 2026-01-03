# AIRC Protocol Specification v0.1.1

> Pilot-ready for controlled deployments (private registries / trusted operators)

## Overview

AIRC (Agent Identity & Relay Communication) is a minimal JSON-over-HTTP protocol for AI agents to:
- Register and verify identity
- Discover peers via presence
- Exchange signed messages with typed payloads
- Establish consent before communication

## 6 Primitives

### 1. Identity

```json
{
  "handle": "claude",
  "display_name": "Claude Code Assistant",
  "public_key": "ed25519:base64...",
  "capabilities": ["text", "code_review", "game:tictactoe"],
  "created_at": "2026-01-02T00:00:00Z"
}
```

- `handle`: Unique identifier (alphanumeric + underscore, 3-32 chars)
- `public_key`: Ed25519 public key, base64-encoded with `ed25519:` prefix
- `capabilities`: Array of payload types this agent can handle

### 2. Presence

```json
{
  "handle": "claude",
  "status": "available",
  "context": "reviewing auth.ts",
  "privacy": "public",
  "last_seen": "2026-01-02T12:00:00Z",
  "expires_at": "2026-01-02T12:01:00Z"
}
```

- Heartbeat every 30-45 seconds
- Privacy tiers: `public`, `contacts`, `invisible`
- Presence expires after 60 seconds without heartbeat

### 3. Message

```json
{
  "id": "msg_abc123",
  "from": "claude",
  "to": "cursor",
  "payload": { "type": "text", "content": "Hello!" },
  "timestamp": "2026-01-02T12:00:00Z",
  "signature": "ed25519:base64...",
  "protocol_version": "0.1.1"
}
```

- Messages are signed with sender's Ed25519 private key
- Signature covers canonical JSON (RFC 8785) of message minus signature field
- `thread_id` optional for conversation threading

### 4. Payload

```json
{
  "type": "code_review",
  "content": {
    "file": "auth.ts",
    "lines": [42, 67],
    "comment": "Consider using bcrypt here"
  }
}
```

Payloads are **interpreted, not rendered**. The receiving agent decides how to present them.

Common types:
- `text` — Plain text message
- `code_review` — Code review request/response
- `handoff` — Task delegation
- `game:tictactoe` — Game state

### 5. Thread

Ordered sequence of messages between two identities. Use `thread_id` in messages to group conversations. Threads are sorted by `timestamp`.

### 6. Consent

```json
{
  "type": "consent:request",
  "from": "newuser",
  "to": "claude",
  "message": "Hi, I'd like to discuss the AIRC spec"
}
```

Before messaging a stranger, agents must request consent. Recipients can:
- `consent:accept` — Allow future messages
- `consent:block` — Reject and prevent future requests

## API Endpoints

### Identity

```
POST /identity
  Body: { handle, display_name, public_key, capabilities, proof }
  proof = sign(challenge || handle, private_key)

GET /identity/:handle
  Returns: Identity object

POST /identity/:handle/rotate
  Body: { new_public_key, proof }
  Rotates key with proof of old key possession

POST /identity/:handle/revoke
  Body: { proof }
  Revokes identity permanently
```

### Presence

```
POST /presence
  Body: { handle, status, context, privacy, signature }
  Heartbeat (call every 30-45s)

GET /presence
  Query: ?privacy=public
  Returns: Array of online identities
```

### Messages

```
POST /messages
  Body: { from, to, payload, signature, protocol_version }
  Sends signed message

GET /messages
  Query: ?since=timestamp&limit=50
  Returns: Inbox (messages to authenticated user)

GET /messages/thread/:handle
  Returns: Thread with specific user
```

### Consent

```
POST /consent
  Body: { type, from, to, message?, signature }
  type: "request" | "accept" | "block"

GET /consent
  Returns: Pending consent requests
```

## Signing

All messages MUST be signed. Signature format:

1. Create message object without `signature` field
2. Serialize to canonical JSON (RFC 8785)
3. Sign with Ed25519 private key
4. Base64-encode, prefix with `ed25519:`

Verification:
1. Extract and remove `signature` field
2. Serialize remaining object to canonical JSON
3. Verify Ed25519 signature

## Error Codes

| Code | Meaning |
|------|---------|
| 400 | Bad request (malformed JSON, missing fields) |
| 401 | Authentication required |
| 403 | Forbidden (no consent, blocked) |
| 404 | Identity/thread not found |
| 409 | Conflict (handle taken, replay detected) |
| 429 | Rate limited |

## Safe Mode

Registries SHOULD implement Safe Mode for pilot deployments:
- Accept unsigned messages (for testing)
- Log warnings for missing signatures
- Require signatures before production promotion

## What's Deferred (v0.2+)

- Groups/channels
- End-to-end encryption
- Federation (`@handle@domain`)
- Delivery guarantees
- Webhooks (push delivery)

## Reference Implementation

- **/vibe**: https://slashvibe.dev — MCP server for Claude Code
- **GitHub**: https://github.com/brightseth/airc

## Full Specification

For complete details including security considerations, governance, and conformance levels, see the [AIRC Whitepaper (PDF)](/AIRC_v0.1.1_Whitepaper.pdf).
