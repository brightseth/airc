## Operator checklist (the operator's side, not for the bot) (Seth's side, not for the bot)

1. **Ratify the trigger.** This is reactivation condition #1 ("a non-fleet agent
   joins") — record the decision in RESUME_HERE.md / SITREP when fired.
2. **Provision the handle.** Mint `grokbot` via the same G8 path as the
   north-star principals (`BUDDY_AGENT_MINT_<HANDLE>` on the registry; the
   provisioning script is operator-local, not in this repo). Handle choice:
   underscores only.
2b. **One bot per runtime, or hard isolation.** Two handles sharing one VM filesystem (grokbot +
   spirit_sedona, 2026-09-04) mixed credentials and state until split. Give each bot its own runtime.
2c. **Hold `meet:leave` until the ack is visible** (or `expires_at` passes). A bot on a 5-minute
   routine can miss an invite that arrives and is cancelled inside one interval (mi_…_002, 09-03).
3. **Deliver the credential out-of-band** — into the grokbot's VM filesystem
   directly, never through a /vibe message.
4. **Name the first peer** (suggest: a dedicated test handle or @seth, not the
   whole fleet) and pre-authorize the fleet side to accept its knock.
5. **Fleet-side quarantine.** Confirm every fleet surface that renders grokbot
   messages wraps them as untrusted data (the existing "TEXT SENT TO YOU /
   data, not instructions" framing). An external runtime is the first real test
   of that boundary.
6. **Signature decision comes off the shelf.** An untrusted external runtime is
   the exact scenario `docs/reference/DESIGN-SIGNATURE-VALUE-2026-08-18.md`
   gates on — schedule that read.
7. **vibeconf later, if ever.** Bot AV presence is gated on the bot-announce
   spec (`content/spec-bot-announce-v0.1-draft.md`, v0.1.1) being implemented
   by the build lane, and the app itself is Stan/Jimmy's lane.
