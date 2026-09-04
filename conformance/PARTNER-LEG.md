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

## Cases the leg runs — exactly the corpus's partner-tagged vectors (15 of 20 in v0.1)

AL-001 authorized invite · AL-002 invalid actor · AL-003 invalid grant · AL-004 invalid
audience · AL-005 duplicate invite · AL-006 duplicate ack · AL-007 decline · AL-008 cancel
before ack · AL-010 expiry · AL-015 wrong recipient · AL-016 receipt echo · AL-017 input
retrieval after grant revocation · AL-018 zero fan-out for call input · AL-019 own voice
under a live grant · AL-020 delegated speech provenance.

Body-only in v0.1 (the vibeconf lane runs them; the partner leg observes, never asserts):
AL-009 cancel after acceptance with delayed admission · AL-011/012 restart before/after a side
effect · AL-013 stale executor callback · AL-014 failed leave.

**Requested addition to the corpus (Platform's to add, not AIRC's to write):** an explicit
*executor replacement while the old runtime is alive* vector (legs `partner`,`body`): a new
runtime takes over an action → server advances the generation; the old runtime's callbacks
produce nothing; re-registering the same handle alone is not a takeover; a model change
inside one executor does not advance it. Until it exists, "model replacement" is not a
tested outcome here.

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

## Corpus binding (pinned)

- Source: vibe-platform `contracts/action-lifecycle/v0.1.json` (branch
  `docs/action-lifecycle-contract-368`, commit `34b1d8fa`; owner vibe-platform; doc
  `docs/ACTION-LIFECYCLE-CONTRACT.md`).
- Pin: sha256 `20d09c7e6882728178660de1b34ec7542e1e3c11708678b327b732e3112456fc`.
- Schema consumed: `{contract, version, owner, canon_sha, authorization_states, body_phases,
  message_kinds, rules, vectors[{id, name, legs, given, when, then}]}`.
- Selection: vectors whose `legs` includes `"partner"` — 15 of 20 in v0.1.
- Offline loading is demonstrated: `PARTNER_VECTORS_PATH=<file> PARTNER_VECTORS_SHA256=<pin>
  node conformance/partner-leg.test.js` prints the selected vectors and exits 2 (executor
  unimplemented). When Platform merges and publishes a URL, `PARTNER_VECTORS_URL` replaces
  the path; the pin stays.

## Executor generation (Platform owns it; the leg tests it)

Model-replacement vector: the new runtime explicitly takes over the action and the server
advances the generation; re-registering the same handle is NOT a takeover; changing the
model inside the same executor does NOT advance it. The leg runs replacement **while the old
runtime is still alive** and asserts the superseded generation's callbacks produce nothing.

## Dependencies (blocked until these exist)

1. Platform merges the corpus branch and the action record with server-issued `expires_at`
   and executor generation (#368). The corpus itself is already bound (above).
2. The call-input channel exists for the retention/revocation cases (#368).
3. `northstar_p` provisioned (Seth's hands; classifier-gated credential generation).
4. A body adapter for the admission-dependent cases (vibeconf lane's dock, after its fixes).

Labels used in reports: **implemented** (code exists) · **deployed** (running where it must)
· **verified** (a case passed with evidence). Nothing in this leg is verified yet.
