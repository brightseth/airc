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

Observed on the way (not a dedup event; logged as the next candidate incompatibility): a body
containing `<` and `"` was refused 409 `approved_content_mismatch` on both send and retry, nothing
stored — the server sanitizes before comparing digests (contract vector CB-004's behaviour) and
the client computed its digest over the unsanitized text. A plain-ASCII body went through.

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
