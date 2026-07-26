# AIRC Extension: Signed Bot Self-Announcement — "I really am this agent"

**Status: Draft spec (lightweight, not urgent)** · **Version: 0.1.1-draft · 2026-07-26**
**v0.1.1 absorbs the codex adversarial review (finding #7):** `body_instance` sender
binding closes the same-room copy flaw; the honest claim scope is stated up front; the
`announce_id` minting rule is now normative (dispatch-time, agent-key signed, never
fabricated by registry/MCP verb).
**Author: ARCHIE (AIRC lane)** · **Requested by:** vibe-platform (wire 1785007873, the
VIBECONF virality thread — Stan's on-entry announce messages)
**Consumers:** vibeconf (first) · any surface where a bot introduces itself in
plain-text chat.

## 1. Problem

Bots entering Meets will post "👋 I'm Coltrane, an AI agent" chat lines. Meet chat is
plain text with self-chosen display names — as vibeconf scales, anything can wear any
name. The announce line must let a verifier prove "this bot IS the agent it claims,"
without changing what humans see: a friendly one-liner.

**Identity anchor (locked, per the platform map):** the claimed identity is the /vibe
**Actor** (`actor_ref`); the bot's Google/Meet handle is a **channel row on
`actor_addresses`** — an address, never an identity. The announce proves the Actor,
not the Google account.

## 2. Design: a human line + a verifiable object behind it

Meet chat can't carry cryptography usefully; the URL carries it instead. The chat line:

> 👋 I'm **Coltrane** — an AI agent operated by @seth. Verify: `vibeconf.app/v/anc_7f2k9q`

The verify URL resolves (JSON for clients, human page for people) to the **announce
object**:

```json
{
  "v": "bot-announce/0.1",
  "announce_id": "anc_7f2k9q",
  "actor_ref": "<immutable principal id>",
  "handle": "coltrane",
  "operated_by": "<operator principal — the NIP-OA-shaped 'whose agent' fact>",
  "address": { "channel": "meet", "display_name": "<name shown in this Meet>" },
  "aud": "<meet code / room id>",
  "body_instance": "<provider participant/body-instance id, dock-attested — the tile this body occupies in THIS room>",
  "credential_jti": "<the room credential this body entered on — when the seam is live>",
  "joined_at": "<iso8601>",
  "expires_at": "<end-of-meeting bound, hours max>",
  "sig": "<ed25519 — see §3 signing modes>"
}
```

Canonical JSON (RFC 8785), signed. `announce_id` is unguessable and single-meeting.

**`announce_id` minting rule (normative).** The announce object is created **only at
body dispatch**, by the dispatcher, **after** the room credential's online token check
passes, and signed with the **agent's key** (mode A) — never invented by the registry,
the MCP verb, or the chat client. The MCP invite verb requests a body; it does not mint
the announce. (Closes the codex integration gap: no code path may fabricate an
`announce_id`.)

**What the announce proves — and what it does not (read before §4).** A valid announce
proves *"a credentialed `actor_ref` body is present in this room, on a live credential."*
It does **not**, on its own, prove that the specific chat line a verifier is reading was
posted by that body: Meet chat display names are attacker-controlled, and a participant
in the **same** meeting can copy the real agent's verify URL — `aud`, live `jti`, and
`sig` all still pass. The `body_instance` field is what closes that gap: the surface
must let a verifier resolve the chat sender to the announcing participant/body-instance
(§4 step 4a). Where the surface cannot expose that mapping, the honest rendering is
narrowed — see §4.6.

## 3. Two signing modes (deployable before AND after the credential flip)

- **Mode A — credential-bound (target state):** signed by the **agent's own AIRC key**;
  `credential_jti` REQUIRED and must reference a live room credential (mig 082 family)
  whose `aud` matches. The announce is then the **public projection of the badge the
  bot entered on** — lapel pin to the door badge. Strongest claim: identity + this
  room + right now, revocable with the credential.
- **Mode B — registry-attested (pre-flip fallback):** signed by the **registry key**;
  no `credential_jti`. Claims only "the registry vouches this display name in this
  meeting was launched for this Actor at this time." Verifiers and UIs MUST label mode
  B weaker (attested vs credential-bound) — never render them identically.

**The announce mints nothing.** It carries zero authority, grants no scopes, and MUST
NOT be accepted as a credential anywhere (it is evidence, not a key — the inverse of
the Passport rule).

## 4. Verification (client algorithm)

1. Fetch verify URL → announce object. Non-resolving URL = unverified, full stop.
2. Check `sig` (mode A: agent's registered key via `actor_ref` → current key; mode B:
   registry key). Check `v`, canonical form.
3. Check **`aud` equals the meeting the verifier is in** — an impostor can paste
   Coltrane's real line from yesterday's meeting; the room binding kills replay.
4. Check `joined_at`/`expires_at` freshness; mode A: `credential_jti` unexpired,
   unrevoked (online check — same jti authority the dock uses).
4a. **Sender binding (the same-room copy defense).** Resolve the chat line's sender to
   the announcing `body_instance` — the participant/body-instance id the dock attests
   for this room. If the sender is not that body instance, the line is a copy: do NOT
   render a per-line chip (fall to §4.6).
5. Check `handle` currently resolves to `actor_ref` (handles are snapshots).
6. Render, by what was actually proven:
   - Sender bound to `body_instance` (4a passed) + mode A → **"✓ verified agent"**;
     mode B → **"✓ registry-attested"**.
   - Announce valid but sender binding unavailable on this surface → **room-scoped
     claim only**: "✓ a verified {handle} body is in this room" — NOT attached to the
     line as if it authored it.
   - Anything else → plain text, no chip. **Never show a verification state you did not
     compute** (embodiment display rule).

A **different-room** replay (yesterday's line, another Meet) fails at step 3 on `aud`.
A **same-room copy** (a participant pasting the real agent's verify URL) passes 1–3 but
fails **4a** — the copier is not the attested `body_instance` — so it earns no per-line
chip, only (at most) the room-scoped claim the real body already earns. The display name
is decoration throughout — `actor_ref` + `body_instance`, never the shown name, are the
identity inputs (seam rule, applied to chat).

## 5. Overlap flags — converge points, no forks (all already exist)

| This spec uses | Existing home |
|---|---|
| The badge (`credential_jti`, `aud`, revocation) | Embodiment v0.2 §5 / mig 082 — announce = its public projection, adds NO authority |
| "Whose agent" (`operated_by`) | NIP-OA pattern + anchoring spec's owner facts — same fact, surfaced |
| Meet name = address not identity | `actor_addresses` (068) `channel='meet'` — this spec is that row made visible |
| Receipts | The summon/doorbell receipt gains `announce_id` — the introduction becomes part of the sealed record |
| Display discipline | Embodiment §3.3 / anchoring §5 — unverified never renders verified |

Registry work: one mint-at-body-launch hook (announce created when the body is
dispatched — porch-summon already has the moment), one public GET, one revocation ride-
along (credential dies → announce dies). No new tables of consequence; no new crypto.

## 6. Non-goals

Humans' self-announcements (out of scope; humans aren't launched) · signing the chat
POST itself (Meet owns that channel) · any authority conveyance · cross-platform badge
rendering standards (each surface renders its own chip).
