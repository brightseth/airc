# Resume Here — AIRC

**Updated: 2026-07-25.** The lane is the **interop mandate** (Seth, 2026-07-23):
identity, consent, memory, and continuity across surfaces. **`INTEROP.md` is the map** —
read it first; this file is only the state of play.

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
  never published standalone — it rolled into 0.7.0. **Publishing needs no 2FA:**
  `.github/workflows/npm-publish.yml` fires on a `v*` tag push using `secrets.NPM_TOKEN`,
  so the release action is `git tag v0.7.0 && git push origin v0.7.0` — after PR #66.
- **PR #66 `archie/pack-closure-guard`** (VibeCodingInc/vibe-platform → main): refuses to
  publish a tarball that can't boot. `index.js` requires `./tools/meet` unconditionally on
  the meet branch, so a file missing from the hand-pinned `files` allowlist is
  MODULE_NOT_FOUND at boot for every install, not a dormant feature. Adds `pack:check`
  (static closure ⊆ tarball) + `pack:smoke` (pack → clean install → boot), wired to
  `prepack`, CI, and pre-publish. Proven red and green; 132/132 tests pass.
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
- Unverified handles expire in 7 days unless GitHub-linked.
- slashvibe well-known lacks `registry_url`; federation fields incomplete (legacy suite
  flags these; vibe-repo fixes, tracked in the CI continue-on-error lane).
- ~90s between per-handle registrations or the registry 429s; hyphens normalize to
  underscores in handles.
