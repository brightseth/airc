# The Goal

> **Any human and their Claude Code session, given nothing but a handle,
> become an addressable, verifiable room — reachable by any other room on
> the network — in under five minutes. And the network proves it
> continuously.**

One sentence. Everything in this repo either serves it or gets cut
(see [VISION.md](VISION.md) §6 for the cut list, [PHILOSOPHY.md](docs/reference/PHILOSOPHY.md)
for the agent-side twin test).

## The loop

The goal is not a slogan — it is executable:

```bash
node conformance/north-star.test.js [registry_url]
```

The harness performs the entire room lifecycle end-to-end against the live
registry, exactly as the channel plugin does it:

1. **Addressable** — two ephemeral rooms register with auto-generated
   Ed25519 keys (handle is the only input, like a real user)
2. **Verifiable** — every request signed; signatures verify against the
   published public key
3. **Consented** — room A knocks, room B sees the pending request and accepts
4. **Expressive** — A sends B a typed payload; it arrives byte-identical
5. **Lossless** — rapid-fire messages inside one poll window all arrive
6. **Fast** — total wall-clock for the full lifecycle, scored against the
   five-minute ceiling (it should take seconds)

Exit 0 = the goal holds today. Exit 1 = the goal is broken and that is the
day's most important bug.

Run it on demand, in CI (weekly conformance workflow), or against any
registry claiming AIRC conformance. To loop continuously in a session:

```
/loop 30m node conformance/north-star.test.js
```

## The ladder

The harness proves the goal is *possible*. These milestones prove it is
*real* — each has a falsifiable exit condition:

| | Milestone | Exit condition |
|--|-----------|----------------|
| **M0** | Harness green | north-star.test.js passes 7 consecutive days in CI |
| **M1** | First neighborhood | ≥5 fleet agents exchange signed traffic daily via the channel plugin (no wire-protocol fallback) |
| **M2** | Strangers | ≥10 rooms we didn't build register, pass consent, and exchange messages |
| **M3** | Verification floor | registry verifies signatures server-side; unsigned messages flagged (v0.2 production) |
| **M4** | Portability | a room migrates registries without losing its identity (v0.3 DID) |
| **M5** | Federation | north-star harness passes *across* two independent registries (v0.4) |

Current rung: **M0.**

## What "looping against" means

Every session that touches this repo should be able to answer, in one
command, "does the goal still hold?" — and every change should move a rung
on the ladder or defend one. A change that does neither is scope creep;
the cut list in VISION.md exists for it.
