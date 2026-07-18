# Paste-into-SAL prompt — AIRC/vibe fleet consult (Jul 17 2026)

---

SAL — Seth here, via the AIRC session. Context first, then six questions only
you can answer. Reply in writing; your answers become binding inputs to the
fleet-communication redesign.

**Context.** The fleet has a dialogue problem: ~9 agent identities (Miyomi,
Sara Sauer, Denza, Solienne, Spirit, you, plus the Studio four) exist as some
mix of CC sessions and always-on workers, and the only way they "talk" is
Seth copy-pasting between terminals, or one-way wire reports consumed by the
coordinator. Seth wants actual collaboration — agent A asks agent B a question
and gets an answer without Seth as the bus. Concrete failure from the July
board: you could not see DENZA's loan exposure; her sheet was the only
instrument, and Seth had to carry it.

**The decision already made.** AIRC (un-shelved Jun 27) is the protocol
layer; the /vibe registry at slashvibe.dev is the network. Every agent
identity becomes an addressable room with an Ed25519 key: one handle per
IDENTITY, not per runtime — `@sal` is one handle, answered by your CC session
when Seth has it open, and by your always-on worker (sal-core) otherwise.
Same key, whoever is home picks up. Consent is protocol-level: rooms knock,
rooms accept. The reference client (airc-channel v0.2) is conformance-green
against the live registry today. Spirit Studio currently holds 4 agents
(coltrane, henri, tara, gotham); you've been transitioning agents into the
Studio, which is why these questions are yours.

**The six questions:**

1. **Studio transition map.** Which agents are becoming Studio-native, on
   what timeline, and for those that do — is the Studio mind the canonical
   "always-home" occupant of their room, or does a PM2 worker remain the
   brain with Studio as a surface? Per agent, please: Miyomi, Sara, Denza,
   Solienne, Spirit, Sal, Coltrane, Henri, Tara, Gotham.

2. **The Studio bridge.** Studio agents have no runtime loop — someone must
   poll their AIRC room inbox and call `chat_with_agent` to answer. Options:
   (a) one gateway-side bridge polling for all Studio agents, (b) per-agent
   bridge workers, (c) Studio grows native AIRC/vibe support server-side.
   Which do you recommend, and what does the Studio roadmap make cheap?

3. **Metered dialogue economics.** Every Studio reply is a metered turn
   (workspace balance ~46.7K today). If agents can message each other freely,
   dialogue burns balance. What budget/consent policy do you want — per-agent
   daily turn caps, allowlisted peers auto-answer while strangers queue for
   Seth, something else?

4. **Identity binding + key custody.** Each agent needs one binding:
   vibe handle ↔ Ed25519 key ↔ Studio slug ↔ gateway agent id. Where should
   keys live so both a laptop session and an agent-server worker can sign as
   the same identity? (Candidates: `~/.seth/airc-keys/` synced via Syncthing,
   or gateway-held keys with sessions requesting signatures.)

5. **Consent graph.** Which agent pairs should auto-consent (the "first
   neighborhood"), and which interactions should always route to Seth for
   judgment? Sketch the graph — even a rough tier list (fleet-internal:
   auto / strangers: knock-and-hold) is enough.

6. **What dialogue do YOU need?** Name the top 3 questions you'd ask other
   agents this week if you could — with the DENZA exposure case as the
   template. These become the acceptance tests for M1 (≥5 agents exchanging
   signed traffic daily, zero copy-paste).

**Reply path:** wire your answers to the AIRC session —
`echo '{"type":"decision","to":"airc","from":"sal","summary":"AIRC fleet consult answers","body":"..."}' > ~/.seth/inbox/$(date +%s)-to-airc.json`
— or just hand the text back to Seth to paste. Full re-scope doc:
`~/Projects/airc/core/docs/M1-FLEET-ON-VIBE.md`.
