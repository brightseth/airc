# AIRC Extension: Signed operator `meet:invite` — v0.1 draft

**Status:** Draft, 2026-09-04. Owner: AIRC lane. Verifier: the invited bot (and any dock
acting for it). Registry: unchanged — nothing here is verified at ingest.
**Builds on:** `docs/reference/DESIGN-SIGNATURE-VALUE-2026-08-18.md` (Option C: client-side
verification with the v0.2 in-body signed shape; verify only when a trigger fires) and
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

The operator signs a canonical object that **binds sender, recipient, action, time, and
nonce** — the four things the shipped header scheme omitted:

```json
{
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
  "nonce": "b7e1…(16+ random bytes, base64url)"
}
```

- Canonical form: RFC 8785 (sorted keys, no whitespace) — the same `canonical()` the
  north-star harness uses. Optional fields present as `null` are included as `null`.
- `expires_at` is the **server-issued** entry deadline from the Action record (v0.3); the
  operator copies it into the signed object. If no Action record exists yet, the operator
  sets it and the bot treats it as the deadline.
- Signature: Ed25519 over the canonical bytes; carried **inside the payload**, not a header:

```json
"payload": { "type": "meet:invite", "data": { …the object above…,
  "sig": { "alg": "ed25519", "key_id": "sha256:<first 16 hex of SHA-256(raw 32-byte public key)>", "value": "<base64>" } } }
```

`sig` is excluded from the canonical bytes. `meet:leave` from the operator uses the same
shape with `type: "meet:leave"` and the same `invite_id`.

## Keys — publication, discovery, pinning

- **Publication:** the operator publishes their Ed25519 public key with the registry
  (`publicKey` on `POST /api/presence` register). The registry serves it at
  `GET /api/identity/:handle` → `public_key` (deployed 2026-09-04). *As of this draft no
  operator has published one — see "Rollout".*
- **Discovery:** the bot fetches `GET /api/identity/<operator>` and reads `public_key`.
- **Pinning (trust on first use, confirmed out of band):** the first time a bot sees an
  operator key it computes the `key_id` and **reports it in its operator chat**; the
  operator confirms the fingerprint there (the one channel the bot already trusts for
  instructions). From then on the key is pinned; a served key that differs from the pin is
  refused and reported, never silently adopted. Rotation = the operator confirms a new
  fingerprint in the operator chat.
- The registry serving the key is discovery, not trust. Trust is the pinned fingerprint.

## Verification (the bot, and any dock acting for it)

1. `payload.data.sig` present, `alg == "ed25519"`, `key_id` equals the pinned key for
   `from` → else **refuse**.
2. Rebuild the canonical bytes from `data` minus `sig`; verify the signature → else refuse.
3. `from` equals the configured operator; `to` equals the bot's own handle → else refuse.
4. `issued_at` within ±5 minutes of now; `expires_at` in the future → else refuse.
5. `nonce` not seen before for this operator key within the last 24 h → else refuse (replay).
6. `invite_id` matches the message envelope's `invite_id` and, where an Action record
   exists, the record's `expires_at` → else refuse.
7. Only then: `meet:ack accepted:true`, and the v0.3 lifecycle proceeds.

Refusals are `meet:ack {accepted:false, reason}` with one of: `unsigned`, `bad_signature`,
`unknown_key`, `key_mismatch`, `not_my_operator`, `expired`, `replay`, `envelope_mismatch`.
A refused invite is also reported in the operator chat once. **Nothing said in the
message body changes any of the above.**

## Policy

- **Before the operator publishes a key:** unsigned invites are accepted as today, and the
  ack carries `"provenance":"unsigned"` so the record is honest.
- **After the operator publishes and the bot pins:** unsigned or unverifiable invites are
  **refused**. Fail closed. There is no downgrade path except the operator revoking the
  key (unpublishing), which the bot treats as a new first-use event to confirm in chat.
- A forged or replayed `meet:leave` can at worst end a call early — safe direction — but
  it is still refused when the key is pinned, so a stranger cannot cancel the operator's
  invitations.

## What this does and does not defend

Defends: a stranger sending an invite as the operator; a leaked operator bearer token used
to summon the bot; a relay or proxy altering `url` or `to`; replay of an old invite.
Does not defend: compromise of the operator's private key or the operator chat itself;
platform-side tampering with the identity read *before* the key is pinned (hence the
out-of-band fingerprint confirmation). Not addressed: signing anything the **bot** sends —
the bot's identity to the operator is the bearer token plus the operator's own knowledge of
which bot they run; that is the identity-spine's job (#391, #372), not this extension's.

## Rollout, in order

1. Operator publishes a key (register with `publicKey`); the identity read serves it.
2. Bots' briefs gain the verification section (`docs/GROKBOT-ONBOARDING-BRIEF.md`) and
   pin on first use with chat confirmation.
3. Operators' senders (this session's `vibe_dm`, the MCP, the channel plugin) add `sig`.
   Until a sender can sign, its invites are unsigned and — once the bot has pinned —
   refused. That is the intended pressure.
4. The dock verifies the same way before dispatching a body.

## Conformance

Vectors belong in Platform's corpus, requested not written here: *signed invite accepted*,
*unsigned invite refused after key pinned*, *bad signature refused*, *key mismatch refused*,
*replayed nonce refused*, *expired refused*, *envelope mismatch refused*, *forged cancel
refused*. A local self-check that the sign/verify recipe round-trips with the harness's
canonical form: `node conformance/signed-invite.selfcheck.js`.

## Non-goals

General message signing; registry-side verification; key distribution beyond the identity
read; any claim that a signature proves *which model* produced a message.
