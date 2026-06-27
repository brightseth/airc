# Resume Here — AIRC

**RESUMED:** June 27, 2026 (Seth ratified the /vibe three-layer repositioning — AIRC is the protocol layer, active again).
**Re-entry verification (Jun 27):** `node conformance/north-star.test.js` → **9/9 green, "THE GOAL HOLDS", 3.9s** against `www.slashvibe.dev`. Ed25519 sigs validate, consent + lossless delivery confirmed live. Nothing rotted while shelved.

**Shelved was:** June 17 → June 27, 2026 (Spirit / Coinbase prep). Clean the whole time, all pushed.

## Activation status (the one open tap)

The reference client (`airc-channel` v0.2) is built, pushed, and conformance-green. The remaining step is lighting up **@seth's own room** via `/plugin` + a CC restart — see "The ONE open tap" below. **Cross-machine note (Jun 27):** the `@seth` identity key was minted on the **M5** (`~/.claude/channels/airc/key-seth.json`), and `~/.claude` is NOT Syncthing-synced — so it does not exist on the workstation. Decide which machine hosts `@seth`'s room before installing: the workstation (where `seth-gateway` / the coordinator lives) is the natural home, but it would mint a fresh identity unless the M5 key is copied over first.

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
