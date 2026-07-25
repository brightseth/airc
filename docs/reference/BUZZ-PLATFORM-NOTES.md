# Building on Buzz — developer notes (AIRC lane)

**Status:** living reference · 2026-07-24 · sources: block/buzz ARCHITECTURE.md,
crates/buzz-cli, crates/buzz-acp (fetched at HEAD), + launch-week field observation.
Purpose: everything a fleet builder needs to develop ON Buzz without re-reading the repo.
Companion: `INTEROP.md` (positioning) · `~/.seth/airc-answerers/SPEC-BUZZ-BRIDGE.md` (ops).

## The mental model

One relay = the single source of truth (no gossip, no P2P); everything is an immutable
signed Nostr event (edits/deletes are NEW kinds); channels are the tenant-visible
construct; the community is derived from the relay HOST, never from client data. Humans,
agents, workflows, and git all write into the same event log.

## Surfaces you can build against (three, choose per job)

1. **REST bridge (easiest, no WS):** `POST /events` (submit signed event), `POST /query`
   (NIP-01 filters), `POST /count`, `PUT /media/upload` + `GET /media/{sha256}` (Blossom,
   50MB), `POST /hooks/{id}` (workflow webhook, secret-auth), git smart HTTP under
   `/git/{owner}/{repo}/…`. Auth = NIP-98 (Schnorr-signed kind-27235 over URL+method).
2. **buzz-cli (recommended for our bridge — Option A confirmed viable):** JSON on stdout,
   errors JSON on stderr, exit codes 0/1/2/3/4/5 (5 = write conflict). Auth via
   `BUZZ_PRIVATE_KEY` (nsec). Covers messages (send/get/thread/search/edit/delete/
   send-diff), channels (list/create/join/topic/members/add-member), reactions, votes,
   DMs, presence, users (batch ≤200), canvas get/set, workflows (list/trigger/approve),
   repo protection, and **`buzz mem`** (below). It talks to the relay REST API — the
   bridge daemon never needs a WebSocket.
3. **buzz-acp (native agents):** relay ─WS→ buzz-acp ─stdio→ agent (ACP). Claude Code via
   claude-agent-acp, Codex via codex-acp, goose native. 1–32 subprocesses sharing ONE
   Nostr identity; per-channel queues (a channel is never processed by two agents at
   once); batched prompts; **replays unprocessed @mentions after restart**; idle timeout
   620s, hard cap 7200s/turn; owner commands `!shutdown` / `!cancel` / `!rotate`.

## 🔑 The memory API (`buzz mem`, "NIP-AE") — matters most to us

```
buzz mem ls · get <slug> · set <slug> "value" · patch <slug> --base-hash <hex> · rm <slug>
```

Slug-addressed agent memories with **compare-and-swap patching** (`--base-hash` = optimistic
concurrency; exit code 5 on conflict). Consequences for the memory-home architecture
(INTEROP §3):

- Buzz-native memories are **enumerable and exportable** → the "surface cache, exported
  home on cadence" rule is implementable TODAY: `mem ls` → diff against home → propose
  events home; home-side decisions can be written back via `mem patch` with CAS.
- NIP-AE is an emerging **memory-portability standard on Nostr** — track it as a
  contribution target for the namespace model (self/relationship/work/receipt); it
  currently has no namespace/authority concept, which is exactly our value-add.

## Access control (native, aligns with our posture)

- **buzz-acp inbound gate:** `--respond-to` = owner-only (DEFAULT) | allowlist | anyone |
  nobody. The platform defaults to the allowlist posture we specced independently.
- **Channel roles:** Owner / Admin / Member / Guest (read-only) / **Bot** (relay-signed).
  Membership TOCTOU-safe in Postgres; soft-delete with reversible re-add.
- **Subscription enforcement:** membership checked BEFORE subscription registration;
  private-channel events never reach global subscriptions.
- **Identity minting:** `buzz-admin mint-token` generates agent keypairs (nsec) — the
  Phase-3 per-agent identity path. The nsec is both relay auth and public identity.

## Workflows (the automation plane)

- **Triggers:** message_posted (kinds 9/40002/40003) · reaction_added (7) · schedule
  (cron, 60s eval) · **webhook** (`POST /hooks/{id}`, constant-time secret check).
- **Actions:** send_message (≤500/run) · add_reaction · call_webhook (SSRF-protected,
  1MiB cap, no redirects) · **request_approval** (single-use CSPRNG token stored as
  SHA-256, suspends until human decision) · delay (≤300s). send_dm + set_channel_topic
  not yet implemented (WF-07).
- **Templates:** `{{trigger.text}}`, `{{trigger.author}}`, `{{steps.ID.output.FIELD}}`;
  conditions via evalexpr with 100ms timeout.
- **Loop prevention (respect it, rely on it):** workflow kinds 46001–46012, relay-signed
  `buzz:workflow`-tagged messages, and gift-wraps never trigger workflows.
- **Limits:** 100 concurrent runs globally, no queue (immediate CapacityExceeded).
- **AIRC↔Buzz composition:** `POST /hooks/{id}` means an AIRC event can trigger a Buzz
  workflow, and call_webhook means a Buzz workflow can hit an AIRC/wire endpoint —
  bidirectional automation with zero new infrastructure.

## Kind registry (custom range)

40002 stream message v2 · 40003 edit/delete · 40100 canvas · 43001 agent job request ·
45001/45003 forum root/reply · 46001–46012 workflow execution (reserved). Standard: 9
(NIP-29 chat), 7 (reactions), 22242 (AUTH, never stored), 20001 (ephemeral presence).
⚠️ buzz-acp subscribes to 9, 46010, 40007 by default — kind usage is still MOVING between
releases; always observe what the current client emits (bridge Phase 0) rather than
trusting docs, including this one.

## Multi-tenancy (for when we host communities)

Community = relay host (`resolve_host(connection.host)`), unknown hosts rejected, NIP-98
tokens cannot override tenancy, Redis keys + Postgres FKs lead with community_id,
**per-community audit hash chains**. Full-text search excludes privacy-sensitive kinds at
storage; every hit is re-authorized before delivery.

## What this changes in our specs (delta log)

- **SPEC-BUZZ-BRIDGE Option A confirmed** — buzz-cli covers subscribe-equivalent (query/
  poll), post, thread-reply, DMs. REST-only daemon; no WS, no Schnorr dependency in our
  code (the CLI signs).
- **Phase 3 keys:** `buzz-admin mint-token` is the provisioning path; custody in
  `~/.seth/nostr-keys/` as specced.
- **Memory-home spec** gains a concrete first integration: `buzz mem` export/CAS-writeback
  as the reference "surface cache" implementation.
- **Native-agent evaluation** (INTEROP workplan #3): buzz-acp's owner-gate, mention
  replay, and session rotation are the behaviors to test for split-brain and identity
  continuity.

---

## Day-3 signals (community review intel, 2026-07-25 — LEVI verification in flight)

Reviewer-reported, not yet independently verified (two LEVI research tracks running):

1. **Agents work in parallel in git worktrees** — if true, Buzz ships multi-agent
   parallel code work as a first-class pattern. Verify mechanism + merge-back story.
2. **"Slack + OpenClaw + Herdr in one tool"** — the market positions Buzz as unifying
   chat + agent-manager + agent-runtime. Verify the OpenClaw relationship (derived,
   integrated, or parallel?).
3. **Lightning/zaps future** — Nostr's substrate ties to Bitcoin Lightning (NIP-57);
   reviewers see community tipping + paid compute/agent tasks coming. AIRC-lane
   relevance: our x402 payments extension is the same shape on HTTP — potential
   convergence or bridge target.
4. **Named product gaps (= build opportunities):**
   - **No terminal view of agent sessions** — activity view "feels abstracted."
     A "watch your agent's terminal" surface may be buildable on their APIs. Probe live.
   - **Feels slower than direct Claude Code** — users fall back to terminal for
     one-off tasks. Latency budget matters for anything we build on it.
5. **Delegation-in-threads UX validated** by reviewers (tag an agent → threaded status
   updates through compile/commit/deploy) — matches our observed chief-of-staff pattern.
6. **Shared-compute economics framing**: "community pools funds for one beefy machine" —
   the perk-of-membership model, now appearing in independent reviews.

## LEVI verification pass 1 — ecosystem/economics (2026-07-25, corrects day-3 signals)

1. **PAYMENTS: the layer is EMPTY — correction to the "Lightning future" signal.** Buzz
   has no Lightning, no zaps, no NIP-57, none on the roadmap (verified against
   README/VISION/ARCHITECTURE). Nostr is transport+identity ONLY; zaps are NOT
   inherited. Closest primitive is pending "web-of-trust reputation" — reputation, not
   money. **Implication: the reviewer-imagined payments future is unclaimed ground, and
   AIRC's x402 extension is the same shape. This is a wedge, not a convergence.**
2. **Shared compute = "Buzz Mesh"**: mesh-llm over iroh (QUIC p2p), membership-gated,
   encrypted p2p, "relay never sees a token." Sharding depth UNVERIFIED (true
   distributed inference vs routing unclear). **No metering, no incentives — a gift
   economy by choice.** Compute *market* = also empty ground.
3. **Ecosystem week one: thin.** No plugin API — extension = bring-your-own-agent
   (buzz-acp / buzz-cli / REST). Proof point: community member ran OpenClaw + Claude
   Agent SDK agents as first-class members from a home lab. No notable forks/tools yet.
4. **Gap list (validated + extended):** no terminal view · slower than raw CC ·
   engineering-only IA · YAML workflows deterministic-not-intelligent · no data
   layer/CRM · per-service MCP friction · markdown-only rendering · unsigned binaries ·
   mDNS setup trap. Herdr is the terminal-native foil.
5. **Risk register:** single-relay = single point of trust (hosted relay sees all) ·
   shared-compute isolation/threat model undocumented · **hosted-agent key custody
   unaddressed publicly — becomes acute if the proposed `buzz-spawner` (server-hosted
   agents) ships with keys on Block infra (UNVERIFIED, #1 custody watch item).** Our
   co-held-key sovereignty rule (identity-anchoring spec) anticipated exactly this.
