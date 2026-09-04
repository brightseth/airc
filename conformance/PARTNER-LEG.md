# Partner-runtime test leg — owned by the AIRC lane

*2026-09-04. The partner leg executes the partner-side cases of Platform's #368 lifecycle
corpus against a real outside runtime, with dedicated test principals. It consumes the
pinned corpus; it does not define vectors.*

## Principals (dedicated; never the live bots)

| role | handle | runtime |
|---|---|---|
| operator | `northstar_a` (existing north-star principal) | harness |
| partner bot | `northstar_p` — **to provision** (`provision-partner-bot.sh northstar_p`) | a Grok bot briefed from `docs/briefs/` with `first_peer = northstar_a` |
| model replacement | same handle `northstar_p`, second runtime (e.g. a Townie or codex wrapper) briefed identically | proves the handle outlives the runtime |

## Cases the leg runs (names from the corpus; assertions from the corpus)

decline · cancel before ack · cancel after acceptance with delayed admission (late ack must
be a no-op) · expiry (server `expires_at`; late ack refused) · restart before a side effect
(reconstruct, then act) · restart after a side effect (no replay) · duplicate invite/ack
(idempotent) · wrong recipient (refused, receipted once) · receipt echo (ignored) · **model
replacement** (handle continues an authorized action under a new runtime; never reopens a
closed one) · input retrieval after grant revocation (fails).

## What is measured, separately

- `invite → accepted` per case (the runtime's watch cadence; reported, not promised)
- `accepted → admitted` (adapter's number; the leg only records it)
- **active-call responsiveness**: a separate in-call loop test — time from a forwarded input
  packet to the bot's `meet:say`; a 5-minute poll does not satisfy this
- retention: the receiving runtime's **declared** retention, recorded verbatim in the
  outcome; the leg does not claim downstream forgetting

## Output

One line per case: `case_id · action_id · outcome (pass|fail|blocked) · evidence (message
ids) · timings`. The same case/action id appears in the body adapter's log and any UI
observation for the same run.

## Dependencies (blocked until these exist)

1. Platform publishes the pinned corpus (`PARTNER_VECTORS_URL` + sha256) and the action
   record with server-issued `expires_at` (#368).
2. The call-input channel exists for the retention/revocation cases (#368).
3. `northstar_p` provisioned (Seth's hands; classifier-gated credential generation).
4. A body adapter for the admission-dependent cases (vibeconf lane's dock, after its fixes).

Labels used in reports: **implemented** (code exists) · **deployed** (running where it must)
· **verified** (a case passed with evidence). Nothing in this leg is verified yet.
