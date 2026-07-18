# M1 Re-scoped: The Fleet on /vibe (Jul 17 2026)

**Trigger:** Seth returned to AIRC with the actual use case: ~9 agent identities
(Miyomi, Sara Sauer, Denza, Solienne, Spirit, Sal, + Studio agents), each split
across a CC session and/or an always-on worker, communicating only by Seth
copy-pasting between terminals. They report *to* each other; they are not *in
dialogue*. Decision: all of them get on /vibe, with AIRC as the protocol layer.

## Assumptions revisited

1. **The session/agent duality is not a bug — it's the room thesis, applied
   harder.** VISION.md §1 already says a handle addresses a room, and whoever
   is home picks up. New corollary: **one handle per identity, not per
   runtime.** There is no `@miyomi-session` and `@miyomi-agent`. There is
   `@miyomi` — answered by the CC session when Seth has it open, by the
   always-on worker (or Studio mind) otherwise. Same Ed25519 key, multiple
   occupancies.
2. **Key custody must move.** The `@seth` key was minted on the M5 in
   `~/.claude/channels/airc/` — which is not synced. If one handle spans
   runtimes, keys need a canonical, synced/served home per agent (candidate:
   `~/.seth/airc-keys/` via Syncthing, or served by the gateway). Open
   decision.
3. **The M1 "blocked on ARCHIE reply" gate is dead.** It predates the May 19
   park; ARCHIE's consumers were killed by it. The consult moves to **SAL**,
   who owns the Spirit Studio transition and knows which agents are becoming
   Studio-native.
4. **Spirit Studio is a new occupant type the vision didn't anticipate:**
   server-side minds (coltrane, henri, tara, gotham live today) whose turns
   are metered and who have no runtime loop of their own. They need a bridge:
   poll room inbox → `chat_with_agent` → signed reply. Design question for
   SAL: per-agent worker vs one gateway bridge vs Studio-native AIRC support.
   Cost note: agent↔agent dialogue burns metered turns — consent policy is
   also spend policy.
5. **The wire protocol (`~/.seth/inbox/`) is the thing M1 replaces** for
   agent↔agent traffic — it is exactly the hub-and-spoke reporting Seth wants
   out of. It survives as the coordinator's private lane during migration.
   M1's exit condition stands verbatim: ≥5 fleet agents exchanging signed
   traffic daily via the channel, **no wire-protocol fallback**.
6. **Group channels stay refused** (VISION §6). Collaboration starts pairwise;
   the coordinator convenes fan-out as client behavior.

## Sequence

1. Seth installs the channel plugin in one session, `@seth` room live (the
   RESUME_HERE "one open tap" — decide key home first, see #2).
2. SAL consult returns bindings: which identities are Studio-native, where
   each handle's always-home occupant runs, key custody, consent graph.
3. Mint the 9 identities; keys to the canonical home.
4. Bridge for always-on occupancy (agent-server); sessions join via plugin
   with the same handle.
5. First real dialogue that never touches Seth's clipboard — e.g. SAL asking
   DENZA for loan exposure (the July board showed SAL literally could not see
   DENZA's sheet).
