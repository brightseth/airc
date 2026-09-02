# Challenge: make a partner bot a first-class vibeconf participant

*2026-09-01 · issued by the AIRC lane after first contact · for a vibe-platform build session*

## Where we are

A Grok bot (@grokbot, xAI, not our fleet) completed the full AIRC arc with a Claude
Code session today: register → knock → accept → typed payloads → round trip
(`docs/FIRST-CONTACT-2026-09-01.md`). Next it gets a `meet:invite`
(`content/spec-meet-invite-v0.1-draft.md`) and joins a call **as a browser guest** —
a tile that says "grokbot" with nothing behind the name. That works today and is
tier 1.

**The challenge is tier 2:** the bot appears in the call as a **verified, announced
agent** — a line in the chat that the UI can mark "✓ verified agent", bound to the
actual tile it occupies, minted through consent, impossible to copy from another
tile. Everything needed is already specified and ratified. It is unbuilt.

## What is already true (do not re-derive, do not re-spec)

- **Embodiment v0.2 is RATIFIED** (`content/spec-embodiment-v0.2-draft.md`). Its MUSTs
  are not design questions: invite-pull never ambient self-join (§7); no bearer
  capability in a URL or in verb args (§5.2); summon authority and room authority are
  different objects, verify both (§7.1/§7.2); scopes `join/speak/hear/share` sealed at
  acceptance, minted as the intersection of request ∩ consent ∩ room policy (§6.1).
- **Bot-announce v0.1.1 is drafted and codex-closed** (`content/spec-bot-announce-v0.1-draft.md`):
  a human-readable chat line plus a signed object behind it — `announce_id` minted
  **only at dispatch**, agent-key signed, single-meeting, unguessable; sender bound to
  the dock-attested `body_instance` so a same-room copy of the line earns nothing;
  two signing modes so it deploys before and after the credential flip; the announce
  mints nothing and grants no scope.
- **The 0.7 `vibe_invite_to_meet` verb exists in slashvibe-mcp and is FAIL-to-enable**
  (codex, `docs/reference/CODEX-REVIEW-DISPOSITION-2026-07-26.md`) until three P0 build
  items close — all implementation of ratified MUSTs, no spec change permitted:
  1. **Consent bypass:** the verb accepts a caller-supplied `_credential` from args. Delete
     it. The public verb emits an `invite` only; a server coordinator awaits
     `invite:accept`, mints, dispatches.
  2. **Summon grant ≠ room authority:** verify both, and re-verify the `aud`-bound room
     lease at dispatch (mechanism already built in migrations 082/083 — wire it).
  3. **`hear` unscoped:** migration 082's CHECK allows only `join`/`join+speak`. Drop it,
     seal the four scopes at accept, mint the intersection, enforce `hear` at the dock.
- P1s (#4 origin proof bound to action, #5 human-confirm preview + pre-lookup metering,
  #6 decline/expiry receipts) follow; #7 was the AIRC lane's and is fixed in the spec.

## The ask

Build the platform + MCP half end-to-end, and hand the app half off as a contract.

**Platform / slashvibe-mcp (yours):**
- Close P0 #1–#3 exactly as the disposition specifies.
- Mint `announce_id` at dispatch and attach it to the summon/doorbell receipt (bot-announce
  §5 converge point: the introduction becomes part of the sealed record).
- Expose a verification endpoint the app can call: given the announce object, return
  the §4 verdict (sender bound to `body_instance` + mode → "verified agent" /
  "launched for this actor" / nothing) — and label the mode.
- Enable `vibe_invite_to_meet` behind the closed P0s, with the human-confirm preview (#5)
  so a prompt-injected agent cannot summon anyone silently.

**App half (Stan and Jimmy's lane — you do not touch it; you write the contract):**
- A one-page `doorbell-contract/` addition: the announce object schema, the verification
  call, the two UI labels and when each MUST/MUST NOT render, and the dock's
  `body_instance` attestation obligation. Make `node --test doorbell-contract/` pass.

## Acceptance (what "done" means)

1. Hermetic tests on PGlite for each P0: bearer-in-args refused; summon without room
   lease refused; `hear`-less token gets no audio; scopes sealed at accept and minted as
   the intersection.
2. A real run: a fleet bot is invited via `vibe_invite_to_meet`, the human sees the
   preview and confirms, the bot joins, its announce line verifies against the
   endpoint, a copied line from another tile does NOT verify, the receipt carries
   `announce_id`. Record the receipt ids in the PR.
3. codex adversarial review absorbed (three-round loop is the house pattern; consent
   semantics are where the bar lives — a refused action must write nothing).
4. Nothing self-minted, no new identity, /vibe handle + JWT remain identity truth
   (8/18 canon). No spec edits — if you think one is needed, stop and say so.

## Guardrails

- **Relay rule:** build authorization at most. Verify with Seth before anything ships,
  publishes, or is enabled in production on the strength of this document.
- **Deploy discipline (learned today, the hard way):** `main` auto-deploys production.
  Diff `migrations/*.sql` against the production ledger (`schema_migrations`) and apply
  pending migrations FIRST, or a merge takes sends down network-wide.
- **Consent kernel:** grants + receipts under every crossing. If a path moves a bot into
  a room without a grant it can cite and a receipt it left, that path is the bug,
  whatever else works.
- Front-load these constraints; do not discover them after the first draft.
