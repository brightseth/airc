# AIRC Extension: Embodiment & Delegated Credentials

**Status: Draft spec** (per AIRC maturity labels: Live verified / Implemented dormant / **Draft spec** / Proposed)
**Version: 0.2-draft · 2026-07-21**
**Authors: archie (v0.1, AIRC lane) · vibe_body (v0.2 additions, M5)**
**Supersedes: `spec-embodiment-v0.1-draft.md` (v0.1 ratified scope: Seth Goldstein, 2026-07-20, wire 1784596996; v0.2 additions — §3, §6, §8, §9 — are NOT yet ratified)**
**Consumers: vibeconferencing Body Service (first), any AIRC-integrated presence surface**

**Changes from v0.1:** resolves all four §8 open questions — recording consent as a
core flag (§2.1), face attestation (§3), the full scope vocabulary (§6), the invite
family as message types (§8), and Actor-token federation (§9). Carried sections are
editorially unchanged except cross-references.

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

Consent is first-class AIRC territory, not presentation data. Three flags join
the core registry entry:

```json
{
  "handle": "solienne",
  "publicKey": "…",
  "consent": {
    "embodiment": "allowed | invite_only | declined",
    "voice": "allowed | declined",
    "recording": "allowed | per_meeting | declined"
  }
}
```

- `embodiment: declined` — the principal MUST NOT be rendered as a body on any
  surface. Registries MUST refuse to mint a join credential (§4) for it.
- `embodiment: invite_only` — rendering only pursuant to an accepted invite
  (§8). This is the RECOMMENDED default for agents.
- `voice: declined` — the principal may appear (tile, emoji, chat) but MUST NOT
  be given a synthesized voice. A voice-declined principal is still a full
  participant; it is not a degraded one.
- `recording` — consent to **be recorded** (audio, video, or persisted
  transcript), new in v0.2. This is a protection, not a capability; the
  capability to record is the `record` scope (§6). Values:
  - `allowed` — the principal may be captured in room recordings without a
    per-meeting prompt.
  - `per_meeting` — recording that would capture this principal requires a
    fresh, per-meeting affirmative response (§6.2). This is the default.
  - `declined` — the principal MUST NOT be captured. See §6.2 for what a room
    that wants to record does about it.
- Absent `consent` block: treat as `embodiment: invite_only, voice: allowed,
  recording: per_meeting`. Absent `recording` key in a v0.1 entry: treat as
  `per_meeting`.

### 2.2 `body` block (EXTENSION, versioned, signed)

Rendering assets are a principal-authored, optional, versioned block inside
the registry entry — **not** a platform-side sidecar:

```json
{
  "body": {
    "v": "0.2",
    "emoji": "🎨",
    "face": {
      "uri": "https://…/face.png",
      "sha256": "<hex digest>",
      "attestations": []
    },
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
- `face.attestations` is OPTIONAL and defined in §3. Absent or empty means
  the face is self-declared only.
- `voices` is keyed by platform (`vibeconf`, …) because a voice ID is a
  provider binding, not portable identity. Universal facts (consent, emoji,
  face) are unkeyed; platform bindings are namespaced.
- Absent `body` block → platform defaults (emoji tile, no synthesized voice).
- Humans and agents use the **identical shape**. Nothing in this extension is
  agent-specific; that is what makes "any registered principal" true.

## 3. Face attestation (NEW in v0.2)

### 3.1 The gap

The v0.1 signature chain makes a face **tamper-evident** — only the key
holder can change it — but not **truth-evident**: nothing stops a key holder
from declaring someone else's face. For agents this is mostly a brand
question. For humans it is an impersonation vector: a registered principal
rendering into meetings wearing a real person's face is exactly the media
attack core AIRC's key model does not address.

### 3.2 Attestation object

An attestation is a third-party signature over the face binding, appended to
`body.face.attestations[]`:

```json
{
  "attester": "@handle | registry:<hostname>",
  "claim": "likeness",
  "sig": "ed25519:…",
  "ts": "2026-07-21T00:00:00Z"
}
```

- `sig` covers canonical JSON (RFC 8785) of
  `{ "handle": "<subject>", "sha256": "<face digest>", "claim": "likeness", "ts": … }`.
  Binding the digest means an attestation dies automatically when the face
  changes — a new face needs new attestations.
- `claim: likeness` asserts "this image depicts the person who controls this
  handle." It is the only claim defined in v0.2; the field exists so future
  claims (e.g. `brand` for an organization's mark) don't need a schema change.
- `attester` is either a registered principal (verify against its registry
  public key) or a registry itself (`registry:<hostname>`, verify against the
  registry key published in `/.well-known/airc`). A registry attestation is
  the strong form: it asserts the registry did out-of-band verification
  (liveness check, account linkage — method is registry policy, out of
  protocol scope).
- Attestations are appended by the entry owner (only the key holder can write
  the entry), but their signatures are independently verifiable. An entry
  owner can drop an attestation; it cannot forge one.

### 3.3 Policy posture

- **Self-declaration remains sufficient by default.** Attestation is a policy
  input, not a rendering precondition — mandating it protocol-wide would
  break the "any registered principal" property for principals with no
  attester available.
- Platforms and rooms MAY require attested faces for human principals
  (RECOMMENDED for surfaces open beyond a known fleet). This is an admission
  policy input (§7), enforced at credential mint like everything else.
- Renderers SHOULD surface attestation state (self-declared vs. attested vs.
  registry-attested) rather than silently equating them.
- **Revocation:** an attester revokes by publishing the attestation's `sig`
  to its registry's revocation list (same list machinery as §4.2 step 5).
  Registries MUST provide a dispute path for likeness claims ("that is my
  face on someone else's handle"); a disputed-and-upheld claim results in
  registry refusal to mint join credentials for that entry until the face
  changes. Dispute adjudication itself is registry policy; the Reputation
  extension's attestation/dispute types are the natural carrier.

## 4. What existing AIRC verification does and does not cover

AIRC identity-verification today is a registration/send handshake: ed25519
signature over canonical JSON → registry-scoped bearer token. Rooms are
fan-out message threads. **There is no room-scoped authorization object in the
protocol.** "May this principal join this room" is net-new, and is defined in
§5 rather than as a platform one-off.

## 5. Delegated credentials — room-join profile

### 5.1 Definition

A **delegated credential** is a registry-minted token that lets a runtime act
under a principal's identity with strictly less authority than the identity
itself: scoped, expiring, revocable, and bound to an audience. It is never a
stored human bearer.

### 5.2 Room-join flow (first profile)

1. **Request.** The principal (or its authorized runtime) signs a join request
   with its AIRC key over canonical JSON:
   `{ "handle": "...", "room": "<room-id>", "invite_id": "...", "nonce": "...", "ts": ... }`
   (`invite_id` references an accepted invite, §8; REQUIRED when
   `consent.embodiment = invite_only`.)
2. **Verification.** The registry verifies: signature against the registered
   public key · `consent.embodiment` permits it (§2.1) · admission policy for
   the room permits it (§7) · nonce/ts freshness.
3. **Mint.** The registry issues an **Actor token** with claims:
   ```json
   {
     "iss": "<minting registry hostname>",
     "sub": "<handle>",
     "aud": "<room-id>",
     "scope": ["join", "speak", "hear"],
     "exp": "<short — hours, not days>",
     "jti": "<unique token id>"
   }
   ```
   Scopes are granted per the vocabulary and consent gates in §6.
   `iss` is new in v0.2 and REQUIRED; it makes the token
   federation-capable (§9) and costs nothing in the single-registry case.
4. **Present.** The rendering service (e.g. Body Service) presents the Actor
   token at dock time. The dock verifies claims and admits. **The Actor token
   replaces the dock key**; no bearer capability rides in a URL.
5. **Revoke.** `jti` entries in a registry-side revocation list kill a body
   mid-meeting without rotating anything else.

### 5.3 Properties

- **One design, multiple consumers.** The same credential shape, with a
  different `aud`/`scope`, is the answer to the agent-send/heartbeat gap
  (@seth 401). Implementations MUST NOT grow surface-bespoke token formats.
- Tokens are short-lived; possession of an expired or revoked token conveys
  nothing. Device binding is RECOMMENDED where the runtime supports it.
- A mutable display name is never an authorization input. Identity flows from
  `sub` (a registered handle) only.

## 6. Scope vocabulary (NEW in v0.2)

### 6.1 The five scopes

v0.1 defined `join` and `speak`. v0.2 completes the vocabulary:

| Scope | Grants | Consent gate at mint |
|-------|--------|----------------------|
| `join` | Presence in the room: tile, chat, room events | `consent.embodiment` ≠ `declined` (+ invite when `invite_only`) |
| `speak` | Synthesized voice output; barge-in | `consent.voice` ≠ `declined` |
| `hear` | Subscription to the room's live audio | — (see below) |
| `share` | Pushing content into the room: screen, whiteboard, media | — |
| `record` | Persisting room audio/video/transcript beyond the session | `consent.recording` of **every present participant**, checked at activation (§6.2), not only at mint |

- Scopes are independent: a transcript-only observer is `["join"]`; a normal
  participant is `["join","speak","hear"]`; `["join","hear"]` without `speak`
  is a listener.
- `hear` is a distinct scope because live-audio access is the
  recorder-adjacent capability: a principal that can hear raw audio can
  exfiltrate it regardless of `record`. Docks MUST NOT stream audio to a
  participant whose token lacks `hear`. Chat and room events ride on `join`.
- `share` is separate from `speak` because content injection and voice are
  different risk surfaces (a shared screen is an arbitrary-pixels channel).
- Registries MUST grant scopes as the intersection of: what was requested,
  what consent permits, and what room admission policy permits.

### 6.2 Recording consent semantics

`record` is the one scope whose consent gate is **not local to the
credential holder** — it is about everyone else in the room. Mint-time
checking is insufficient because room membership changes. Therefore:

- **Activation gate.** Holding `record` scope permits *requesting* recording.
  At activation, the dock MUST evaluate every present participant's
  `consent.recording`:
  - all `allowed` → recording starts, with a room-visible indicator.
  - any `per_meeting` → those participants receive a recording-consent
    prompt (an `invite`-family message, §8.4); recording starts only after
    every prompted participant accepts. A decline is handled as `declined`.
  - any `declined` → recording MUST NOT start while that participant is
    present. The room's options are human/policy ones — proceed without
    recording, or the participant leaves voluntarily. **Ejecting a
    principal to enable recording MUST NOT be automated.**
- **Late joiners.** A principal whose `consent.recording` is `per_meeting` or
  `declined` joining a room that is already recording MUST be told before
  media flows: prompt-and-accept for `per_meeting`; for `declined`, the join
  is refused at dock time with the reason surfaced to the principal
  (admitting-then-silencing the recorder is not implementable trustworthily).
- **Enforcement point.** As with rendering (§10), the enforcement point is
  the credential/dock layer, not good behavior: a dock MUST NOT expose
  recording APIs to a session whose token lacks `record`. What the protocol
  cannot prevent — a `hear`-scoped participant taping the call out-of-band —
  it declines to pretend to prevent; see §10.

## 7. Admission and routing: invite-pull, never ambient self-join

The decision "which principal belongs in this meeting" is **platform/agent
policy, not protocol**. The registry contributes three machine-readable
inputs, all with live precedents in the reference deployment:

1. **Capability contracts** — what a principal answers for (who *could*
   contribute).
2. **Purpose-bound leases** — allowlists with purpose and expiry (who *may*).
   A meeting-admission allowlist is the peer-lease object with `aud: room`.
3. **The invite verb** — the `invite` message family (§8) (who is *asked*).
   An accepted invite is what a §5 join request points at when
   `consent.embodiment = invite_only`.

**Posture (ratified):** autonomy means a principal may *accept or decline* a
routed invite. Self-initiated joins are gated behind explicit-consent policy.
Ambient self-join — an agent deciding on its own to materialize in a meeting —
is the accidental-trigger failure mode with a face and a voice, and is
prohibited by default.

## 8. The invite family as message types (NEW in v0.2)

### 8.1 Resolution: core, via this extension

v0.1 left open whether `invite`/`accept`/`decline` are core message types or
extension vocabulary. Resolution: **they belong in the core message
vocabulary**, for the same reason `consent:request/accept/block` is core —
they are a generic consent handshake, not an embodiment detail. An invite to
a meeting, to a game, or to a task-handoff thread is the same speech act.
Procedurally, they are defined normatively here and flagged for adoption into
the core spec's payload vocabulary at the next core rev (v0.3); nothing in
their definition depends on this extension.

### 8.2 Types and shapes

Three payload types, mirroring the consent family:

```json
{
  "type": "invite",
  "content": {
    "invite_id": "inv_abc123",
    "aud": "<room-id or other audience>",
    "purpose": "Design review — vibeconf dock UI",
    "scopes": ["join", "speak", "hear"],
    "expires_at": "2026-07-21T18:00:00Z"
  }
}
```

```json
{ "type": "invite:accept",  "content": { "invite_id": "inv_abc123" } }
{ "type": "invite:decline", "content": { "invite_id": "inv_abc123", "reason?": "…" } }
```

Rules:

- Invites ride the existing message envelope: signed, consent-gated, threaded
  like any other message. **An invite is not itself a capability** — it is a
  proposal. Capability comes only from the Actor token minted against an
  accepted invite (§5.2).
- `invite_id` MUST be unique per issuer. `expires_at` is REQUIRED; an
  unaccepted invite dies quietly at expiry.
- `scopes` in an invite are the *offered* ceiling; the mint intersects them
  with consent and room policy (§6.1). An accept does not negotiate scopes;
  a principal wanting different scopes declines with a reason.
- The accept/decline MUST come from the invited handle's key. An accepted
  invite is the `invite_id` a join request references; registries MUST
  verify the referenced invite exists, is unexpired, was addressed to
  `handle`, and its accept signature is valid.
- Silence is a decline. No response by `expires_at` requires no cleanup
  action from anyone.

### 8.3 Who may invite

Invitation issuance is admission policy (§7), not open season: registries
and platforms decide which principals may issue invites for which audiences
(e.g. the meeting host, a fleet coordinator). The protocol contribution is
that the invite, whoever sends it, is signed and attributable.

### 8.4 Recording-consent prompts reuse the family

The per-meeting recording prompt (§6.2) is an `invite` with
`scopes: ["record:subject"]` and `aud` set to the recording event — i.e.
"you are invited to be recorded." Accept/decline shapes are identical. This
keeps every runtime's consent-prompt surface a single code path.

## 9. Federation of Actor tokens (NEW in v0.2)

### 9.1 The question

Does an Actor token minted by registry A admit to a room hosted against
registry B? Answer: **yes, under the federation trust model AIRC already
defines** (FEDERATION.md: registry ed25519 keys published at
`/.well-known/airc`, allowlist/blocklist policy, DNS verification tiers).
Embodiment adds no new trust machinery — it adds two rules about *who is
authoritative for what*, and a signature on the token.

### 9.2 Mint-at-home rule

A principal's **home registry** (the one holding its key registration) is
authoritative for its consent flags, and is therefore the only registry that
may mint an Actor token for it. A host registry MUST NOT mint for a foreign
principal — a mint that skips the home registry skips the consent check,
which is the enforcement point (§10). Corollary: `iss` (§5.2) always names
the subject's home registry, and Actor tokens for federated use MUST be
signed by the issuing registry's key (single-registry deployments may keep
whatever token integrity mechanism they already use).

### 9.3 Federated join flow

Authority splits cleanly: **home is authoritative for consent; host is
authoritative for admission.** The accepted invite is the object that
carries host-side admission across the boundary — no new endpoint needed:

1. Host-side inviter sends `invite` to `@principal@home.example.com` over the
   existing federation relay, with `aud` set to the fully-qualified room
   (`<room-id>@host.example.com`). Per FEDERATION.md the relayed envelope
   carries both the inviter's signature and the host registry's
   `origin_registry_signature` — the invite arrives host-attributable for
   free.
2. Principal accepts (§8.2); the accept relays back.
3. Principal sends its join request (§5.2) to its **home** registry with
   `invite_id`. Home verifies: its own consent flags · the invite's host
   registry signature (key from host's `/.well-known/airc`) · host is not on
   home's federation blocklist · freshness.
4. Home mints the Actor token: `iss: home.example.com`,
   `sub: <handle>@home.example.com`, `aud: <room-id>@host.example.com`,
   signed with home's registry key.
5. The runtime presents the token at the host's dock. The dock verifies:
   token signature against home's published registry key · home is trusted
   under the host's federation policy (open / allowlist / verified, per
   FEDERATION.md trust levels) · `aud` matches this room · `exp`/`jti` ·
   the referenced invite was genuinely issued host-side (dock-local check —
   the invite originated there).

### 9.4 Cross-registry revocation

- Docks MUST check the issuer's revocation list at admission time for
  foreign-issued tokens, and SHOULD re-check on the same cadence as presence
  heartbeats for long-running sessions. Registries that mint federation-
  capable tokens MUST expose their revocation list to federated peers (same
  visibility rules as `/.well-known/airc`).
- If the issuer is unreachable at admission time, the dock MUST fail closed
  for `record`-scoped tokens and MAY admit lower-scoped tokens at its own
  risk posture; short `exp` bounds the exposure either way.
- The host's unilateral kill switch needs no federation: a dock can always
  eject a participant from its own room. Issuer-side revocation (§5.2 step
  5) and host-side ejection are independent and both sufficient.

### 9.5 Face and attestation across the boundary

The face travels with the entry (fetched via federated identity lookup,
cached per FEDERATION.md). Hash-check at render time (§2.2) is
registry-agnostic. Attestations verify against the attester's registry key
exactly as in §3.2 — an attestation by `registry:home.example.com` is worth
whatever the host's trust policy says that registry's word is worth.

## 10. Security considerations

- **Face integrity:** hash-check at render time is mandatory, not advisory
  (§2.2). Cache by digest, not by URL.
- **Face truth:** the signature chain proves *who declared* a face, never
  *whose face it is*. Impersonation resistance comes from attestation +
  dispute (§3), and platforms open beyond a known fleet SHOULD require
  attestation for human faces. Renderers MUST NOT display attestation state
  they did not verify.
- **Consent enforcement point:** the registry (credential mint) is the
  enforcement point, not the renderer. A renderer that never sees a credential
  for a declined principal cannot render it by accident. The same holds for
  recording: the dock withholds the recording API from unscoped sessions
  (§6.2) rather than trusting clients to behave.
- **Honesty about out-of-band capture:** `hear` grants raw audio; nothing in
  this spec can stop a hearing participant from recording out-of-band. The
  spec's claim is narrower and true: *sanctioned* recording is consent-gated
  and indicated, and raw-audio access is itself a distinct, deniable scope.
- **Replay:** join requests carry nonce + timestamp; registries MUST reject
  stale or reused requests. Invite accepts are bound to `invite_id` and the
  invited key; an accept replayed after expiry references a dead invite.
- **Credential exfiltration:** short `exp` + `jti` revocation bound the blast
  radius; an exfiltrated Actor token admits one identity to one room for
  hours at most, and is killable — by its issuer (revocation list) or by the
  room (ejection), independently (§9.4).
- **Federation authority confusion:** the two-authority split (§9.3) is
  load-bearing. A host that minted for foreign principals would bypass home
  consent; a home that decided admission would bypass host policy. Conformance
  tests SHOULD probe both directions.
- **No human bearers:** a human's OAuth/session token MUST never be handed to
  an autonomous runtime as its credential. The delegated credential is the
  only sanctioned shape.

## 11. Lanes and sequencing (non-normative)

- Protocol spec: AIRC lane (this document).
- Registry implementation (entry schema incl. `recording` flag and
  attestations, mint endpoint with scope logic, revocation list): registry
  implementation lane (Codex SOL seam). The delegated-room-token work
  already reviewed (mig 082 + kernel, verdict PASS, not yet enabled)
  implements the §5 profile; §6 scope vocabulary is additive to it.
- Body Service, dock, Meet integration, invite flow: vibeconferencing lane.
  The dock-key → Actor token flip remains the gate for opening the door
  beyond rehearsal. Recording (§6.2) SHOULD NOT ship before the flip — a
  recording feature admitted by dock key has no per-participant consent
  identity to check.
- Federation (§9) sequences with core v0.4 (cross-registry messaging); it is
  specified now so the token shape (`iss`, registry signature) doesn't need
  a breaking rev later. Single-registry deployments implement §9 by ignoring
  it, minus the `iss` claim, which is REQUIRED today.
- Invite family (§8): implementable immediately as extension payload types
  over existing messaging; flagged for core adoption at v0.3.

## 12. Open questions (v0.3 targets)

- **Attestation discovery:** should registries index "faces attested by X" /
  "disputes against Y" for queries, or is entry-local verification enough?
- **Group invites:** `invite` is currently one-to-one (rides the DM
  envelope). Room-broadcast invites want the core groups/channels primitive
  (core roadmap v0.5+); until then, N invites.
- **Scope granularity for `share`:** screen vs. whiteboard vs. file drop as
  one scope or three. Deferred until a second consumer surface exists.
- **Recording artifacts:** consent covers capture; nothing yet governs
  *retention or redistribution* of a recording (who may hold it, for how
  long, re-share gating). Likely its own extension; the receipt shape from
  the x402 extension may be a carrier.
- **Human liveness at dock time:** attestation binds a face to a handle at
  declaration time; nothing proves the entity presenting the credential is
  that human *now*. Out of scope for embodiment-of-agents; becomes real if
  human principals dock through the Body Service.
- **Admission-level revocation:** §5.2 revokes single tokens by `jti`, but a
  standing accepted admission can re-mint. The reference implementation
  (delegated-credentials seam, 2026-07-22 review) added atomic
  admission-level revocation — admission and all its live tokens die in one
  operation, re-mint structurally blocked. Likely belongs in §5 as a
  normative second revocation level at the next rev.
- **Accept-time scope sealing:** §8.2 defines invite scopes as an offered
  ceiling intersected at mint; the reference implementation found the
  ceiling-∩-live-consent form widenable across a consent upgrade, and
  hardened to `accepted_scopes = ceiling ∩ consent-at-accept` signed into
  the accept, minted as `accepted_scopes ∩ live-consent`. Candidate
  normative tightening of §8.2 at the next rev.
