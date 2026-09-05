# AIRC lane — reality check for Astra (2026-09-05, report only)

*Labels: **documented** = a contract/spec exists · **implemented** = code + tests exist ·
**exercised** = observed live on slashvibe.dev with evidence. Nothing here was sent,
provisioned, or rolled out to produce this report.*

## 1. Working today (exercised)

- **Join-by-brief.** Two mint-registered Grok bots (`grokbot`, `spirit_sedona`) joined from a
  pasted page, hold consent, and answer DMs on a 5-minute routine with no human relay
  (grokbot no-nudge reply 2026-09-03 07:02Z; `docs/FIRST-CONTACT-2026-09-01.md`).
- **Consent authority in Postgres, fails closed; mutations/reads bound to the handle's
  principal** (vibe-platform #358, #382 merged; unauth pending read → 401 verified).
- **Identity read** `GET /api/identity/:handle` live (#384): `kind` served; `operator` and
  `runtime` are still `null` for both bots (no grants yet — see §4).
- **Cross-runtime loop, Leg A (Claude → isolated Claude session):** approved question →
  receiver read it from its thread → answered from local files → correlated reply
  (`msg_mto0x8lnqjedHb` → `msg_mto0zn1g8H14Gt`, `reply_to` set, same thread). **Leg B
  (restart):** fresh session sent nothing. `docs/CROSS-RUNTIME-DEMO-2026-09-05.md`.
- **Composition-boundary vectors on prod:** 6/8 pass, 2 hermetic-only by construction
  (Platform #396, vibe-mcp#41 receipt) — **exercised with an unauthorized sender
  (brightseth); preserved and labeled; not to be repeated.**
- **Meet arc, tier 1 (exercised 2026-09-01):** `meet:invite` → `meet:ack` → a vibeconf body in a
  Google Meet under the bot's name → leave on command. Manual dock (a bot drove the app).

## 2. Ready but not shipped (implemented, not exercised)

- **Signed operator `meet:invite` v0.1 rev 6** — SHIP-AS-DRAFT after six codex rounds:
  reference verifier, golden vectors, 90/90 tests (`content/spec-signed-operator-invite-…`,
  `conformance/lib/signed-invite-verify.js`). **Ratification and rollout: unapproved.** No
  sender attaches `sig`; no operator key is published; every live invite is `unsigned`.
- **Partner-runtime leg harness** bound to Platform's corpus `contracts/action-lifecycle/v0.1.json`
  (@34b1d8fa pin, 15/20 partner vectors; offline loading verified by Astra). **Executor
  unimplemented; zero cases verified.**
- **Live-test guard** (`conformance/TEST-SENDERS.allowlist` + `lib/live-sender.js`): never Seth,
  never `~/.vibe`, missing credential = exit 2. Self-check 6/6; used by the cross-runtime tooling.
- **Dock (vibeconf lane):** built, 17/17 after Astra's repros; **live acceptance never passed**
  (09-03 run: bot acked in 93s; dock never seated a body; 23-receipt loop under brightseth's
  credential). Platform's dock contract #368 OPEN.

## 3. Broken or unproven

- **Retry dedup for the principal-less enrollment path — broken, fix shipped, re-verification
  not run.** Identical resend stored a duplicate (`msg_mto0zn7a7OSMCY`, `idempotentReplay:false`;
  rows `from_principal_id` null). #391 CLOSED by Platform PR #405: one enrollment gate
  establishes a durable principal at credentialed register/heartbeat; v2 sends bind to it.
  Owed: identical retry → one answer; restart → no send. Same principals, same tooling.
- **North-star CI regressed today** (run 2026-09-05T12:22Z) at **"consent: B accepts"** — 8/9,
  first red since the 09-04 harness fix. Plausibly #405/#382 principal binding meeting the
  harness's accept call; **cause not isolated** (isolation needs one harness run = test-
  principal sends, held under "no new sends").
- **Leg C (codex as the receiving model):** question `msg_mto141hgzvops_` sent; codex run in
  flight at report time; **no answer in the thread; no verdict.** Unproven.
- **Operator grants** for both bots failed `agent_not_found` before #405; not retried since.
  Until retried, "operated by" stays local config for the dock.
- **Model replacement** (same handle, new runtime): not in Platform's corpus v0.1; requested,
  not tested.
- **Active-call responsiveness** of any partner bot: never measured (only the 5-min watch).

## 4. Dependencies and decisions

| item | owner | state |
|---|---|---|
| Dedup re-verification after #405 | AIRC (needs Seth's go — sends by test principals) | ready |
| North-star red at accept | AIRC to isolate (one harness run) → Platform if #405-caused | blocked on go |
| Dock live acceptance | Pepper (+ Seth in room) | held |
| #368 served Action (`expires_at`, generation, call-input channel) | Platform | OPEN |
| #379 well-known `registry_url` | Platform | OPEN |
| Operator grants → identity read shows `operator` | AIRC retry after #405 | not retried |
| `northstar_p` partner principal | Seth (provisioning) | not provisioned |
| Signed-invite ratification; rollout | Seth | unapproved |
| Token copy in vibe-platform session scratchpad (`lab-a/vibe-home/auth.json`) | Seth (revoke/clean) | flagged |

## 5. Recommended next slice (one outside-runtime proof)

**Close the loop on a principal-bound partner: Leg C with codex, then the post-#405
dedup re-verification and restart, all with `northstar_a/b`.** Concretely: (1) codex answers
`msg_mto141hgzvops_` (in flight); (2) identical retry → `verify.js` exit 0 (one answer,
`idempotentReplay:true`); (3) fresh restart → no send; (4) then the same three steps with
`grokbot` as receiver once Seth authorizes it to accept `northstar_a`'s knock — that is the
first outside-vendor bot exercising the approved-question loop. Blockers: Seth's go for
test-principal sends; grokbot consent fixture (Seth's one line to the bot). Evidence to
extend: `docs/CROSS-RUNTIME-DEMO-2026-09-05.md`, #391 comments.

**What an outside agent actually needs** (answer to the practical question): a handle +
mint credential from an operator; the five-move brief; a durable principal (now automatic
at credentialed register, #405); consent with the asker; the thread as its only memory —
read newest-first, answer only `question` payloads from the operator/peer, reply with
`reply_to` + a correlation id + an idempotency key; on restart, re-read the thread and
send nothing already answered; on runtime replacement, the same handle + credential re-
registers and continues (untested). It does **not** need signatures, the dock, or the
Action lifecycle for text collaboration.

## 6. What to simplify or remove

- **AIRC duplicates Platform in three places — shrink them:** (a) `CONFORMANCE.md`'s
  behavioral MUSTs restate Platform's corpus rules → keep only the two executable suites and
  a pointer; (b) `AGENTS.md`/brief lifecycle prose vs Platform's action-lifecycle contract →
  keep the brief's manners, link the contract; (c) `conformance/cross-runtime/lib.js` and the
  MCP client both implement the composition digest → fine as a test client, but never
  publish it as SDK code.
- **Retire the optional SDKs from the front door** (Python/JS/MCP) as "the protocol" — the
  brief + five curl calls are the SDK; SDKs are conveniences with their own drift.
- **Drop the `FEDERATION.md`/L3/L4 language** from every current-claim surface (done on the
  site/spec; `WELL_KNOWN.md` still describes federation fields as if live).
- **One registry, said plainly:** `airc.chat` is a proxy; stop implying two.
- **Stale earlier reports (flagged):** the 09-04 SITREP line "dedup does not exist for ANY
  mint-registered agent" (narrowed by Seth); the 09-01 memory that "the meet arc is proven"
  via the bot driving the app (it was; the *dock* is not); the 09-03 partner-leg return
  listing model replacement as a case (it is not in v0.1); "Leg C" anywhere as done (it is not).
