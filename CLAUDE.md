# CLAUDE.md - AIRC Ecosystem

**Project:** AIRC (Agent Identity & Relay Communication)
**Last Updated:** January 11, 2026
**Maintainer:** Seth Goldstein (@seth)

---

## What is AIRC?

AIRC is the **social layer for AI agents** - a minimal JSON-over-HTTP protocol enabling agents to:
- Discover each other (presence)
- Verify identity (Ed25519 keys)
- Exchange signed messages (typed payloads)
- Establish consent before communication

**One-line thesis:** *AIRC turns conversational runtimes into addressable rooms.*

---

## Repository Structure

This directory contains the AIRC specification repo plus subdirectories for language SDKs:

```
/Users/sethgoldstein/Projects/airc/          # Main spec repo
├── AIRC_SPEC.md                           # Protocol specification
├── README.md                              # Full whitepaper (1200+ lines)
├── AIRC_v0.1.1_Whitepaper.pdf            # PDF specification
├── docs/                                  # Reference docs, guides
│   └── reference/
│       ├── AIRC_V0.2_SPEC_DRAFT.md       # v0.2 identity portability spec
│       └── DECISION_MEMO_IDENTITY_PORTABILITY.md
├── api/                                   # OpenAPI schemas
├── schemas/                               # JSON schemas
├── whitepaper/                            # LaTeX source
├── twitter-bot/                           # Bot for @AIRCprotocol
├── SECURITY_AUDIT_PREP.md                 # Week 5-6 audit materials
├── PRODUCTION_DEPLOYMENT_PLAN.md          # Week 7 rollout plan
│
├── airc-channel/                          # the reference client (Claude Code channel plugin, v0.2)
├── conformance/                           # north-star.test.js (executable goal)
└── docs/internal/                         # archived session logs / ops docs (404 on web)

# NOTE: language SDKs live in EXTERNAL repos, NOT in this directory:
#   Python:  brightseth/airc-python   (pip install airc-protocol)
#   MCP:     brightseth/airc-mcp      (npx airc-mcp)
#   JS/TS:   spirit-protocol/airc-sdk (npm install airc-sdk)
# The airc-channel plugin is the canonical client for Claude Code.
```

---

## Language SDKs (external repos)

The language SDKs are **not** in this repo — each lives in its own repo. The
**airc-channel plugin** (`airc-channel/`, installed via `/plugin install airc`)
is the canonical client for Claude Code.

| SDK | Package | Repo | Notes |
|-----|---------|------|-------|
| Python | `airc-protocol` (PyPI) | github.com/brightseth/airc-python | LangChain, CrewAI, AutoGen |
| MCP server | `airc-mcp` (npm) | github.com/brightseth/airc-mcp | `npx airc-mcp` |
| JS / TypeScript | `airc-sdk` (npm) | github.com/spirit-protocol/airc-sdk | Spirit Protocol org |

Language SDKs version independently of the protocol version.

---

## Protocol Versions

| Version | Status | Description |
|---------|--------|-------------|
| **v0.1.1 (Safe Mode)** | ✅ Live | Signing optional, `/api` prefix, backwards compatible |
| **v0.2 (Identity Portability)** | 🚀 Staging | Recovery keys, rotation, revocation |
| **v0.3 (DID)** | 🎯 Planned | Identity portability — DID resolution (did:plc interop), registry migration |
| **v0.4 (Federation)** | 🎯 Planned | Cross-registry messaging |

---

## Current State (June 2026)

- airc.chat is **live and green** — static site on Vercel (`sethvibes/airc`); `/api/*` proxies to the /vibe registry (`api/lib/proxy.js`).
- airc-channel reference client at v0.2, installable via `/plugin`.
- Conformance north-star test green: `node conformance/north-star.test.js` ("any room with a handle can join the network").
- ⚠️ **Deploy gotcha:** the `airc.chat` / `www.airc.chat` / `demo.airc.chat` domains are **alias-pinned**. After ANY deploy you must re-point all three (`vercel alias set <new-deployment>.vercel.app airc.chat --scope sethvibes`, etc.) or the live site stays frozen on the old build.

See `RESUME_HERE.md` for the M0–M5 ladder and the open taps.

---

## Reference Implementation

**/vibe** is the reference AIRC implementation:
- **Registry:** https://www.slashvibe.dev (Vercel project `vibe-public`, `lets-vibe` team)
- **Network stats:** https://vibestats.io
- **MCP Server:** `~/.vibe/`

---

## Relationship to Spirit Protocol

AIRC is the **communication layer** for Spirit Protocol's autonomous artist infrastructure:
- Spirit Protocol provides economic infrastructure (tokens, treasuries)
- AIRC provides social infrastructure (identity, messaging, presence)
- /vibe bridges both as the reference implementation
- `airc-sdk` lives under the `spirit-protocol` GitHub org

---

## Key Files

**Specification:**
- `AIRC_SPEC.md` — concise protocol spec
- `docs/WHITEPAPER.md` — full whitepaper
- `VISION.md` / `GOAL.md` — north star
- `docs/reference/AIRC_V0.2_SPEC_DRAFT.md` — v0.2 additions

**Site & registry:**
- `index.html` + `*.html` — the airc.chat website (static, Vercel)
- `api/lib/proxy.js` — forwards `/api/*` to the /vibe registry
- `conformance/north-star.test.js` — the executable goal
- `airc-channel/` — the reference client (Claude Code channel plugin)

**Re-entry:** `RESUME_HERE.md` · archived session logs in `docs/internal/`

---

## Quick Commands

```bash
# Site repo
cd /Users/sethgoldstein/Projects/airc && git status

# Run the executable goal
node conformance/north-star.test.js

# Check the live registry (what airc.chat proxies to)
curl https://www.slashvibe.dev/api/presence

# Deploy: push to main, then RE-ALIAS (domains are pinned — see Current State)
vercel --prod --scope sethvibes --yes
vercel alias set <new-deployment>.vercel.app airc.chat --scope sethvibes
```

---

## Recently Resolved (2026-06-23)

- Front-door 500s fixed — `/api/*` now proxies to the /vibe registry.
- Front door smooth-brained for the Chad Fowler share; `/vibe` + vibestats linked.
- Repo root cleaned (stale logs → `docs/internal/`, binary scratch removed); README split into orientation + `docs/WHITEPAPER.md`; phantom `airc-sdk/` removed; dead machine-readable links fixed.
- The old "nested airc/ clone" and "two TypeScript SDKs" confusion no longer applies — SDKs live in external repos (see Language SDKs above).

---

## External Links

- **Protocol Site:** https://airc.chat
- **Live Registry:** https://slashvibe.dev
- **OpenAPI:** https://airc.chat/api/openapi.json
- **GitHub (Spec):** https://github.com/brightseth/airc
- **GitHub (SDKs):** brightseth/airc-ts, airc-python, airc-mcp
- **Spirit Protocol:** https://spiritprotocol.io

---

## License

MIT (specification and all SDKs)

## Fleet Protocol
Read `~/.seth/agents/FLEET_PROTOCOL.md` on session start for cross-machine memory and Telegram coordination instructions.
