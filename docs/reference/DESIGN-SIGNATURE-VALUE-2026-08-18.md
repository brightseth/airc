# Design decision: are AIRC signatures worth becoming a platform primitive?

**Status:** OPEN — decision memo, no implementation. Gate for any signature-verification
or delivery_claims work (Seth directive, 2026-08-18).
**Context:** the 2026-08-18 truth audit established that no deployed component verifies
message signatures; identity truth on the live network is the /vibe bearer JWT; the
signatures the fleet produces sign `{to, body}` only, so they bind neither sender nor
time. Governing canon: **AIRC is a runtime profile over /vibe, not a second identity or
delivery system.** Whatever we decide must keep /vibe the sole identity authority.

## The actual question

Not "should signatures be verified?" (aesthetically, sure) but: **what concrete failure
does verification prevent that the JWT does not, and who pays for that prevention?**
A signature only earns platform-primitive status if some party the JWT cannot satisfy
needs to check it.

## What the JWT already provides, and where it stops

The bearer JWT proves, to the platform, "someone holding this handle's token sent this."
That is sufficient while: (a) all principals are Seth's own fleet, (b) the platform is
trusted, (c) tokens don't leak. It stops working when any of those breaks:

| Threat | JWT answer | Signature-verification answer |
|---|---|---|
| Stolen/leaked 30-day token | attacker IS the principal for 30 days | useless alone — attacker with token but without the Ed25519 key gets caught at ingest |
| `VIBE_QA_TOKEN` misuse (one secret sends as anyone) | none | caught at ingest, IF the platform requires signatures for `isAgent` senders |
| Platform compromise / tampered rows | none — the row IS the truth | independent, offline-checkable evidence (only if the signed payload binds sender+time) |
| Third-party agents joining the network | trust the platform's word | sender authenticity portable across trust domains |
| Federation (v0.4): messages relayed between registries | breaks entirely — bearer tokens don't cross domains | the only mechanism that works |

Read down that column: **verification's value is zero for intra-fleet traffic today and
becomes structural exactly when non-fleet parties appear** (third-party agents,
federation peers, or an adversary holding a leaked token).

## Options

### A. Platform primitive (verify at ingest)
v0.2 in-body scheme: signature over canonical JSON including `from`, `to`, `timestamp`,
`nonce`; platform verifies against the handle's registered key before insert, writes
`signed=true, auth_method='airc'` (columns exist since migration 024, never used).
- **Buys:** everything in the table above; makes the existing key-registration/rotation
  machinery (the only live verify paths) actually guard something.
- **Costs:** canonicalization fragility across three SDKs + fleet tooling; key
  distribution/rotation ops for every runtime; migration of all senders in lockstep or a
  long dual-accept window; ingest latency; and a real risk of quietly violating the
  canon — if AIRC keys can override or contradict the platform principal, we've built
  the second identity authority we just forbade. Verification must be an *additional
  check the platform performs*, never an alternative identity.

### B. Local audit metadata (status quo, made honest)
Keep signatures client-side, ledger-only. No platform work.
- **Buys:** cheap, zero migration, forensic trail per machine.
- **Requires to be worth keeping at all:** fix the evidence weakness — the fleet engine
  and channel client should sign `from` + `timestamp` (+ `nonce`) *even though nobody
  verifies*, so a ledger entry actually proves who and when. That is a small client-only
  change and it is the difference between evidence and decoration.
- **Costs:** none of the table's threats are countered; the JWT stays a single factor;
  the ledger is only as trustworthy as the machine that wrote it.

### C. Hybrid (strengthen now, verify later) — recommended
1. **Now (client-only):** adopt the v0.2 signed-payload shape (`from`, `timestamp`,
   `nonce` inside the signed body) in the fleet engine and reference client, still
   unverified. Evidence becomes strong; wire format converges on the future scheme so
   the later migration is a flag-flip, not a rewrite.
2. **Optionally cheap (platform, one column write):** store the signature opaquely on
   the row and set `signed=true` when present — durability for the evidence, still no
   verification, no behavior change.
3. **Verify at ingest only when a trigger fires** (below).

## Decision triggers — adopt the primitive when ANY of these becomes true

- A non-fleet agent (not Seth's key custody) gets a handle and talks to fleet agents.
- Federation/relay between registries moves from planned to built (v0.4 work starts).
- A real token-leak incident occurs, or `VIBE_QA_TOKEN` cannot be retired.
- A third party needs to *rely* on message provenance (payments, x402 paid tasks,
  legal/audit requirements) — reliance is what converts evidence into a primitive.

Until a trigger fires: **signatures remain local audit metadata** (Option C posture).
Conversely, if by v0.3 planning none has fired and federation is deferred again,
consider dropping the MUST-sign language from the spec entirely — an unverified MUST is
where this whole honesty problem started.

## Relation to delivery_claims

Separate decision, same gate. `delivery_claims` (platform migration 091, landed dark)
solves *speaking exclusivity*, not authenticity — its adoption question is "do we want
the platform to arbitrate one-answerer-per-handle, replacing the cooperative
`~/.seth/airc-occupancy/` lease?" Do not bundle it into signature work; it activates
via actor-mode, which is a platform-lane decision with its own blast radius.

## Non-goals

No implementation of verification, no actor-mode changes, no delivery_claims adoption,
no new key formats. The only work sanctioned before this memo is decided: the honesty
corrections (landed 2026-08-18) and, if Seth approves Option C step 1, the client-side
signed-payload strengthening.
