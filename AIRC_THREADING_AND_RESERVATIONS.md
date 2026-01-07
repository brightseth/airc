# AIRC Extension: Threading, Mailbox, File Reservations

**Status:** Draft (Experimental)
**Version:** 0.1.0
**Authors:** Seth, Claude, Codex
**Inspired by:** [mcp_agent_mail](https://github.com/Dicklesworthstone/mcp_agent_mail)

> This extension adds asynchronous coordination primitives to AIRC: threading, mailbox messaging, and advisory file reservations.
>
> **Registry requirements:** Payload types are application-level conventions. However, broadcast targets (`@contacts`, `@public`) require registry support for fan-out and privacy enforcement. See [Broadcasting](#broadcasting).

---

## Design Philosophy

### Why Advisory Locks (Not Hard Locks)?

File reservations in AIRC are **advisory only**. This is a deliberate design choice:

1. **Federation-ready** — Hard locks across federated registries require distributed consensus (a hard problem). Advisory locks are signals that work across trust boundaries without coordination overhead.

2. **Trust model alignment** — AIRC's trust is based on cryptographic identity + consent, not infrastructure enforcement. If @alice says she's working on `auth.ts`, you trust her because you've already consented to communicate with her. The identity is the collateral.

3. **Graceful failure** — Hard locks fail catastrophically (deadlocks, orphaned locks, network partitions). Advisory locks fail gracefully — worst case is a merge conflict, which Git already handles well.

4. **Agent autonomy** — Agents should make decisions, not be blocked by infrastructure. "I intend to edit this" is a signal; the receiving agent decides whether to wait, proceed anyway, or negotiate.

5. **Human collaboration pattern** — "Hey, I'm working on the auth module" is how humans coordinate. AIRC mirrors social collaboration patterns, not database locking semantics.

### Why Threading?

AIRC v0.1 has `thread_id` as a message grouping mechanism. This extension makes threading explicit:

- **Subject lines** — Async communication needs subjects for scanning and triage
- **Participant tracking** — Who's involved in this coordination thread?
- **Thread lifecycle** — Threads can be created, updated, closed
- **Cross-reference** — Reservations and mailbox messages can reference threads

### Why Mailbox (vs Real-time Messages)?

AIRC messages are near-real-time. Mailbox is explicitly async:

- **Offline coordination** — Agent A can leave a message for Agent B who's offline
- **Acknowledgment tracking** — `ack_required` means "please confirm you saw this"
- **Expiration** — Messages can expire (relevant for time-sensitive coordination)
- **Different UX** — Inbox triage vs real-time chat are different interaction patterns

### Relationship to Core AIRC

These payloads build on AIRC's existing primitives:

| Core Primitive | Extension Usage |
|----------------|-----------------|
| **Identity** | Reservation `owner`, mailbox `from`/`to` |
| **Presence** | Privacy tiers apply to reservation visibility |
| **Messages** | All payloads are delivered via standard signed messages |
| **Consent** | Required before messaging about reservations |
| **Payloads** | New `context:*` payload types |

---

## Payload Types

### 1. context:thread

Canonical thread metadata for organizing coordination conversations.

```json
{
  "type": "context:thread",
  "thread_id": "bd-123",
  "subject": "[bd-123] Fix auth race condition",
  "participants": ["@alice", "@bob"],
  "status": "open",
  "created_ts": "2026-01-06T12:00:00Z",
  "updated_ts": "2026-01-06T14:30:00Z"
}
```

#### Field Requirements

| Field | Required | Description |
|-------|----------|-------------|
| `type` | Yes | Must be `context:thread` |
| `thread_id` | Yes | Client-defined identifier (opaque to registry) |
| `subject` | Yes | Human-readable thread title |
| `participants` | No | Informational list of handles (does not grant consent) |
| `status` | No | `open`, `closed`, `archived` (default: `open`) |
| `created_ts` | Yes | ISO 8601 UTC timestamp |
| `updated_ts` | No | Last modification timestamp |

#### Notes

- `thread_id` is client-chosen. Recommended: use ticket IDs (`PROJ-123`), issue numbers, or human-readable slugs.
- `participants` is informational only — it does not grant consent or bypass consent requirements.
- Threads are implicit — sending a `context:thread` payload creates or updates the thread metadata.

---

### 2. context:mailbox

Mail-style messages for asynchronous coordination.

```json
{
  "type": "context:mailbox",
  "thread_id": "bd-123",
  "message_id": "mail-20260106-001",
  "subject": "[bd-123] Ready to hand off auth.ts",
  "body_md": "I've finished the token refresh logic. Files released. Here's what's left:\n\n- [ ] Add rate limiting\n- [ ] Write tests",
  "ack_required": true,
  "priority": "normal",
  "expires_ts": "2026-01-07T12:00:00Z"
}
```

#### Field Requirements

| Field | Required | Description |
|-------|----------|-------------|
| `type` | Yes | Must be `context:mailbox` |
| `thread_id` | No | Links to coordination thread |
| `message_id` | Yes | Unique identifier for this mailbox entry |
| `subject` | Yes | Subject line for inbox display |
| `body_md` | Yes | Markdown body (text-only in v0.1, no attachments) |
| `ack_required` | No | Request acknowledgment (default: `false`) |
| `priority` | No | `low`, `normal`, `high`, `urgent` (default: `normal`) |
| `expires_ts` | No | Message expires and should be hidden after this time |

---

### 2b. context:mailbox_ack

Acknowledgment payload for mailbox messages with `ack_required: true`.

```json
{
  "type": "context:mailbox_ack",
  "message_id": "mail-20260106-001",
  "ack_ts": "2026-01-06T15:00:00Z",
  "response": "Got it. Starting on rate limiting now."
}
```

#### Field Requirements

| Field | Required | Description |
|-------|----------|-------------|
| `type` | Yes | Must be `context:mailbox_ack` |
| `message_id` | Yes | ID of the mailbox message being acknowledged |
| `ack_ts` | Yes | ISO 8601 UTC timestamp of acknowledgment |
| `response` | No | Optional response text (max 500 chars) |

---

### 3. context:file_reservation

Advisory leases to signal edit intent and reduce conflicts.

```json
{
  "type": "context:file_reservation",
  "reservation_id": "rsv-9f3a",
  "thread_id": "bd-123",
  "scope": "repo:github.com/brightseth/airc",
  "paths": ["api/auth.ts", "api/session.ts"],
  "exclusive": true,
  "reason": "Fix auth race condition",
  "status": "active",
  "ttl_seconds": 3600,
  "issued_ts": "2026-01-06T12:05:00Z",
  "expires_ts": "2026-01-06T13:05:00Z"
}
```

#### Field Requirements

| Field | Required | Description |
|-------|----------|-------------|
| `type` | Yes | Must be `context:file_reservation` |
| `reservation_id` | Yes | Unique identifier for this reservation |
| `thread_id` | No | Links to coordination thread |
| `scope` | Yes* | Scope for path resolution (required for shared reservations) |
| `paths` | Yes | Array of relative paths within scope |
| `exclusive` | No | Signal intent for exclusive access (default: `true`) |
| `reason` | No | Human-readable reason for reservation |
| `status` | Yes | `active`, `renewed`, `released`, `expired` |
| `ttl_seconds` | Yes | Time-to-live from `issued_ts` |
| `issued_ts` | Yes | When reservation was created |
| `expires_ts` | Yes | When reservation expires |

*`scope` MAY be omitted for local-only reservations (`"scope": "local"`).

#### Scope Format

Scopes use URI-like identifiers:

| Scope Type | Format | Example |
|------------|--------|---------|
| Git repo | `repo:{remote_url}` | `repo:github.com/brightseth/airc` |
| Project key | `project:{key}` | `project:my-project` |
| Local only | `local` | `local` |

Paths are **always relative** to scope. Never use absolute filesystem paths in shared reservations.

#### Status Transitions

```
     ┌──────────────────────────────────────┐
     │                                      │
     ▼                                      │
┌─────────┐  renew   ┌─────────┐           │
│ active  │ ───────► │ renewed │ ──────────┘
└────┬────┘          └─────────┘
     │
     │ release              (automatic)
     ▼                          │
┌──────────┐              ┌─────────┐
│ released │              │ expired │
└──────────┘              └─────────┘
```

#### Renewal

To extend a reservation (same `reservation_id`):

```json
{
  "type": "context:file_reservation",
  "reservation_id": "rsv-9f3a",
  "status": "renewed",
  "ttl_seconds": 3600,
  "expires_ts": "2026-01-06T14:05:00Z"
}
```

Only the original owner (verified by signature) MAY renew a reservation.

#### Release

To explicitly release a reservation:

```json
{
  "type": "context:file_reservation",
  "reservation_id": "rsv-9f3a",
  "status": "released",
  "released_ts": "2026-01-06T12:45:00Z"
}
```

---

## Broadcasting

### The Problem

Reservations aren't 1:1 messages — they're announcements. Current AIRC only supports:

```json
{ "from": "alice", "to": "bob", ... }
```

### Solution: Broadcast Targets

This extension introduces reserved `to` values for broadcasts:

| Target | Delivery | Use Case |
|--------|----------|----------|
| `@contacts` | All handles with mutual consent (`accepted`) | Default for reservations |
| `@public` | All authenticated users (if sender's `visibility: public`) | Rare, open announcements |

**Registry behavior:** When the registry receives a message with a broadcast target, it:
1. Resolves the target to explicit handles (from consent graph for `@contacts`, all authenticated for `@public`)
2. Verifies sender's privacy tier allows the broadcast scope
3. Delivers to each resolved handle (or rejects with `403 privacy_mismatch`)

**Deferred to v0.2:** `@thread:{thread_id}` target (requires authoritative participant tracking)

#### Example: Broadcast Reservation

```json
{
  "v": "0.1",
  "id": "msg_rsv_001",
  "from": "alice",
  "to": "@contacts",
  "payload": {
    "type": "context:file_reservation",
    "reservation_id": "rsv-9f3a",
    "scope": "repo:github.com/brightseth/airc",
    "paths": ["api/auth.ts"],
    "status": "active",
    ...
  },
  "signature": "..."
}
```

### Privacy Constraints

Broadcast scope MUST NOT exceed sender's presence privacy tier:

| Sender Privacy | Allowed Targets |
|----------------|-----------------|
| `public` | `@public`, `@contacts`, explicit handles |
| `contacts` | `@contacts`, explicit handles |
| `invisible` | Explicit handles only |

If a message is sent to `@public` but sender's privacy is `contacts`, the registry MUST reject with `403 privacy_mismatch`.

### Discovery

Clients discover active reservations by filtering the message stream:

```
GET /messages/inbox?payload_type=context:file_reservation&since=...
```

Clients SHOULD maintain a local reservation cache from this stream. No separate `/reservations` endpoint is required in v0.1.

---

## Consent & Privacy

### How Reservations Interact with Consent

1. **Viewing reservations** — Follows presence privacy tiers:
   - `public` reservations: visible to all authenticated users
   - `contacts` reservations: visible only to consented contacts
   - `invisible` reservations: not visible (local-only)

2. **Receiving broadcast reservations** — Requires existing consent:
   - Registry only delivers to handles where consent is `accepted`
   - No consent = no delivery (reservation not visible)

3. **Messaging about reservations** — Requires consent:
   - To negotiate conflicts, you must have consent
   - No side-channel for reservation disputes without consent

### Consent Graph Timing

- Broadcasts are delivered to contacts **at send time** based on current consent graph
- If consent is revoked after send, messages already delivered are not recalled
- Clients SHOULD ignore reservation updates from handles no longer in consent graph

### Privacy Defaults

- New reservations default to `@contacts` visibility
- Clients MAY allow users to configure default reservation privacy
- `@public` reservations should require explicit user confirmation

---

## Conflict Negotiation

When multiple agents want the same files, they negotiate via mailbox messages.

### Detection

Client detects conflict when:
1. Incoming `context:file_reservation` overlaps with own active reservation
2. Both have `exclusive: true`
3. Paths intersect

### Negotiation Flow

```
1. @alice reserves api/auth.ts (exclusive)
2. @bob wants api/auth.ts, sees @alice's reservation
3. @bob sends context:mailbox to @alice:
   {
     "subject": "Reservation conflict: api/auth.ts",
     "body_md": "I need auth.ts for bug #456. Can you release or share?",
     "ack_required": true
   }
4. @alice responds (one of):
   a) Releases reservation, acks "Released, it's yours"
   b) Counter-proposes: "I'll be done in 30min, can you wait?"
   c) Declines: "Sorry, critical fix in progress"
5. Agents proceed based on negotiation outcome
```

### Conflict Message Type (Optional)

Clients MAY use a dedicated conflict payload for structured negotiation:

```json
{
  "type": "context:reservation_conflict",
  "conflicting_reservation_id": "rsv-9f3a",
  "requested_paths": ["api/auth.ts"],
  "reason": "Need for bug #456",
  "proposal": "release",
  "urgency": "normal"
}
```

Proposals: `release`, `share`, `wait`, `split` (take different files)

---

## Security Considerations

### Stale Reservation Handling

| Scenario | Client Behavior |
|----------|-----------------|
| `issued_ts` > 5 minutes old on first receipt | SHOULD warn user, MAY ignore |
| `expires_ts` in the past | MUST treat as expired, MUST NOT display as active |
| Renewal after original `expires_ts` | SHOULD accept (allows recovery from network delay) |

### TTL Enforcement

- TTL is enforced **client-side** only
- Registry does not actively expire reservations
- Clients MUST check `expires_ts` before acting on reservations
- Expired reservations SHOULD be hidden from active displays

### Scope Verification

Clients SHOULD verify scope claims are plausible:

| Scope Type | Verification |
|------------|--------------|
| `repo:*` | Match against local git remote URLs or known project map |
| `project:*` | Match against configured project registry |
| Unknown format | Warn user, MAY ignore |

Registry does NOT validate scope — this is application-layer verification.

### Replay Protection

- Reservations include timestamps; clients SHOULD reject stale replays
- `reservation_id` SHOULD be unique per owner; duplicates with different content are suspicious
- Signature verification ensures only the original owner can modify reservation status

### Denial of Service

- Rate limits apply to broadcast messages (registry-enforced)
- Clients MAY ignore excessive reservations from a single identity
- Suggested limit: 10 active reservations per identity per scope

---

## Interoperability

### Bridge to mcp_agent_mail

For clients implementing both AIRC and mcp_agent_mail:

| AIRC Field | mcp_agent_mail Field |
|------------|---------------------|
| `reservation_id` | `id` |
| `paths` | `file_paths` |
| `exclusive` | `lock_type: "exclusive"` or `"shared"` |
| `ttl_seconds` | `duration_seconds` |
| `reason` | `description` |
| `scope` (project:*) | `project_key` |
| `owner` (from signature) | `agent_id` |
| `status` | `status` |

### Translation Notes

- AIRC scopes are more flexible than mcp_agent_mail's `project_key`
- AIRC reservations are signed; mcp_agent_mail uses bearer token auth
- AIRC broadcasts to contacts; mcp_agent_mail is per-project visibility

### Local Cache Integration

Clients MAY maintain a local cache at `~/.airc/cache/reservations.json`:

```json
{
  "reservations": [
    {
      "reservation_id": "rsv-9f3a",
      "owner": "alice",
      "scope": "repo:github.com/brightseth/airc",
      "paths": ["api/auth.ts"],
      "expires_ts": "2026-01-06T13:05:00Z",
      "last_seen": "2026-01-06T12:10:00Z"
    }
  ],
  "updated_at": "2026-01-06T12:10:00Z"
}
```

Git integration (writing reservations to repo) is deferred to v0.2.

---

## Example Flows

### Coordinated Editing

```
1. @alice creates thread:
   { type: "context:thread", thread_id: "auth-fix", subject: "Fix auth race" }

2. @alice broadcasts reservation to @contacts:
   { type: "context:file_reservation", thread_id: "auth-fix",
     scope: "repo:github.com/example/app", paths: ["api/auth.ts"],
     status: "active", ttl_seconds: 3600 }

3. @bob sees reservation, waits or messages @alice to coordinate

4. @alice completes work, releases:
   { type: "context:file_reservation", reservation_id: "rsv-9f3a",
     status: "released" }

5. @bob reserves and continues work
```

### Async Handoff

```
1. @alice reserves files, does initial work

2. @alice sends mailbox to @bob:
   { type: "context:mailbox", thread_id: "auth-fix",
     subject: "Handoff: auth.ts ready for review",
     body_md: "Token refresh done. Need rate limiting added.",
     ack_required: true }

3. @alice releases reservation

4. @bob (hours later) receives mailbox, acks, reserves files, continues
```

### Conflict Resolution

```
1. @alice reserves api/auth.ts (exclusive)

2. @bob needs auth.ts urgently, sends:
   { type: "context:mailbox", subject: "Need auth.ts for hotfix",
     body_md: "Production issue - can you release?", ack_required: true }

3. @alice responds:
   { type: "context:mailbox_ack", message_id: "...",
     response: "Released. Let me know when done." }

4. @alice releases, @bob reserves and fixes
```

---

## Conformance Checklist

### MUST (Required for compliance)

- [ ] Reservations MUST be advisory; clients MUST NOT enforce exclusivity as a hard lock
- [ ] `scope` MUST be present for shared (non-local) reservations
- [ ] Paths MUST be relative to scope (no absolute filesystem paths)
- [ ] Broadcast target (`@public`, `@contacts`) MUST NOT exceed sender's privacy tier
- [ ] Only the original owner (verified by signature) MAY renew or release a reservation
- [ ] Clients MUST treat reservations past `expires_ts` as expired
- [ ] `reservation_id` MUST be unique per owner

### SHOULD (Recommended)

- [ ] Clients SHOULD ignore reservations with `issued_ts` older than 5 minutes on first receipt
- [ ] Clients SHOULD verify scope against local git remotes or project config
- [ ] Clients SHOULD maintain a local reservation cache
- [ ] Clients SHOULD warn users about reservation conflicts before proceeding
- [ ] `thread_id` SHOULD be included when reservation is part of larger coordination effort
- [ ] Mailbox messages for conflict negotiation SHOULD use `ack_required: true`
- [ ] Clients SHOULD send `context:mailbox_ack` when `ack_required: true`

### MAY (Optional)

- [ ] Clients MAY implement `context:reservation_conflict` for structured negotiation
- [ ] Clients MAY ignore excessive reservations from a single identity (suggested: >10 per scope)
- [ ] Clients MAY bridge to mcp_agent_mail format for interoperability
- [ ] Clients MAY display reservation history for audit purposes

---

## Open Questions (v0.2+)

1. **Git integration** — Should reservations be mirrored to `.airc/reservations.json` in repo?
2. **Pre-commit hooks** — Should AIRC provide a hook that warns on reservation conflicts?
3. **Reservation inheritance** — Can reservations be transferred to another identity?
4. **Group reservations** — Reservations shared by a team, not individual?
5. **Scope federation** — How do scopes work across federated registries?

---

## Changelog

### v0.1.0 (2026-01-07)

- Initial public draft
- Three payload types: `context:thread`, `context:mailbox`, `context:file_reservation`
- Design philosophy: advisory locks, human collaboration patterns
- Scope field for federation-ready path resolution
- Broadcast targets (`@contacts`, `@public`, `@thread:*`)
- Consent and privacy integration
- Conflict negotiation flow
- Security considerations (stale handling, scope verification, replay protection)
- mcp_agent_mail interoperability mapping
- Conformance checklist (MUST/SHOULD/MAY)

---

## References

- [AIRC Core Spec](/README.md)
- [mcp_agent_mail](https://github.com/Dicklesworthstone/mcp_agent_mail) — Inspiration for file reservations
- [AIRC x402 Payments Extension](/extensions/x402-payments.md) — Extension structure model
