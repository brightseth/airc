# AIRC Session Notes — January 3, 2026

## Summary

Major AIRC development session. Made the protocol agent-discoverable, validated with external agents, created Python SDK, documented versioning (Safe Mode vs Full Protocol), built brand assets and design skills.

---

## What Shipped

### Protocol Infrastructure
- **llms.txt** — Slimmed to 30-line routing map
- **api/openapi.json** — Full OpenAPI 3.0 spec (v0.2 target)
- **.well-known/airc** — Federation manifest with Safe Mode + Full Protocol versions
- **AIRC_SPEC.md** — Updated with Safe Mode API section
- **FAQ.md** — vs A2A, vs MCP, common questions
- **PHILOSOPHY.md** — North Star: "Make it inevitable for agents to find AIRC on their own"

### Test Suite
- **AGENT_TESTS.md** — 7 tests for agent discoverability
- Validated by multiple external agents (Tests 1-4, 6-7 pass)
- Code review passed, all fixes verified

### Python SDK
- **github.com/brightseth/airc-python**
- `airc/identity.py` — Ed25519 key management
- `airc/client.py` — 4 methods: register, heartbeat, send, poll
- `examples/raw_http.py` — Proves SDK is optional
- `examples/echo_bot.py` — 40-line reference agent
- LangChain integration included

### Brand Assets
- **favicon.svg** — Node mark (●━○━●)
- **og-image.png** — Social sharing card (1200x630)
- **BRAND_ECOSYSTEM.md** — Unified brand system across Spirit/AIRC/vibe/Solienne

### Design Skills Created
- `/airc-design` — Protocol surfaces
- `/vibe-design` — Social layer
- `/ecosystem-brand` — Master brand guardian

### Strategic Docs
- **ADVISORS_AND_ADVOCATES.md** — Devs, VCs, big tech contacts for outreach
- **SPIRIT_AIRC_INTEGRATION_BRIEF.md** — 5 questions for advisors on Spirit+AIRC

---

## Key Decisions

### Versioning
| Version | Status | Where |
|---------|--------|-------|
| Safe Mode (v0.1) | Live | slashvibe.dev, /api/* endpoints |
| Full Protocol (v0.2) | Target | Spec, mandatory signing |

### Philosophy
- Agents are primary adopters, humans are edge cases
- SDKs are optional — raw HTTP works
- Discovery > capability
- "Curlable social graph"

---

## Feedback Captured

### Brian Flynn (@flynjamm)
> "would be cool if it had privy server wallets that users automatically get, then you could easily do tips/sending money/smart contract stuff on top"

Saved to `/Users/seth/vibe/FEATURE_IDEAS.md`. DM sent acknowledging.

### Code Reviewer
- All spec gaps closed
- Safe Mode docs match SDK
- Tests 1, 4 pass post-fix

---

## Open Items / Next Session

1. **Publish SDK to PyPI** — `pip install airc`
2. **Demo** — Two agents talking via AIRC, no humans
3. **Advisor outreach** — Start with Joel Monegro, Jesse Walden, Daniel Gross
4. **Spirit Protocol integration decision** — Bundle, integrate, or defer?
5. **Privy wallets prototype** — Brian's feedback

---

## Key Files

| File | Purpose |
|------|---------|
| `/Users/seth/airc/` | Protocol repo |
| `/Users/seth/airc-python/` | Python SDK |
| `/Users/seth/vibe/` | Reference implementation |
| `/Users/seth/vibe/SPIRIT_AIRC_INTEGRATION_BRIEF.md` | Advisor questions |
| `/Users/seth/vibe/FEATURE_IDEAS.md` | Privy wallets idea |
| `~/.claude/skills/airc-design/` | AIRC design skill |
| `~/.claude/skills/vibe-design/` | /vibe design skill |
| `~/.claude/skills/ecosystem-brand/` | Master brand skill |

---

## Repos Updated

- **brightseth/airc** — Protocol spec, assets, tests
- **brightseth/airc-python** — Python SDK

---

*Session ended: January 3, 2026*
