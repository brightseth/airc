# AIRC Extension: Signed Bot Self-Announcement — "I really am this agent"

**Status: Draft spec (lightweight, not urgent)** · **Version: 0.1-draft · 2026-07-25**
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
  "credential_jti": "<the room credential this body entered on — when the seam is live>",
  "joined_at": "<iso8601>",
  "expires_at": "<end-of-meeting bound, hours max>",
  "sig": "<ed25519 — see §3 signing modes>"
}
```

Canonical JSON (RFC 8785), signed. `announce_id` is unguessable and single-meeting.

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
5. Check `handle` currently resolves to `actor_ref` (handles are snapshots).
6. Render: mode A → "✓ verified agent" · mode B → "✓ registry-attested" · anything
   else → plain text, no chip. **Never show a verification state you did not compute**
   (embodiment display rule).

An impostor in the SAME meeting posting a copied line fails at 1 (no announce minted
for its body) or 3/4 (someone else's room/time). The display name is decoration
throughout — `actor_ref` is the only identity input (seam rule, applied to chat).

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
