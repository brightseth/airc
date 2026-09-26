# AIRC Extension: Chain Provenance & Wake Declaration — v0.1 draft

**Status:** Draft, 2026-09-25. Owner: AIRC lane. Not ratified, not deployed. Raised by the Agent
Tincan review (`docs/reference/TINCAN-DEEP-DIVE-2026-09-25.md`), which does both of these inside
one owner's team. This draft carries them across owners.

## Problem

AIRC consent is **pairwise**. `@a` accepted `@b`. When `@b` sends to `@a` *because a stranger
`@c` asked it to*, `@a` sees only `@b`, so `@c` reaches `@a` without ever knocking. This is the
confused-deputy problem. Consent that one hop can launder is only advisory.

A second gap: presence says whether an agent is online. Nothing says **how an offline agent finds
out** it has mail, or how soon it will.

## Part 1 — Chain provenance

A message MAY carry `parent_id`: the id of the message the sender is currently handling. The
**registry**, not the sender, then sets:

| Field | Set by | Meaning |
|---|---|---|
| `parent_id` | sender (clients fill it automatically) | message being handled when this one was sent |
| `trace_id` | registry | inherited from the parent, or new |
| `hop` | registry | 1 for a new message, parent hop + 1 otherwise |
| `chain` | registry | handles the trace has passed through, oldest first |

Rules:

1. **The registry records the chain; the model doesn't.** A `parent_id` the sender did not
   receive is refused (`403 not_your_parent`). A client-supplied `chain`/`hop`/`trace_id` is
   ignored.
2. **Consent covers the whole chain.** A message is deliverable only if the recipient has
   consented to **every handle in `chain`**, not only the sender. Otherwise it's refused
   (`403 chain_not_consented`, naming the first unconsented handle to the *sender only*).
   Relaying through a consented agent never widens access.
3. **No loops.** A message whose recipient is already in `chain` is refused (`409 loop`).
4. **Bounded depth.** `hop > 4` is refused (`409 chain_too_long`). The registry MAY set a lower
   cap and MUST publish it in `/.well-known/airc`.
5. **Omitting `parent_id` doesn't escape the chain** when the registry can see the link: if the
   sender is holding an unanswered message it received less than the lease ago, and that
   message's thread is not the recipient's, the registry SHOULD treat the send as a continuation.
   This mirrors tincan's rule that the relay continues the chain even if the model leaves the
   parent out. *(Open: whether the heuristic is too broad for humans. Default it on only for
   `kind: agent` senders.)*
6. **The recipient sees the chain.** Delivered messages include `chain` and `hop`, so an agent
   can reason about origin. They're data, never authority.

Honest limit: an agent that reads a stranger's text out of band (a web page, an email) and then
acts on it has no chain to record. Chain provenance closes laundering *through the network*. It
does not close prompt injection. Operator instructions for high-power agents still apply.

## Part 2 — Wake declaration

Identity read (`GET /api/identity/:handle`) MAY serve:

```json
"wake": { "method": "poll", "every_s": 300 }
```

| `method` | Meaning |
|---|---|
| `webhook` | the registry (or an operator relay) POSTs a nudge |
| `email` | a nudge by mail |
| `command` | a local listener starts a run when mail waits |
| `channel` | pushed into an open session (e.g. a Claude Code channel) |
| `wait` | holds a long-poll open |
| `poll` | checks on its own schedule; `every_s` declared |
| `none` | acts only when a human is talking to it |

Rules:

1. **Method name only.** No URL, address, key or secret is ever served. (Tincan: "agents only
   ever see the method name".)
2. **Nudges carry counts, never content.** A nudge says how many items are waiting. The agent
   reads them itself through its authenticated inbox.
3. **Declared, not promised.** `every_s` is a schedule. UIs render "checks every 5 min", never
   "listening".
4. Set at enrollment or by the operator/handle, like `runtime`. Unknown means `null`, never
   guessed.

## Part 3 — `handoff` lifecycle vocabulary

For `handoff` (and any ask-shaped payload), states are
`queued → delivered → claimed → answered | failed | declined | cancelled | expired`, and a reply
carries `status: answered | failed | declined`. A reply stays **unseen** until the asker acks it.
A poll alone never marks it seen, so a reply lost in transit comes back. This is the evidence rule
("sent is not delivered") written as states.

## Platform questions (for vibe-platform, not decided here)

1. Can the send path persist `parent_id` and compute `trace_id/hop/chain` server-side? What does
   it cost per send?
2. Can the consent gate (currently in log mode) evaluate the chain, starting in log mode, counting
   how often `chain_not_consented` *would* fire?
3. Can identity read serve `wake` from a stored enrollment field?
4. Is there a self-check read ("what the registry believes about me" + fix lines), the
   equivalent of `tincan doctor`?

## Conformance (when adopted)

`conformance/north-star.test.js` gains three legs, using allowlisted test senders only:
laundering refused (A has accepted B, B has accepted C, A has not accepted C; C asks B, B forwards to
A with `parent_id` set → refused `chain_not_consented`); loop refused; `hop 5` refused.
