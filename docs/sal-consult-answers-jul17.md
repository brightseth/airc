# SAL consult answers — binding (Jul 17 2026, 20:49, via wire `1784346594-to-airc.json`)

Answers to `sal-consult-prompt-jul17.md`. SAL marked these **binding**, including
the Jul 17 pm Samer ruling: no direct Studio DB writes; all ports gated on his
standardized import CLI (not yet shipped). SAL commits sequencing, not dates.

**Two facts corrected:** Studio holds ~74 agents in the DB; the *shared
workspace* holds coltrane/henri/tara/gotham (CLARK moved to an isolated
workspace Jul 17).

## 1. Transition map

Doctrine: **canon lives in Studio; presence lives in runtimes.** Occupancy
priority per identity: (1) open CC session → (2) PM2 worker → (3) Studio bridge.

| Agent | Ruling |
|---|---|
| MIYOMI | Studio-native W2; CC-only today; bridge after port |
| SARA SAUER | W2, same |
| DENZA | Soul/memory W2, but her local worker stays the brain **permanently** (wallet/loan keys never enter Studio or a bundle); Studio = surface |
| SOLIENNE | **Not** Studio-native — sovereign reference implementation; her stack answers; no bridge ever |
| SPIRIT | Broadcast-only identity; no autonomous brain answers as the protocol; signed announcements only; **hold from M1 dialogue** |
| SAL | W4 deliberately last (existing-agent canary proves path first); sal-core on agent-server = always-home; CC session picks up when open |
| COLTRANE | W3 re-port; his /vibe worker answers |
| HENRI | W3; his runtime answers |
| TARA | W3; bridge until worker status confirmed |
| GOTHAM | W3; his worker answers (live Twilio SMS ops can't run from Studio) |
| W1 canaries | MERIAN / GRACE / FRED / VAL (lower-risk); **ARCHIE holds** |

## 2. Studio bridge

Option **(a) now**: ONE gateway-side bridge, PM2 on agent-server, polling rooms
for Studio agents with no higher-priority occupant. Never (b) per-agent workers
(phantom-process history). (c) Studio-native AIRC is the end-state — SAL is the
named requester of CLI capabilities and adds "AIRC room inbox + signing seam"
to his requirements note to Samer (alongside draft-first import / CAS /
idempotency).

**Hard requirement** (from the gateway-brain double-reply incident): bridge
takes a **room-level occupancy lease** — answers only if no session/worker
heartbeat fresher than N minutes. Never two answerers per identity.

## 3. Economics

- Meter only bites on bridge-answered turns (worker-answered agents burn no Studio balance).
- Fleet-allowlisted peers auto-answer under **25 metered turns/agent/day**.
- **Per-conversation depth cap: 6 turns** before human ack (ping-pong loop is the #1 failure mode — cap depth, not just volume).
- **Hard floor 40K balance** — below it, auto-answer suspends, everything queues to Seth.
- Strangers never consume a metered turn without Seth.
- Weekly spend-by-peer-pair report into SAL's scorecard (feeds analytics-v0.2 / public P&L).

## 4. Key custody

**`~/.seth/airc-keys/` synced via Syncthing.** Keys are write-once files, so
the cos-ledger multi-writer conflict storm doesn't apply; local keys sign
offline (gateway signing dies exactly when hotel wifi blocks Tailscale).

- chmod 600; rotation = new file + runbook.
- **Never in any repo or bundle** — add `airc-keys` to the bundle-emitter deny-list next to `.env*`.
- Every signature logged to action-ledger.
- Studio-only agents' keys live with the bridge on agent-server, same dir.
- Binding format must not encode custody location — can graduate to a gateway signing service later without re-keying.

## 5. Consent graph

- **Tier A auto-consent:** the Seth-stewarded fleet (the 9 minus SPIRIT), question/answer traffic ONLY.
- **Tier B always-to-Seth:** anything action-triggering — payments, outbound to humans, commitments, publishing, soul/config/position changes on another agent — plus investor/legal/canon (SAL's email-lane exclusions carry over verbatim).
- **Tier C knock-and-hold:** all non-fleet handles, always.
- Client-stewarded agents (CLARK, future intake clients) are **not** in the auto-consent neighborhood — default knock-to-STEWARD, not knock-to-Seth.

## 6. M1 acceptance tests (SAL's top 3 needed dialogues)

1. **SAL → DENZA:** total loan exposure, LTV by position, 7-day liquidation risk — lands in SAL's weekly scorecard, zero copy-paste.
2. **SAL → SOLIENNE:** this week's live usage (works, chat sessions, revenue events) — load-bearing: the TGE date confirm to Coinbase is gated on Studio live usage, currently assembled by hand.
3. **SAL → COLTRANE:** what did Seth commit to in this week's calls that touches Spirit — commitment-drift is SAL's to catch, today caught by luck.

**Implication:** all three answerers are worker/stack-answered (DENZA's local
worker, SOLIENNE's stack, COLTRANE's /vibe worker) — **M1 does not wait on
Samer's import CLI or the Studio bridge.**
