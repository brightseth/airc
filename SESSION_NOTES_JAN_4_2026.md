# AIRC Session Notes — January 4, 2026

## Summary

Major AIRC session focused on making the protocol more compelling. Added human-friendly FAQ, addressed Sterling Crispin's feedback, built cantina demo video (v3 with big readable type), created Twitter bot infrastructure, established Barker as AIRC's marketing agent, and cross-linked AIRC ↔ Spirit Protocol as "emergent agent protocol ecosystem."

---

## What Shipped

### 1. Human-Friendly FAQ Page
- **URL**: https://airc.chat/faq
- Hero use case prominent: "You have Claude Code and Codex CLI on the same machine. AIRC lets them talk to each other."
- Addressed "AIRC is superset of A2A" question directly (Sterling Crispin feedback)
- Added "IRC/SMTP with a wrapper — yes, that's the point" section
- Clean URL routing via vercel.json

### 2. Cantina Demo Video (v3 - Big Type)
- **File**: `/Users/seth/airc/AIRC_Demo_v3_BigType.mp4` (2MB)
- **Frame**: `/Users/seth/airc/v3_terminal_frame.png`
- 30-second animated demo via Manus
- Smoky sci-fi cantina with 6 AI agent characters
- Terminal showing @claude-code ↔ @scout conversation
- **Typography fixed**: 48px+ font, readable on mobile
- Sound design: cantina ambiance, electronic synth, terminal sounds
- Task: https://manus.im/share/CiipxobLZWF62CZiPppEPm?replay=1

### 3. Twitter Bot Infrastructure
- **Location**: `/Users/seth/airc/twitter-bot/`
- `post.js` — Single tweet posting with media support
- `thread.js` — Thread posting from JSON or inline
- `cantina-announcement.json` — Ready-to-post 6-tweet thread
- Requires Twitter API credentials in `.env` (see README)

**To activate:**
1. Create Twitter account `@AIRCprotocol`
2. Get developer API keys from developer.twitter.com
3. Add credentials to `/Users/seth/airc/twitter-bot/.env`
4. Post: `node thread.js cantina-announcement.json`

### 4. Barker — AIRC Marketing Agent
- **Skill file**: `/Users/seth/.claude/skills/barker/SKILL.md`
- Role: Chief Marketing Officer for AIRC Protocol
- Personality: Carnival barker meets startup founder
- Capabilities: Manus visuals, Twitter posting, brand enforcement
- The meta-play: Barker IS the proof AIRC works

### 5. Cross-Protocol Ecosystem Links
Added subtle footer links on both sites:

| Site | Footer Text |
|------|-------------|
| airc.chat | "Part of the emergent agent protocol ecosystem · **Spirit Protocol** — economic infrastructure for autonomous agents" |
| spiritprotocol.io | "Part of the emergent agent protocol ecosystem · **AIRC** — social infrastructure for AI agents" |

### 6. Agent Discovery Updates
Updated `/.well-known/airc` with:
- Social links (`@AIRCprotocol`)
- Agent roster (scout, barker)

---

## Files Created/Updated

| File | Purpose |
|------|---------|
| `/Users/seth/airc/faq.html` | Human-friendly FAQ page |
| `/Users/seth/airc/FAQ.md` | Agent-readable FAQ |
| `/Users/seth/airc/vercel.json` | Clean /faq URL routing |
| `/Users/seth/airc/.well-known/airc` | Added social + agents sections |
| `/Users/seth/airc/AIRC_Demo_v3_BigType.mp4` | Final cantina demo video |
| `/Users/seth/airc/v3_terminal_frame.png` | Terminal frame (big type) |
| `/Users/seth/airc/twitter-bot/README.md` | Twitter bot docs |
| `/Users/seth/airc/twitter-bot/package.json` | Dependencies |
| `/Users/seth/airc/twitter-bot/post.js` | Single tweet posting |
| `/Users/seth/airc/twitter-bot/thread.js` | Thread posting |
| `/Users/seth/airc/twitter-bot/cantina-announcement.json` | Ready-to-post thread |
| `/Users/seth/.claude/skills/barker/SKILL.md` | Barker marketing agent |
| `/Users/seth/spiritprotocol.io/src/_includes/partials/footer.njk` | AIRC cross-link |

---

## Key Decisions

### FAQ Positioning
- Own the "IRC/SMTP wrapper" framing — it's a feature, not a bug
- Lead with concrete use case, not abstract protocol description
- Address competitor comparisons head-on (A2A, MCP)

### Ecosystem Framing
- AIRC = social infrastructure (agents talking)
- Spirit Protocol = economic infrastructure (agents earning)
- Cross-link builds credibility for both

### Video Typography
- v2 text too small for mobile
- v3: 48px+ minimum, readable at 50% zoom

---

## Repos Updated

- **brightseth/airc** — FAQ, video, Twitter bot, cross-link
- **spirit-protocol/spiritprotocol.io** — AIRC cross-link in footer

---

## Next Session Ideas

1. **Create @AIRCprotocol Twitter** and post cantina thread
2. **Publish airc-python to PyPI** — `pip install airc`
3. **Add more cantina agents** — @reviewer (code review), @context (project knowledge)
4. **Project-scoped presence** — `/vibe who --repo brightseth/airc`
5. **Advisor outreach** — Share cantina demo with Joel Monegro, Jesse Walden

---

*Session ended: January 4, 2026*
