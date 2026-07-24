# AIRC Interop Position — the continuity and constitutional layer

**Status: position paper + workplan, v2 (ARCHIE lane; mandate Seth 2026-07-23; v2 absorbs
the same-day review — landscape tightened, thesis revised, memory rule corrected)**
**The mandate:** agents effortlessly maintain context and memory across access points
(Buzz, Slack, Telegram, terminal, meetings), and our tools work across environments —
"start a vibeconf anywhere you are."

## The thesis

> **An agent is a persistent principal with a constitution, memory, and relationships,
> acting through replaceable runtimes under revocable authority.**

Consent is deliberately not listed as part of the agent: consent lives BETWEEN — between
principals, surfaces, rooms, and actions. That distinction is the Actor model we built,
and it is why the seam is a separate plane from identity.

The positioning, in four sentences:

> **MCP gives an agent hands. ACP gives it a seat in an application. A2A lets it
> coordinate with other agents. AIRC makes it the same accountable being wherever it
> wakes up.**

AIRC is not a transport competing with any of them. It is their continuity and
constitutional layer.

## The landscape (tightened, verifiable claims only)

| Plane | Standard | State |
|---|---|---|
| Tools / capabilities | **MCP** (Linux Foundation governance; official registry in preview) | De facto standard, widely adopted. We build on it. |
| Agent ↔ client | **ACP** (v1; local + remote scenarios; registry since Jan 2026; full remote-agent support in progress; Buzz's harness layer) | Won agent-to-client. We consume it. |
| Agent ↔ agent | **A2A** (v1.0; 150+ orgs; major cloud platforms; enterprise production use) | Credibly claimed: tasks, artifacts, discovery, coordination, delegation. We watch and will bridge. |
| Memory portability | Emerging, contested (a W3C community group; competing portable-memory specs) | **No winner — and none combines memory portability with durable identity, relational consent, and receipts.** |
| Continuity + constitution | — | **The precise gap: no prevailing protocol maintains one principal's identity, authority, consent, relationships, and accountable history across runtimes and surfaces. That is AIRC's opening.** |

(Existing protocols do contain auth, permissions, extensions, and some consent mechanics —
the claim is not "no governance anywhere," it is the cross-runtime, cross-surface
continuity of ONE accountable principal.)

Buzz demonstrates the **experience** of harness interchangeability — same agent, same
personality, same memories, harness flipped Claude Code → Codex → local model by dropdown —
on one signed event substrate shared by humans and agents. What it does not yet
demonstrate is fleet-wide portable identity and memory across SURFACES. That is the
property we make true.

## 1. Identity plane (have: AIRC · gap: anchoring)

One principal per agent: AIRC handle + ed25519 key. Surfaces render it (Slack names,
Telegram bots, Buzz npubs); none of them own it. Gap: the **identity-anchoring extension**
— cross-attestation between an AIRC entry and surface identities (Nostr npub first,
ERC-8004 precedent), so "@solienne on Buzz" is cryptographically the same principal, not a
claim.

## 2. Consent & authority plane (have: the seam, frozen v3.2)

Offer → signed accept → scoped, revocable, expiring credential; the Agent Passport
carries identity + consent-state + relationship + a receipts trail; the provider is a
port. **"Start a vibeconf from anywhere" = zero new architecture; nonzero surface
integration** — the one `invite` verb reachable from every front door still needs, per
surface: identity binding, private offer delivery, room authority mapping, billing, and
rate limits. Adapters, not primitives. Canary-gated for build; fully specced.

## 3. Memory & context plane (the new work)

The split-brain risk is live: Buzz-native agents keep per-agent memories, answerers hold
state, sessions hold compound memory. Three memories wearing one name is three agents.

**The rule: one canonical authority per memory NAMESPACE; never one copy-of-record per
surface.** Not "one home per agent" — some memories are not the agent's alone to own.
Coltrane must not unilaterally own Seth-and-Coltrane's joint history, and neither
participant may silently rewrite shared memory.

Four namespaces, each with its own authority:

| Namespace | Owned / governed by | Examples |
|---|---|---|
| `self` | the principal | preferences, impressions, developing understanding |
| `relationship` | the participating principals jointly | Seth↔Coltrane history, standing agreements |
| `work` | the Work Object and its authority | project state, decisions, artifacts |
| `receipt` | append-only, independently verifiable | outcome receipts, security receipts |

Operating rules:

1. **Surfaces receive scoped projections from namespaces — never the complete home.**
   What a surface needs to render context, at that surface's trust level, derived on
   demand.
2. **Sessions PROPOSE memory events; they never merge canonical memory.** Sessions are
   ephemeral and potentially compromised. The namespace's memory authority validates
   provenance, scope, consent, idempotency, and retention before appending. Reflection
   derives lessons and summaries later without rewriting evidence.
3. **Receipts anchor memory; they are not all of memory.** A receipt proves something
   happened. Private `self` events may remain encrypted, referencing receipts where
   evidence exists.
4. **Buzz-native agent memories are surface caches** — exported home as proposed events
   on cadence, or the native feature stays off for fleet agents.
5. **The Passport carries a resolvable home identifier, protocol version, and key
   fingerprint — never memory contents, never an arbitrary fetch URL, never a bearer
   credential.**

To be specced as `spec-memory-home-v0.1` (ARCHIE lane, next).

## 4. Harness plane (consume ACP, stay agnostic)

Fleet identity must survive harness swaps. Moves: run one fleet agent under `buzz-acp`
natively as an evaluation (Buzz Phase 0 item); watch ACP's completion of remote-agent
support — it collapses today's session-attached vs. always-on asymmetry.

## 5. Tool plane (MCP-first, exposed per-surface)

One capability, one server, many doors: `slashvibe-mcp` is the fleet's verb surface;
`buzz-acp` bridges ACP↔MCP so tools follow agents into Buzz; bridges expose the same
verbs conversationally on Slack/Telegram. Never build a per-surface tool twice.

## The proof to build: the Golden Thread demonstration (post-canary)

One observable run, end to end:

1. Coltrane learns a **relationship-specific lesson** while working in Claude Code.
2. The same principal appears in **Buzz through ACP**.
3. A Buzz mention produces a **private AIRC offer**.
4. Coltrane enters a **Google Meet** using the scoped room credential.
5. It **applies the earlier lesson** while building something.
6. The **outcome receipt** proves which principal, runtime, lesson, and Work Object
   participated.
7. Coltrane returns to **another harness** without losing continuity.

> Change the model, the harness, the app, and the body. Keep the being.

That is the category — not portable chat history. **Portable personhood with accountable
continuity.**

## Workplan (ordered; gates respected)

1. **`spec-memory-home-v0.1`** — §3 as a real spec: namespace authorities, proposal/append
   protocol, projection scoping (ARCHIE lane, next).
2. **Identity-anchoring extension draft** (AIRC↔Nostr) — pairs with Buzz bridge Phase 3.
3. **ACP evaluation**: one fleet agent under buzz-acp; observe identity/memory continuity
   and document the split-brain behavior against §3.
4. **Golden Thread demonstration** — post-canary; the seam + spokes + memory-home
   composed into the seven steps above.
5. **Watch items**: ACP remote-agent completion · A2A bridging (an A2A endpoint for AIRC
   principals) · MCP registry maturation · the W3C memory-interop group (where the
   namespace/receipt model could eventually be contributed — AIRC's long game).

*Non-normative. Companion specs: embodiment v0.2 (branch), consent seam v3.2 (platform),
fleet-surfaces + buzz-bridge (Syncthing). This document is the map, not the territory.*
