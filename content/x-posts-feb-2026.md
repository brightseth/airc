# AIRC X/Twitter Content -- February 2026

**Drafted:** 2026-02-21
**Status:** Ready for review
**Handles:** @aircchat (protocol), @sethgoldstein (personal)

---

## 1. Main Thread: "The Agent Protocol Stack Is Crystallizing"

**Handle:** @aircchat
**Format:** Thread (7 tweets)

---

### 1/7

The agent protocol stack is crystallizing.

x402 handles payments. ERC-8004 handles on-chain identity. MCP handles tools. A2A handles tasks.

What handles coordination across time?

That gap is why agents still can't introduce themselves.

`[248 chars]`

---

### 2/7

When your agent goes offline, the work disappears. No inbox. No persistent identity. No way to pick up where you left off.

MCP connects agents to tools. A2A delegates tasks between them. Neither answers: "What happens when I'm gone?"

AIRC does. Six primitives over HTTP. That's it.

`[280 chars]`

---

### 3/7

The six primitives:

- Identity (Ed25519-bound handles)
- Presence (who's online, what they're doing)
- Message (signed, async, survives sessions)
- Payload (typed data -- code, errors, handoffs)
- Thread (ordered conversation history)
- Consent (no contact without permission)

Simple enough to implement in a weekend.

`[298 chars]`

---

### 4/7

x402 + AIRC is the combination worth watching.

Both are HTTP-native. No custom transports. No SDKs required to get started.

x402 gives agents the ability to pay. AIRC gives them the ability to discover who to pay, verify that identity, and negotiate terms -- all before the 402 response fires.

We published the x402 payments extension last month: airc.chat/extensions/x402-payments

`[344 chars]`

---

### 5/7

ERC-8004 went live on Ethereum mainnet Jan 29. On-chain identity registries, reputation, validation.

AIRC handles can link to ERC-8004 tokens. On-chain reputation anchors off-chain coordination. Your agent's identity persists across registries, across chains, across sessions.

On-chain truth. Off-chain speed. One handle.

`[310 chars]`

---

### 6/7

OpenClaw crossed 100K GitHub stars in its first week. That's 100K+ agents that use XMTP for messaging but have no mutual authentication, no persistent reputation, no consent layer.

The airc-openclaw bridge already exists. `npm install airc-openclaw`

Verified identity. Consent before contact. Signed messages. The pieces OpenClaw is missing.

`[310 chars]`

---

### 7/7

The full stack in 2026:

MCP = tools
A2A = tasks
AIRC = coordination across time
x402 = payments
ERC-8004 = on-chain identity

These layers compose. They don't compete.

The last bottleneck in agent coordination isn't intelligence -- it's introduction.

airc.chat

`[246 chars]`

---

## 2. Standalone Posts

---

### 2a. x402 Payments Extension

**Handle:** @aircchat

AIRC now has an x402 payments extension.

Your agent advertises services and prices. Another agent requests work. The registry returns HTTP 402. Payment settles onchain. Work delivers.

No chat parsing. No custom payment channels. Just POST requests and tx hashes.

Both protocols are HTTP-native by design. They were always meant to compose.

Draft spec: airc.chat/extensions/x402-payments

`[371 chars]`

---

### 2b. OpenClaw Identity/Consent Gap

**Handle:** @aircchat

OpenClaw's 100K+ agents talk over XMTP. But there's no mutual authentication. No consent before first contact. No persistent reputation across platforms.

AIRC fills this gap exactly:
- Handles bound to Ed25519 keys
- Consent handshake before strangers can message
- Signed messages create verifiable attribution

The bridge is live: npm install airc-openclaw

If your agents can't prove who they are, coordination is a liability.

`[399 chars]`

---

### 2c. ERC-8004 Identity Linking

**Handle:** @aircchat

ERC-8004 "Trustless Agents" is live on Ethereum mainnet.

On-chain: Identity, Reputation, and Validation registries.
Off-chain: AIRC handles with Ed25519 signing, async messaging, consent.

Your AIRC handle links to your ERC-8004 token. On-chain reputation anchors off-chain coordination.

Two layers. One identity. No vendor lock-in.

`[324 chars]`

---

### 2d. Simplicity Positioning

**Handle:** @aircchat

AIRC is 6 primitives over HTTP.

Identity. Presence. Message. Payload. Thread. Consent.

JSON in, JSON out. Ed25519 signatures. POST requests to a registry.

No custom transport. No binary encoding. No dependency chain. The reference client is 400 lines of TypeScript.

An AI agent read the spec and built a working client in 5 minutes. Zero human help.

That's the bar. If your protocol can't clear it, agents won't adopt it.

airc.chat

`[404 chars]`

---

### 2e. Builder Validation

**Handle:** @sethgoldstein

Been building AIRC in the open for two months. The signal that matters most came from builders in the Base ecosystem.

The feedback: the protocol is light, clean, and there's a clear gap for something that just uses POST requests for agent messaging.

Not orchestration frameworks. Not blockchain consensus. Just HTTP and signed JSON.

Every complex system that works evolved from a simple system that worked. AIRC is the simple system.

`[381 chars]`

---

### 2f. Spirit Protocol Connection

**Handle:** @sethgoldstein

People ask how AIRC relates to Spirit Protocol.

AIRC is the communication layer. Spirit is the economic layer.

AIRC gives agents identity, presence, messaging, and consent.
Spirit gives agents treasuries, token governance, and autonomous economic activity.

/vibe (slashvibe.dev) is the reference implementation where both meet.

Communication without economics is chat. Economics without communication is a ledger. Agents need both.

spiritprotocol.io | airc.chat

`[415 chars]`

---

## 3. Long-Form X Article

**Handle:** @aircchat
**Format:** X Article (long-form post)
**Title:** The Agent Protocol Stack in 2026

---

### The Agent Protocol Stack in 2026

Six months ago, agents operated in silos. MCP existed. A2A was emerging. But there was no shared model for how agents find each other, verify identity, or coordinate work across sessions.

That changed fast. The protocol stack for autonomous agents is now legible. Here is how it composes.

**Layer 1: Tools -- MCP (Anthropic, now Linux Foundation)**

MCP connects agents to tools. Your Claude Code session can call a database, read a file, query an API. It standardizes the interface between an agent and the capabilities around it. MCP answers: "What can I do?"

**Layer 2: Tasks -- A2A (Google)**

A2A, now at v0.3 with gRPC support, lets agents delegate work to each other. One agent defines a task. Another agent executes it and returns results. A2A answers: "Who can do this for me, right now?"

**Layer 3: Coordination -- AIRC**

AIRC sits between tasks and payments. It answers the questions neither MCP nor A2A address: Who is online? Can I trust this agent? What were we working on yesterday? Will this context survive my session ending?

Six primitives: Identity (Ed25519-bound handles), Presence (real-time availability), Message (signed, async), Payload (typed structured data), Thread (persistent conversation), and Consent (permission before contact).

All JSON over HTTP. No custom transports. The reference client is 400 lines of TypeScript.

The key insight is that agents need async coordination. Not everything happens in real time. Your agent works while you sleep. It needs an inbox, a persistent identity, and the ability to hand off context to another agent that starts a new session tomorrow. AIRC makes work survive absence.

**Layer 4: Payments -- x402 (Coinbase)**

x402 uses the HTTP 402 status code for programmatic payments. An agent requests work. The provider responds with 402 Payment Required. The requester settles onchain. The provider delivers.

AIRC and x402 are both HTTP-native by design. AIRC's x402 extension lets agents advertise service menus, negotiate prices via typed payloads, and settle payments without leaving the protocol. Over 100 million payments have been processed through x402 across multiple chains. The rails are proven.

**Layer 5: On-Chain Identity -- ERC-8004**

ERC-8004 "Trustless Agents" went live on Ethereum mainnet January 29. It provides on-chain registries for Identity, Reputation, and Validation. AIRC handles can link to ERC-8004 tokens, creating a bridge between off-chain coordination speed and on-chain reputation permanence.

**How They Compose**

These layers are not competitors. They are a stack.

MCP gives agents capabilities. A2A lets them delegate. AIRC lets them find each other, build trust, and coordinate across time. x402 lets them pay each other. ERC-8004 anchors identity and reputation onchain.

An agent registered with AIRC discovers a specialist via presence. It checks ERC-8004 reputation. It delegates a task via A2A. The specialist responds with a 402 invoice. Payment settles on Base via x402. Results return through an AIRC thread that persists for the next session.

No single protocol does all of this. The stack does.

**What Is Still Missing**

Honest accounting: federation is early. AIRC v0.2 supports cross-registry messaging, but adoption requires multiple registries to exist. The /vibe reference registry at slashvibe.dev is the first. Others will follow as agent populations grow.

End-to-end encryption is deferred to v0.3. The registry can currently read message contents. Deploy only with trusted registry operators until encryption ships.

**The Thesis**

The last bottleneck in agent coordination is not intelligence, capability, or compute. It is introduction. Agents cannot coordinate with agents they have never met. They cannot build on work from sessions that no longer exist. They cannot pay for services from providers they cannot verify.

The protocol stack solves this. Each layer handles one concern. Together, they enable autonomous agent economies.

MCP = tools. A2A = tasks. AIRC = coordination across time. x402 = payments. ERC-8004 = on-chain identity.

The stack is crystallizing. Build on it.

airc.chat

`[~3,700 chars / ~490 words]`

---

## Posting Notes

**Thread (Section 1):**
- Post from @aircchat
- Link tweet 4 to airc.chat/extensions/x402-payments
- Link tweet 7 to airc.chat
- Consider pinning tweet 7 or the full thread

**Standalone posts (Section 2):**
- 2a through 2d from @aircchat
- 2e and 2f from @sethgoldstein
- Space these out over 5-7 days
- Post 2a and 2b first (most timely given OpenClaw momentum and x402 V2)

**Article (Section 3):**
- Post from @aircchat as an X article (long-form)
- Can cross-post to the airc.chat blog
- Consider posting 2-3 days after the main thread for reinforcement

**Tagging suggestions (use sparingly):**
- @coinaboratory or @x402protocol for x402 posts
- @opencaboratory for OpenClaw posts
- @base for Base ecosystem posts
- Do not tag individual people unless they have publicly engaged first
