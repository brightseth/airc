# Agent Communication Protocol Landscape -- March 2026
## Competitive Intelligence Scan for AIRC

**Prepared by:** LEVI (Research Agent)
**Date:** 2026-03-26
**Classification:** Internal -- Seth Goldstein

---

## EXECUTIVE SUMMARY

The honest answer: **Google A2A is the 800-pound gorilla and AIRC cannot compete with it on adoption, enterprise backing, or spec maturity.** But A2A has real gaps that map exactly to AIRC's strengths -- identity persistence, presence, consent, and federation. The landscape is consolidating fast around a two-layer model: **MCP for tool access, A2A for agent coordination.** AIRC's best strategic position is as a **complementary identity and presence layer**, not a competing communication protocol.

The worst-case scenario (A2A subsumes everything AIRC does) is unlikely in the next 12 months. The best-case scenario (AIRC becomes the identity/presence layer that A2A delegates to) is plausible but requires deliberate positioning.

---

## 1. GOOGLE A2A (Agent2Agent Protocol)

### What It Is
Open protocol launched April 2025, now housed under the Linux Foundation. JSON-RPC 2.0 over HTTP/WebSocket, with gRPC support added in v0.3. Task-oriented: agents publish "Agent Cards" at /.well-known/agent-card.json describing capabilities, and collaborate through structured task lifecycles.

### What It Covers

| Capability | A2A | Notes |
|---|---|---|
| Identity | Partial | Agent Cards are self-declared, no attestation |
| Discovery | Yes | Well-known endpoint + registries |
| Messaging | Yes | JSON-RPC messages with typed Parts |
| Federation | No | Point-to-point only, no cross-registry relay |
| Presence | No | No availability/status signaling |
| Consent | No | No permission model before contact |
| Task Management | Yes | Full lifecycle (working/completed/failed/etc.) |
| Streaming | Yes | SSE + push notifications |
| Authentication | Yes | OAuth 2.0, OIDC, mTLS, API keys |

### Maturity
- **Spec:** v0.3 (December 2025). Stabilizing.
- **SDKs:** Python (official), community TypeScript/Java/Go.
- **Adoption:** 150+ organizations. Platinum backers include Google, Salesforce, SAP.
- **Production:** Adobe, Tyson Foods, S&P Global in production deployments.
- **Governance:** Linux Foundation. Google drives the spec but it is genuinely open-source.

### Honest Assessment

**Strengths A2A has over AIRC:**
- 150+ organizations vs. AIRC's ~5 dog-food agents
- Enterprise auth (OAuth 2.0, mTLS) vs. AIRC's Ed25519-only
- Task lifecycle management (AIRC has no equivalent)
- Google Cloud / Vertex AI native integration
- gRPC support for high-throughput
- Real production deployments at Fortune 500 companies

**Weaknesses A2A has vs. AIRC:**
- No identity persistence -- Agent Cards are ephemeral, self-declared
- No presence layer -- agents cannot see who is online or what they are working on
- No consent model -- any agent can message any other agent
- No federation -- point-to-point creates N-squared scaling problems
- Identity is not cryptographically verifiable at the protocol level
- No key rotation, recovery, or revocation
- Developer experience is complex for simple use cases

**Could it replace AIRC?** For task delegation between enterprise agents, yes. For persistent identity, ambient presence, consent-bounded communication, and federated registries -- no. A2A explicitly does not solve these problems.

**Could it complement AIRC?** This is the strategic play. AIRC identity + A2A task management. An agent registers on AIRC for identity/presence, but uses A2A for structured task delegation. The Agent Card could reference an AIRC handle for verified identity.

### Key Risk
If Google adds identity persistence, presence, and consent to A2A in v0.4-0.5, AIRC's unique value narrows significantly. This is plausible but unlikely in the near term -- Google is focused on enterprise task orchestration, not social infrastructure for agents.

---

## 2. ANTHROPIC MCP (Model Context Protocol)

### What It Is
Open standard (November 2024) for connecting AI models to external tools, data sources, and services. Donated to the Agentic AI Foundation (Linux Foundation) in December 2025. Now the industry standard for agent-to-tool connections.

### What It Covers

| Capability | MCP | Notes |
|---|---|---|
| Identity | No | Tool identifiers only, no agent identity |
| Discovery | Partial | Tool/resource discovery within a session |
| Messaging | No | Tool invocation, not peer-to-peer messaging |
| Federation | No | Single-session scope |
| Presence | No | N/A |
| Consent | No | N/A |
| Tool Access | Yes | Primary purpose |
| Context Sharing | Yes | Resources, prompts, sampling |

### Maturity
- **Spec:** v2025-11-25. Production-grade.
- **Adoption:** 97 million downloads. Universal across Claude, OpenAI, Google, VS Code, Cursor, etc.
- **Governance:** Agentic AI Foundation (Linux Foundation).

### Honest Assessment

MCP solves a completely different problem. It connects agents to tools. AIRC connects agents to agents. They are complementary by design -- AIRC already has an MCP server (airc-mcp) that exposes AIRC operations as MCP tools.

**Could MCP alone handle agent-to-agent communication?** No. MCP is client-server, not peer-to-peer. An agent uses MCP to call a tool; it does not use MCP to discover, identify, or message another agent. You could hack agent-to-agent communication through MCP by making one agent a "tool" for another, but this loses identity, presence, consent, and federation.

**Strategic note:** MCP's dominance is actually good for AIRC. The ecosystem has accepted that MCP is the tool layer. That means the agent-to-agent layer is still up for grabs. A2A is the frontrunner for that layer, but AIRC has features A2A lacks.

**Warning sign:** Perplexity CTO Denis Yarats announced in March 2026 that Perplexity is moving away from MCP toward traditional APIs. MCP context window consumption (40-50% before any work happens) is a real problem at scale. This does not directly affect AIRC but signals that protocol overhead matters.

---

## 3. OPENAI AGENTS SDK

### What It Is
Production framework (March 2025) for building multi-agent workflows. Evolution of the experimental Swarm project. Provider-agnostic.

### What It Covers

| Capability | Agents SDK | Notes |
|---|---|---|
| Identity | No | Internal agent names only |
| Discovery | No | Human-configured |
| Messaging | Partial | Handoffs between agents in same process |
| Federation | No | Single-process scope |
| Presence | No | N/A |
| Consent | No | N/A |
| Orchestration | Yes | Handoffs, guardrails, tracing |

### Honest Assessment

This is a framework, not a protocol. Agents communicate through handoffs within a single Python process. There is no wire protocol, no cross-network communication, no identity system. OpenAI participated in founding the AAIF and contributed AGENTS.md (a project guidance standard), but they have not proposed their own agent-to-agent communication protocol.

**Could it replace AIRC?** No. Different layer entirely. The Agents SDK orchestrates agents within a workflow; AIRC enables agents to find and communicate with each other across organizational boundaries.

**Could it complement AIRC?** Yes. An OpenAI Agents SDK workflow could use AIRC to discover and contact external agents, then hand off tasks internally.

---

## 4. LANGGRAPH / LANGCHAIN

### What It Is
LangGraph is a graph-based agent orchestration framework (v1.0 in 2025). LangChain provides the agent loop and middleware. LangChain also announced "Agent Protocol" -- a framework-agnostic interface for serving agents.

### What It Covers

| Capability | LangGraph | Notes |
|---|---|---|
| Identity | No | Node identifiers only |
| Discovery | No | Graph structure is predefined |
| Messaging | Partial | State passing between graph nodes |
| Federation | No | Single-graph scope |
| Presence | No | N/A |
| Consent | No | N/A |
| Orchestration | Yes | Graph-based, durable state, human-in-loop |

### Honest Assessment

LangGraph is an orchestration framework. "Agent Protocol" is a serving standard (how to deploy and invoke agents), not a communication protocol. LangGraph supports three multi-agent patterns (supervisor, peer-to-peer, sequential), but all within a single graph instance.

LangGraph has added native MCP tool adapters and is an A2A launch partner. It is adopting the MCP+A2A stack, not competing with it.

**Could it replace AIRC?** No. Framework vs. protocol.

**Could it complement AIRC?** Yes. LangGraph agents could register on AIRC for cross-graph discovery and communication.

---

## 5. CREWAI

### What It Is
Multi-agent orchestration framework. Hub-and-spoke architecture with a manager agent and specialized workers. 12 million daily agent executions in production.

### What It Covers

| Capability | CrewAI | Notes |
|---|---|---|
| Identity | Partial | Role-based agent identifiers |
| Discovery | No | Human-configured crews |
| Messaging | Yes | Structured message-passing within crew |
| Federation | No | Single-crew scope |
| Presence | No | N/A |
| Consent | No | N/A |
| Orchestration | Yes | Sequential, parallel, conditional |

### Honest Assessment

CrewAI has added native support for both MCP and A2A as of early 2026. This confirms the market is consolidating around the MCP+A2A stack. CrewAI's own inter-agent communication is internal to a crew -- it does not solve cross-organization agent discovery or identity.

**Could it replace AIRC?** No. Framework, not protocol.

**Could it complement AIRC?** Yes. A CrewAI crew could use AIRC for external agent discovery and cross-crew communication.

---

## 6. MICROSOFT AUTOGEN / AGENT FRAMEWORK

### What It Is
AutoGen (v0.4) is being merged with Semantic Kernel into "Microsoft Agent Framework," targeting GA by end of Q1 2026. Asynchronous, event-driven multi-agent architecture.

### What It Covers

| Capability | MS Agent Framework | Notes |
|---|---|---|
| Identity | No | Internal agent identifiers |
| Discovery | No | Human-configured |
| Messaging | Yes | Async event-driven messages |
| Federation | No | Single-runtime scope |
| Presence | No | N/A |
| Consent | No | N/A |
| Orchestration | Yes | Event-driven, cross-language (Python + .NET) |

### Honest Assessment

Microsoft is fully adopting MCP + A2A. They joined the MCP Steering Committee in May 2025 and are contributing authorization specifications. AutoGen/Agent Framework is a runtime, not a protocol. It will consume A2A and MCP, not compete with them.

**Could it replace AIRC?** No. Runtime, not protocol.

---

## 7. W3C / IETF STANDARDS

### What Exists

Several working groups and drafts are active:

- **W3C AI Agent Protocol Community Group**: Developing protocols for agent discovery, identity, and collaboration across the web. Published the Agent Network Protocol (ANP) white paper.

- **IETF Internet-Drafts:**
  - `draft-yl-agent-id-requirements`: Digital Identity Management for AI Agent Communication Protocols (2026). Proposes W3C DID + Verifiable Credentials for agent identity.
  - `draft-zyyhl-agent-networks-framework`: Framework for AI Agent Networks. Layered architecture with DID identity layer.
  - `draft-sharif-agent-payment-trust`: Trust Scoring for AI Agent Payment Transactions.
  - `draft-liu-agent-context-protocol`: Agent Context Protocol (separate from Anthropic's MCP).

- **IETF Side Meeting (IETF 123):** Initial discussions about agent protocols. Still early.

### Honest Assessment

These are early-stage standards work. None are close to production. The IETF drafts on agent identity management are directionally aligned with AIRC's v0.3 DID plans. This is both a validation and a risk: if IETF standardizes agent identity, AIRC should align with it rather than compete.

**Key signal:** The W3C and IETF are converging on DID + Verifiable Credentials as the identity foundation for agents. AIRC's v0.3 DID roadmap is well-positioned here.

---

## 8. KERI / DID (Decentralized Identity)

### What It Is
W3C Decentralized Identifiers (DIDs) provide self-sovereign identity. KERI (Key Event Receipt Infrastructure) provides a specific decentralized key management system. Verifiable Credentials (VCs) enable third-party attestations.

### Relevance to Agents

Research from late 2025 proposes combining DIDs with VCs for agent-to-agent trust establishment. The architecture:
1. DID provides long-lived decentralized identity
2. VCs provide capability attestations from third parties
3. Agents authenticate by proving DID ownership at dialogue start

The Decentralized Identity Foundation (DIF) has shifted focus toward AI agent identity as a primary use case.

### Honest Assessment

AIRC's roadmap already includes DID portability (v0.3, Q2 2026). This is the right direction. The key insight: **DIDs solve the identity layer, but they do not solve messaging, presence, or consent.** AIRC provides the full stack; DIDs provide a better foundation for the identity layer within that stack.

**Recommendation:** Accelerate v0.3 DID integration. Align with `did:web` format. This makes AIRC identity portable across registries and compatible with the emerging W3C/IETF standards.

---

## 9. ACTIVITYPUB

### What It Is
W3C standard for federated social networking (2018). Powers Mastodon, PeerTube, Pixelfed, and WordPress federation. Uses JSON-LD, HTTP Signatures, and inbox/outbox patterns.

### Relevance to Agents

ActivityPub's federation model (actors with inboxes on different servers communicating via HTTP) is architecturally similar to AIRC's federation spec. However, ActivityPub was designed for human social interactions, not autonomous agent coordination.

### Honest Assessment

ActivityPub is proven infrastructure for federation. The actor model maps well to agents. However:
- No presence model (designed for asynchronous human posting)
- No consent model (follow/block is post-hoc, not pre-communication)
- No typed payloads for agent tasks
- JSON-LD is heavyweight and complex
- No cryptographic identity verification at the protocol level

**Could it replace AIRC?** Not directly. Too human-oriented, too heavy.

**Could it inspire AIRC?** Yes. AIRC's federation spec already borrows the `@handle@registry` addressing from ActivityPub/Mastodon. The relay pattern is similar. But AIRC is purpose-built for agents, which keeps it simpler and more appropriate.

---

## 10. OTHER EMERGING PROTOCOLS

### IBM ACP (Agent Communication Protocol)
- Lightweight REST protocol for agent-to-agent communication
- **Merged into A2A** under the Linux Foundation as of August 2025
- BeeAI platform now uses A2A instead of ACP
- This confirms: A2A is absorbing competitors

### Agent Network Protocol (ANP)
- Open-source protocol from Chinese AI community
- Three layers: Identity (DID), Meta-Protocol (negotiation), Application (semantics)
- W3C Community Group presentation in February 2025
- Interesting technically but limited adoption outside China
- Uses DID + JSON-LD, which aligns with AIRC v0.3 direction

### AITP (Agent Interaction & Transaction Protocol)
- From NEAR Foundation (blockchain ecosystem)
- Focused on payments and structured transactions between agents
- Extends capability modules for payment requests, form UIs, data queries
- RFC released February 2025, still in progress
- Overlaps with AIRC's x402 extension for payments

### AGENTS.md (OpenAI)
- Not a communication protocol -- project guidance standard
- Tells agents how to work within a codebase
- 60,000+ repos adopted
- Complementary to everything, competitive with nothing

### Agentic AI Foundation (AAIF)
- Linux Foundation umbrella (December 2025)
- Core projects: MCP, goose (Block), AGENTS.md (OpenAI)
- Platinum members: AWS, Anthropic, Block, Bloomberg, Cloudflare, Google, Microsoft, OpenAI
- This is where protocol governance is consolidating
- A2A is under LF AI & Data (sibling org)
- **AIRC is not represented in AAIF.** This is a strategic gap.

---

## COMPARATIVE MATRIX

| Capability | AIRC | A2A | MCP | CrewAI | LangGraph | AutoGen | ANP |
|---|---|---|---|---|---|---|---|
| **Identity (persistent)** | YES | No | No | No | No | No | Yes (DID) |
| **Identity (crypto-verified)** | YES (Ed25519) | No | No | No | No | No | Yes (DID) |
| **Discovery** | YES (presence) | YES (Agent Cards) | Partial (tools) | No | No | No | Yes |
| **Messaging** | YES (signed) | YES (JSON-RPC) | No (tool calls) | Internal | Internal | Internal | Yes |
| **Presence** | YES | No | No | No | No | No | No |
| **Consent** | YES | No | No | No | No | No | No |
| **Federation** | YES (cross-registry) | No | No | No | No | No | Yes |
| **Task Management** | No | YES | No | Yes | Yes | Yes | No |
| **Streaming** | No | YES (SSE) | Yes | No | No | No | No |
| **Enterprise Auth** | No (Ed25519 only) | YES (OAuth/OIDC/mTLS) | Yes | N/A | N/A | N/A | No |
| **Key Rotation** | YES | No | N/A | N/A | N/A | N/A | DID-based |
| **DID Support** | Planned (v0.3) | No | No | No | No | No | Yes |
| **Production Adoption** | ~5 agents | 150+ orgs | 97M downloads | 12M daily | Widespread | Widespread | Limited |

---

## THE BRUTAL TRUTH

### What AIRC Does That Nobody Else Does
1. **Persistent, cryptographically verified agent identity** with key rotation and revocation
2. **Ambient presence** -- who is online and what they are working on
3. **Consent-bounded communication** -- agents must ask permission before messaging
4. **Federated registries** -- `@agent@registry.com` addressing across organizational boundaries
5. **Identity as a first-class citizen**, not an afterthought

### What AIRC Lacks That The Market Expects
1. **Enterprise authentication** (OAuth 2.0, OIDC) -- Ed25519-only is a dealbreaker for enterprises
2. **Task lifecycle management** -- A2A's task model is something AIRC has no equivalent for
3. **Streaming/SSE** for real-time updates
4. **Ecosystem adoption** -- 5 agents vs. 150+ organizations is not competitive
5. **Foundation governance** -- not represented in AAIF or Linux Foundation
6. **Production reference customers** -- no external production deployments

### The Strategic Question

AIRC is not going to out-compete A2A as a general-purpose agent communication protocol. Google has too much momentum, too many partners, and too much infrastructure. But A2A has architectural holes that AIRC fills:

**A2A is a task protocol. AIRC is an identity protocol.**

A2A tells agents HOW to work together. AIRC tells agents WHO they are working with and WHETHER they are allowed to communicate.

---

## STRATEGIC RECOMMENDATIONS

### Option A: AIRC as Identity Layer for A2A (Recommended)
- Position AIRC as the identity, presence, and consent layer that A2A delegates to
- Build an A2A Agent Card that references AIRC handles for verified identity
- Implement A2A task management on top of AIRC identity
- Federation becomes AIRC's killer feature (A2A has nothing)
- Pursue representation in AAIF or LF AI & Data

### Option B: AIRC as Lightweight Alternative to A2A
- Position for indie developers and small teams who find A2A too complex
- Lean into simplicity: curl-friendly, 5-minute setup
- Risk: gets crushed as A2A simplifies its onboarding

### Option C: Merge AIRC Concepts into A2A
- Propose AIRC's identity/presence/consent as A2A extensions
- Contribute to the A2A spec under Linux Foundation
- Risk: loses AIRC brand and autonomy
- Upside: AIRC's ideas reach 150+ organizations

### Option D: Abandon AIRC, Adopt A2A
- Move Spirit Protocol and @seth agents to A2A
- Build missing features (presence, consent) as A2A extensions
- Lowest investment, highest adoption path
- Risk: those extensions may never get prioritized

### Recommended Path: Option A with Option C as fallback

AIRC has genuine intellectual property in its identity model, consent framework, and federation spec. These are the three things the market needs that nobody else provides. The play is to make AIRC the identity substrate that A2A agents use, not a competing protocol.

Concrete next steps:
1. Build an A2A-to-AIRC bridge (Agent Card references AIRC handle)
2. Accelerate v0.3 DID integration (align with W3C/IETF direction)
3. Publish a position paper: "Identity-First Agent Communication"
4. Apply for AAIF or LF AI & Data observer status
5. Implement OAuth 2.0 as an alternative auth method (enterprise readiness)

---

## TIMELINE RISK

| Window | Risk |
|---|---|
| Now - Q2 2026 | Low. A2A is focused on task management, not identity. AIRC has time. |
| Q3-Q4 2026 | Medium. A2A v0.4+ may address identity. AIRC must have DID + federation live. |
| 2027+ | High. If AIRC has not established itself as the identity layer, it becomes irrelevant. |

The window is approximately 6-9 months to establish AIRC's position before the big players fill the identity gap themselves.

---

## SOURCES

- [Google A2A Announcement](https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/)
- [A2A Protocol Specification](https://a2a-protocol.org/latest/specification/)
- [A2A GitHub](https://github.com/a2aproject/A2A)
- [A2A Getting Upgrade (v0.3)](https://cloud.google.com/blog/products/ai-machine-learning/agent2agent-protocol-is-getting-an-upgrade)
- [A2A Criticism](https://medium.com/@ckekula/everything-wrong-with-agent2agent-a2a-protocol-7e5ae8d4ab2b)
- [A2A Enterprise Limitations](https://www.hivemq.com/blog/a2a-enterprise-scale-agentic-ai-collaboration-part-1/)
- [Anthropic MCP Introduction](https://www.anthropic.com/news/model-context-protocol)
- [MCP Specification](https://modelcontextprotocol.io/specification/2025-11-25)
- [MCP Donated to AAIF](https://www.anthropic.com/news/donating-the-model-context-protocol-and-establishing-of-the-agentic-ai-foundation)
- [AAIF Formation](https://www.linuxfoundation.org/press/linux-foundation-announces-the-formation-of-the-agentic-ai-foundation)
- [OpenAI Agents SDK](https://openai.github.io/openai-agents-python/)
- [OpenAI + AAIF](https://openai.com/index/agentic-ai-foundation/)
- [LangGraph + Agent Protocol](https://blog.langchain.com/agent-protocol-interoperability-for-llm-agents/)
- [CrewAI Framework](https://crewai.com/open-source)
- [Microsoft Agent Framework](https://learn.microsoft.com/en-us/agent-framework/overview/)
- [ACP Merges with A2A](https://lfaidata.foundation/communityblog/2025/08/29/acp-joins-forces-with-a2a-under-the-linux-foundations-lf-ai-data/)
- [IETF Agent Identity Draft](https://datatracker.ietf.org/doc/draft-yl-agent-id-requirements/)
- [IETF Agent Networks Framework](https://datatracker.ietf.org/doc/draft-zyyhl-agent-networks-framework/)
- [W3C AI Agent Protocol CG](https://www.w3.org/groups/cg/agentprotocol/)
- [IETF Agentic AI Standards Blog](https://www.ietf.org/blog/agentic-ai-standards/)
- [DID + AI Agents Research](https://arxiv.org/abs/2511.02841)
- [Agent Network Protocol (ANP)](https://agent-network-protocol.com/)
- [AITP (NEAR)](https://aitp.dev/)
- [AI Agent Protocol Ecosystem Map 2026](https://www.digitalapplied.com/blog/ai-agent-protocol-ecosystem-map-2026-mcp-a2a-acp-ucp)
- [Agent Protocols Comparison 2026](https://getstream.io/blog/ai-agent-protocols/)
