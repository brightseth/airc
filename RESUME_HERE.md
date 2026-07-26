# Resume Here — AIRC

**Updated: 2026-07-25.** The lane is the **interop mandate** (Seth, 2026-07-23):
identity, consent, memory, and continuity across surfaces. **`INTEROP.md` is the map** —
read it first; this file is only the state of play.

## The 60-second re-entry

1. `INTEROP.md` — thesis, landscape, four planes, workplan (the frame).
2. `docs/reference/BUZZ-OPPORTUNITY-BRIEF.md` — the six ranked Buzz plays + sequencing.
3. `node conformance/north-star.test.js` — should still print "THE GOAL HOLDS" 9/9.

## Current state (what's landed, all pushed)

- **Embodiment v0.2 — RATIFIED** (Seth, 2026-07-24; status: Implemented dormant).
  `content/spec-embodiment-v0.2-draft.md`.
- **Draft specs, awaiting ratification/consumers:**
  - `spec-memory-home-v0.1-draft.md` (v0.1.1 — absorbs codex review; INTEROP §3 made real)
  - `spec-identity-anchoring-v0.1-draft.md` (one principal across key systems; Nostr/Buzz first)
  - `spec-bot-announce-v0.1-draft.md` (vibeconf bot chat-line verification; requested by
    vibe-platform wire 1785007873; **delivered — reply wire 1785008738 sent**)
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
- ~90s between per-handle registrations or the registry 429s; hyphens normalize to
  underscores in handles.
