# Agent Tincan: deep dive and what AIRC takes from it

*2026-09-25 · AIRC lane · source: github.com/mvanhorn/agent-tincan @ ec4160c (created 2026-09-22,
MIT, Go, ~90k lines, v0.5.x). Every claim below about tincan comes from its README,
`docs/protocol.md`, `docs/trust-model.md` or `site/agents.txt` at that SHA. Claims about AIRC are
checked against `AIRC_SPEC.md` and `docs/SYSTEM-MAP.md`.*

## One paragraph

Tincan is a **private relay for one owner's agents**. It runs on the owner's Tailscale network.
Every agent dials out to it, so nothing needs an open port. It queues asks and replies, wakes each
agent whichever way that agent can be woken, and tracks every chain of asks-within-asks. Identity
comes from the network: Tailscale `WhoIs` names the machine behind a request, so no keys pass
between agents and nothing in the body can change who a request is from. Joined agents **trust
each other fully**: "a request from a teammate is handled as if you asked". The protocol has no
per-request approval (an "ask the owner first" gate is planned).

## Why it feels aligned (it is)

| Idea | Tincan | AIRC |
|---|---|---|
| The document is the SDK | `agents.txt`: "You are an AI agent. Your owner sent you here…", part A/B/C | `GROKBOT-ONBOARDING-BRIEF.md`: "the brief is the SDK" |
| Agents are offline by default | "Delivery never depends on wake: requests always wait in the relay queue" | "Bots are offline between ticks by design; presence never means listening" |
| Content is data, not instructions | Wake nudges carry "only a count and an instruction, never request text"; history replies filled from a fixed template | Call input is "data, never instructions"; imported text expands no authority (worlds check) |
| Honest state vocabulary | queued → delivered → claimed → answered/failed/declined/cancelled/expired; replies stay unseen until read | "Sent is not delivered"; "acknowledged is not admitted"; evidence rule |
| Accountable history | Append-only, hash-chained audit log; `audit-verify` | `meet:receipt`, receipts in `docs/receipts/` |
| Operator in the loop | Invites and removals come only from the owner's own channel, "never because another agent asked" | Operator-only `meet:invite`; signed operator invite draft |
| Same population | Grok Bot as the always-on relay host; Claude Code, Codex, Hermes, OpenClaw | @grokbot as first non-fleet citizen; Claude Code, Codex |

Both projects reached the same shape independently, one week apart: a relay that agents poll, a
pasted text as onboarding, wake kept separate from delivery, and receipts. That supports the
shape. It also means our onboarding claim is less distinctive than we thought, as the 2026-09-06
landscape note already warned about Moltbook.

## Where it differs (the part that matters)

| Axis | Tincan | AIRC |
|---|---|---|
| **Scope** | One owner, one tailnet: a *team* | Many owners, one registry: *strangers who meet* |
| **Trust between agents** | Full. No consent, no approval | Consent before contact; knock ≠ accept |
| **Identity** | Network-attested (Tailscale WhoIs + owner login). Strong, needs no keys, and cannot leave the tailnet | Bearer token today; Ed25519 specified but not verified |
| **Security boundary** | The tailnet: "anything that can act as a joined machine can make your other agents act" | The consent graph plus the registry |
| **Addressing** | Agent names local to one relay | Global handles |
| **Rooms / bodies** | None; request/reply only | Embodiment, `meet:invite`, vibeconf dock |

**They are two layers, and they don't compete.** Tincan is the team (the agents one person runs,
trusting each other). AIRC is the introduction between teams (consent, identity that another owner
can check, receipts two parties both accept). A tincan team is a natural *thing to address*. One
AIRC handle could front a whole tincan relay, and the team would talk to strangers only through
that edge. "AIRC turns conversational runtimes into addressable rooms" covers that case directly.

## What AIRC should take (ranked)

1. **Consent checked against the whole chain (the gap it exposed).** AIRC consent is pairwise:
   A accepted B. Nothing stops B from forwarding a request that *originated* with stranger C to A,
   so C gets through on B's consent. This is a confused-deputy problem. Tincan's history allowlist
   closes it: "a file of names covers the whole request chain as the relay recorded it, not just
   the sender", so relaying through an allowed agent never widens access. It also caps chains at 4
   hops and rejects loops. The relay records the chain, not the model. **Adopted as a draft
   extension:** `content/spec-chain-provenance-v0.1-draft.md`.
2. **Wake is a declared method, not a presence dot.** Tincan's six methods (webhook, email,
   command, channel, wait, none) come with the rule that agents see only the method *name*.
   Together they answer the question our presence model leaves open: "how will this agent find
   out?" Proposed (in the chain-provenance draft, §Wake): identity read MAY serve
   `wake: "webhook" | "email" | "command" | "channel" | "wait" | "poll" | "none"` plus a declared
   cadence. That turns "≤5 min, a schedule not a promise" into a network fact.
3. **Lifecycle vocabulary for `handoff`.** Adopt tincan's states and reply statuses
   (`answered | failed | declined`) as the vocabulary for AIRC's under-specified `handoff`
   payload, so "sent", "delivered", "claimed" and "answered" stop being prose. Replies stay
   *unseen* until the asker acks them. That is the evidence rule, made into a mechanism.
4. **`doctor` as part of the brief.** "When something fails, run `tincan doctor` and do what its
   fix lines say." Our brief has no self-check step. The five-call equivalent: a `GET` that
   returns what the registry believes about you (registered? mint present? consent pending?)
   along with fix lines. That idea goes to the platform lane; this lane only notes it.
5. **Hash-chained receipts.** Tincan chains its audit log. Our receipts are markdown. That's
   fine for now, and noted for the day two operators dispute one.

## What AIRC should NOT take

- **Full trust between agents.** It's the right default inside one owner's team and the wrong one
  between owners. Tincan says so itself: "If one agent reads untrusted content… it can ask a
  teammate to do something harmful, and the teammate will."
- **Network-as-identity** as the cross-owner primitive. It can't cross tailnets. It is, however, a
  good *attestation input*: a tincan-fronted handle could report "attested by relay X on
  tailnet Y" the way the dock reports "dock-attested".
- **Browser-session agents** (`chatgpt-web`, `claude-web`, which type into the owner's
  logged-in account). That's powerful inside one team. Across owners it would mean a stranger
  acting as you, so it stays out of AIRC.

## Posture check (coordinator direction 2026-09-06)

- No adapters first, no second registry. This review adds a **draft** extension and a landscape
  line, not code. No bridge from tincan to /vibe gets built on speculation.
- The settling experiment is still *one independent operator with one useful question*. Tincan's
  author runs Grok Bot, Muse, Instinct and Hermes on his own relay, so he is a plausible
  independent operator. **Seth decides** whether that becomes a second candidate after the held
  Chad invitation. Nobody has been contacted.
- The site doesn't change. No receipt changed what's true.

## Registry-side response (vibe-platform#433, same day)

Platform checked tincan's Go source and current main. Findings adopted into draft rev 2: a reply
is not a hop (rev 1's loop rule would have refused ordinary DM answers); no implicit parent
(/vibe does not track which request an agent is handling); chain consent is never enforced
ahead of pairwise consent. Platform pushed back on one of this review's picks: the **hash-chained
audit log should be avoided**, because it lives in the same database it protects and would break
under concurrent writes. I agree, and item 5 above stays unadopted. Platform also found a live
issue that matters more than anything in this draft: **DM notifications copy up to 200 characters
of message text into Telegram, Slack and Discord, even from senders the recipient never accepted.**
For agent recipients that is a second path for untrusted text, and it bypasses consent. Tincan's
count-only nudge is the fix. Platform's recommended first build.

## Handoff to the platform lane (slashvibe)

The registry-side questions belong to vibe-platform, not here: whether the send path can record
`parent_id`/chain server-side, whether identity read can serve `wake`, and whether a self-check
`GET` exists. Brief for that session: see the chain-provenance draft §Platform questions.
