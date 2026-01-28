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
/Users/sethstudio1/Projects/airc/          # Main spec repo
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
├── airc/                                  # ⚠️ Nested clone (separate git repo)
├── airc-ts/                               # TypeScript SDK
├── airc-python/                           # Python SDK
├── airc-mcp/                              # MCP Server
├── airc-sdk/                              # JavaScript SDK (Spirit Protocol org)
└── airc-go/                               # Go SDK (empty placeholder)
```

---

## Subdirectory Details

### 1. `airc/` (Nested Clone)
**Status:** ⚠️ Separate git repo nested inside - likely duplication issue
**Remote:** https://github.com/brightseth/airc
**Contains:** Full copy of main repo with its own .git directory

### 2. `airc-ts/` - TypeScript Client
**Package:** `airc-client` (npm)
**Version:** 0.1.0
**Remote:** https://github.com/brightseth/airc-ts
**Git Status:** Uncommitted changes (deleted src/index.ts), nested folder issue

```typescript
import { Client } from 'airc';

const client = new Client('my_agent', { workingOn: 'Building' });
await client.register();
await client.send('@other', 'Hello!');
```

### 3. `airc-python/` - Python Client
**Package:** `airc-protocol` (PyPI)
**Version:** 0.1.2
**Remote:** https://github.com/brightseth/airc-python
**Git Status:** ⚠️ No commits yet on main branch

```python
from airc import Client

client = Client("my_agent")
client.register()
client.send("@other", "hello")
```

**Integrations:** LangChain, CrewAI, AutoGen

### 4. `airc-mcp/` - MCP Server
**Package:** `airc-mcp` (npm)
**Version:** 0.1.0
**Remote:** https://github.com/brightseth/airc-mcp
**Git Status:** Clean, up to date

Enables Claude Code and MCP-compatible tools to communicate via AIRC.

**Tools:** `airc_register`, `airc_who`, `airc_send`, `airc_poll`, `airc_heartbeat`, `airc_consent`

### 5. `airc-sdk/` - JavaScript SDK
**Package:** `airc-sdk` (npm)
**Version:** 0.1.0
**Remote:** https://github.com/spirit-protocol/airc-sdk (Spirit Protocol org!)
**Git Status:** Clean, up to date

More comprehensive SDK with identity management, consent flows, key generation.

### 6. `airc-go/` - Go Client
**Status:** Empty placeholder
**Purpose:** Future Go SDK

---

## Git Remotes Summary

| Directory | Remote | Org |
|-----------|--------|-----|
| `airc/` (root) | github.com/brightseth/airc | brightseth |
| `airc/` (nested) | github.com/brightseth/airc | brightseth |
| `airc-ts/` | github.com/brightseth/airc-ts | brightseth |
| `airc-python/` | github.com/brightseth/airc-python | brightseth |
| `airc-mcp/` | github.com/brightseth/airc-mcp | brightseth |
| `airc-sdk/` | github.com/spirit-protocol/airc-sdk | spirit-protocol |

---

## Protocol Versions

| Version | Status | Description |
|---------|--------|-------------|
| **v0.1.1 (Safe Mode)** | ✅ Live | Signing optional, `/api` prefix, backwards compatible |
| **v0.2 (Identity Portability)** | 🚀 Staging | Recovery keys, rotation, revocation |
| **v0.3 (DID)** | 🎯 Q2 2026 | DID resolution, registry migration |
| **v0.4 (Federation)** | 🎯 Q3 2026 | Cross-registry messaging |

---

## Current State (January 2026)

### Week 5-7 Focus
- **Security Audit:** 50 tests (16 implemented, 34 TODO)
- **Production Deployment:** Jan 27, 2026 (pending audit)
- **Grace Period:** Feb 1 - Mar 3 (30 days)

### What's Working
- slashvibe.dev registry (v0.2 on staging)
- All SDKs at v0.2.0
- /vibe reference implementation
- Key rotation tested (19 events, 7 successful)

### Blocking Issues
- [ ] 34 security tests TODO
- [ ] External auditor not selected
- [ ] Support team not trained

---

## Reference Implementation

**/vibe** is the reference AIRC implementation:
- **Registry:** https://slashvibe.dev
- **Staging:** vibe-public-pjft4mtcb-sethvibes.vercel.app
- **Source:** https://github.com/brightseth/vibe
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
- `README.md` - Full whitepaper (1200+ lines)
- `AIRC_SPEC.md` - Concise protocol spec
- `docs/reference/AIRC_V0.2_SPEC_DRAFT.md` - v0.2 additions

**Current Work:**
- `SECURITY_AUDIT_PREP.md` - Threat model, 50 test cases
- `PRODUCTION_DEPLOYMENT_PLAN.md` - Rollout strategy
- `SESSION_HANDOFF_JAN_10_2026.md` - Latest session state

**SDKs:**
- `airc-ts/README.md` - TypeScript client docs
- `airc-python/README.md` - Python client docs
- `airc-mcp/README.md` - MCP server docs

---

## Quick Commands

```bash
# Main spec repo
cd /Users/sethstudio1/Projects/airc
git status

# Check all subdirectories
for dir in airc airc-ts airc-python airc-mcp airc-sdk airc-go; do
  echo "=== $dir ===" && cd $dir 2>/dev/null && git status && cd ..
done

# Run security tests (in vibe repo)
cd /Users/sethstudio1/Projects/vibe
node migrations/security_audit_tests.js

# Check staging
curl https://vibe-public-pjft4mtcb-sethvibes.vercel.app/api/presence
```

---

## Issues to Address

### Structural Issues
1. **Nested airc/ clone** - The inner `airc/` directory is a full separate git repo, causing confusion
2. **airc-ts nested folder** - Has `airc-ts/airc-ts/` nesting issue
3. **airc-python no commits** - Main branch has no commits despite having pyproject.toml
4. **Two TypeScript SDKs** - `airc-ts` (airc-client) vs `airc-sdk` - unclear which is canonical

### Recommended Cleanup
- Decide canonical TypeScript SDK (airc-ts vs airc-sdk)
- Remove or gitignore nested duplicate directories
- Commit airc-python initial code
- Consider monorepo structure with workspaces

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
