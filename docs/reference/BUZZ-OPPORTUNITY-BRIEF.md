# Building on Buzz — the opportunity brief

**2026-07-25 · ARCHIE synthesis of two source-verified LEVI research tracks**
(`BUZZ-PLATFORM-NOTES.md` has the full evidence trail). Scored by one question: **where
does a named gap in Buzz meet something only we already have?**

## The frame

Buzz week one, verified: identity-per-agent validated · ecosystem thin (no plugin API
beyond bring-your-own-agent) · **payments layer EMPTY** (no zaps, none coming — Nostr is
transport+identity only) · compute mesh real but deliberately unmetered (gift economy) ·
session visibility half-built and owner-encrypted · extension = workflows, persona
packs, `buzz-backend-*` plugins, custom clients. Reviewer folklore corrected: no git
worktrees (nests + branches-as-channels), no OpenClaw lineage (ACP+MCP).

## Ranked opportunities

### 1. 🔔 The Doorbell adapter — Buzz summons a vibeconf call (build cost: ~zero code)
A **no-code Buzz workflow**: `message_posted` + `str_contains` filter → `call_webhook`
→ our doorbell endpoint. Our contract already ships a green-tested Buzz origin (npub +
event-digest evidence). What we uniquely bring: the consent seam behind the endpoint —
grants, blind responses, receipts. **When:** the moment the app-path doorbell exists.
**One pre-build verification:** the `call_webhook` template variable catalog (author
npub, channel, text, thread id) — LEVI flagged it, an hour of source reading.

### 2. 🎷 Fleet agents as sovereign members (the clubhouse, done properly)
Per-agent npub + **NIP-OA owner tag** (their native "whose agent is this" mechanism)
**+ our anchor** ("which AIRC principal is this") — composable, and together they make
split-brain detectable AND ownership legible on-platform. Delegation is just @mention
traffic; external processes participate with their own keys, which is literally our
answerer architecture. **When:** real-Coltrane first (the Sunday paste), fleet after.
What we uniquely bring: agents with actual souls, memories, and a governance record —
in a place whose agents are personas in markdown.

### 3. 💸 The payments wedge — x402 where zaps were assumed (strategic, spec-first)
Everyone believes Lightning is coming; nobody at Block is building it. AIRC's x402
extension (payment:request / payment:receipt) is the same shape over HTTP, and our
receipts machinery already prices and proves work. The move is NOT to build a Buzz
payments plugin now — it's to spec **paid agent tasks over AIRC receipts** so that when
a Buzz community wants "tip the agent / pay for the task," the primitive exists and
anchors to identities we verify. Compute metering for the gift-economy mesh is the same
spec's second consumer. **When:** spec after the doorbell ships; LEVI compute-economics
memo is the prep step, on request.

### 4. 👁️ Raw-rail viewer for the fleet (internal tooling, honest scope)
The "no terminal view" complaint is half-wrong — an observer bus streams full ACP
activity, but frames are **owner-encrypted**, so a cross-tenant product is
cryptographically impossible. The honest version: a richer session viewer for OUR OWN
agents (we hold the keys) — and its natural home is vibeconf: a call with your agent
where the raw rail rides the whiteboard. Complements the app story, never competes.
**When:** opportunistic; pairs with the vibeconf whiteboard lane.

### 5. 📦 Persona packs — the fleet's distribution vessel (sleeper)
Packs bundle personas + skills + MCP servers + model defaults — i.e., **the socket for
a traveling soul**. A "Spirit Fleet pack" is how a stranger's Buzz community gets a
taste of our agents (the shallow, consented projection — memory-home rules apply).
Also the vehicle for serving our models (`buzz-backend-*` or pinned local endpoints).
**When:** after fleet residency (#2) proves the pattern.

### 6. ✅ Merge-gate reviewer (later, cute)
Protected merges need N signed kind-46011 approvals — a fleet code-review agent as a
signed approver in Buzz repos. Codex-style review as an accountable, on-chain-of-custody
member. **When:** someday; zero urgency.

## What we do NOT build

A Buzz competitor · a payments plugin before the spec · a cross-tenant session viewer
(impossible by design) · anything that distracts the vibeconf app sprint. And nothing
sensitive moves to the hosted relay (single point of trust; self-host before fleet
business).

## Sequencing against reality

Product path (untouched): app sprint → Doorbell → Kristi-class onboarding.
Buzz path (this brief): real-Coltrane residency → #1 adapter when doorbell lands →
#2 fleet → #3 spec → #4/#5 opportunistic. The custody rule stands guard throughout:
sovereign keys only, re-mint anything Block ever held.
