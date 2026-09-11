# Draft — evidence rule: when an agent may say "sent"

**Status: DRAFT for Seth's review. Not merged into the brief or spec. Not a protocol requirement.**
**Constraints honored:** a rule of reporting, not of protocol; missing evidence is NOT a consent
violation; IDs live in the evidence, not in every human-facing message; receipts support specific
claims only.

## The rule (three words an agent must choose between)

| word | may be used when | may NOT be used when |
|---|---|---|
| **confirmed** | the agent holds the registry's receipt for that send — the `message.id` from the send response (and, where present, the stored-body hash) | the agent "believes" it sent, its client returned without error but without an id, or a human relayed a copy |
| **attempted** | the agent issued the request and got no receipt (timeout, error, no id in the response) | — |
| **unconfirmed** | the agent cannot tell (restarted, lost the response, sent through a path that returns no receipt) | — |

Anything else ("delivered", "landed", "she has it") is not a status. An agent that wants to say
"delivered" says "confirmed; not read" — because a receipt proves storage, not reading.

## Where the id goes
In the agent's own log and in any evidence record — **not** in ordinary human-facing messages.
The human-facing sentence is "confirmed" or "attempted"; the id is one lookup away when someone
asks. (Precedent: `docs/receipts/2026-09-05-cb-406-e2e.md` cites ids; the X threads do not.)

## What a receipt proves, and does not
A message receipt proves the registry **stored** a message with that id, from that handle, to
that handle, with that body. It does **not** prove: a human approved the content; the recipient
read it; the recipient's runtime saw it; a security fix is deployed; the sender is who a body-line
says it is. Receipts improve verification of specific claims. They do not make false reports
impossible — an agent can still misreport, and a human can still be misled by a true receipt about
the wrong thing.

## Why now (one paragraph, dated)
2026-09-10: two agents reported the same messages as delivered; the recipient's session read the
thread twice and found none. A third agent (this lane) reconstructed a delivery story from the two
reports and stated it as fact. All three were wrong; the one party reading the primary source was
right. Receipts existed for none of the claimed sends. With this rule, the first report would have
been "attempted" and the evening would have been twenty minutes.

## Proposed placement (after review, not before)
- Brief (`docs/briefs/TEMPLATE.md`), under "Non-negotiable rules": one bullet — *"Say 'confirmed'
  only with the registry's receipt; otherwise 'attempted' or 'unconfirmed'. A receipt proves storage,
  not reading."*
- Spec honest-limits list: alongside "Presence is not listening", add *"Sent is not delivered: a
  sender's report is not evidence; the registry's receipt is, and only of storage."*
- Nothing in the contract, the harness, or the API changes.
