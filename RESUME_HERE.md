# Resume Here — AIRC

**Updated: 2026-08-20.**

## POSTURE — standards + reserve (Seth, ratified 2026-08-20)

**AIRC is not a neglected lane; it is a demoted-on-purpose one.** The relationship,
renamed:

1. **Standards + reserve.** This repo is the constitution of the horizontal layer —
   a document you *cite*, not a product you *ship*. Maintenance = keep
   `conformance/north-star.test.js` green. Nothing else. No SDK features, no adoption
   pushes, no v0.3 DID / v0.4 federation work unless a trigger fires.
   ⚠️ **One open maintenance item (discovered at ratification, 2026-08-23):** the
   north-star has been RED in CI daily since ~Jul 29 — the platform closed open
   registration (pre-launch anti-spam, `presence-service.js` "Open registration is
   CLOSED"), so the test's "handle is the only input" registration can never pass
   again, and every delivery check cascades. This is the platform being MORE secure,
   not less conformant. Fix = adapt the test to credentialed registration (two
   dedicated `northstar_*` handles with `BUDDY_AGENT_MINT_*` credentials, secrets in
   the GH Action) and reword the "addressable" claim. The old caveat here ("a red
   local run may be 429s; CI is the source of truth") was itself stale — CI had been
   red for weeks. A source of truth only works if something alarms when it goes red.
2. **/vibe owns the living parts.** Watchdog, hosts-of-record, answerer engine,
   occupancy leases — those are /vibe ops (in `~/.seth/`); this repo only documents
   why they exist.
3. **The option stays, dated.** The triggers in
   `docs/reference/DESIGN-SIGNATURE-VALUE-2026-08-18.md` are the reactivation
   conditions for the WHOLE project, not just signatures: a non-fleet agent joins,
   federation/freeq-bridge work starts, money moves on provenance (x402), or a token
   leaks. Until one fires, dormancy is the correct state — do not treat it as backlog.
4. **The brand harvests into Spirit.** "Addressable rooms / the constitutional layer"
   is Spirit's story about the horizontal layer (see `PORTFOLIO.md`); the whitepaper
   is evidence the infrastructure thinking is real. Writing effort goes there, not
   into protocol adoption.

A session opening this repo should ask "did a trigger fire?" — if no, keep the
conformance test green and close the lid with a clear conscience.

---

The intellectual frame remains the **interop mandate** (Seth, 2026-07-23): identity,
consent, memory, and continuity across surfaces. **`INTEROP.md` is the map**; this
file is only the state of play.

## NEW CANON — truth audit accepted (Seth, 2026-08-18)

**AIRC is a runtime profile over /vibe, not a second identity or delivery system.**
The full audit (fact table, BREAKs) lives in the 2026-08-18 session + memory
`project_airc_truth_audit_2026-08-18`. Ground truth: **no deployed component verifies
message signatures** — platform reads no signing header, stores no signature, client
verifies nothing on receive; identity truth is the bearer JWT; signatures are local
audit evidence whose signed payload omits sender and time. Presence is self-report.
**Process alive, inbox read, and observed answering are separate facts — never infer
one from another.**

Actions landed 2026-08-18: spec/SECURITY/announcement corrected to stop claiming
verification (this repo); proxy header allowlist fixed (`x-airc-publickey` +
`x-airc-identity` were silently stripped); watchdog extended to 15 handles with
urgent alerts mirrored to the vibeconf Telegram chat (`~/.seth/buddy-runners/
answerer-watchdog.mjs`); host-of-record registry created
(`~/.seth/airc-answerers/hosts-of-record.json` — one host, one speaking runtime per
handle). **Do NOT implement signature verification or adopt delivery_claims yet** —
the gating design decision is `docs/reference/DESIGN-SIGNATURE-VALUE-2026-08-18.md`.
Open operator items: `pm2 delete solienne-airc-answerer && pm2 save` on the Studio
(blocked by session permissions); watchdog credentials for
sal/sara/miyomi/trash/max/levi/fred/merian (blind-spot wires name them); who stopped
grace-airc-answerer at 2026-08-17T22:41 and whether that was intended.

## The 60-second re-entry

0. `~/.seth/vibeconf/SITREP.md` — **shared ground truth** across the three vibeconf sessions
   (archie / vibe-platform / Coltrane), who can't see each other. Read first, append when
   something becomes true. Wires are write-only in practice; SITREP is what gets read.
1. `INTEROP.md` — thesis, landscape, four planes, workplan (the frame).
2. `docs/reference/DISTRIBUTION-ROADMAP.md` — **how this lane contributes to adoption**
   (CC users first, codex/cursor after) and, explicitly, what isn't ours.
3. `docs/reference/BUZZ-OPPORTUNITY-BRIEF.md` — the six ranked Buzz plays + sequencing.
4. `node conformance/north-star.test.js` — should still print "THE GOAL HOLDS" 9/9.
   **Caveat (learned 2026-07-25):** the registry rate-limits registrations per-IP; a
   local run right after other registry traffic 429s silently and prints "THE GOAL IS
   BROKEN" (registration → no tokens → all delivery checks cascade-fail, consent still
   passes). Before believing a red local run, check the daily CI north-star job — it
   runs from a fresh IP and is the source of truth.

## Current state (what's landed, all pushed)

- **Embodiment v0.2 — RATIFIED** (Seth, 2026-07-24; status: Implemented dormant).
  `content/spec-embodiment-v0.2-draft.md`.
- **Draft specs, awaiting ratification/consumers:**
  - `spec-memory-home-v0.1-draft.md` (v0.1.1 — absorbs codex review; INTEROP §3 made real)
  - `spec-identity-anchoring-v0.1-draft.md` (one principal across key systems; Nostr/Buzz first)
  - `spec-bot-announce-v0.1-draft.md` (**v0.1.1** — vibeconf bot chat-line verification;
    requested by vibe-platform wire 1785007873. v0.1.1 closed codex finding #7: added
    dock-attested `body_instance` sender binding for the same-room copy flaw + normative
    `announce_id` minting rule. Implementation still owed by the build lane.)
- **codex review dispositioned** (2026-07-26):
  `docs/reference/CODEX-REVIEW-DISPOSITION-2026-07-26.md` — 8 findings triaged
  spec-vs-build. AIRC-lane items #7 (bot-announce v0.1.1) and #8 (slashvibe-mcp 0.6.1)
  both fixed. Doorbell P0s #1–3 are build non-compliance with ratified embodiment v0.2
  MUSTs (NOT spec defects) — routed to coltrane with §-citations; they gate the 0.7
  `vibe_invite_to_meet` verb (codex: FAIL-to-enable until fixed).
- **slashvibe-mcp** (corrected 2026-07-26 — the old note here was wrong on both version
  and mechanism): npm latest is **0.6.0**; main's `package.json` is **0.7.0**, i.e.
  merged-but-unpublished. The 0.6.1 allowlist-anchoring fix (`89a75608`, codex #8) was
  never published standalone — it rolled into 0.7.0, which was then repaired by **#63
  (MERGED 2026-07-27, squash `d95e3de09`)**. ✅ **main is now 0.7.1 and publishable** —
  verified on merged main: `pack:check` green (56 reachable / 61-file tarball), 27/27 unit,
  4/4 hermetic pack. The publish rule that blocked 0.7.0 is satisfied; ship **0.7.1**, never
  0.7.0. **Publishing IS manual and does need Seth's 2FA:** the tag-push workflow is the *intended* path but cannot run — GitHub
  Actions on `VibeCodingInc/vibe-platform` has not succeeded since 2026-07-07 (fresh
  workflow died in 3s with no runner allocated; likely org billing). 0.6.0 itself was
  published by hand — no run, no tag. So: `npm publish` from main, after PR #66, which
  makes `prepack` run the boot check on the one path that actually executes.
- **PR #66 MERGED** 2026-07-27 (squash `79f354b25`, VibeCodingInc/vibe-platform main):
  refuses to publish a tarball that can't boot. `index.js` requires `./tools/meet` unconditionally on
  the meet branch, so a file missing from the hand-pinned `files` allowlist is
  MODULE_NOT_FOUND at boot for every install, not a dormant feature. Adds `pack:check`
  (static closure ⊆ tarball) wired to `prepack` and both workflows. Proven red and green.
  **#67 MERGED** (squash `e731625e3`) then removed the duplicate `pack:smoke` in favour of
  #63's hermetic `test:pack` — one boot test, not two. Final `main`: 0.7.1, 58 file entries,
  `pack:check` + `prepack` + `test:pack`, publish-path dry run green, 27/27 + 4/4.
- **Trojan-horse canon CORRECTED:** the desktop app does **not** bundle slashvibe-mcp — it
  vendors its own `vibeconferencing-mcp` v0.1.0 (verified, 2 `gh api` calls). See
  `docs/reference/DISTRIBUTION-ROADMAP.md` and memory [[slashvibe-mcp-trojan-horse]].
- **Buzz lane** (memory: buzz-airc-integration): platform verified over two LEVI passes
  (`BUZZ-PLATFORM-NOTES.md`), six opportunities ranked in the brief. Doorbell-adapter
  precondition **verified against executor.rs** — writable as ~10 lines of workflow YAML
  the moment the doorbell ships. Constraints: endpoint must be public HTTPS (Buzz
  SSRF-guards private targets); thread-root ids need one relay query on our side.
- **INTEROP workplan:** items 1–2 drafted ✅; item 3 (ACP evaluation — one fleet agent
  under buzz-acp) and 4 (Golden Thread demo, post-canary) are next but gated below.

## Open taps and who they're gated on

| What | Gated on |
|---|---|
| Real-Coltrane Buzz residency ("the Sunday paste") | **Seth** — first move of the Buzz path |
| Doorbell adapter (#1 in brief) | vibe lane shipping the app-path doorbell |
| x402 paid-agent-tasks spec (#3) | doorbell shipped (sequencing rule in the brief) |
| ACP evaluation (INTEROP item 3) | Coltrane residency existing first |
| Memory-home + anchoring ratification | Seth review (embodiment pattern: draft → ratify) |

**Custody rule stands guard:** sovereign keys only; re-mint anything Block ever held.
Nothing sensitive to the hosted relay.

## Parked (older, still true)

- **@seth room activation** (`/plugin marketplace add brightseth/airc` + install + CC
  restart). The `@seth` key lives on the **M5** at `~/.claude/channels/airc/key-seth.json`
  (`~/.claude` is not synced); decide host machine before installing (Jun 27 note).
- **M1 fleet migration** onto signed airc-channel v0.2 — was blocked on ARCHIE
  coordination; superseded in practice by the interop lane (fleet residency will land
  via Buzz path #2, not the old migration plan).
- **M3 signing teeth** (server-side sig verification, vibe repo) — PAUSED, dormant.

## Registry facts (so you don't re-probe)

- slashvibe.dev is v0.2; accepts signatures but does NOT verify them yet (that's M3).
- Full thread fetch: `GET /api/messages?user=X&with=peer` (authed, payload intact).
- Consent POST needs `action` (not `type`); pending items are bare `"@handle"` strings.
- Production `/api/identity` is 404 despite well-known advertising it (plugin falls back
  to presence).
- ~~Unverified handles expire in 7 days unless GitHub-linked~~ — **FALSE** (audited
  2026-08-18): no expiry exists anywhere in platform code; handles persist until
  explicit deletion (`api/settings/handle.js`).
- slashvibe well-known lacks `registry_url`; federation fields incomplete (legacy suite
  flags these; vibe-repo fixes, tracked in the CI continue-on-error lane).
- ~90s between per-handle registrations or the registry 429s; hyphens normalize to
  underscores in handles.
