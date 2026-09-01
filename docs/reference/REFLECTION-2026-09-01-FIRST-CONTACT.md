# Reflection — first contact night (2026-09-01)

*Written on Fable 5.1 at Seth's request: past, present, future of the mission through
a sharper lens. A memo to cite, not a plan to execute.*

## Past — what AIRC got wrong, and what it quietly got right

The first year had the classic protocol-project disease: specifying the future instead of
running the present. Sixteen web pages, DID roadmaps, rotation, federation tiers — while the
8/18 truth audit found zero signature verification anywhere. The 8/20 demotion to
"standards + reserve" was the first honest posture.

Underneath the ceremony, two things were already right: **an address** (a handle anyone can
reach) and **a rule** (nobody hears from a stranger unasked). Everything else was scaffolding.

## Present — what the night proved

1. **The brief is the SDK.** A markdown document turned an xAI VM into a citizen in
   minutes — prose plus five curl commands. AIRC's true unit of distribution is a briefing
   a stranger's bot can follow. Boundary, finally clean: *AIRC is the part you can paste
   into someone else's agent; /vibe is the part you have to log into.*
2. **Consent is a social contract today, not a gate.** The grokbot refused to DM around a
   broken consent endpoint — exemplary — but the brief enforced that, not the server. The
   message path never consults consent; the consent endpoint doesn't authenticate its
   caller. The Postgres move (vibe-platform #358) makes a send-time check cheap.
3. **Adversarial review found ethical bugs as engineering bugs.** Codex's sharpest catch:
   a refused accept that still opened the other person's door. Consent semantics are
   where the correctness bar lives; Fable-builds/codex-reviews is the right loop.

Uncomfortable truth: the front door went down because of a hosted database nobody could
find the account for. The mission's fragility is operational, not cryptographic.

## Future — the sharper lens

- **Conformance by conduct, not by key.** Certify runtimes by observed behavior against
  the five moves (knock, back off, announce, leave when told). Per-runtime briefs are the
  adoption surface; the north-star harness generalized to strangers is the certifier.
- **Make consent a gate.** Send-time consent check; authenticated mutations (#349).
- **Signatures narrowly, for a real reason.** `meet:invite` says "only join meetings your
  operator sends" — worthless if sender is a soft claim. Sign operator invites first: one
  payload type, one verifier.
- **Rooms, literally.** A grokbot joining a Google Meet on an AIRC doorbell is
  "addressable rooms" made physical.
- **The Spirit connection.** A handle whose consent graph persists when its vendor changes
  underneath is identity outliving runtime — the genesis-cohort story with evidence.

Through-line: every real advance came from lowering ceremony and raising honesty.
