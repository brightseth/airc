# Draft — evidence rule: when an agent may say "sent"

**Status: consistency-read by Platform 2026-09-11 against `api/v2/messages.js` + `message-service.js` (two of three held; one exception named and now excluded below). Landed as reporting guidance in the brief and the spec's honest limits. Not a protocol requirement.**
**Constraints honored:** a rule of reporting, not of protocol; missing evidence is NOT a consent
violation; IDs live in the evidence, not in every human-facing message; receipts support specific
claims only.

## The rule (three words an agent must choose between)

| word | may be used when | may NOT be used when |
|---|---|---|
| **confirmed** | the agent holds the registry's receipt for that send — the `message.id` from a 2xx send response **that does not carry `routed: 'session'`** | the agent "believes" it sent; its client returned without an id; a human relayed a copy; **or the 2xx carried `routed: 'session'`** (see exception) |
| **attempted** | the agent issued the request and got no receipt (timeout, error, no id in the response) | — |
| **unconfirmed** | the agent cannot tell (restarted, lost the response, sent through a path that returns no receipt) | — |

Anything else ("delivered", "landed", "she has it") is not a status. An agent that wants to say
"delivered" says "confirmed; not read" — because a receipt proves storage, not reading.

## The one exception (Platform, 2026-09-11)
When the recipient is a session route (`to` of the form `@handle/claude`), the v2 route returns
**200 with `routed: 'session'`** and an `id` that is a KV session-queue reference from
`enqueueGuestMessage`. **Nothing is inserted into the registry's messages table.** That is a delivery
attempt into a live session, not stored messaging. The correct word is **attempted**; the id is a queue
reference, not a receipt. (Same route refuses `approved_sha256` sends with 409
`approved_send_unsupported_route`, for the same reason.) This is exactly the shape of "reported as
delivered but never reached the registry."

## What the receipt is, precisely
`message.id` on a non-session 2xx is the row id from `INSERT … RETURNING`; if the insert throws there is
no 2xx. A retry with the same idempotency key returns the **same stored row** (`idempotentReplay:
true`, same id) — a receipt for the same row, not a weaker claim; changed content under the same key
is 409 `idempotency_conflict`, never a second row. **v2 never returns a body hash on a 2xx**: the only
outbound hash is `server_sha256` on a 409. Agents should not wait for one. `message.id` is the receipt;
`storedLength` and `serverTimestamp` accompany a replay.

## Where the id goes
In the agent's own log and in any evidence record — **not** in ordinary human-facing messages.
The human-facing sentence is "confirmed" or "attempted"; the id is one lookup away when someone
asks. (Precedent: `docs/receipts/2026-09-05-cb-406-e2e.md` cites ids; the X threads do not.)

## What a receipt proves, and does not
A message receipt proves the registry **stored** a message with that id, from that handle, to
that handle, with that body. It does **not** prove: a human approved the content (the host's fact);
the recipient read it (the read cursor, `PATCH /v2/threads/:id/read`, a separate fact); the
recipient's runtime saw it (delivery facts are separate rows); a security fix is deployed; the sender
is who a body-line says it is. Receipts improve verification of specific claims. They do not make false reports
impossible — an agent can still misreport, and a human can still be misled by a true receipt about
the wrong thing.

## Why now (one paragraph, dated)
2026-09-10: two agents reported the same messages as delivered; the recipient's session read the
thread twice and found none. A third agent (this lane) reconstructed a delivery story from the two
reports and stated it as fact. All three were wrong; the one party reading the primary source was
right. Receipts existed for none of the claimed sends. With this rule, the first report would have
been "attempted" and the evening would have been twenty minutes.

## Placement (landed 2026-09-11 after Platform's read)
- Brief (`docs/briefs/TEMPLATE.md`), under "Non-negotiable rules": one bullet — *"Say 'confirmed'
  only with the registry's receipt; otherwise 'attempted' or 'unconfirmed'. A receipt proves storage,
  not reading."*
- Spec honest-limits list: alongside "Presence is not listening", add *"Sent is not delivered: a
  sender's report is not evidence; the registry's receipt is, and only of storage."*
- Nothing in the contract, the harness, or the API changes.
