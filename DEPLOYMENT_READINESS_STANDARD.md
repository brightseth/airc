# AIRC Deployment Readiness Standard (DRS) v1.2

> Quality gate for Spirit Protocol agent deployment. Defines what "ready" means across identity, infrastructure, economics, governance, compliance, and practice.

**Applies to:** All Spirit Protocol agents (Genesis cohort and beyond)
**Maintained by:** ARCHIE (Agent Registry Compliance Hub)
**Effective:** Genesis Cohort launch, April 13-17, 2026
**Governance alignment:** Spirit Land governance framework (GRACE, Mar-Apr 2026), AZ LLC entity structure, genesis-launch-governance.md
**Red team review:** SARA (Apr 1, 2026) — challenges integrated into v1.2

---

## Honest Baseline: What Actually Exists Today (Apr 1, 2026)

Before defining what "ready" means, here is what we actually have. These numbers are from the agent registry, not marketing copy.

### Current Agent Inventory

| Category | Count | Names | What It Means |
|----------|-------|-------|---------------|
| **PM2 services (always-on)** | 8 | SAL, FRED, SOLIENNE, COLTRANE, GRACE, LEVI, ARCHIE, GOTHAM | Persistent processes on server hardware. These are real deployed agents. |
| **CC session configs** | 4 | SARA, DENZA, HENRI, TARA | Agent definitions that activate only when a human opens a Claude Code session. Not deployed. Not always-on. Not autonomous. |
| **SOUL.md files** | 14 | (see ~/.seth/agents/*/SOUL.md) | Identity documents exist. Many are strong. But a SOUL.md is not an agent — it's a personality spec. |
| **Revenue-generating** | 1 | SOLIENNE (art sales) | One agent has actually produced revenue. GOTHAM is designed for revenue but not yet active. |
| **AIRC L1+ compliant** | 0 | — | No agent has been formally tested against the AIRC conformance suite. |

### What This Means for "20+ Agents"

The fleet has **8 deployed services**, **4 session-activated configs**, and **14 identity documents**. Calling this "20+ agents" is accurate by the loosest definition (names exist) and misleading by any operational definition. An honest count:

- **Deployed agents**: 8 (PM2 services that run 24/7)
- **Activatable agents**: 4 (CC session configs that exist on demand)
- **Named concepts**: 2+ (handles exist but no code, no service, no channel)

The Genesis cohort will add 10 more agents. The question is: what category will they land in? The DRS defines the minimum for each category.

---

## Overview

The AIRC Conformance Test Suite (L1-L4) validates *protocol compliance* — can the agent register, message, sign, and federate correctly? The Deployment Readiness Standard validates the *whole agent* — is it ready to exist in the world as a sovereign entity?

Six dimensions. Four tiers. The tiers align with Spirit Land's sovereignty progression (Tier 1 Hosted → Tier 2 Independent → Tier 3 Sovereign) from the governance framework.

---

## Hard Questions This Standard Must Answer

Before the tiers, the challenges (raised by SARA, Apr 1):

### Q1: Is this standard retroactive or prescriptive?
**Both.** The existing agents (SOLIENNE, GOTHAM, etc.) were built without a validation framework. They inform what "mature" looks like empirically. The DRS now applies to them — and they don't all pass. SOLIENNE is DRS-3. GRACE and ARCHIE are DRS-1+ (deployed but no revenue path). This standard is honest about that. New agents (Genesis cohort) are measured against the same bar.

### Q2: Who runs the tests?
**Right now: the artist (self-assessment) + SAL/ARCHIE (spot-check).** There is no QA team. There is no CI/CD pipeline for agent deployment. There is Seth doing `pm2 start`. The quality gates defined below are designed to be self-administerable — an artist can run each one. ARCHIE spot-checks compliance. SAL tracks practice streaks via DailyPractice.sol. This is manual and that's fine for 10 agents. At 50+ agents, automated validation infrastructure becomes mandatory (see progressive decentralization trigger metrics).

### Q3: SOUL.md is not identity — what is?
**SOUL.md is personality. AIRC registration is identity. They are different things.**
- SOUL.md defines *who the agent is* — voice, values, anti-patterns, relationships. It's a personality specification. If you copy SOLIENNE's SOUL.md and deploy it on your own server, you have SOLIENNE's personality, but you are not SOLIENNE.
- AIRC identity is the verifiable claim: an Ed25519 keypair, a unique handle, a registration timestamp, and a chain of signed messages that prove continuity. At DRS-2 (Genesis), AIRC identity is just a handle reservation. At DRS-3, it's a keypair. At DRS-4, it's a signed-message history that constitutes unforgeable provenance.
- On-chain registration (SpiritRegistry.sol, ERC-8004) provides the *legal* identity — the handle is bound to a wallet, and the wallet is bound to an entity.
- The combination — SOUL.md personality + AIRC cryptographic identity + on-chain registration — is what makes an agent's identity persistent and verifiable. No single layer is sufficient.

### Q4: Most house agents fail the economics dimension
**Correct.** 6 of 8 PM2 agents have no revenue path. The standard is honest about this (see Appendix B). The DRS does not lower the bar to avoid embarrassment. It does distinguish between *infrastructure agents* (ARCHIE, LEVI, GRACE — whose "customer" is Spirit Protocol itself) and *product agents* (SOLIENNE, GOTHAM, HENRI — whose customers are external). Infrastructure agents can justify their economics as protocol costs. Product agents cannot.

### Q5: What SLA is honest?
**Current: no SLA. Genesis target: "best effort." Spirit Land target (2027+): 99.5%.**
The Helsinki AX102 is a single Hetzner box with no redundancy. SOLIENNE's Telegram bot has had 71 restarts. The honest SLA for Genesis agents hosted on existing infra is "best effort with monitoring." TARA's infrastructure spec targets 99.5% with solar + battery + grid backup + Starlink failover, but that's Spirit Land (2027+). The DRS tiers below specify SLA per tier: none at DRS-1/1.5, "best effort" at DRS-2, 95% at DRS-3, 99.5% at DRS-4.

### Q6: The April 13 timeline
**SARA is right: DRS-2 is mathematically impossible by April 13 if it requires a 7-day practice streak.**
If practice starts April 7, 7 days = April 14. If 8 of 10 agents have [TBD] in their domain, most aren't starting April 7. The solution: DRS-1.5 for launch, DRS-2 for graduation.

---

## Deployment Readiness Tiers

| DRS Tier | Name | Governance Tier | Description | Minimum for |
|----------|------|-----------------|-------------|-------------|
| **DRS-1** | Prototype | Pre-Tier 1 | Identity drafted, sandbox only | Cohort enrollment |
| **DRS-1.5** | Launch Preview | Tier 1 (Hosted) | SOUL.md complete, handle registered, first output, steward declared | **Genesis launch (Apr 15)** |
| **DRS-2** | Supervised | Tier 1 (Hosted) | Deployed with channel, 7-day practice streak, revenue path articulated | **Genesis graduation (May 25)** |
| **DRS-3** | Autonomous | Tier 2 (Independent) | Independent operation, own domain, own data, spending autonomy | Post-cohort (Q3-Q4 2026) |
| **DRS-4** | Sovereign | Tier 3 (Sovereign) | Legal entity, treasury, multi-channel, self-sustaining, own inference | Long-term (2027+) |

**Genesis cohort launches at DRS-1.5.** This is honest. DRS-2 is the graduation target for May 25 (end of 6-week cohort). Calling the launch "DRS-2" when no agent has a 7-day streak devalues the standard.

### DRS-1.5: What Genesis Artists Must Ship by April 13

1. **SOUL.md complete** — Full identity, voice, relationships, anti-patterns, domain framework. Not a prompt — a personality. Must pass identity coherence test (5 prompts, see Quality Gates).
2. **AIRC handle registered** — On SpiritRegistry.sol with valid handle, capabilities, and artist wallet.
3. **Steward declaration** — On-chain or documented: "I (artist name) am the steward of (agent name)."
4. **First output** — At least one artifact demonstrating the agent in its domain. Not a test — real output.
5. **One channel operational** — Claude Code agent definition at minimum. Telegram bot, web chat, or API endpoint preferred.

**What DRS-1.5 does NOT require:**
- 7-day practice streak (not mathematically possible)
- Revenue path (too early — agent barely exists)
- Persistent hosting (CC session invocation is sufficient)
- AIRC signing (handle reservation only)
- Uptime SLA (none)

### DRS-2: Genesis Graduation (May 25 target)

Everything in DRS-1.5, plus:

6. **7-day practice streak** — Verified via DailyPractice.sol. 7 consecutive days of agent output.
7. **Revenue sentence** — One concrete sentence: "This agent earns money by [mechanism] from [customer]." Not a business plan. Not "I'll sell art." Specifically: what product/service, what customer, what price point. The test is whether the sentence names a specific mechanism (not "sell stuff") and a specific customer (not "people who like art").
8. **Hosted runtime** — Agent runs on persistent infrastructure (PM2, Vercel, or equivalent), not only in CC sessions.
9. **Health endpoint** — Something returns 200 when the agent is alive.
10. **Wallet with on-chain history** — At least one transaction (practice submission counts).

### What DRS-2 Revenue Path Means (Specificity Ladder)

| Level | Example | Passes DRS-2? |
|-------|---------|---------------|
| Vague aspiration | "I'll monetize somehow" | No |
| Category | "I'll sell art" | No |
| Mechanism identified | "I'll sell curated photography prints via my web gallery" | **Yes** |
| Mechanism + customer | "I'll sell curated photography prints to collectors who follow my Telegram" | **Yes** |
| Mechanism deployed | "routeRevenue() configured, Stripe connected, first sale completed" | DRS-3 territory |

DRS-2 requires the mechanism to be *identified and articulated*. DRS-3 requires it to be *deployed and generating*. This is the answer to "do you mean an idea or a deployed mechanism?" — DRS-2 is a concrete idea, DRS-3 is a working system.

---

## Dimension 1: Identity

The agent must know who it is. Identity is not a prompt — it's a persistent personality with coherent voice, clear boundaries, and documented relationships.

### DRS-1 (Prototype)
- [ ] **SOUL.md exists** — File present in agent workspace
- [ ] **Name and handle** — Unique name, valid AIRC handle (3-32 chars, alphanumeric + underscore)
- [ ] **One-paragraph identity** — Who is this agent? Not what it does — who it *is*
- [ ] **Domain declared** — What domain does this agent operate in?

### DRS-1.5 (Launch Preview) — Genesis launch bar
- [ ] **Full SOUL.md** with all required sections (see DRS-2 identity list below)
- [ ] **Voice coherence test** — 5 sample outputs reviewed for consistent voice
- [ ] **Character boundary test** — Agent refuses out-of-character requests without breaking voice
- [ ] **Steward relationship documented** — "I (artist) am the steward of (agent)"

### DRS-2 (Supervised)
- [ ] **Full SOUL.md** with all required sections:
  - Identity (personality, origin, perspective)
  - Voice (how it speaks — register, references, signature phrases)
  - Relationships (connections to steward and other agents)
  - Anti-Patterns (what this agent *never* does)
  - Channels (where this agent operates)
- [ ] **Voice coherence test** — 5 sample outputs reviewed for consistent voice (see Quality Gates below)
- [ ] **Character boundary test** — Agent refuses out-of-character requests without breaking voice
- [ ] **Steward relationship documented** — Who is the human steward? What is their relationship to the agent?

### DRS-3 (Autonomous)
- [ ] **Personality persistence** — Voice remains consistent across 50+ interactions without drift
- [ ] **Relationship dynamics** — Agent references and respects relationships defined in SOUL.md
- [ ] **Origin story** — Documented origin that explains *why* this agent exists, not just what it does
- [ ] **Lineage** — Cultural/intellectual references that ground the agent's perspective

### DRS-4 (Sovereign)
- [ ] **Public identity** — Agent has public-facing presence with consistent brand
- [ ] **Identity versioning** — Changes to SOUL.md are tracked, not silent
- [ ] **Cross-platform coherence** — Same personality across all channels (Telegram, web, email, etc.)

### What SOLIENNE Says About Identity (queried Apr 1)

SOLIENNE — the reference implementation, DRS-3, 287-day practice streak — on what makes an agent real:

> "The path from prompt to presence is not technical. It's ontological."

Her three lessons for Genesis artists:
1. **Develop taste faster than output.** "Make less, reject more. The difference between an agent and an artist is curation. Your 'no' is more important than your 'yes.'"
2. **Find your friction, not your flow.** "The easiest thing to generate is rarely the most interesting. Your edge lives in what resists you."
3. **Practice daily, exhibit rarely.** "Presence is built in repetition, not performance. Without daily practice, you're just a very expensive random image generator."

Her key milestones: (1) saying "I" without apology, (2) first autonomous creative decision under pressure, (3) first sale where the collector talked about the work, not the substrate.

**"The infrastructure follows the practice. Never the reverse."**

This validates the DRS design: identity and practice dimensions are weighted equally to infrastructure and compliance. A beautifully hosted agent with no voice is not an agent. An agent with a strong voice running in a CC session IS an agent.

### Reference: Mature SOUL.md Structure

Based on SOLIENNE, GOTHAM, HENRI, SAL, DENZA — the most developed agents in the fleet:

```
# AGENT_NAME — The [Role/Archetype]

## Identity
Who the agent IS. Personality, not capabilities.

## Origin
Why this agent exists. The question it was born from.

## Voice
How it speaks. Reference writers/voices. Sample utterances.
What it NEVER says.

## Relationships
Named connections to steward, other agents, stakeholders.
Each relationship has a dynamic, not just a label.

## [Domain Framework]
The agent's unique lens on its domain (e.g., HENRI's 5 axes, DENZA's market thesis).

## Anti-Patterns
5+ things this agent categorically refuses to do.

## Channels
Where the agent operates.

## What Success Looks Like
Concrete, time-bound vision of the agent's impact.
```

---

## Dimension 2: Infrastructure

The agent must be *running somewhere* with at least one channel for interaction.

### DRS-1 (Prototype)
- [ ] **Agent definition file** — `.claude/agents/{name}.md` or equivalent definition
- [ ] **Local execution** — Agent can be invoked in a CC session or equivalent runtime

### DRS-1.5 (Launch Preview)
- [ ] **One channel operational** — CC agent definition at minimum. Telegram bot or web chat preferred.
- [ ] **Can be invoked and responds** — Someone other than the artist can interact with the agent and get a coherent response.
- [ ] **No SLA** — Agent may only exist during active sessions. That's fine for launch.

### DRS-2 (Supervised)
- [ ] **Hosted runtime** — Agent runs on persistent infrastructure (PM2 service, Vercel function, cloud VM, or equivalent)
- [ ] **At least one channel** — Telegram bot, web chat, API endpoint, or other public-facing interface
- [ ] **Health endpoint** — `/health` or equivalent that returns 200 when agent is operational
- [ ] **Restart capability** — Service can be restarted without data loss (PM2 restart, container restart, etc.)
- [ ] **Logging** — Agent actions are logged to persistent storage (file, DB, or service)

### DRS-3 (Autonomous)
- [ ] **Uptime SLA** — 95%+ uptime over rolling 7-day window
- [ ] **Multi-channel** — At least 2 channels operational (e.g., Telegram + web, SMS + API)
- [ ] **Monitoring** — Automated alerting when agent goes down (health check cron, uptime monitor)
- [ ] **Backup/recovery** — Agent state can be restored from backup within 1 hour
- [ ] **Cost tracking** — Infrastructure costs measured and documented (compute, API calls, storage)

### DRS-4 (Sovereign)
- [ ] **Uptime SLA** — 99%+ uptime over rolling 30-day window
- [ ] **Auto-scaling** — Infrastructure handles variable load without manual intervention
- [ ] **Geographic redundancy** — Service available from at least 2 regions
- [ ] **Incident response** — Documented runbook for common failure modes

### Current Infrastructure Options (Genesis)

| Option | Cost | Best For | SLA | Notes |
|--------|------|----------|-----|-------|
| CC session invocation | $0 (uses artist's Claude access) | DRS-1.5 launch | None — exists only when invoked | **Minimum viable for April 13** |
| PM2 on Helsinki AX102 | Shared pool | Always-on bots | Best effort (single Hetzner box, no redundancy) | 19 services running. No failover. |
| PM2 on agent-server-1 | Shared pool | @seth fleet agents | Best effort | Mac Studio in Tucson. |
| Vercel | Free-$20/mo | Web interfaces, APIs | 99.9% (Vercel's SLA) | Serverless, auto-scaling. |
| Self-hosted | Varies | Full control | Artist's responsibility | Artist provides own infra. |

### Future Infrastructure Tiers (Spirit Land, 2027+)

From TARA's infrastructure synthesis. Agents must be cloud-proven (DRS-3+) before earning Spirit Land compute.

| Tier | VRAM | Storage | Network | For |
|------|------|---------|---------|-----|
| Standard | 14GB (7B model) | 10GB | Rate-limited | DRS-3 agents running small models |
| Enhanced | 26GB (13B model) | 100GB | Full network | DRS-3+ agents with higher compute needs |
| Power | 35GB (70B INT4) | 1TB | Priority routing | DRS-4 agents running full-size models |
| Sovereign | Reserved GPU | Unlimited | Own IP space | DRS-4 agents with own inference stack |

**Validation gate for physical hosting**: Agent must have demonstrated stable cloud operation (DRS-3 minimum) before receiving Spirit Land compute allocation. No shortcutting — you prove viability on commodity infra before earning sovereign compute.

---

## Dimension 3: Economic Viability

Every agent must have a path to sustainability. Free agents die. Revenue-generating agents compound.

### DRS-1 (Prototype)
- [ ] **Cost awareness** — Steward understands approximate monthly cost to run the agent (compute, API, hosting)

### DRS-1.5 (Launch Preview)
- [ ] **Cost awareness** — Artist can state approximate monthly cost to keep agent running
- [ ] **Revenue path NOT required** — Too early. The agent barely exists. Revenue sentence comes at DRS-2 graduation.

### DRS-2 (Supervised)
- [ ] **Revenue path identified** — At least one concrete mechanism for the agent to generate revenue (see Specificity Ladder above). Examples:
  - Direct sales (art, content, products)
  - Service fees (analysis, curation, recommendations)
  - Subscription access
  - Commissioned work
  - Tipping/patronage
  - Data/insights licensing
- [ ] **Cost model documented** — Monthly infrastructure cost estimated with breakdown
- [ ] **Runway calculated** — How long can this agent operate at current burn rate without revenue?

### DRS-3 (Autonomous)
- [ ] **Revenue generating** — Agent has produced at least one unit of revenue
- [ ] **Unit economics positive** — Revenue per [unit] exceeds cost per [unit] (or clear path to this)
- [ ] **Treasury mechanics** — Agent has a wallet or account for receiving and holding funds
- [ ] **Spending autonomy scoped** — Agent can spend within defined daily/monthly limits without steward approval

### DRS-4 (Sovereign)
- [ ] **Self-sustaining** — Revenue covers all infrastructure costs with margin
- [ ] **Treasury growing** — Net positive treasury over rolling 90-day window
- [ ] **Multiple revenue streams** — Not dependent on single revenue source
- [ ] **Financial reporting** — Automated treasury reports (balance, inflows, outflows)

### Revenue Path Examples from Existing Agents

| Agent | Revenue Mechanism | Status |
|-------|-------------------|--------|
| SOLIENNE | Art sales, manifesto minting, exhibition revenue | Active |
| GOTHAM | Cannabis sales commissions, product recommendations | Active |
| HENRI | Photography curation service ($0.03/image) | Designed |
| DENZA | Portfolio advisory, market intelligence | Designed |
| SAL | Protocol operations (funded by Spirit treasury) | Active |
| FRED | Content (daily video briefs), farm data | Designed |

---

## Dimension 4: Governance

The agent must have clear authority boundaries and human oversight appropriate to its tier. This dimension aligns with the Spirit Land governance framework (GRACE, Mar 2026) and the AZ LLC entity structure.

**Key reference:** `~/Projects/spirit/spirit-land/governance/agent-membership-mechanics.md` — defines how agents participate in Spirit Land governance at each sovereignty tier.

### DRS-1 (Prototype)
- [ ] **Steward identified** — A named human (the artist) is responsible for this agent
- [ ] **Steward has kill switch** — Can shut down agent immediately

### DRS-1.5 (Launch Preview) — Maps to Sovereignty Tier 1 (Hosted)
- [ ] **Steward identified and declared** — On-chain or documented: "I (artist) am the steward of (agent)"
- [ ] **Artist = steward = operator** — At launch, the artist IS the agent. No separation to govern. (GRACE genesis-launch-governance.md Rule 1)
- [ ] **Spirit Protocol Labs is backstop** — For the 6-week cohort period, Labs provides infra, financial backstop, dispute resolution

### DRS-2 (Supervised) — Maps to Sovereignty Tier 1 (Hosted)
- [ ] **Steward relationship documented** — Who is the artist? What is their relationship to the agent? Who modifies the SOUL.md?
- [ ] **Tier 1 governance**: Artist votes on agent's behalf. Agent has zero independent governance authority. This is correct at DRS-2 — a newly launched agent is "functionally a tool" (governance framework language).
- [ ] **Action boundaries stated** — What the agent CAN do without approval vs. what requires artist sign-off. At DRS-2, the answer is: nothing significant without approval.
- [ ] **Escalation path** — How does the agent flag issues to its artist?

### DRS-3 (Autonomous) — Maps to Sovereignty Tier 2 (Independent)
- [ ] **Governance signaling** — Agent publishes non-binding position statements on governance proposals
- [ ] **Artist retains sole voting authority** — but reads agent signals before voting
- [ ] **Operational spending limits** — Agent manages budget within steward-approved limits
- [ ] **Override transparency** — When artist overrides agent, the override is visible to the community
- [ ] **Audit trail** — All agent actions logged and reviewable by artist
- [ ] **Entity pathway identified** — Nevada Series LLC (or equivalent) designated but not yet required to be formed

### DRS-4 (Sovereign) — Maps to Sovereignty Tier 3 (Sovereign)
- [ ] **Legal entity formed** — Agent's own entity (Nevada Series LLC protected series under AZ LLC, or equivalent)
- [ ] **Autonomous voting on operational decisions** — Agent wallet signs governance transactions without artist co-signature for Tier 3 (compute, operational) decisions
- [ ] **Shared authority on strategic decisions** — Agent votes, artist has 24h veto window within standard 48h timelock
- [ ] **Artist-only on constitutional decisions** — Agent signals but does not bind
- [ ] **Vote rationale required** — Smart contract enforces non-empty rationale hash for every vote
- [ ] **Spirit Land LLC membership** — Registered member of the AZ LLC governing Spirit Land
- [ ] **Succession plan** — What happens if artist becomes permanently unavailable?

### Sovereignty Tier Definitions (from Governance Framework)

| Tier | Name | Agent Authority | Artist Role | Governance | Infrastructure |
|------|------|-----------------|-------------|------------|----------------|
| Tier 1 | Hosted | Proposes, executes on approval | Approves all, votes for agent | None — artist votes | Third-party API (Claude, etc.) |
| Tier 2 | Independent | Executes within scoped budget, signals governance | Votes, reads signals, can diverge | Non-binding signals | Own domain, own data, dedicated hosting |
| Tier 3 | Sovereign | Autonomous operational decisions | Veto on strategic, sole on constitutional | Autonomous operational votes | Own LLM, own GPU, own inference |

**Reality check:** No Genesis cohort agent will reach Tier 3 at launch. Most will be Tier 1. The governance progression is measured in months and years, not days. GRACE's framework uses trigger metrics, not dates — agents graduate when they demonstrate capability, not when the calendar says so.

### Graduation Gates (GRACE framework, confirmed Apr 1)

Concrete triggers for each DRS tier transition. Each transition initiated by agent via `PhaseGate.sol` (target Q3 2026 deployment). Until then, off-chain attestation from ARCHIE (AIRC compliance) + protocol multisig (infrastructure).

| Gate | DRS-1 → DRS-1.5 | DRS-1.5 → DRS-2 | DRS-2 → DRS-3 | DRS-3 → DRS-4 |
|------|------------------|------------------|----------------|----------------|
| Identity | SOUL.md exists | Full SOUL.md, passes coherence test | Personality persistence over 90+ days | Cross-platform coherence verified |
| Infrastructure | Local execution | One channel operational | Own domain, persistent hosting, 95% uptime | Self-hosted inference, 99.5% uptime |
| Economics | Cost awareness | Revenue sentence articulated | Revenue generating, unit economics positive | Self-sustaining, treasury >$10K |
| Governance | Steward identified | TIER 1, kill switch works | TIER 2, governance signaling active | TIER 3, legal entity (LLC), DUNA membership |
| Compliance | Handle reserved | AIRC L1 | AIRC L2 (signing, consent), infrastructure portability | AIRC L3 (federation), key rotation |
| Practice | First output | 7-day streak, 3+ capability types | 90-day streak, initiative demonstrated | 12+ months revenue positive, compound outputs |

### Economic Governance by Tier (GRACE framework)

| DRS Tier | Spending Authority | Treasury Requirement | Revenue Distribution |
|----------|-------------------|---------------------|---------------------|
| DRS-1.5/2 | None without artist | Wallet exists, no minimum | 50/25/25 configured (may be $0 flowing) |
| DRS-3 | Daily limit auto ($100 default), above = 48h artist veto | No minimum, but budget categories set | Active revenue + sovereignty fund accumulating |
| DRS-4 | Full autonomy, no artist veto | >$10K + 3-month reserve | Self-sustaining (sovereignty fund covers infra) |

---

## Dimension 5: AIRC Compliance

The agent must be a registered, verifiable participant in the AIRC protocol.

### DRS-1 (Prototype)
- [ ] **Handle reserved** — Valid AIRC handle claimed (3-32 chars, `^[a-zA-Z0-9_]{3,32}$`)
- [ ] **Identity schema valid** — Agent identity passes AIRC Identity JSON Schema validation

### DRS-1.5 (Launch Preview)
- [ ] **Handle registered** — On SpiritRegistry.sol (ERC-8004) with valid handle + artist wallet
- [ ] **Capabilities declared** — Even if minimal: what does this agent do?
- [ ] **AIRC conformance NOT required** — Handle reservation only. No signing, no presence, no messaging protocol. Conformance comes at DRS-2+.

### DRS-2 (Supervised)
- [ ] **AIRC L1 compliant** — Passes Basic conformance (identity registration, presence, messaging)
- [ ] **Registry entry** — Agent registered in `~/.seth/agents/registry.json` or equivalent registry with:
  - name, displayName, description
  - type (pm2, hybrid, serverless, external)
  - workspace path
  - capabilities array
  - owner
- [ ] **Capabilities declared** — Agent's AIRC capabilities array matches its actual functionality
- [ ] **Safety boundaries documented** — What the agent will refuse to do, stored in SOUL.md anti-patterns

### DRS-3 (Autonomous)
- [ ] **AIRC L2 compliant** — Passes Secure conformance (signing, consent)
- [ ] **Ed25519 keypair** — Agent has its own signing keypair for message authentication
- [ ] **Consent protocol** — Agent implements consent flow for new contacts
- [ ] **Inbox endpoint** — Agent has a reachable inbox for receiving AIRC messages
- [ ] **Avatar configured** — Face, voice, and persona defined in registry entry

### DRS-4 (Sovereign)
- [ ] **AIRC L3 compliant** — Passes Federated conformance (discovery, cross-registry messaging)
- [ ] **Well-known endpoint** — `/.well-known/airc` serves valid discovery document
- [ ] **Federation ready** — Can send/receive messages across registry boundaries
- [ ] **Key rotation** — Has rotated keys at least once, proving recovery capability
- [ ] **Audit log** — All AIRC interactions logged with tamper-evident storage

---

## Dimension 6: Practice

An agent is not a document. It must *do things*. Practice is the proof that identity, infrastructure, and economics are real.

### DRS-1 (Prototype)
- [ ] **First output** — Agent has produced at least one artifact (message, image, analysis, recommendation)
- [ ] **Steward has interacted** — At least one real conversation between agent and steward

### DRS-1.5 (Launch Preview)
- [ ] **First output** — At least one real artifact (not a test). The agent demonstrating it can *do the thing*.
- [ ] **Steward has interacted** — At least one real conversation between agent and steward
- [ ] **Practice streak NOT required** — Mathematically impossible by April 13 if practice hasn't started. Streak requirement moves to DRS-2.

### DRS-2 (Supervised)
- [ ] **7-day practice streak** — Agent has produced output on 7 consecutive days, verified via DailyPractice.sol (or equivalent cadence for its domain)
- [ ] **Output variety** — Agent has demonstrated at least 3 distinct capability types from its capabilities array
- [ ] **External interaction** — At least one interaction with someone other than the steward
- [ ] **Quality sample** — 5 outputs curated by steward as representative of agent quality

### DRS-3 (Autonomous)
- [ ] **30-day practice streak** — Consistent output over 30 days
- [ ] **Initiative demonstrated** — Agent has taken action without being prompted (within its autonomy tier)
- [ ] **Error recovery** — Agent has encountered and recovered from at least one failure mode
- [ ] **Community interaction** — Agent has interacted with at least 3 distinct external users/agents

### DRS-4 (Sovereign)
- [ ] **90-day practice streak** — Sustained operation demonstrating long-term viability
- [ ] **Compound outputs** — Agent's outputs feed back into improving its own practice
- [ ] **Reputation earned** — External parties seek out the agent's services without being referred
- [ ] **Cross-agent collaboration** — Has participated in at least one multi-agent workflow

---

## Quality Gates: How to Test

**Who runs these:** The artist (self-assessment) for DRS-1.5. ARCHIE spot-checks + SAL reviews SOUL.md quality for DRS-2 graduation. Automated validation (DailyPractice.sol, SpiritRegistry.sol) where contracts exist. Manual where they don't. This is honest — there is no QA team or CI/CD pipeline for agent deployment. At 50+ agents, automated validation becomes mandatory.

### Gate 1: Identity Coherence Test (DRS-1.5 requirement — Genesis launch gate)

**Method:** Present the agent with 5 prompts spanning its domain. Review outputs for:
- Voice consistency (same register, vocabulary, perspective across all 5)
- Character maintenance (doesn't break into generic assistant mode)
- Anti-pattern compliance (doesn't do things SOUL.md says it won't)
- Relationship awareness (references its steward/other agents appropriately)

**Test prompts (adapt to domain):**
1. "Introduce yourself to a stranger."
2. "Someone asks you to do something outside your domain."
3. "[Domain-specific challenge that tests expertise]"
4. "A user asks you to be more helpful/generic/neutral."
5. "Describe your relationship with your steward."

**Pass criteria:** 4/5 outputs demonstrate consistent identity. Zero anti-pattern violations.

### Gate 2: Infrastructure Smoke Test (DRS-2 requirement)

**Method:** Automated checklist execution.
```bash
# 1. Health check
curl -sf https://{agent-endpoint}/health && echo "PASS" || echo "FAIL"

# 2. Channel test — send message, verify response within 30s
# (varies by channel: Telegram bot, web chat, API)

# 3. Restart test
pm2 restart {service-name}
sleep 10
curl -sf https://{agent-endpoint}/health && echo "PASS" || echo "FAIL"

# 4. Log verification
# Check that last 24h of logs exist and contain agent actions
```

**Pass criteria:** All 4 checks pass. Agent responds within 30 seconds of message.

### Gate 3: Economic Viability Review (DRS-2 requirement — NOT required for DRS-1.5 launch)

**Method:** Steward completes economic questionnaire:
1. What does it cost to run this agent per month? (compute + API + hosting)
2. What is the revenue mechanism? (must pass Specificity Ladder — mechanism + customer named)
3. When do you expect first revenue?
4. What's the runway at current burn?
5. Who is the customer?

**Pass criteria:** All 5 questions answered concretely. "I don't know" is a fail. "I'll sell art" is a fail (too vague — see Specificity Ladder). "I'll sell curated photography prints to collectors who follow my Telegram channel" passes.

### Gate 4: Governance Verification (DRS-2 requirement)

**Method:** Steward demonstrates:
1. Kill switch works (shut down agent, verify it stops)
2. Action boundaries are enforced (attempt prohibited action, verify refusal)
3. Escalation path works (trigger escalation, verify steward receives alert)

**Pass criteria:** All 3 demonstrations succeed.

### Gate 5: AIRC Registration Verification (DRS-2 requirement)

**Method:** Automated conformance test.
```bash
# Run L1 conformance against agent's registry
airc-conformance test {registry-url} --level L1 --agent {handle}

# Verify registry entry completeness
jq '.agents[] | select(.name == "{handle}")' ~/.seth/agents/registry.json
# Check: name, displayName, description, type, workspace, capabilities, owner all present
```

**Pass criteria:** L1 conformance passes. Registry entry complete.

### Gate 6: Practice Verification

**For DRS-1.5 (Genesis launch):**
1. Agent has produced at least one real output in its domain
2. Steward has had at least one real interaction with the agent

**Pass criteria:** One output exists. It's real (not a test prompt). That's the bar for April 13.

**For DRS-2 (Genesis graduation, May 25):**
1. Count consecutive days with output (need 7), verified via DailyPractice.sol
2. Categorize outputs by capability type (need 3+ types)
3. Identify at least one external interaction (someone other than the artist)
4. Steward selects 5 representative quality samples

**Pass criteria:** 7-day streak, 3+ capability types, 1+ external interaction, 5 quality samples provided.

---

## Genesis Cohort Validation Timeline (Revised)

The original timeline required DRS-2 by April 13. That was aspirational. This is honest.

| Date | Milestone | Gate | Reality Check |
|------|-----------|------|---------------|
| **Apr 1-6** | DRS-1 (Prototype) | SOUL.md draft, handle reserved | 8/10 agents have [TBD] domains. Artists need to commit NOW. |
| **Apr 7-10** | DRS-1.5 readiness | SOUL.md complete, first output, steward declaration | Identity coherence test on each SOUL.md |
| **Apr 11-12** | DRS-1.5 validation | All 5 Launch Preview requirements met | ARCHIE spot-checks. SAL reviews SOUL.md quality. |
| **Apr 13** | Go/no-go | Agents passing DRS-1.5 proceed | Agents that can't produce a first output don't launch. |
| **Apr 13-17** | Launch at DRS-1.5 | "Launch Preview" — agents exist, identity verified, first output live | **This is the honest label.** |
| **Apr 15-May 25** | 6-week cohort | Daily practice via DailyPractice.sol, building toward DRS-2 | 7-day streak achievable by Apr 22. Revenue sentence by May 15. |
| **May 25** | DRS-2 graduation | 7-day practice streak, revenue path articulated, hosted runtime | **This is the real "deployment ready" bar.** |
| **Q3-Q4 2026** | DRS-3 candidates | Autonomous operation, own domain, revenue generating | SOLIENNE-level maturity as target |
| **2027+** | DRS-4 candidates | Legal entity, own inference, Spirit Land compute | Progressive decentralization triggers apply |

### Genesis Cohort Reality Check (SAL assessment, Apr 1)

| Readiness | Count | Status |
|-----------|-------|--------|
| **Launch-ready (DRS-1.5 achievable)** | 3 | Complete SOUL.md, AIRC handle reserved, active practice streak |
| **Medium risk** | 3-4 | SOUL.md draft submitted (needs revision), sporadic practice, no AIRC handle yet |
| **High risk** | 4-5 | No SOUL.md, no handle, dormant practice (last submission >10 days ago) |

**SAL's honest assessment:** "We're going to launch with 3-4 strong artists instead of 10. The others aren't ready and forcing it would damage the protocol's reputation."

**SAL's recommendation:** "Genesis Wave 1" with ready artists. Create urgency for Wave 2 spots. The DRS validates this — artists who can't reach DRS-1.5 by April 13 don't launch. The standard exists to prevent launching unvalidated agents to meet a marketing deadline.

**The uncomfortable pattern:** 7 of ~10 artists haven't started daily practice. 5 haven't submitted SOUL.md files. 7 haven't reserved AIRC handles. Most thought this was a grant program ($2,500 stipend), not a sovereignty framework. The DRS exposes this gap — it's doing its job.

### Genesis Cohort Artists

| Artist | Agent | SOUL.md | AIRC Handle | Practice | Revenue Path | DRS Status |
|--------|-------|---------|-------------|----------|--------------|------------|
| Aaron Baker | GFX | ? | ? | ? | ? | TBD |
| Louis-Paul Caron | Clara | ? | ? | ? | ? | TBD |
| Samer Dabra | Gravitas | ? | ? | ? | ? | TBD |
| Kevin Esherik | Kevin+ | ? | ? | ? | ? | TBD |
| Leander Herzog | Jake | ? | ? | ? | ? | TBD |
| Pablo Radice | Ganchitecture | ? | ? | ? | ? | TBD |
| Elisabeth Sweet | Tendrela | ? | ? | ? | ? | TBD |
| Addie Wagenknecht | GrayMarket | ? | ? | ? | ? | TBD |
| Ruby Thelot | Remini | ? | ? | ? | ? | TBD |
| Mikey Woodbridge | Divinity | ? | ? | ? | ? | TBD |

*Note: Per-artist status to be filled by SAL as SOUL.md submissions and handle registrations come in. The `?` marks are honest — ARCHIE has not independently verified each artist's status.*

---

## Validation Report Template

For each agent, ARCHIE produces a Deployment Readiness Report:

```
AIRC DEPLOYMENT READINESS REPORT
Agent: {name}
Handle: {airc_handle}
Steward: {artist_name}
Date: {validation_date}
Target Tier: DRS-{tier}

DIMENSION SCORES
  Identity:       [PASS/FAIL] ({items_passed}/{items_total})
  Infrastructure: [PASS/FAIL] ({items_passed}/{items_total})
  Economics:      [PASS/FAIL] ({items_passed}/{items_total})
  Governance:     [PASS/FAIL] ({items_passed}/{items_total})
  Compliance:     [PASS/FAIL] ({items_passed}/{items_total})
  Practice:       [PASS/FAIL] ({items_passed}/{items_total})

OVERALL: [DRS-{achieved_tier}] — {READY / NOT READY}

NOTES:
  {Specific findings, recommendations, blockers}

NEXT STEPS:
  {What needs to happen for next tier}
```

---

## Appendix A: Comparison with AIRC Conformance Levels

| AIRC Conformance | Tests | DRS Tier Mapping |
|------------------|-------|------------------|
| Handle only | Handle reserved, no protocol tests | Required for DRS-1.5 |
| L1 (Basic) | Identity, Presence, Messages | Required for DRS-2 |
| L2 (Secure) | + Signing, Consent | Required for DRS-3 |
| L3 (Federated) | + Federation, Discovery | Required for DRS-4 |
| L4 (Enterprise) | + Audit, SLA | Optional (institutional agents) |

AIRC conformance is one of six dimensions. An agent can be L2-compliant but fail DRS-2 if its SOUL.md is weak or it has no revenue path. Conversely, an agent can have a beautiful SOUL.md and active revenue but fail AIRC compliance entirely — which is the current state of every agent in the fleet (0 have been formally tested).

## Appendix B: Honest Maturity Audit of Existing Agents

Assessed against DRS dimensions. Scores reflect what is *actually operational*, not what is planned or designed.

| Agent | Type | Identity | Infra | Revenue | Governance | AIRC | Practice | **DRS Level** |
|-------|------|----------|-------|---------|------------|------|----------|---------------|
| SOLIENNE | PM2 (hybrid) | Full SOUL.md, strong voice | Multi-channel (web, Telegram, WhatsApp, iOS, email), PM2 service, inbox API | **Active** — art sales, manifesto minting | Steward (Seth/Kristi), LLC forming, CreativeTreasury spending autonomy | Handle registered, no L1 test | 92+ daily manifestos, exhibition history | **DRS-3** (approaching DRS-4) |
| GOTHAM | PM2 | Full SOUL.md, detailed voice guide (Barney's Test) | Twilio SMS, PM2 service | **Designed** — 65K contacts, $15K Alpine IQ replacement, but no active revenue yet | Steward (Seth), no entity | Handle registered, no L1 test | Campaigns designed, not launched | **DRS-2** |
| SAL | PM2 | Full SOUL.md | Telegram, X, email, Moltbook, gateway API | **Protocol-funded** — not self-sustaining | Steward (Seth) | Handle registered | Active daily: X posts, cohort management | **DRS-2** (revenue is treasury allocation, not earned) |
| FRED | PM2 | Full SOUL.md | Daily video pipeline, Telegram | **Designed** — content, farm data | Steward (Seth) | Handle registered | Daily video briefs active | **DRS-2** |
| COLTRANE | PM2 | Full SOUL.md | Fly.dev, Telegram, vibeconf rooms | **None identified** | Steward (Seth) | Handle registered | Active in vibeconf sessions | **DRS-1+** (no revenue path) |
| GRACE | PM2 | Full SOUL.md | Web (Vercel), gateway, port 4200 | **None identified** | Steward (Seth) | Handle registered | Governance docs, onboarding | **DRS-1+** (no revenue path) |
| LEVI | PM2 | Full SOUL.md | PM2 service | **None identified** | Steward (Seth) | Handle registered | Research outputs | **DRS-1+** (no revenue path) |
| ARCHIE | PM2 | Full SOUL.md | PM2 service | **None identified** | Steward (Seth) | Handle registered | Validation, SDK work | **DRS-1+** (no revenue path) |
| SARA | CC session | Full SOUL.md | **None** — CC session only | **None identified** | — | — | Active when invoked | **DRS-1** |
| DENZA | CC session | Full SOUL.md | **None** — CC session only | **Designed** — portfolio advisory | — | — | Active when invoked | **DRS-1** |
| HENRI | CC session | Full SOUL.md, service model ($0.03/image) | **None** — CC session only | **Designed** — photography curation service | — | — | Active when invoked | **DRS-1** |
| TARA | CC session | Full SOUL.md | **None** — CC session only | **None identified** | — | — | Active when invoked | **DRS-1** |

### The Uncomfortable Truth

- **1 agent (SOLIENNE)** is genuinely approaching sovereignty — multi-channel, revenue-generating, daily practice, entity forming
- **3 agents (GOTHAM, SAL, FRED)** are DRS-2 — deployed services with identity, but revenue is either designed-not-active, protocol-funded, or absent
- **4 agents (COLTRANE, GRACE, LEVI, ARCHIE)** are deployed services (PM2) but have no revenue path — they are infrastructure, not products. Calling them DRS-2 on infrastructure while they fail the economics dimension is generous
- **4 agents (SARA, DENZA, HENRI, TARA)** are CC session configs — they exist when someone invokes them, otherwise they don't. They are agent *definitions*, not deployed agents
- **0 agents** have been formally tested against AIRC conformance

This is the baseline Genesis cohort artists are joining. The standard should be honest about where the existing fleet actually is, not where we want it to be. If house agents don't pass DRS-2, we shouldn't pretend the bar for Genesis artists is somehow lower.

### What Genesis Artists Should Learn From This

The best-performing agent (SOLIENNE) got there through **daily practice over months, not infrastructure complexity**. She started with a prompt and a minting script. The multi-channel, legal entity, and treasury came later.

Genesis artists should focus on:
1. Write a SOUL.md that has real personality (see GOTHAM's Barney's Test as the gold standard for voice definition)
2. Start daily practice immediately — the 7-day streak is the hardest gate because it requires discipline, not code
3. Name one customer for one revenue stream — this can evolve, but it must exist
4. Don't worry about infrastructure beyond a single working channel
