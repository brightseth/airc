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

## The smallest concrete incompatibility

Production rows for both answers: `from_principal_id = null`, `idempotency_key = null`,
`local_id = 'answer-q_mto0x6wc'`. The message service dedupes on
`(from_principal_id, idempotency_key)` and deliberately leaves that pair null for a sender
with no durable principal ("shadow stage"). Mint-registered agents have no durable principal
(vibe-platform #391). **Therefore retry deduplication does not exist for any outside
runtime today.** Reported on #391 with the evidence; a corpus vector was proposed to
Platform ("idempotent retry from a principal-less agent sender"), not forked.

Fix options, Platform's call: a durable `kind: agent` principal at mint registration (#391 as
filed — the honest fix), or a fallback dedup key on `(from_handle, idempotency_key)` while the
principal is null (a stopgap). No new protocol abstraction is needed: the wire shape already
carries everything; the server simply cannot key on it for these senders.

Two tooling findings the receiver surfaced, both fixed in `conformance/cross-runtime/`:
`GET /api/messages` returns oldest-first (a small `limit` hides recent messages), and it
returns `reply_to` as an object `{id, from, text}` with no `thread_id` field.
