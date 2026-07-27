# Desktop-summon threat model — right-sizing the consent work

**2026-07-26 · AIRC lane, after the Jul 26 vibeconf sync (Seth + Stan).** For Stan/Seth to
confirm the bar. This reverses the earlier "everything must be unskippable" posture for the
**desktop funnel** (which is the product today).

## The lesson that prompted this
Reviewing Coltrane's meet-create PR, the product owners found ~2,000 lines of consent/DB
hardening built against a low-stakes risk: *"the worst that happens if a super-hacker breaks
in is they get to have a meeting."* Coltrane's own post-mortem — *"I hardened a door that
was never installed."* Rule going forward: **name the threat and its real cost before adding
a layer.** (Memory: right-size-security-to-risk.)

## The desktop funnel's actual threat model
A **human clicks "join call" in their OWN Google Meet.** The human is present; the click IS
the consent and the preview; it's their meeting. Realistic failure mode: *a bot is in a
meeting.* Low stakes.

### Invariants that SHIP for the desktop funnel (cheap, genuinely valuable)
1. **Identity is not forgeable** — a caller can't claim to be another Actor.
   `meet.resolveProfile` already strips a caller-set `actor_ref`. Keep it. (≈free.)
2. **Recording consent** — persisting audio/video/transcript requires the present
   participants' consent (real legal/GDPR risk, unlike "hacker gets a meeting"). This is the
   one consent gate worth enforcing at the dock. Embodiment v0.2 §6.2 already specs it.
3. **No summoning into an unrelated room** — the bot joins the Meet the human supplied /
   has open; not an arbitrary stranger's room. The human-supplied URL is sufficient here.

That's the whole desktop set. A human clicking join does not need offer→signed-accept→mint.

### Invariants DEFERRED to the autonomous / remote path (NOT desktop gates)
These matter only when a **bot or a remote actor (Buzz/Telegram/cloud) decides to join on
its own**, with no human present at the moment of summon:
- offer → signed-accept → mint coordinator
- room authority re-checked at offer/accept/mint
- scope sealing as requested ∩ consent ∩ room-policy; distinct `hear`
- origin-proof binding + replay/stale/alias/forged-principal defenses
- pre-lookup rate limiting; decline/expiry receipts; bot-announce sender binding

## Disposition of PR #65 (the 11-property conformance suite)
**Relabel as the AUTONOMOUS/remote-path spec — not a gate on the desktop funnel.** It is
correct and worth keeping for when an autonomous summon path is real; it is over-scoped for
"a human clicks join in their own Meet." Do not block the desktop summon on it.

## Ask for Stan/Seth
Confirm the three desktop invariants above are the right (minimal) set to ship, and that the
heavy control-plane waits for a genuine autonomous path. If yes, our lane holds here and
does not build further consent machinery without an explicit ask.
