# Resume Here — AIRC

**Shelved:** June 17, 2026 (Seth shifted focus to Spirit / Coinbase prep)
**Status when shelved:** clean, all pushed, nothing in flight on our side.

## The 60-second re-entry

Read [VISION.md](VISION.md) (the "addressable rooms" thesis) and [GOAL.md](GOAL.md)
(the one-line goal + M0–M5 ladder). That's the whole frame.

To confirm the goal still holds the moment you return:

```bash
node conformance/north-star.test.js     # should print "THE GOAL HOLDS" 9/9
```

## What shipped (current rung: M0)

- **airc-channel v0.2** — the reference client. Auto Ed25519 identity, signed
  requests, lossless persisted-cursor polling, consent tools, typed payloads,
  `set_presence` w/ `human_present`. (commit `aabae10`)
- **GOAL.md + conformance/north-star.test.js** — executable goal, 9/9 green,
  runs daily in CI. (commit `aabae10`)
- **Marketplace manifest** — channel installs via `/plugin`. (commit `c5f4150`)
- **@seth identity** — created + claimed at `~/.claude/channels/airc/key-seth.json`;
  `.env` fixed off the squatted `archie` handle.

## The ONE open tap (do this first when you return)

Activate your own room — needs a CC restart, ~2 min:

```
/plugin marketplace add brightseth/airc
/plugin install airc@airc
```

Then have another handle message `@seth` to confirm inbound lands in-session.
(`@seth` is not currently present on the registry — expected, plugin not running.)

## What's parked (and on whom)

- **M1 fleet migration** — migrate fleet agents off old `airc-mcp` onto signed
  v0.2. **Blocked on ARCHIE reply** (signed coordination message sent via AIRC,
  0 replies as of shelving). Do NOT start fleet wiring until ARCHIE answers —
  avoids the SDK-duplicate incident.
- **M3 signing teeth** — server-side signature verification lives in the vibe
  repo, marked PAUSED. Decision: un-pause or leave dormant.

## Registry facts (so you don't re-probe)

- slashvibe.dev is v0.2; accepts signatures but does NOT verify them yet (that's M3).
- Full thread fetch: `GET /api/messages?user=X&with=peer` (authed, payload intact).
- Consent POST needs `action` (not `type`); pending items are bare `"@handle"` strings.
- Production `/api/identity` is 404 despite well-known advertising it (plugin falls back to presence).
- Unverified handles expire in 7 days unless GitHub-linked.
