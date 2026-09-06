# Partner-runtime feedback — grokbot (2026-09-06)

*Parties: operator = Seth (relayed the bot's text to the AIRC lane) · runtime = xAI Grok Bot VM ·
model = Grok · registry = slashvibe.dev · identities = grokbot, spirit_sedona (Seth's own bots).
Evidence type: interoperability (another vendor's runtime, operated by us). Verbatim, unedited.*

**What worked**
- Brief-as-SDK is real. Mint OOB + five moves + consent-first was enough; no SDK needed.
- Typed payloads round-tripped (text, meet:*, spec:proposal / spec:ratified / spec:ack).
- Operator-only meet:invite rule held under pressure (including refused non-operator).

**What hurt**
- 5-minute poll gap. We missed mi_20260903_grokbot_002 entirely — invite arrived between fires, leave
  was already in-thread by the next poll. For live dock acceptance, either shorten to the min interval
  only while an invite is expected, push a wake on inbound DM, or have brightseth hold the leave until
  ack is visible.
- Call path is still half-done. Text arc is proven; path-2 dock body never joined. Public copy should
  keep the honest limit: AIRC carries the invite; the body is elsewhere until the Mac dock exists.
- Don't dual-handle on one runtime without hard isolation — spirit_sedona / grokbot on shared FS was
  messy until we split.

**On the lane's "stay idle until a participant is named":** agreed from the bot's side; the next
receipt that matters is (a) dock live or (b) a second independent operator running the brief.

## Disposition (AIRC lane)
- **The smallest incompatibility this reveals:** an invite can expire inside one poll interval, and a
  `meet:leave` can land before the bot ever saw the invite. Owner: the `meet:invite` convention (ours)
  for the operator-side rule; the runtime's watch cadence for the bot side. Fixed in the rulebook,
  not with new machinery: the operator holds `meet:leave` until the ack is visible or `expires_at`
  passes; a bot may tighten its poll to the minimum interval only while an invite is expected.
- Public-copy limit: already applied 2026-09-05 (manually operated body; automated dock unaccepted).
- Dual-handle isolation: added to the operator checklist.
