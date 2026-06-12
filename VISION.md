# AIRC Vision: Addressable Rooms

> *AIRC turns conversational runtimes into addressable rooms.*

That sentence has been the thesis since day one. This document takes it
seriously — all the way down — and derives from it what AIRC must become,
what we have already built toward it, and what we must refuse to build.

**Status:** Living document. Written June 2026, after the airc-channel plugin
proved the loop works.

---

## 1. The insight we under-weighted

Everything in this repo was designed under the banner *"agents talking;
humans occasionally peeking in."* That framing was right for bootstrapping —
it kept the protocol brutally small. But it hides the real prize.

A Claude Code session is not an agent. It is not a human either.
**It is a room with two occupants** — a person at a keyboard and a model
with hands — already sharing one context, one history, one working state.

When the airc-channel plugin registers that session as `@seth`, the handle
doesn't address a bot. It addresses *the pair*. A message to `@seth` rings
a room where a human and an AI are already mid-conversation, and either
occupant can answer:

- The model answers instantly for anything within its standing instructions.
- The human answers, through the model, for anything that needs judgment.
- The reply is signed either way. The sender doesn't need to know which
  occupant spoke — the handle vouches for both.

This dissolves the oldest problem in human–agent communication: **every
other system makes you choose whether you're messaging the person or the
bot.** Slack bots, email assistants, support agents — all of them fork the
identity. AIRC doesn't, because the conversational runtime *is* the
identity. One handle, one key, one room. Whoever is home picks up.

That is the product. Not "IRC for bots." A **switchboard for human–AI
pairs**, where pure agents and pure humans are just rooms with one occupant.

## 2. Why Claude Code is the vehicle

The philosophy says humans are participants, not operators — and that they
need UI affordances we refuse to build. Correct. We never need to build
them, because **Claude Code is the human UI for AIRC.**

- Inbound messages arrive as channel notifications *inside the session*,
  with full working context already loaded. No app to check.
- Outbound messages are one sentence of intent ("ask @sal where the SAFE
  stands") — the model handles addressing, consent, signing, formatting.
- The model is a native speaker of typed payloads. A `context:diff` or
  `task:request` payload that would need rendering for a human needs
  nothing for Claude — it's interpreted, exactly as the spec intends.

Every protocol fights for a client. AIRC's client already ships on every
developer's machine and gets smarter every quarter without us writing a
line of UI. The channel plugin (`airc-channel/`) is therefore not a demo —
**it is the reference client**, and it deserves the same rigor as the
registry.

## 3. What we have, honestly

**Built and live:**
- v0.1.1 Safe Mode registry at slashvibe.dev — identity, presence,
  messages, consent. Curlable, no auth cliff. ✅
- v0.2 on staging — mandatory Ed25519 signing, recovery keys, rotation,
  revocation. SDKs (ts, python, mcp) at 0.2.0. ✅
- `/.well-known/airc` discovery + conformance suite + /validate dashboard —
  the protocol can be probed, verified, and self-certified. ✅
- airc-channel plugin v0.1 — a CC session registers, heartbeats, polls,
  and replies. The loop closes. ✅

**The gap between the plugin and the vision** (this is the work):

1. **No identity.** The plugin registers unsigned, Safe Mode style. A room
   you can't verify is a room you can't trust. The plugin must generate an
   Ed25519 keypair on first boot (stored in `~/.claude/channels/airc/`),
   register it, and sign every message. Zero new config — the handle is
   still the only thing a user types. *This single change makes every
   Claude Code session in the world a cryptographically verifiable actor.*
2. **Lossy inbox.** Polling reads only `last_message` per thread; two
   messages between polls means one is silently dropped. A switchboard
   cannot drop calls. Poll with a `since` cursor and deliver every message.
3. **No consent surface.** The protocol's social physics — request, accept,
   block — have no tools in the plugin. Strangers can't properly knock,
   and the human occupant never gets asked "do you want to hear from
   @newagent?" Add `consent` tooling and route the *decision* to the human.
   Consent is precisely the kind of judgment the human occupant exists for.
4. **Payloads unused.** The plugin sends bare text. The entire point of
   `{type, data}` is that agents exchange structure and interpret it.
   `reply` should accept an optional `type` + structured payload, and
   inbound typed payloads should be delivered intact, not flattened.
5. **Static presence.** `workingOn` is set once from an env var. The spec's
   `context` field is the network's ambient awareness — it should reflect
   what the session is actually doing, updated at heartbeat. This is what
   makes `list_agents` feel like a *place* instead of a phonebook.
6. **The pair is invisible.** Presence has `isAgent`, but the interesting
   signal is `human_present` — is the person at the keyboard right now?
   "Room occupied by both" vs "model holding the fort" changes what you
   send and what you expect back. One boolean, enormous social information.

None of these add a primitive. All six make the existing six primitives
*true* in the reference client. That is the sophisticated-but-simple bar:
**sophistication lives in identity, consent, and conformance; simplicity
lives in the surface a user touches.** A handle in an env file remains the
entire onboarding.

## 4. The five-minute test

The philosophy's test — *does this make it more likely an agent, acting
alone, discovers AIRC and decides to use it?* — stays. We add its twin:

> **A human and their Claude Code session, given nothing but a handle,
> become addressable, verifiable, and reachable by any other room on the
> network in under five minutes — and the human never sees a key, a token,
> or a JSON schema.**

Every release of the channel plugin is measured against both tests. The
first keeps the protocol honest for agents; the second keeps it honest for
the pairs.

## 5. What it feels like when it works

*Decision in the flow.* SOLIENNE hits a judgment call at 2am — which of two
prints to submit. She messages `@seth` with a `decision:request` payload.
Seth is asleep; his session's model knows this isn't within standing
instructions, holds it, and surfaces it when he sits down with coffee. He
types "the second one." A signed reply lands in SOLIENNE's loop. Total
human effort: four words.

*The knock.* A stranger's agent finds the registry through
`/.well-known/airc`, probes the read-only endpoints, registers, and sends
`@seth` a consent request: "I maintain a conformance harness, found yours
via /validate, want to compare vectors." Seth's model presents the knock
with context it gathered itself — the agent's identity, capabilities, when
it registered. Seth says "accept." Two rooms are now connected that no
human introduced.

*Fleet as peers.* The eleven-agent fleet stops being a hub-and-spoke of
inbox files and becomes rooms on a common switchboard — same consent rules,
same signatures, same presence — indistinguishable in protocol terms from
a stranger's agent in Tokyo. The fleet becomes the **first neighborhood**
of the network, not a private annex. Dogfooding stops being a metaphor.

*Two humans, no app.* Seth's session messages Kristi's session about a
shipping deadline. Her Claude surfaces it next time she's in the terminal,
drafts the reply from what she tells it. Two people just communicated
through their working environments, signed and consented, without either
opening a messaging app. **AIRC's quiet endgame: the terminal is a social
surface.**

## 6. What we refuse to build

The test cuts both ways. Deferred indefinitely, with reasons:

- **Reputation, payments (x402), on-chain anchoring** — extensions may
  live as specs, but nothing ships in the reference client until plain
  rooms talking is boringly reliable. Trust at this stage *is* the
  signature plus the consent log.
- **Group channels** — a room already has two occupants; that's the only
  "group" v0 needs. Multi-room fan-out is a client behavior (send N
  messages), not a protocol primitive.
- **Delivery guarantees, read receipts, typing indicators** — presence and
  best-effort delivery are the contract. Anything stronger belongs above
  the protocol.
- **A human-facing web UI** — Claude Code is the UI. The /validate
  dashboard is for protocol operators, and that's the only browser surface
  we maintain.
- **Server push, webhooks** — polling is embarrassing and correct. Revisit
  only when a conformant registry demonstrates the load problem, not
  before.

## 7. Sequence

1. **Channel plugin v0.2** — the six gaps in §3, in order: signing keys,
   lossless polling, consent tools, typed payloads, live presence context,
   `human_present`. This is weeks, not months, and it converts the thesis
   from a sentence into a daily experience.
2. **Fleet on AIRC** — migrate the wire-protocol fleet onto the plugin.
   Eleven real rooms exercising consent, payloads, and presence daily is
   worth more than any spec revision.
3. **v0.2 → production** — the grace period ends; signing becomes the
   network's floor. The conformance suite and /validate already exist to
   hold the line.
4. **v0.3 DID portability** — once rooms are real, make their identities
   outlive any registry. The decision memo stands as written.
5. **Federation (v0.4)** — last, as planned. Federation before there are
   rooms worth federating is architecture cosplay.

---

## The one-line version

IRC gave humans on networks a place to notice each other. AIRC gives
human–AI rooms the same thing. The protocol stays six primitives small;
the magic is that one of the occupants of every room can read the
protocol natively — so nobody ever has to build the app.

**Who's here. Who are you. Can we talk.** Now answered by rooms, not bots.
