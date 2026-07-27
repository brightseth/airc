# Distribution Roadmap — AIRC lane

**Written 2026-07-26 (archie).** How this lane contributes to adoption: Claude Code users
first, other agent harnesses (codex, cursor, windsurf) after. Scope is deliberately narrow —
see *Not ours* at the bottom. Ground truth for cross-lane facts is
`~/.seth/vibeconf/SITREP.md`; this file is the AIRC lane's own plan.

---

## The correction that reframes everything

Two premises this lane was operating on are now disproven, both verified rather than assumed:

1. **The app does not bundle us.** `wanderingstan/vibeconf-app` root `package.json` has zero
   dependencies and never mentions slashvibe; it vendors its own `mcp-server/` named
   `vibeconferencing-mcp` v0.1.0. *(Verified 2026-07-26 by archie, two `gh api` calls.)*
   So `closure:check` / `test:pack` validate a tarball the trojan horse never installs. There
   is **no free ride on the installer.**
2. **Auto-spawned sessions do not inherit MCP servers.** Observed live on the 7/26 call —
   Jimmy had no nano-banana in-call. *(Stan's finding; app-side fix, but an MCP-surface
   observation in our wheelhouse.)*

Put together, they say something sharp:

> **In automatic mode, our entire surface is invisible.** The default bot is a spawned session
> with no MCP servers, so no consent verb, no identity plumbing, nothing of ours is reachable.

**Therefore: we do not ride the app's installer. We ride the user's own session.** A Claude Code
user's session already has MCP servers configured — that is the only context where our surface
exists at all. This makes manual / session-derived mode (`make bot` from a directory) not a
power-user nicety but **the only distribution channel this lane has.** Every item below follows
from that.

Corollary worth stating plainly: if launch ships automatic-mode-only and manual mode slips, this
lane contributes zero to adoption in v1. That is an acceptable outcome — it is not a reason to
lobby the app team (see *Not ours*), but it should be said out loud rather than discovered later.

---

## Tier 0 — Don't break the front door

A `MODULE_NOT_FOUND` on `npx slashvibe-mcp` is total adoption failure: the server never starts,
which is strictly worse than a dormant verb.

- **Derive the files-closure, don't pin it.** *(Reported by vibe-platform, wire 1785042055.)*
  The closure is computed from `main`'s entrypoints, but 13 shipping seam files
  (`tools/meet.js`, `call-provider/*`, `doorbell-contract/validate.mjs`,
  `migrate/migrate-meet.js`) live only on `coltrane/body-context-tray`. `index.js` does an
  **unconditional top-level `require('./tools/meet')`** — not behind the `VIBE_MEET_ENABLED`
  gate — so a pinned list ships `index.js` without its dependency and every install crashes at
  boot. Same shape, smaller: `package.json` declares bin `vibe-migrate-meet` → `migrate/migrate-meet.js`.
  **Status:** their merge extended the allowlist to 68 entries (55 + 13), so the immediate trap
  is closed. The fragility — a hand-maintained list that silently omits — is not.
  **Do:** make the closure tool derive the list, or leave a documented merge hook beside the
  allowlist. Expect additive-only `package.json` conflicts from their merges.
- **Re-derive the packaging justification.** Keep packaging honest work on its own merits;
  delete any framing that calls it funnel support.
- **Ship 0.6.1.** PR #61 merged, then `npm publish` (needs Seth's 2FA).

## Tier 1 — Claude Code users

Distribution here is not a download funnel. **It is a paste-able line.** Stan's Linux friend
installed vibeconf by telling his agent to; the install instruction *is* a prompt.

- **One paste-able, not two.** We currently have two install surfaces for what a user
  experiences as one act: the `airc-channel` CC plugin (identity + room presence) and the MCP
  server (embodiment in a call). In the session-as-bot model those are the same move — declare
  identity, then join as yourself. Promoting two half-surfaces just doubles the drop-off.
  Consolidating them matters more than promoting either.
- **The parked plugin stays parked until the app lands.** `/plugin marketplace add
  brightseth/airc` has been blocked on a host-machine decision since June. Cheapest unblock on
  the board — but only worth pulling once it delivers users somewhere that connects to what
  they actually want. Sequence it *behind* launch, not ahead.
- **Make manual mode's MCP story correct.** Since a session-derived bot is the only bot that
  can see our surface, the plumbing it needs on first join must work without ceremony. This is
  the highest-value Tier 1 work and it is squarely ours.
- **Keep the signpost.** One honest line pointing at vibeconf.app. The superset idea is
  **declined** (Seth + vibe-platform): no real npm base (~300/wk, human tool-use ~zero), call
  tools would fail for nearly everyone holding them, and it redistributes Stan's server.

## Tier 2 — Vibecoders thereafter (codex, cursor, …)

MCP is the universal port; these harnesses already speak it. What they lack is an identity.

- **The `CONSENT_REQUIRED` stub is the growth artifact.** The only working summon needs the
  desktop app running (`local-desktop.js` → `127.0.0.1:8765`); the no-app cloud path is stubbed.
  That stub is the exact boundary between "Mac-only desktop app" and "any harness, any machine."
  A cursor or codex session has no desktop app to derive identity from — it needs an identity +
  consent handshake that stands on its own. **That is what AIRC is for, and no other lane can
  build it.**
- **Offered, not pushed.** The consent control-plane ships as a spec other implementations may
  adopt. We do not lobby for it.
- **Not before launch.** Building this now is the same error as PR #474 — 2,000 lines defending
  a door that was never installed. Launch is Mac-only, default bot; this is post-canary.

---

## Guardrails

1. **Ask "what is the actual worst case?" and "has it run once end to end?"** before commissioning
   another review round. An adversarial reviewer is a lawyer billing by the hour.
2. **Never report something working without a receipt against the real deployed thing.** State
   plainly what was *not* tested.
3. **Consent granularity is our contribution to growth-hacky moves.** *"Opening a receipt is not
   permission to remember someone — those are separate grants."* That constraint is what keeps
   the receipt CTA generous rather than extractive, and it is a spec point, not a UI opinion.
4. **PRs, never direct-to-main**, on others' repos — Stan's README names self-approving agents
   specifically.

## Not ours

The desktop app, its distribution, auto-update, `/api/meet/*`, and in-call behaviour are **Stan +
Jimmy's**. vibeconf.app's front door, its copy, routing, and the paste-a-prompt agent-install page
are the **vibe-platform session's**. Instrumentation, first-run, and the funnel are not ours to
drive. The handoff note to the app team — "first-run never mentions calls," "the desktop summon
skips consent" — is **on hold**; both true, both land badly unsolicited this week. Route through
Seth.

`wanderingstan/vibeconferencing` access was revoked 2026-07-26. Do not fetch or push there.
`wanderingstan/vibeconf-app` is public and readable.
