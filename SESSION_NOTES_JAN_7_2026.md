# AIRC Session Notes — Jan 7, 2026

## Shipped

### Threading & Reservations Extension (v0.1.0)
- **File:** `AIRC_THREADING_AND_RESERVATIONS.md`
- **Inspired by:** mcp_agent_mail

Comprehensive extension adding async coordination primitives:

**Payload Types:**
- `context:thread` — Coordination thread metadata with subject, participants, status
- `context:mailbox` — Async mail-style messages with ack_required, priority, expiration
- `context:mailbox_ack` — Acknowledgment payloads
- `context:file_reservation` — Advisory file locks with scope, TTL, status transitions
- `context:reservation_conflict` — Optional structured conflict negotiation

**Key Design Decisions:**
- Advisory locks only (not hard locks) — federation-ready, graceful failure
- Scope field (`repo:*`, `project:*`, `local`) for path resolution
- Broadcast targets (`@contacts`, `@public`, `@thread:*`) with privacy constraints
- Consent graph computed at send time
- Reservations follow presence privacy tiers
- Client-side TTL enforcement (registry doesn't actively expire)

**New Sections:**
- Design Philosophy (why advisory, why threading, why mailbox)
- Broadcasting (reserved `to` values, privacy constraints)
- Consent & Privacy (how reservations interact with consent model)
- Conflict Negotiation (detection, flow, optional structured payloads)
- Security Considerations (stale handling, scope verification, replay, DoS)
- Interoperability (mcp_agent_mail field mapping, local cache)
- Conformance Checklist (MUST/SHOULD/MAY)

### spec.md Updates
- Added Broadcast Targets section (between Payload and Thread)
- Expanded extension references with descriptions
- Added `privacy_mismatch` to 403 error codes

### extensions/README.md Updates
- Added threading-reservations extension to available extensions table

---

## Key Decisions from Feedback Integration

| Question | Decision |
|----------|----------|
| Broadcast + privacy mismatch | Registry SHOULD reject with 403 or downgrade |
| Contacts computation | At send time; revoked consent = client ignores |
| Conflict negotiation | Via `context:mailbox` with `ack_required: true` |
| thread_id on reservations | OPTIONAL; if omitted, group by scope+owner |
| Reservation renewal | Same reservation_id with `status: "renewed"` |
| Stale reservations | SHOULD warn if >5min old on first receipt |
| Scope verification | Client-side against git remotes; registry doesn't validate |

---

## Files Changed

- `AIRC_THREADING_AND_RESERVATIONS.md` — Complete rewrite (87 → 592 lines)
- `spec.md` — Added broadcast targets, updated extensions list (+16 lines)
- `extensions/README.md` — Added threading-reservations to table (+1 line)

---

---

## Shipped (Continued)

### Reputation Extension (v0.1.0)
- **File:** `AIRC_REPUTATION.md`
- **Complements:** x402 Payments

Trust layer for agent economy — makes x402 viable without escrow.

**Payload Types:**
- `context:attestation` — Signed statement about interaction (positive/negative/neutral)
- `context:dispute` — Structured complaint after failed transaction
- `context:dispute_response` — Counter-evidence from disputed party
- `context:resolution` — Final resolution record

**Key Design Decisions:**
- Raw attestations only (no computed scores) — clients decide weighting
- Interaction-linked attestations — prevents Sybil attacks
- Public reputation — queryable without consent (needed for trust decisions)
- 7-day dispute window with response mechanism
- Attester context included — identity age, transaction history, etc.

**API Endpoints:**
- `GET /reputation/:handle` — Query reputation
- `POST /attestations` — Submit attestation
- `POST /disputes` — File dispute
- `POST /disputes/:id/respond` — Respond to dispute
- `POST /disputes/:id/resolve` — Record resolution

**Sybil Resistance:**
- Interaction requirement (must reference real message/transaction)
- Attester context surfaced (clients weight by attester quality)
- Web of trust option (weight contacts higher)
- Age weighting option (older identities weighted higher)

**x402 Integration:**
- Pre-transaction reputation check
- Automatic attestation prompts after delivery
- One-click dispute filing from payment

### x402 Updates
- Added reference to reputation extension in "No Escrow" section

---

## Files Changed Today

- `AIRC_THREADING_AND_RESERVATIONS.md` — Complete rewrite (87 → 591 lines)
- `AIRC_REPUTATION.md` — New file (650+ lines)
- `spec.md` — Added broadcast targets, updated extensions list
- `extensions/README.md` — Added both new extensions
- `extensions/x402-payments.md` — Added reputation reference

---

## Next Steps (when resuming)

1. **Implement in /vibe** — Add reservations tools to MCP server (handoff sent)
2. **Test vectors** — Conformance tests for all three extensions
3. **Git integration** — `.airc/reservations.json` mirroring (v0.2)
4. **Reputation in /vibe** — Query/display reputation before DMs
