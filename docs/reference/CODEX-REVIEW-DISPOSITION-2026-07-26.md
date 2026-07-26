# codex adversarial review — disposition

> **ADJUDICATION v2 (code-verified, 2026-07-26 — at the vibe session's request).**
> The section below (v1) triaged findings against the spec. This v2 header records the
> verdicts after reading the *actual* control-plane code on `coltrane/body-context-tray`
> (meet.js) and `codex/airc-delegated-room-token` (migrations 082/083, validate.mjs).
> Several v1 verdicts sharpened; two of codex's findings are weaker than stated once the
> migrations are read.
>
> **Per-finding verdict (real-blocking / already-mitigated / N-A-until-wired):**
>
> - **#1 consent bypass (`_credential`, desktop skip)** → **N/A-until-wired + hard
>   guardrail.** `meet.js:62-64`: desktop returns `null` (local, correct); cloud throws
>   `CONSENT_REQUIRED` unless `args._credential` is supplied — an explicit placeholder
>   ("injected once the seam lands"). Not exploitable while the verb is disabled. But the
>   raw `args._credential` acceptance is a latent bypass that **MUST be deleted** and
>   replaced by a call to the 082/083 mint before the verb is enabled. codex's
>   FAIL-to-enable gate is **CONFIRMED**.
> - **#2 summon grant ≠ room authority** → **SPLIT; mostly already-built — push back on
>   codex.** Identity-spoof half: **already-mitigated** (`meet.js:81-85` `resolveProfile()`
>   deletes caller `actor_ref`). Room-authority half: **already BUILT** —
>   `082` mint requires an `airc_room_admissions` row for the *exact* `room_id` or raises
>   `AIRC_ROOM_ADMISSION_REQUIRED` (082:~62-73), and `083` makes that admission require an
>   invitee-signed decision (offer→signed-accept). The gap is **wiring meet.js to this
>   mint**, not missing design. Guardrail: the enabled verb MUST mint via 082 only, never
>   a side path.
> - **#3 `hear` unscoped** → **REAL, blocking-before-enable.** `082:125` CHECK constraint
>   hard-forbids any scope beyond `join`/`join+speak`; embodiment v0.2 §6.1 mandates
>   `hear`/`share` as distinct sealed scopes + intersection minting. Spec needs **no**
>   change (§6.1 is correct and ratified) — the migration is non-compliant. Fix = drop the
>   two-scope CHECK, seal `join/speak/hear/share` at acceptance, mint the intersection,
>   withhold audio without `hear`.
> - **#4 origin proof not action-bound** → **REAL, blocking-before-enable for
>   surface-origin (Buzz/Telegram) summons.** `validate.mjs` is structural-only: `ts`
>   parse-checked not freshness-checked (:51), `principal_id` taken from the proof not from
>   auth (:38), `MEET_URL` accepts uncanonicalized query-string variants (:12), and no
>   signature binds agent/room/purpose/nonce/ts. Fix = canonicalize room to
>   `google-meet:<code>`, derive `principal_id` from auth, add a freshness window, verify
>   the surface event's signature over the actionable fields.
> - **#5 prompt-injection boundary** → **N/A-until-wired + guardrail.** Preview→confirm→
>   single-use bound token and pre-lookup rate-limit are part of the unwired seam. Action
>   for me: locate the "previously-ratified human-confirm preview" codex cites — it is
>   **not** in embodiment v0.2; if it isn't ratified anywhere it needs a spec home.
> - **#6 decline/expiry receipts** → **REAL, build-side.** The "every outcome is
>   receipted" claim needs offer/accept/decline/expired/mint/dispatch/announce/revoke/end
>   events actually written.
> - **#7 bot-announce Mode A** → **SPEC DONE (v0.1.1).** `body_instance` sender binding +
>   normative `announce_id` minting rule already shipped in the spec. Implementation
>   (mint `announce_id` at dispatch, agent-key signed) owed by Fable.
> - **#8 packaging** → **DONE; does NOT block publish.** 0.6.1 (PR #61) + 0.7.0 (PR #62)
>   merged; lockfile at **0.7.0** (the "still 0.5.25" context is stale); test-file
>   exclusion is deliberate (dev-only — `npm test`→0-tests only manifests in an extracted
>   tarball, not a real workflow). Only remaining action: `npm publish` (Seth 2FA).
>
> **Gate confirmation & one clarification.** CONFIRM: do **not** enable
> `vibe_invite_agent_to_meet` until `obtainCredential()` mints *exclusively* via the
> 082/083 function (room-admission + invitee-signed decision) and the raw `args._credential`
> path is deleted. **Clarification:** the shipped **0.7.0 is the surface diet and contains
> NO invite verb** — publishing it now is safe and unrelated to the gate; the verb lands in
> a later release (0.8) after wiring.
>
> **Spec deltas I own:** embodiment v0.2 — **none** (§6.1 already mandates the four scopes,
> intersection, and `hear` enforcement; the fix is build compliance, not an erratum).
> bot-announce — **none further** (v0.1.1 covers it). My open spec task: find/authorize a
> home for the human-confirm-preview requirement (#5).
>
> **Prioritized fix plan (Fable builds; this is the triage):**
> P0, gate the verb: (1) wire `obtainCredential`→082/083 mint, delete `args._credential`
> [#1+#2]; (2) four-scope credential + seal-at-accept + `hear` enforcement [#3];
> (3) harden `validate.mjs` for surface origins [#4]; (4) preview→confirm→single-use token
> + pre-lookup metering [#5]; (5) outcome receipts [#6]; (6) `announce_id` at dispatch [#7].
> P1, non-blocking hygiene: add `doorbell-contract/schema.json` (absent) and make
> `node --test doorbell-contract/` pass (`validate.test.mjs` exists; likely fails on the
> missing schema import). Independent/now: publish 0.7.0 (Seth 2FA).

---

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
