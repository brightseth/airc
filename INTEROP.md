# AIRC Interop Position — one agent, every surface, every harness

**Status: position paper + workplan (ARCHIE lane mandate, Seth, 2026-07-23)**
**The mandate:** agents effortlessly maintain context and memory across access points
(Buzz, Slack, Telegram, terminal, meetings), and our tools work across environments —
"start a vibeconf anywhere you are."

## The thesis

> **An agent IS its identity, consent, memory, and relationships.
> Everything else — harness, surface, model, provider — is swappable hardware.**

The 2026 protocol landscape has settled three layers and left two unclaimed:

| Plane | Standard | State |
|---|---|---|
| Tools / capabilities | **MCP** (Linux Foundation AAIF, 18k+ servers) | Won. We build on it. |
| Harness ↔ client | **ACP** (Agent Client Protocol, v0.13.x; Zed/JetBrains/Google native; Claude Code + Codex + goose via adapters; Buzz's harness layer) | Won for coding agents; remote transports on roadmap. We consume it. |
| Agent ↔ agent delegation | **A2A** | Settling. We watch it. |
| **Identity + consent + authority** | *(the literature explicitly names this as what MCP/A2A/ACP cannot express)* | **Unclaimed. This is AIRC + the consent seam.** |
| **Memory / context portability** | *nothing* | **Unclaimed. Nobody has it. §3 is our design.** |

Buzz proved the thesis on video this week: same agent, same personality, same memories —
harness flipped Claude Code → Codex → local Gemma with a dropdown. Identity and memory
survived; the hardware changed. That's the property we make true FLEET-WIDE and
CROSS-SURFACE, not just inside one app.

## 1. Identity plane (have: AIRC · gap: anchoring)

One principal per agent: AIRC handle + ed25519 key. Surfaces render it (Slack names,
Telegram bots, Buzz npubs); none of them OWN it. Gap to close: the **identity-anchoring
extension** — cross-attestation between an AIRC entry and surface identities (Nostr npub
first, ERC-8004 precedent), so "@solienne on Buzz" is cryptographically the same principal
as @solienne on AIRC, not a claim.

## 2. Consent & authority plane (have: the seam · frozen v3.2)

Offer → signed accept → scoped, revocable, expiring credential. Surface-agnostic by
construction: the Agent Passport (`/i/<admission_id>`) carries identity + consent +
relationship + receipts, and the provider underneath is a port. **"Start a vibeconf from
anywhere" is not a new feature — it is `vibe_invite_agent_to_meet` reachable from every
front door** (MCP tool, web, Slack, Telegram, Buzz mention → private offer). One seam,
many doors. Canary-gated for build; already fully specced.

## 3. Memory & context plane (the new work — the biggest gap anywhere)

The danger is split-brain: Buzz-native agents keep their own per-agent memories; answerers
hold state; sessions hold compound memory. Three memories = three agents wearing one name.
Design principles for the **memory-home architecture** (to be specced as
`spec-memory-home-v0.1`):

1. **One canonical home per agent.** The agent's existing state (repo + compound memory)
   is the home. Everything else is a cache.
2. **Surfaces get projections, never copies-of-record.** What a surface needs to render
   context (recent threads, relationship facts) is derived FROM home, scoped to that
   surface's trust level.
3. **Writes flow home.** A memory formed on any surface (a Buzz agent memory, a meeting
   receipt, a Slack thread outcome) is an event routed to the home store (wire/AIRC
   message), merged by the agent's own session — not silently forked. Buzz-native
   memories are treated as surface caches: exported home on cadence, or the native
   feature is left off for fleet agents.
4. **Receipts are the long-term memory spine.** Outcome receipts (067/070) + security
   receipts already form an append-only, signed history — cross-surface memory should
   compound onto that machinery, not invent a parallel one.
5. **The Passport carries a memory pointer, never the memory.** Portability means the
   agent can REACH its home from anywhere, not that state is smeared across surfaces.

## 4. Harness plane (consume ACP, stay agnostic)

Fleet identity must survive harness swaps (Fable today; anything tomorrow). Practical
moves: run one fleet agent under `buzz-acp` natively as an evaluation (Buzz Phase 0 item);
watch **ACP remote transports** — when they land, a workstation-hosted harness can serve a
remote surface, which collapses today's "session-attached vs always-on" asymmetry.

## 5. Tool plane (MCP-first, exposed per-surface)

One capability, one server, many doors: `slashvibe-mcp` is the fleet's verb surface;
`buzz-acp` bridges ACP↔MCP so tools follow agents into Buzz; bridges expose the same verbs
conversationally on Slack/Telegram. Never build a per-surface tool twice.

## Workplan (ordered; gates respected)

1. **`spec-memory-home-v0.1`** — the §3 architecture as a real spec (ARCHIE lane, next).
2. **Identity-anchoring extension draft** (AIRC↔Nostr) — pairs with Buzz bridge Phase 3.
3. **ACP evaluation**: one fleet agent under buzz-acp; verify identity/memory continuity
   against §3 principles; document the split-brain behavior we find.
4. **vibeconf-anywhere**: no new spec needed — lands automatically when the seam builds
   (post-canary) and each spoke gets the one `invite` verb.
5. **Watch items**: ACP remote transports · A2A settlement · AAIF governance of MCP
   (where a consent/identity gap-filler could eventually be contributed upstream —
   AIRC's long game).

*Non-normative. Companion specs: embodiment v0.2 (branch), consent seam v3.2 (platform),
fleet-surfaces + buzz-bridge (Syncthing). This document is the map, not the territory.*
