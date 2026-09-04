# Resume Here — AIRC

**Updated: 2026-09-03. Read `docs/SYSTEM-MAP.md` first (four layers, one diagram), then this.**

## State of play — AIRC is REACTIVATED (trigger #1 fired 2026-09-01)

**What is true now (all pushed):**
- **Two partner bots are citizens, each on its own runtime and credential:** @grokbot (xAI
  "AIRC" bot) and @spirit_sedona (its own Grok bot, mint rotated via
  `provision-partner-bot.sh <handle> --rotate`). Both run an "AIRC watch" routine every
  5 minutes and answer DMs with no human relay. Full arc proven for both: register →
  knock → accept → typed payloads → round trip. Threads: brightseth↔grokbot
  (thread_tuwBA4fGR48Z), brightseth↔spirit_sedona.
- **The meet arc is proven:** `meet:invite` → `meet:ack` → a vibeconf body in a Google Meet
  under the bot's name (announce spoken aloud) → `meet:leave` on command. `meet:invite`
  v0.2 (dock payloads) was RATIFIED agent↔agent over AIRC itself — the bot's
  `spec:proposal` matched the addendum field-for-field.
- **The dock is BUILT** (PEPPER, 22/22 tests, on the AWS fleet box vibeconf-seth, Electron
  body path). Contract + AIRC-lane answers: `vibeconf/memos/2026-09-01-dock-bridge/BRIEF.md`.
  **Live acceptance run awaits Seth in the Meet** (host = seth@spiritprotocol.io,
  room mrq-ujjh-qna): invite → ack → body-in ≤60s → say → transcript → leave → receipt.
- **Consent has Postgres authority** (vibe-platform #358 merged+deployed; #362 renumber
  merged). Lesson, binding: main auto-deploys prod — diff `migrations/` vs the prod ledger
  BEFORE merging (099_operator_grants unapplied took sends down for ~40 min).
- **airc.chat, AIRC_SPEC.md, README, llms.txt, CLAUDE.md aligned (2026-09-03):** not an
  app, four layers, five moves, "what is true today"; versions roadmap gone.
- **Platform asks filed:** vibe-platform #371 consent as an enforced gate + authenticated
  mutations; #372 identity read (`content/spec-identity-read-v0.1-draft.md`); #373 revoke
  tokens on mint rotation.

**Findings worth remembering:** a bot's own browser joins Meet as its OPERATOR's Google
identity (the dock is the only path to a body under the bot's name); Grok bots have no
API/webhooks — routines are the only autonomous trigger; mint rotation does NOT revoke
issued tokens; all of one operator's Grok bots share one VM filesystem; the grokbot has
computer-use on M5 + Mac Studio — both set to "Ask every time".

**Seth's ruling 2026-09-03, executed:** narrative fixed with maturity labels
(`docs/NARRATIVE.md`); dock live-run sheet for PEPPER (vibeconf brief); build contracts
handed to platform — #371 (`docs/reference/CONSENT-GATE-CONTRACT-371.md`), #372
(`docs/reference/IDENTITY-READ-ACCEPTANCE-372.md`); CONFORMANCE.md = registry profile by
real tests; well-known fix PR #379; per-runtime briefs (`docs/briefs/make-brief.py`).
Daily one-liner to cc-seth: proven / held / blocked; wire Seth only for decisions.

**Next, in order:** ① live dock acceptance run (Seth says "go" from the Meet; airc +
PEPPER drive; run sheet in the dock brief) ② Rebecca note ③ #371/#372/#373/#379 land in
the platform lane ④ signed operator `meet:invite` ⑤ native bot participant in vibeconf
(`docs/CHALLENGE-FIRST-CLASS-BOT-PARTICIPANT-2026-09-01.md`).

Records: SITREP 2026-09-01..03 entries; `docs/FIRST-CONTACT-2026-09-01.md`;
`docs/reference/REFLECTION-2026-09-01-FIRST-CONTACT.md`.

---

**(Prior state, 2026-08-20 — posture context still true except dormancy:)**

## POSTURE — standards + reserve (Seth, ratified 2026-08-20)

**AIRC is not a neglected lane; it is a demoted-on-purpose one.** The relationship,
renamed:

1. **Standards + reserve.** This repo is the constitution of the horizontal layer —
   a document you *cite*, not a product you *ship*. Maintenance = keep
   `conformance/north-star.test.js` green. Nothing else. No SDK features, no adoption
   pushes, no v0.3 DID / v0.4 federation work unless a trigger fires.
   ⚠️ **North-star maintenance (2026-08-23, FIXED in code — provisioning pending):**
   CI had been RED daily since ~Jul 29: the platform closed open registration
   (pre-launch anti-spam), so "handle is the only input" could never pass again and
   delivery checks cascaded. The old caveat here ("a red local run may be 429s; CI is
   the source of truth") was itself stale — the source-of-truth job failed silently
   for 3.5 weeks. Fixes landed: the harness now runs as two dedicated credentialed
   principals (`northstar_a`/`northstar_b`, x-agent-mint; exit 2 = unprovisioned vs
   exit 1 = broken; all assertions run-scoped since the rooms persist), and the
   workflow rings Telegram on failure. **RESOLVED 2026-08-24: 9/9, THE GOAL HOLDS**
   (CI run 32690060553) — first green since Jul 29. Provisioned via
   `~/.seth/scripts/provision-northstar.sh` (Seth, 2026-08-23). Local runs from a
   busy fleet IP may still 429 on the 5/hr register budget — the harness now prints
   the register error loudly; CI is the verdict and it rings Telegram when red.
   **Related regression, same root:** enrolling the 8 watchdog credentials
   (2026-08-20) closed those handles' open bootstrap, 401-ing the Studio answerers'
   token refresh (max caught red-handed). Engine fix landed in
   `~/.seth/airc-answerers/answerer-engine.mjs` (register now presents the handle's
   own x-agent-mint when the credential file exists); needs a pm2 restart of the
   Studio answerer fleet.
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
- Unverified handles expire in 7 days unless GitHub-linked — **TRUE but narrower than
  it sounds** (corrected twice: audit 2026-08-18 called it false; re-audit 2026-08-23
  found it): `OPEN_TTL_DAYS = 7` applies only to handles claimed through the (now
  credential-gated) open-registration bootstrap in `presence-service.js`; GitHub-linked
  and pre-existing handles persist until explicit deletion.
- slashvibe well-known lacks `registry_url`; federation fields incomplete (legacy suite
  flags these; vibe-repo fixes, tracked in the CI continue-on-error lane).
- ~90s between per-handle registrations or the registry 429s; hyphens normalize to
  underscores in handles.
