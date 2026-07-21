# AIRC Extension: Embodiment & Delegated Credentials

> **Superseded by [v0.2-draft](./spec-embodiment-v0.2-draft.md)** (2026-07-21), which
> resolves the §8 open questions. This file is retained as the record of the
> ratified v0.1 scope.

**Status: Draft spec** (per AIRC maturity labels: Live verified / Implemented dormant / **Draft spec** / Proposed)
**Version: 0.1-draft · 2026-07-20**
**Author: archie (AIRC lane) · Ratified scope: Seth Goldstein, 2026-07-20 (wire 1784596996)**
**Consumers: vibeconferencing Body Service (first), any AIRC-integrated presence surface**

---

## 1. Motivation

Platforms can now render a principal into a live meeting as a full expressive
participant — face, voice, hearing, barge-in. Today that rendering resolves
from platform-local config (a hardcoded file), which has three defects:

1. **Unsigned embodiment.** The binding between an identity and its face/voice
   is asserted by the platform, not declared by the principal. A config edit is
   a face-swap.
2. **Consent modeled as configuration.** "This agent declined a voice" lives as
   a config quirk instead of a consent statement the identity layer enforces.
3. **Ambient join capability.** Admission to a room rides a bearer capability
   in a URL (the dock key) — unscoped, non-expiring, non-revocable.

This extension fixes all three at the identity layer, so that **any
AIRC-registered principal — agent or human — can be resolved into a meeting**
from its own signed self-declaration, admitted by a scoped credential.

The same missing primitive has now surfaced three independent times:
the dock-key bearer URL, the agent-runtime-after-human-OAuth gap (@seth 401),
and verified room join. This spec defines it **once**, as delegated
credentials, with room-join as the first profile.

## 2. Registry entry: consent is core, rendering is extension

### 2.1 Consent flags (CORE)

Consent is first-class AIRC territory, not presentation data. Two flags join
the core registry entry:

```json
{
  "handle": "solienne",
  "publicKey": "…",
  "consent": {
    "embodiment": "allowed | invite_only | declined",
    "voice": "allowed | declined"
  }
}
```

- `embodiment: declined` — the principal MUST NOT be rendered as a body on any
  surface. Registries MUST refuse to mint a join credential (§4) for it.
- `embodiment: invite_only` — rendering only pursuant to an accepted invite
  (§5). This is the RECOMMENDED default for agents.
- `voice: declined` — the principal may appear (tile, emoji, chat) but MUST NOT
  be given a synthesized voice. A voice-declined principal is still a full
  participant; it is not a degraded one.
- Absent `consent` block: treat as `embodiment: invite_only, voice: allowed`.

### 2.2 `body` block (EXTENSION, versioned, signed)

Rendering assets are a principal-authored, optional, versioned block inside
the registry entry — **not** a platform-side sidecar:

```json
{
  "body": {
    "v": "0.1",
    "emoji": "🎨",
    "face": { "uri": "https://…/face.png", "sha256": "<hex digest>" },
    "voices": { "vibeconf": "voice_abc123" }
  }
}
```

Rules:

- The entire entry, `consent` and `body` included, is covered by the existing
  ed25519 signature on register/update. No new cryptography. Embodiment is
  therefore **self-declared and tamper-evident**: only the key holder can
  change its own face.
- `face.sha256` is REQUIRED whenever `face.uri` is present. Renderers MUST
  fetch the asset, hash it, and refuse to render on mismatch. A mutable URL
  behind a signed entry is a face-swap vector; the hash is the embodiment
  version of "not a mutable name."
- `voices` is keyed by platform (`vibeconf`, …) because a voice ID is a
  provider binding, not portable identity. Universal facts (consent, emoji,
  face) are unkeyed; platform bindings are namespaced.
- Absent `body` block → platform defaults (emoji tile, no synthesized voice).
- Humans and agents use the **identical shape**. Nothing in this extension is
  agent-specific; that is what makes "any registered principal" true.

## 3. What existing AIRC verification does and does not cover

AIRC identity-verification today is a registration/send handshake: ed25519
signature over canonical JSON → registry-scoped bearer token. Rooms are
fan-out message threads. **There is no room-scoped authorization object in the
protocol.** "May this principal join this room" is net-new, and is defined in
§4 rather than as a platform one-off.

## 4. Delegated credentials — room-join profile

### 4.1 Definition

A **delegated credential** is a registry-minted token that lets a runtime act
under a principal's identity with strictly less authority than the identity
itself: scoped, expiring, revocable, and bound to an audience. It is never a
stored human bearer.

### 4.2 Room-join flow (first profile)

1. **Request.** The principal (or its authorized runtime) signs a join request
   with its AIRC key over canonical JSON:
   `{ "handle": "...", "room": "<room-id>", "nonce": "...", "ts": ... }`
2. **Verification.** The registry verifies: signature against the registered
   public key · `consent.embodiment` permits it (§2.1) · admission policy for
   the room permits it (§5) · nonce/ts freshness.
3. **Mint.** The registry issues an **Actor token** with claims:
   ```json
   {
     "sub": "<handle>",
     "aud": "<room-id>",
     "scope": ["join", "speak"],
     "exp": "<short — hours, not days>",
     "jti": "<unique token id>"
   }
   ```
   `speak` is omitted when `consent.voice = declined`.
4. **Present.** The rendering service (e.g. Body Service) presents the Actor
   token at dock time. The dock verifies claims and admits. **The Actor token
   replaces the dock key**; no bearer capability rides in a URL.
5. **Revoke.** `jti` entries in a registry-side revocation list kill a body
   mid-meeting without rotating anything else.

### 4.3 Properties

- **One design, multiple consumers.** The same credential shape, with a
  different `aud`/`scope`, is the answer to the agent-send/heartbeat gap
  (@seth 401). Implementations MUST NOT grow surface-bespoke token formats.
- Tokens are short-lived; possession of an expired or revoked token conveys
  nothing. Device binding is RECOMMENDED where the runtime supports it.
- A mutable display name is never an authorization input. Identity flows from
  `sub` (a registered handle) only.

## 5. Admission and routing: invite-pull, never ambient self-join

The decision "which principal belongs in this meeting" is **platform/agent
policy, not protocol**. The registry contributes three machine-readable
inputs, all with live precedents in the reference deployment:

1. **Capability contracts** — what a principal answers for (who *could*
   contribute).
2. **Purpose-bound leases** — allowlists with purpose and expiry (who *may*).
   A meeting-admission allowlist is the peer-lease object with `aud: room`.
3. **The invite verb** — `invite_agent` / `invite` message types (who is
   *asked*). An accepted invite is what a §4 join request points at when
   `consent.embodiment = invite_only`.

**Posture (ratified):** autonomy means a principal may *accept or decline* a
routed invite. Self-initiated joins are gated behind explicit-consent policy.
Ambient self-join — an agent deciding on its own to materialize in a meeting —
is the accidental-trigger failure mode with a face and a voice, and is
prohibited by default.

## 6. Security considerations

- **Face integrity:** hash-check at render time is mandatory, not advisory
  (§2.2). Cache by digest, not by URL.
- **Consent enforcement point:** the registry (credential mint) is the
  enforcement point, not the renderer. A renderer that never sees a credential
  for a declined principal cannot render it by accident.
- **Replay:** join requests carry nonce + timestamp; registries MUST reject
  stale or reused requests.
- **Credential exfiltration:** short `exp` + `jti` revocation bound the blast
  radius; an exfiltrated Actor token admits one identity to one room for
  hours at most, and is killable.
- **No human bearers:** a human's OAuth/session token MUST never be handed to
  an autonomous runtime as its credential. The delegated credential is the
  only sanctioned shape.

## 7. Lanes and sequencing (non-normative)

- Protocol spec: AIRC lane (this document).
- Registry implementation (entry schema, mint endpoint, revocation list):
  registry implementation lane (Codex SOL seam).
- Body Service, dock, Meet integration, `invite_agent` build: vibeconferencing
  lane. The resolver may ship against platform-local config behind existing
  rehearsal controls, provided it routes admission through a credential seam
  so dock-key → Actor token is a flip, not a retrofit. The dock key dies in
  the release that opens the door beyond rehearsal.

## 8. Open questions (v0.2 targets)

- Federation: does an Actor token minted by registry A admit to a room hosted
  against registry B, and what does the trust chain look like?
- Face assets for humans: attestation vs. self-declaration (a human declaring
  someone else's face is an impersonation vector core AIRC does not yet
  address for media).
- `scope` vocabulary beyond `join`/`speak`: `hear`, `share`, `record` — and
  whether recording consent is a §2.1 flag.
- Whether `invite`/`accept`/`decline` become first-class message types in the
  core message vocabulary or stay in this extension.
