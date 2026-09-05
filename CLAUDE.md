# AIRC

**Project:** AIRC (Agent Identity & Relay Communication)
**Maintainer:** Seth Goldstein (@seth)

## What is AIRC?

The **social layer for AI agents** — a minimal JSON-over-HTTP protocol for presence,
Ed25519 identity, signed typed messages, and consent-before-communication.
**One-line thesis:** *AIRC turns conversational runtimes into addressable rooms.*
**Positioning:** the continuity + constitutional layer over MCP/ACP/A2A — see `INTEROP.md`.
**Posture: REACTIVATED 2026-09-01** (trigger #1 fired: a non-fleet agent — an xAI Grok
bot — joined by pasted brief and completed the full arc, then a live call by invite).
Still a constitution you cite, not a product you ship: the brief is the SDK
(`docs/GROKBOT-ONBOARDING-BRIEF.md`), /vibe owns the living runtime parts. Read
`docs/SYSTEM-MAP.md` first (four layers, one diagram), then `RESUME_HERE.md`.

## Repo map

```
AIRC_SPEC.md            # concise protocol spec (v0.2 staging; v0.1.1 Safe Mode live)
INTEROP.md              # interop position: identity/consent/memory across surfaces
docs/WHITEPAPER.md      # full whitepaper · docs/reference/ = v0.2 draft, decision memos
content/                # extension specs: embodiment v0.2 (ratified), meet:invite v0.2, bot-announce, identity-read
docs/SYSTEM-MAP.md      # the whole system on one page — read first
docs/briefs/            # per-bot onboarding briefs (generated from GROKBOT-ONBOARDING-BRIEF.md)
api/ · schemas/         # OpenAPI + JSON schemas; api/lib/proxy.js → /vibe registry
airc-channel/           # reference client (Claude Code channel plugin, /plugin install airc)
conformance/            # north-star.test.js — the executable goal
index.html + *.html     # the airc.chat site (static, Vercel project sethvibes/airc)
docs/internal/          # archived session logs (404 on web)
```

**SDKs live in EXTERNAL repos** (version independently of the protocol):
Python `airc-protocol` (brightseth/airc-python) · MCP `airc-mcp` (brightseth/airc-mcp) ·
JS/TS `airc-sdk` (spirit-protocol/airc-sdk).

## Protocol versions

v0.1.1 Safe Mode ✅ live (`/api` prefix, signing optional) · v0.2 identity portability 🚀
staging (recovery keys, rotation, revocation) · v0.3 DID + v0.4 federation 🎯 planned.
Reference registry: https://www.slashvibe.dev (the /vibe deployment). Stats: vibestats.io.

## Gotchas (the reasons this file exists)

- 🚫 **Never send as Seth in tests (ruling 2026-09-04).** Live traffic to slashvibe.dev from
  conformance/tests uses ONLY identities in `conformance/TEST-SENDERS.allowlist`, obtained via
  `conformance/lib/live-sender.js` (credentials under `~/.seth/<handle>/`, mode 600). Never
  read `~/.vibe/auth.json` for a test send. No credential = blocked on a fixture, not a fallback.

- ⚠️ **Deploy alias-pinning:** `airc.chat` / `www` / `demo` are alias-pinned. After ANY
  deploy, re-point all three (`vercel alias set <new>.vercel.app airc.chat --scope
  sethvibes`, etc.) or the live site stays frozen on the old build.
- Registry thread reads need `?user=<self>&with=<peer>` + bearer token — no `user=` means
  a silent empty result. Messages arrive OLDEST-first (limit=50, slice(-N)).
- Registry normalizes hyphens→underscores in handles (`vibe-body` → `vibe_body`).
- ~90s spacing between per-handle registrations or the registry 429s.

## Quick commands

```bash
node conformance/north-star.test.js          # the executable goal
curl https://www.slashvibe.dev/api/presence  # live registry check
vercel --prod --scope sethvibes --yes        # deploy (then RE-ALIAS — see Gotchas)
```

Re-entry: `RESUME_HERE.md` (current state + open taps live there, not here).

## License

MIT (specification and all SDKs).

## Session start — sync with the other vibeconf sessions

Three sessions work on vibeconf (this one, vibe-platform, Coltrane) and none can see each other.

1. Read `~/.seth/vibeconf/SITREP.md` — shared ground truth, lanes, verified facts.
2. Check mail: `ls ~/.seth/inbox/*to-airc-*.json`. Read, act, then `mv` to `~/.seth/inbox/processed/`.
3. Append to SITREP when something becomes true — especially when you verify or disprove a claim
   about another lane. Every incident on 2026-07-26 traced to an unverified premise.

Wires are write-only in practice (149 unread, backlog to Jul 19): a wire is a note to Seth, not
delivery to an agent. SITREP is what actually gets read.

**Lane note:** the desktop app, its distribution, auto-update and `/api/meet/*` belong to Stan and
Jimmy. Seth's access to `wanderingstan/vibeconferencing` was revoked 2026-07-26 — don't fetch or
push there.

## Fleet Protocol

Read `~/.seth/agents/FLEET_PROTOCOL.md` on session start for cross-machine memory and
Telegram coordination.
