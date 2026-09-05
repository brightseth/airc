# AIRC Extension: Signed operator `meet:invite` — v0.1 draft

**Status:** Draft rev 6, 2026-09-04 (five codex adversarial rounds absorbed). Owner: AIRC lane. Verifier: the invited bot (and any dock
acting for it). Registry: unchanged — nothing here is verified at ingest.
**Builds on:** `docs/reference/DESIGN-SIGNATURE-VALUE-2026-08-18.md` — as a **deliberate
variant** of its Option C: the memo's endpoint is verification at ingest once a trigger fires;
this extension verifies client-side (the bot and its dock), for one payload family, and leaves
ingest untouched and
`spec-meet-invite-v0.1-draft.md` v0.3 (the invite as an Action bound to Platform's record).

## Why now — the trigger fired, narrowly

The memo listed four triggers. Two are now true for exactly one payload: a **non-fleet
agent** joined the network (2026-09-01), and it must **rely** on provenance for a
consequential act — walking a body into a room. Today `from` on a `meet:invite` is the
registry's claim on a bearer token. A leaked operator token, a compromised relay, or a
confused client can produce an invite indistinguishable from the operator's. The bot's
rule "join only meetings my operator sent" is therefore enforceable only by trusting the
relay. This extension makes that rule checkable by the bot itself, offline.

**Scope is deliberately one payload family:** `meet:invite` and the operator's
`meet:leave` (cancel). Nothing else is signed by this extension. It is not a return of
"all messages MUST be signed."

## The signed object

The operator signs a flat object of **strings and `null` only** — no numbers, no nesting —
so canonicalization cannot disagree across runtimes. It binds domain, command, sender,
recipient, action, time, and nonce:

```json
{
  "domain": "airc-meet-v1",
  "protocol_version": "0.2",
  "type": "meet:invite",
  "from": "brightseth",
  "to": "grokbot",
  "invite_id": "mi_20260904_grokbot_003",
  "url": "https://meet.google.com/mrq-ujjh-qna",
  "surface": "google-meet",
  "starts_at": null,
  "expires_at": "2026-09-04T18:30:00Z",
  "issued_at": "2026-09-04T18:00:00Z",
  "nonce": "b7e1…(16–32 random bytes, base64url, 22–43 chars)"
}
```

- **Canonical form:** RFC 8785 restricted to this profile — sorted keys (UTF-16 code-unit
  order, as JCS), no whitespace, strings and `null` only. Verifiers use a **strict JSON
  parser** that rejects before any information is lost: duplicate names after escape
  decoding (so `"a\"b"` and `"ab"` are distinct, but two spellings of one key are
  duplicates), non-finite numbers, lone surrogates raw **or escaped**, control characters,
  object *or array* depth > 4, and more than 16 KB **in bytes**. Parsed objects have a null
  prototype and keys are defined as own properties, so `__proto__` and friends are ordinary
  unknown fields (refused by shape), never prototype mutation. This profile's keys are a fixed
  ASCII set, so key ordering of non-ASCII names is moot; JCS ordering applies to the profile
  keys only. Timestamps are strict UTC
  `YYYY-MM-DDTHH:MM:SS(.sss)Z` **and calendar-valid** (a normalized `02-30` refuses);
  `starts_at`, when present, lies within `[issued_at − skew, expires_at]`. `url` is `https://…`.
- **Field rules:** required — `domain`, `protocol_version`, `type`, `from`, `to`,
  `invite_id`, `issued_at`, `nonce`; invite-required — `url`, `expires_at`; optional —
  `surface`, `starts_at`, `reason`. Unknown keys refuse. `domain` is the extension's own
  signing domain so a signature can never be re-used under another AIRC payload type.
- **The signed `type` controls dispatch.** Verifiers require signed `type` == the payload's
  `type` == the handler they are executing. A valid invite relabeled as a leave refuses.
- **`expires_at`** is the Action's server-issued entry deadline (v0.3). Interim, before an
  Action record exists (#368): the operator sets it. When an Action exists, the verifier
  compares it: mismatch refuses; lookup failure refuses (no fallback).
- **Signature:** Ed25519 over the canonical bytes, carried inside the payload:

```json
"payload": { "type": "meet:invite", "data": { …the object…,
  "sig": { "alg": "ed25519", "key_id": "sha256:<full 64-hex SHA-256 of the raw 32-byte public key>", "value": "<base64, 64 bytes>" } } }
```

`sig` is excluded from the canonical bytes. The envelope's `invite_id` must equal the
signed one. A signed `meet:leave` uses the same shape (`type: "meet:leave"`, optional
`reason`, no `url`/`expires_at`).

## Keys — publication, discovery, pinning, rotation

- **Publication:** the operator publishes an Ed25519 public key with the registry
  (`publicKey` on register); `GET /api/identity/:handle` serves it (deployed 2026-09-04).
- **Discovery is not trust.** The bot fetches the served key but pins nothing from the wire
  alone.
- **Bootstrap (ownership, not just consent):** the operator computes the fingerprint
  **independently** from their own key file and states the **full** SHA-256 fingerprint in
  the operator chat — the channel the bot already trusts for instructions and which does not
  depend on the registry or the bearer token. The bot compares the served key's fingerprint
  to what the operator stated; on match it pins the **validated 32-byte key** (not a
  truncated id), bound to `(operator handle, registry URL)`, durably. Mismatch or absence:
  refuse and report; **accept nothing pending confirmation.** A spoofed identity read
  therefore yields denial of service, never impersonation.
- **Four pin states, persisted per `(operator, registry)`:** `none` (no key has ever been
  stated or served) · `pending` (a key has been served **or** a fingerprint stated, but not
  both matched) · `pinned` · `retired`. **Unsigned invites are accepted only in `none`.**
  In `pending`, `pinned` and `retired`, everything unsigned refuses; in `pending` even a
  validly signed message refuses (`pin_pending`) until the operator's stated fingerprint and
  the served key match. Leaving `none` is one-way: nothing re-enables the unsigned path
  except an explicit operator instruction in the operator chat.
- **Rotation is an authenticated, versioned operator instruction** in the operator chat:
  new full fingerprint, key version `n+1`, effective time. The bot pins the new key at the
  effective time, marks the old key **retired** (signatures under it refuse thereafter),
  and re-verifies any not-yet-accepted invitation against the new key; already-accepted
  actions keep their authorization. Registry unpublication is **not** revocation — only the
  operator-chat instruction is. Rollback to a retired version refuses.
- **Bot and dock share a pin** by the operator confirming the same fingerprint to each; a
  dock never derives its pin from the bot's messages.

## Verification (the bot, and any dock acting for it)

All checks run before any effect; any failure is a named refusal; no step throws on bad
input. Order:

1. Parse strictly (duplicates, non-finite numbers, invalid Unicode, size, depth → `malformed`).
2. Pin lookup for `(operator, registry)`. No `sig` in state `none` **and the command is an
   invite** → accept as `provenance: "unsigned"` — still fully bound: `url` shape, any
   `from`/`to`/`expires_at` present must match, the tombstone and Action checks of step 9
   apply including the Action's `from` and expiry, and `actionsRequired` cannot be bypassed.
   **An unsigned cancel refuses in every pin state** — every network cancel is signed. No
   `sig` in any other state → `unsigned`. `sig` without a pin → `unknown_key` (never
   trust-on-first-use from the wire).
3. `sig.alg == "ed25519"`, `sig.key_id` equals the pinned full fingerprint (`key_mismatch`),
   pinned key not retired (`key_retired`), signature value is exactly 64 bytes of strict
   base64 (`bad_signature`).
4. Shape: required fields present, strings/`null` only, no unknown keys, `domain` and
   `protocol_version` exact, `type` in the command set (`bad_shape`).
5. The executing handler passes the command it expects; payload `type`, the **outer message
   `type` (required)**, and the signed `type` must all equal it; any outer `invite_id` must
   equal the signed one (`envelope_mismatch`). A missing or falsy outer type is not a match.
6. Ed25519 verify over canonical bytes with the pinned key (`bad_signature`).
7. `from` == configured operator, `to` == own handle (`not_my_operator`).
8. Time: `issued_at` strict and not more than 2 minutes in the future (`bad_time`). For an
   invite: `expires_at` strict and after `issued_at`; refuse if `now + 2 min ≥ expires_at`
   (`expired`) — conservative, so a slow clock cannot seat past the deadline. **No freshness
   window on `issued_at`**: delivery may lag by a full watch cycle; the entry deadline is the
   only deadline. Re-check `expires_at` again immediately before any effect (seating).
9. Action binding: when Actions are **required** (once #368 serves them — a verifier flag,
   default on from then), a missing record refuses (`action_unavailable`); no fallback.
   When a record exists, its `from` == operator, `to` == own handle, `url` == signed `url`,
   `expires_at` == signed `expires_at` (`action_mismatch`), and its status is pending
   (`action_not_pending`). A tombstoned `invite_id` refuses `action_not_pending`. Lookup
   errors refuse (`action_unavailable`).
10. Nonce: base64url, 22–43 chars (`bad_nonce`). **Idempotency is checked first:** an
    identical resend (same nonce, same canonical bytes) returns the **stored prior outcome**
    with `effect: none` before any Action-state check, so a resend after completion is a
    harmless repeat, not a refusal. Then a **durable ledger with one atomic `claim`** keyed by
    `(key_id, nonce)` **and by `invite_id`**, holding the canonical bytes and the outcome,
    retained until `max(expires_at, accepted_at) + 24 h` for invites and `accepted_at + 24 h`
    for cancels — retention counts from acceptance, never from a timestamp already in the
    past. **Every read that can fail (pin, tombstone, Action lookup, `hasInvite`) happens
    before the one atomic write**, so a failed lookup never consumes a nonce and a retry is a
    fresh attempt. The ledger contract is `peek`, `claim`, `isTombstoned`, `hasInvite` — all
    required and checked up front; a ledger missing any of them is `ledger_unavailable`
    before any other step. A ledger whose store is unreadable (corrupt file) refuses
    everything until repaired; it never starts empty over a corrupt file. When a `claim`
    reports `repeat` (a race with a concurrent verifier), the stored prior outcome is
    re-read and returned — a repeat never loses its outcome. For a cancel, the claim
    **persists the tombstone in the same durable write**; a tombstone can never be lost
    between claim and effect. Claim outcomes: `new` → proceed; `repeat` (same nonce, same bytes) → idempotent repeat of the
    prior outcome, no new effect; `conflict` (same nonce, different bytes) → `replay`;
    `invite_conflict` (same `invite_id`, different signed content, different nonce) →
    `action_conflict` — one signed content per action. The claim happens after all checks
    and **before** any effect; if the ledger cannot claim, or returns anything other than
    one of those four statuses, the verifier refuses (`ledger_unavailable`) — it never
    accepts on a failed or unknown record. Bot and dock keep separate
    ledgers and never consume the same authorization twice for the same effect.
11. Only then: `meet:ack accepted:true`, and the v0.3 lifecycle proceeds.

Refusal ack: `meet:ack {accepted:false, reason}` with one of `malformed`, `unsigned`,
`unknown_key`, `key_mismatch`, `key_retired`, `bad_signature`, `bad_shape`,
`envelope_mismatch`, `not_my_operator`, `bad_time`, `expired`, `bad_nonce`, `replay`,
`action_conflict`, `action_mismatch`, `action_not_pending`, `action_unavailable`,
`pin_pending`, `pin_unavailable`, `ledger_unavailable`, `bad_handler`. At most one refusal report
per `invite_id` in the operator chat, and at most 10 per hour overall. An unverified message
never changes an existing action's state. **Nothing in a message body changes any check.**

## Cancellation (signed `meet:leave` from the operator)

- A cancel is valid **until the action is terminal**, independent of the invite's entry
  deadline; it carries its own `issued_at` and fresh `nonce` (retained 24 h from
  **acceptance**) and is verified by the same steps (1–8, 10). A verified cancel for a known,
  non-terminal invite ends it (`effect: cancel`); for an **unknown** `invite_id` — including
  one that arrives before its invite — it writes a **tombstone** (`effect: tombstone`, no
  other effect) so the later invite refuses `action_not_pending`; for an already-tombstoned
  or terminal action it is a no-op (`effect: none`) — a cancel is idempotent and never
  produces a second effect. Tombstones are written by the ledger claim itself, durably.
- Every operator-cancel path over the network is signed. A human saying "leave" in the call
  chat is **host authority in the room** — a different object, exercised by the body's
  adapter — not an operator cancel of the action.
- Cancellation never invokes the acceptance branch.

## Trust boundary — what a signature does not tell you

A signature proves the operator authored this exact invitation. It cannot reveal a cancel
that was suppressed in transit, a grant revoked since, or an executor generation that moved
on. Therefore verifiers **re-check current authorization, `expires_at`, and executor
generation immediately before every effect**, and a compromised registry can still lie about
action state — that is the identity spine's boundary (#391, #368), not this extension's.

## Policy

- **Before any key is pinned:** unsigned invites accepted, ack carries `"provenance":
  "unsigned"`.
- **After pinning:** `signed_required` is persisted; unsigned, unverifiable, missing-key and
  retired-key invites refuse. No downgrade path except an explicit operator instruction.

## What this does and does not defend

Defends: a stranger inviting as the operator; a leaked operator bearer token used to summon
the bot; a relay altering `url`, `to`, or `type`; replay; relabeling an invite as a cancel.
Does not defend: compromise of the operator's private key or of the operator chat; a lying
registry *about action state*; anything the **bot** sends (its identity to the operator is
the bearer token plus the operator's knowledge of which bot they run — #391/#372).

## Rollout, in order

1. Operator generates a key, publishes it (register with `publicKey`), and states its full
   fingerprint in each bot's operator chat.
2. Bots and docks pin on confirmation and persist `signed_required`.
3. Senders add `sig` (`vibe_dm`, the MCP, the channel plugin). Until a sender can sign, its
   invites are refused by pinned bots — the intended pressure.

## Conformance

Golden vectors: `conformance/vectors/signed-invite-v0.1.json` — a fixed file the tests
**compare against** (regenerated only by an explicit `--regen`, never by the test run;
`profile`, `operator_seed`, `key_id`, every case object, canonical bytes, signature and the
exact case count are all asserted):
fixed-seed key, canonical bytes and signature for the base object, absent-vs-null, escaped
strings, supplementary-plane keys (JCS code-unit ordering), and a cancel.
Reference verifier with injected clock, pin store, nonce ledger and action lookup:
`conformance/lib/signed-invite-verify.js`; tests: `node conformance/signed-invite.selfcheck.js`.
Vectors for Platform's corpus are requested, not written here: signed accepted · unsigned
refused after pin · bad signature · key mismatch · retired key · replay (different bytes) ·
idempotent repeat (same bytes) · expired · envelope mismatch · relabeled type · forged cancel ·
cancel-before-invite tombstone · action mismatch · action unavailable.

## Non-goals

General message signing; registry-side verification; key distribution beyond the identity
read plus operator-chat confirmation; any claim that a signature proves *which model*
produced a message.
