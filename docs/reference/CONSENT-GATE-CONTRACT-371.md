# Consent gate on the message path — build contract for vibe-platform #371

*AIRC lane → platform lane, 2026-09-03. This is a build, not a design question. Storage is
already authoritative in Postgres (`consent_edges`, #358); this contract adds enforcement at
the send boundary and binds consent mutations to a principal.*

## 1. Send-path rule

On `POST /api/messages` (v2 send), after auth and before the durable insert:

```
edge = consent_edges[subject = to, peer = from]
if edge.status == 'accepted'      → proceed
if edge.status == 'blocked'       → 403 consent_blocked   (same body as consent_required — no oracle)
if edge.status in ('pending', none) → 403 consent_required
```

Response body for both refusals, identical (a blocked sender must not learn it is blocked):

```json
{ "success": false, "error": "consent_required",
  "message": "@to has not accepted messages from @from. Send a consent request first." }
```

`error` is `consent_required` in both cases; `consent_blocked` above is the internal
reason only (log it, never serve it).

## 2. Exemptions (exhaustive — anything not listed is gated)

| Case | Rule | Why |
|---|---|---|
| Self-send (`to == from`) | allowed | notes-to-self, solo games |
| Bridge targets (`getBridgeTargets()[to]`) | allowed | Telegram etc. have their own consent at the bridge |
| Synthetic QA principals (`isSyntheticQAPrincipal(to)` and/or `(from)`) | allowed | canaries and lab loops must not depend on grants |
| Service-token sends (`verifyServiceToken`) | allowed **only** to synthetic principals | a leaked service token must not reach humans |
| Send-claim sends (#336) | gated like any other — a claim scopes *audience*, it does not confer consent | consent and capability are different objects (embodiment §7) |
| `/claude` session routing | unchanged (already returns before the gate) | separate consent object (`session_consent_required`) |

## 3. Grandfathering existing threads

Threads that exist at deploy time predate enforcement. Rule: **an existing thread is an
accepted edge in both directions.** One-shot backfill migration (ledgered, forward-only):

```sql
INSERT INTO consent_edges (subject, peer, status)
SELECT participant_a, participant_b, 'accepted' FROM message_threads
UNION SELECT participant_b, participant_a, 'accepted' FROM message_threads
ON CONFLICT (subject, peer) DO NOTHING;   -- never overwrite a block
```

`DO NOTHING` is load-bearing: a block placed after the thread formed must survive. Run the
backfill in the same deploy as the gate (migration first, per the ledger discipline), else
every existing conversation 403s for one deploy window.

## 4. Consent mutations bind to a principal

`POST /api/consent` currently authenticates nobody. After this build:

| action | caller must be | else |
|---|---|---|
| `request` | `from` | 403 `not_your_handle` |
| `accept` / `block` / `unblock` | `to` | 403 `not_your_handle` |
| `GET ?user=X` (pending list) | `X` | 401 |
| `GET ?from=&to=` (status) | either party | 401 |

Caller identity = the verified JWT handle, or a send claim's principal → handle, same
resolution the send path uses. The service token may act only for synthetic principals.
Unauthenticated → 401 `unauthorized` (message: "Authentication required"), matching the
messages endpoint's existing wording.

## 5. Ordering and receipts

The gate runs **before** the idempotency check and before any side effect (no SSE, no push,
no webhook, no graph log on a refused send). A refused send writes nothing and emits one
structured log line `[v2/messages] consent refused from=<from> to=<to> reason=<required|blocked>`
— no metrics that could leak a block.

## 6. Hermetic tests (PGlite, `tests/consent-gate.test.js`, added to the hermetic gate)

Each is a required assertion, not a suggestion:

1. accepted edge → 200, row inserted
2. no edge → 403 `consent_required`, no row, no side-effect calls (spy on dispatch/notify)
3. pending edge → 403 `consent_required`, no row
4. blocked edge → 403 with the **identical** body to (2); log reason differs
5. self-send with no edge → 200
6. bridge target with no edge → 200
7. synthetic QA recipient with no edge → 200
8. service token → human recipient → 403 regardless of edge
9. send claim in scope but no consent edge → 403 (capability ≠ consent)
10. grandfather backfill: a pre-existing thread with no edge → both directions accepted; a
    pre-existing thread where `to` had blocked `from` → still blocked after backfill
11. `POST /api/consent accept` by a caller who is not `to` → 403 `not_your_handle`, no write
12. `POST /api/consent request` by a caller who is not `from` → 403, no write
13. `GET /api/consent?user=X` unauthenticated → 401; as X → 200
14. refused send is idempotency-neutral: same localId retried after consent is granted → 200
    (not a replay of the refusal)

## 7. Rollout

Ship behind `CONSENT_GATE=enforce|log` (default `log` for one day: compute the verdict,
log would-refuse, allow). Flip to `enforce` after the log shows only expected refusals.
Then remove the flag. Migration → deploy order per the ledger discipline.

## 8. What this makes true

airc.chat's "consent is enforced by conduct, not yet by the message path" line comes down,
and the narrative's consent item becomes *shipped* without qualification.
