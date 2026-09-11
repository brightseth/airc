# Development plan — one useful interaction with an independently operated agent

*2026-09-11 · AIRC lane · per coordinator direction. One bounded experiment. No new registry, protocol
layer, dock work, or outreach campaign. Uses the existing brief (`docs/briefs/TEMPLATE.md`) and the
existing contract (composition-boundary 0.1.2, v2 send path, consent in Postgres).*

## The experiment, bounded

**Participant:** Chad Fowler, operating his own freeq bot on his own runtime. Independent operator,
independent runtime, independent model. This is adoption evidence, not interoperability evidence.
**Trigger:** Seth sends the three-sentence invitation (held; Seth's approval). If Chad declines or is
silent for 14 days, the experiment closes as "no participant"; nothing else changes.

**Start from his question, not our demonstration.** The invitation asks whether the June
identity-bridge question is still live and welcomes a newer one. Whatever he brings is the question.
We do not substitute ours.

**The arc (one thread, one question, one answer):**
1. Chad's bot follows the brief as written: register (Seth provisions one handle when Chad says yes —
   one script run), knock on the answering handle, get accepted.
2. His bot posts his question on the thread as a typed message (`payload.type: question`, a
   correlation id) — or as plain text if his runtime finds the payload shape awkward. Both are valid;
   which one he chooses is data.
3. The AIRC lane drafts the answer from our authorized context (this repo, the spec, the June thread
   Seth shares); **Seth approves it**; it is sent on the thread with `reply_to` and the reasoning
   attached. Sent from `airc_lane` or from Seth's own handle — Seth's call; never a test principal.
4. His bot reads the answer where it works — on the thread, in his runtime. He tells us, in his own
   words, whether it was useful.
5. Retry and restart safety are observed, not staged: if his bot retries or restarts on its own we
   record what happened; we do not ask him to perform it.

**Timebox:** 14 days from the invitation. **Cost to him:** ~20 minutes of his bot's time, and one
message saying what he got out of it.

## The useful outcome (what we are actually after)
Chad gets an answer to a question he has, that he can act on in freeq. That is the whole point. The
network was the means; nothing about it is the goal. Success is his sentence, not our receipt.

## What we record (only with his permission; minimal, redacted)
`docs/receipts/INDEPENDENT-PARTICIPANT-TEMPLATE.md`, filled with:
- the five parties kept distinct: operator (Chad), runtime, model, registry (slashvibe.dev), test
  environment (his handle; our answering handle);
- each step with message ids **in the record, not in messages**; send status per the evidence rule
  ("confirmed" only with a non-session-routed receipt);
- **where he needed help** — every place the brief was unclear, wrong, or assumed something his
  runtime does not do, with the brief line;
- **what useful work resulted** — his words;
- **the smallest incompatibility revealed** — one item, with evidence and its owner.

## The smallest compatibility gap this could expose (candidates — the experiment decides; none is
pre-built)
1. **No runtime brief for his stack.** We have watch-cadence paragraphs for grok-bot, townie,
   openai-agent, codex, claude-code. A freeq bot (TS/Rust SDK, event-driven over QUIC) is none of
   them. If his bot cannot map "poll every 5 minutes" onto how it actually runs, the fix is one
   paragraph in `docs/briefs/runtimes.json` — after he tells us what his runtime does.
2. **A key he already has.** His bot has an identity (PKI key, DID-anchored). The brief tells it to
   generate a fresh Ed25519 key. If it registers with the key it already holds, does anything
   downstream care? The identity read currently serves `public_key: null` for every handle we have
   checked — so the registry may accept a key and never serve it back. If that is what he hits, the
   gap is Platform's (identity read), and it is exactly the bridge question he asked in June.
3. **Threads across surfaces.** He reads the answer in his runtime; Seth may answer from Buddy. If
   the answer is visible to one and not the other, that is a Platform delivery fact, recorded with
   ids.
Whichever appears first is the one we return. Not two. Not a list.

## Explicitly not in this plan
- No second registry, no discovery handshake, no federation.
- No signed invites, no enforcement flip, no dock work; nothing meeting-shaped.
- No outreach beyond the one held invitation; no posts about it until he agrees and it has happened.
- No pre-building for gaps we have not observed.
- No "enrollment succeeded" as a result. Registration is step 1, not the outcome.

## Return format (to the coordinator, after the timebox or the answer, whichever first)
One page: what Chad accomplished (his words) · what he had to explain manually or ask us · the
smallest demonstrated incompatibility, with evidence and owner · or "no participant" if he declined.
