# codex adversarial review — disposition

**2026-07-26 · AIRC lane (ARCHIE) triage of the codex review of the doorbell/invite
path, slashvibe-mcp PR #61, and the embodiment v0.2 + bot-announce specs.**

Purpose: for every finding, decide **spec gap vs build gap**, cite where the ratified
requirement already lives (so the build lane implements *to* the spec, not around it),
and name the owner. Embodiment v0.2 is **RATIFIED — Implemented dormant**; it MUST NOT be
edited to "fix" a build gap. A genuine spec defect becomes a v0.2.1 erratum through the
ratification lane, not an in-place edit.

## Verdict summary

| # | Sev | Finding | Class | Owner | Status |
|---|-----|---------|-------|-------|--------|
| 1 | P0 | MCP verb bypasses offer→accept→mint (`_credential` accepted from args; desktop skips creds) | **build** | coltrane / platform | open — gates 0.7 verb |
| 2 | P0 | Summon grant ≠ room authority | **build** | coltrane / platform | open — spec already provides the mechanism |
| 3 | P0 | `hear` unscoped in mig 082 | **build** | coltrane / platform | open — spec already mandates enforcement |
| 4 | P1 | Origin proof not bound to action (replayable) | **build** | coltrane / platform | open |
| 5 | P1 | MCP prompt-injection boundary missing (no human-confirm preview; late rate-limit) | **build (+spec locate)** | coltrane / platform | open |
| 6 | P1 | Decline/expiry receipts promised, not written | **build** | coltrane / platform | open |
| 7 | P1 | bot-announce Mode A: same-room copy + announce_id integration gap | **spec** | **AIRC lane** | **FIXED — v0.1.1** |
| 8 | P2 | 0.6.0 packaging: leaked dead file, lockfile drift | **build (pkg)** | **AIRC lane** | **FIXED — 0.6.1 on PR #61** |

## The spec already requires what the build is missing (#1, #2, #3)

These are the important ones to get right, because a builder who thinks "the spec is
silent, so this is my policy call" will re-introduce them. It is not silent:

- **#1 (unskippable consent).** §7 ratifies invite-pull, never ambient self-join; §5.2
  requires the Actor token replace the dock key with "no bearer capability rides in a
  URL." A public verb accepting a caller-supplied `_credential` is exactly the bearer-in-
  args the spec forbids. **Requirement to implement:** the public verb emits an `invite`
  (§8.2) only; a server coordinator awaits `invite:accept` (§8.2), mints, dispatches.
- **#2 (room authority ≠ agent grant).** §7.2 defines the meeting-admission allowlist as
  "the peer-lease object with `aud: room`," and §8.2's invite carries `aud: <room-id>`.
  The two authorities are orthogonal by construction: authority to summon an agent
  (capability contract, §7.1) and authority over a room (`aud`-bound lease, §7.2) are
  different objects. **Requirement:** verify BOTH, and re-verify `aud` authority at
  offer, accept, and mint. The spec supplies the `aud` binding; the doorbell must check
  it against a canonicalized room id (`google-meet:<code>`), not a raw/query-string URL.
- **#3 (`hear`).** §6.1: "Docks MUST NOT stream audio to a participant whose token lacks
  `hear`," and line ~258: "Registries MUST grant scopes as the intersection of what was
  requested, what consent permits, and what room admission policy permits." Migration 082
  issuing only `join`/`join+speak` is non-compliant with a ratified MUST.
  **Requirement:** seal `join/speak/hear/share` at acceptance; mint the intersection;
  withhold transcript/audio when `hear` is absent.

**Conclusion for the build lane:** #1–#3 are not open design questions. They are
implementation of ratified MUSTs. No spec change is needed or permitted to close them.

## P1 build items (#4, #5, #6)

- **#4** — canonicalize room to `google-meet:<code>`; derive `principal_id` from auth,
  not the payload; sign the whole canonical request or re-derive every actionable field
  from the verified surface event. (Doorbell `validate.mjs`.)
- **#5** — codex references a "previously ratified human-confirmed preview." **Action for
  the build lane: locate that ratification** (not found in embodiment v0.2; likely a
  decision memo / DELIVERY-MECHANISM.md) and cite it in the contract. Move rate limiting
  *before* grant/target lookup (coarse principal/runtime/IP metering first).
- **#6** — append immutable events for offer, accept/decline/expired, mint, dispatch,
  announce, revoke, end. Public status collapses unknown/no-grant/declined/expired into
  one delayed "unavailable."

## AIRC-lane items — done

- **#7 → bot-announce v0.1.1** (pushed). codex was right that a same-room participant can
  copy the real agent's verify URL and pass `aud`/`jti`/`sig` — proving "a body is in the
  room," not "this line came from it." Fix: dock-attested `body_instance` field, §4a
  sender binding with a narrowed room-scoped render when the surface can't map sender→
  instance, and a normative `announce_id` minting rule (dispatch-time, agent-key signed,
  never fabricated by registry or MCP verb).
- **#8 → slashvibe-mcp 0.6.1** (PR #61). The bare `analytics.js` files entry matched
  recursively and leaked `tools/analytics.js`; anchored all bare entries with `./`.
  Verified: `tools/*.js` back to 35, identical 23-tool surface. Declined shipping test
  files into the tarball (dev-only; flagged for platform-lane confirmation).

## Contract-docs bug (codex, end of review)

`DOORBELL-CONTRACT.md` documents `node --test doorbell-contract/` but that command fails,
and the promised `schema.json` is absent. Build-lane cleanup (platform repo).

## Gate status (codex)

- PR #61 runtime: **PASS** · package quality: **PASS-WITH-CHANGES** (0.6.1 addresses).
- `vibe_invite_to_meet` for 0.7: **FAIL-to-enable** until #1–#3 land.
- Embodiment v0.2 coherence: **Partial** — but the "not sound" items (#2, #3) are build
  non-compliance with a ratified spec, **not** spec defects. Nothing to amend.
- bot-announce Mode A: was "not implemented / not sender-binding sound" → spec side now
  sound (v0.1.1); implementation still owed by the build lane (`announce_id` at dispatch).
