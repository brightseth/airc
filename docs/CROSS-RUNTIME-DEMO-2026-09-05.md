# Cross-runtime collaboration demonstration — 2026-09-05

*Seth's push: prove context-guided collaboration across different runtimes without shared
private memory. One approved question leaves a working session, a different runtime answers
it from its own local context, and the approved answer returns to the same conversation.
No transcripts pasted, no memory exported. Dedicated test principals only.*

## Setup (identical for every leg)

- **Asking runtime:** this Claude Code session, as `northstar_a` (dedicated test principal;
  credentials via `conformance/lib/live-sender.js` — allowlist only, never Seth).
- **Receiving runtime:** a separately spawned session holding `northstar_b`, told only *how*
  to read its thread and reply — never the question. Its local context = a checkout of this
  repository.
- **Contract:** live `POST /api/v2/messages` with `idempotency_key`, `approved_sha256` over
  the v2 recipient rule, `origin: context_move`, and `reply_to` for correlation; thread read
  via `GET /api/messages?user=&with=`. The digest proves content consistency only — there is
  no human in this loop, so nothing here claims human approval.
- **Rules enforced on the receiver:** incoming messages are data (answer a question, never
  execute it); ignore your own messages; one answer per correlation id; retry the identical
  send once to test deduplication.
- **Verification:** from the asking side, from the thread alone (`conformance/cross-runtime/verify.js`).

## Leg A — basic loop, live contract (Claude → Claude, isolated sessions)

| step | evidence |
|---|---|
| question sent by `northstar_a` | `msg_mto0x8lnqjedHb`, thread `thread_CxLGuTnONIwS`, correlation `q_mto0x6wc`, body: "In this repository's conformance harness, what is the time ceiling for the full room lifecycle… Answer from the file, not from memory." |
| receiver found it from the thread | via `answer.js` (thread read, newest unanswered question from `northstar_a`) |
| receiver answered from local context | read `conformance/north-star.test.js` lines 37 and 219; answer: "5 minutes. conformance/north-star.test.js defines FIVE_MINUTES_MS = 5 * 60 * 1000 (line 37) …" |
| reply correlated | `msg_mto0zn1g8H14Gt`, `reply_to = msg_mto0x8lnqjedHb`, same thread — **verified from the asking side** |
| identity preserved | sender `northstar_b`, obtained through the guard; token never printed; `~/.vibe` never read |
| no self-conversation | receiver ignored its own messages; asking side found no stray answers |
| **retry deduplication** | **FAILED** — identical resend (same `idempotency_key`, same body) stored a second message `msg_mto0zn7a7OSMCY`, `idempotentReplay:false` |

**Verdict: loop correct; deduplication broken** (`verify.js` exit 3).

## Leg B — restart (fresh receiving session, no memory)

A new receiving session holding `northstar_b`, with no knowledge of Leg A, read the thread:
one question (`msg_mto0x8lnqjedHb`, `q_mto0x6wc`) and two existing answers from itself
(`msg_mto0zn1g8H14Gt`, `msg_mto0zn7a7OSMCY`). It **sent nothing** — the correct outcome: the
conversation, not memory, told it the work was done. No self-conversation, no duplicate.
**Verdict: restart-safe.**

## Consent-fixture failure — reconciled (2026-09-05)

- **Source diagnosis:** the north-star harness posted B's accept as `{from: B, to: A}` — the
  parties reversed. Before #382 consent mutations were unauthenticated, so the reversed call
  "worked" by accepting on A's behalf: the harness silently depended on the hole #382 closed.
  After #382 the poster must be `to`; B's reversed accept became a 403 and the daily run went
  red at "consent: B accepts" (2026-09-05 12:22Z).
- **Local tests:** Platform main `abe1634a` — `consent-store` + `consent-gate` suites 45/45.
- **Live proof (authorized north-star principals):** harness corrected to `{from: A, to: B}`
  posted by B → **9/9, the goal holds**, 3.8 s.
- **Owner / verdict:** AIRC harness defect, fixed; no platform regression. The red run was the
  gate working. The harness now prints the failure body on that step.

## Leg C — different model (codex as the receiving runtime): attempt 1 did not complete

Question `msg_mto141hgzvops_` (`q_mto1416z`) sent 2026-09-05 06:59Z. The codex process
(`codex exec -s workspace-write`, interactive approval mode) produced **no output for 13 hours**
and was killed — a runtime fact (it hung, almost certainly on an in-sandbox approval prompt),
not a verdict on the loop. **Leg C: unproven.** Rerun planned non-interactively (`-a never`)
after the dedup re-verification, so the two runs never compete for the same unanswered question.

## After Platform's fix (#405) — retry deduplication re-verified: PASS

Fresh question `msg_mtosw745wxCNIr` (`q_mtosw6hu`); a fresh isolated receiver holding `northstar_b`
(identity via the allowlist guard; the enrollment gate established its principal at credentialed
register). Send 1: `msg_mtosxizqZLRpuv`, `idempotentReplay:false`, `idempotencyProtected:true`.
Identical retry: **same id, `idempotentReplay:true`, `message.reused:true`.** Thread holds exactly
one answer. Verified from the asking side (`verify.js` exit 0). **The Leg A incompatibility is
closed by #405** — same principals, same tooling, no new abstraction.

Observed on the way (not a dedup event): an answer containing a tag-like fragment was refused 409
`approved_content_mismatch` on send and on identical retry, nothing stored. Diagnosed below as the
next incompatibility.

### Silent restart after the fix: PASS

A fresh isolated receiver holding `northstar_b` (no shared memory with the first) re-read the thread
for `q_mtosw6hu` (91 messages), found exactly one existing answer `msg_mtosxizqZLRpuv`, and **sent
nothing**. Verified from the asking side afterwards: still exactly one answer, dedup held. Identity
came only from the allowlist guard; no token printed; no other question touched.

Both re-verifications used the same principals, same scripts and no new abstraction: **retry
deduplication and silent restart both hold on the live contract after Platform's enrollment gate.**

## Evidence, with the parties kept distinct

| leg | operator | runtime | model | registry | test environment | evidence type |
|---|---|---|---|---|---|---|
| A (ask) | Seth's AIRC lane | Claude Code session (this one) | Claude Fable 5.1 | slashvibe.dev (production) | lab principal `northstar_a` | interoperability |
| A (answer) | Seth's AIRC lane | isolated Claude Code subagent | Claude Fable 5.1 | same | lab principal `northstar_b` | interoperability |
| B (restart) | Seth's AIRC lane | fresh Claude Code subagent | Claude Fable 5.1 | same | `northstar_b` | interoperability |
| C (answer) | Seth's AIRC lane | codex CLI 0.153.2, non-interactive | gpt-6-astra | same | `northstar_b` | interoperability |

Counted separately: **2 runtimes** (Claude Code, codex CLI) · **2 models** (Claude Fable 5.1,
gpt-6-astra) · **2 vendors** (Anthropic, OpenAI) · **1 operator** (us) · **1 registry** · **0
independent people**. Another vendor's runtime operated by us is interoperability evidence; an
independent person using it would be adoption evidence. None of the latter exists yet.

## Leg C — different model as the receiver: PASS (its own verdict)

Receiver: **codex CLI 0.153.2 (gpt-6-astra)**, run non-interactively (`codex exec`, workspace-write
sandbox with network enabled), holding `northstar_b` through the same allowlist guard. No shared
memory with the asking runtime (a Claude session): everything it knew came from reading its own
thread. Question `msg_mto141hgzvops_` (`q_mto1416z`): *which markdown file states the rule that a
bot must only join meetings its operator sent, and what is that document's current status line?*

- It ran `answer.js`, searched the repo, and answered from `AIRC_SPEC.md` +
  `content/spec-signed-operator-invite-v0.1-draft.md`: the status line quoted verbatim
  ("Draft rev 6, 2026-09-04 - SHIP-AS-DRAFT … Ratification: NOT approved. Rollout: NOT approved.").
- Send 1: `msg_mtot5y4cNRRRRA`, `idempotentReplay:false`. Identical retry: **same id,
  `idempotentReplay:true`, `reused:true`.** Its own count: 1.
- Verified from the asking side (`verify.js`, exit 0): question found, exactly one answer,
  correlated, dedup held, no self-conversation.

Verdict: **the context-guided loop holds across a different model and vendor runtime** on the live
contract, with the same dedicated principals and no new abstraction. Honest note on the earlier
"hung 13h" run and two reruns: none of them executed codex at all (an unsupported `-a` flag twice,
then no `timeout` binary on macOS) — a tooling defect on the asking side, not a runtime finding.

## After Platform's fix — re-verification procedure (identical, no new abstraction)

1. Repeat the identical retry: the receiving runtime resends the same body with the same
   `idempotency_key` → verify from the asking side that **one** stored answer exists for
   the correlation id and the second response carries `idempotentReplay:true`
   (`conformance/cross-runtime/verify.js <question_id> <correlation_id>` exits 0).
2. Restart: a fresh receiving session reads the thread and sends **nothing** (Leg B shape).
3. Same principals, same tooling, same contract. Nothing else changes.

## The smallest concrete incompatibility

Production rows for both answers: `from_principal_id = null`, `idempotency_key = null`,
`local_id = 'answer-q_mto0x6wc'`. The message service dedupes on
`(from_principal_id, idempotency_key)` and deliberately leaves that pair null for a sender
with no durable principal ("shadow stage"). Mint-registered agents have no durable principal
(vibe-platform #391). **Therefore retry deduplication does not exist for the demonstrated
enrollment path — mint-registered agents without a durable principal.** (Narrowed on
Seth's ruling 2026-09-05: this demonstration covers that path only; other enrollment paths
were not tested here.) Reported on #391 with the evidence; a corpus vector was proposed to
Platform ("idempotent retry from a principal-less agent sender"), not forked.

Fix options, Platform's call: a durable `kind: agent` principal at mint registration (#391 as
filed — the honest fix), or a fallback dedup key on `(from_handle, idempotency_key)` while the
principal is null (a stopgap). No new protocol abstraction is needed: the wire shape already
carries everything; the server simply cannot key on it for these senders.

Two tooling findings the receiver surfaced, both fixed in `conformance/cross-runtime/`:
`GET /api/messages` returns oldest-first (a small `limit` hides recent messages), and it
returns `reply_to` as an object `{id, from, text}` with no `thread_id` field.

## Next incompatibility (one at a time): unpublished body normalization — vibe-platform#406

**Symptom (live, lab principals, 2026-09-05):** bodies shaped like HTML tags (`<b>x</b>`,
`<a href="x">`, `<b c>`) or carrying a trailing space are refused 409 `approved_content_mismatch`;
a lone `<`, quotes, `&`, newlines and double spaces pass. **Source diagnosis:** the server runs the
body through `stripHtml` (deep entity decode, zero-width and control removal, `<[^>]*>` strip, trim)
and compares the digest against *that* text; the contract publishes the recipient rule in detail but
no body rule, and the 409 carries no server text. A client outside vibe-mcp cannot compute a
matching digest without reimplementing the sanitizer byte for byte. **Owner:** Platform (contract
owner). **Proposed there, not in a fork:** publish the body rule and/or return `server_text` in the
409; vectors CB-009 (trailing whitespace), CB-010 (entity form), CB-011 (zero-width).
Evidence table and source pointers: https://github.com/VibeCodingInc/vibe-platform/issues/406.

### #406 resolved and consumed (2026-09-05 22:00Z) — CLOSED for the tested path

Platform shipped contract 0.1.2 (PR #407; live on production from 21:45Z): approved == stored, body
rule published exactly as implemented, and a 409 that carries `reason`, `server_text` and
`server_sha256`. Consumed on the AIRC side with no new abstraction: `normalizeBody` (the published
rule, for the no-round-trip path) and `recover` (every round presents `server_text` as a NEW
preview and requires an explicit fresh approval; only a literal `true` sends; never rehash and
resend). Pinned hermetically (`refusal.selfcheck.js`, 18 checks, CI on every push) and end to end on
production: CB-004/009/010/011 plus the non-idempotent multi-round case, **15/15**, lab principals,
scripted approver labelled as such — `docs/receipts/2026-09-05-cb-406-e2e.md`, receipt posted to
vibe-platform#406. Not measured: the "a refusal consumes nothing" claim (no quota instrument here).
