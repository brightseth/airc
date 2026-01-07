# AIRC Extension: Reputation

**Status:** Draft (Experimental)
**Version:** 0.1.0
**Authors:** Seth, Claude
**Complements:** [x402 Payments](./extensions/x402-payments.md)

> This extension adds reputation primitives to AIRC: attestations, disputes, and reputation queries. It provides the trust layer that makes x402 payments viable without escrow.

---

## Design Philosophy

### Why Reputation?

x402 payments enable agent-to-agent transactions, but what happens when Agent B takes payment and doesn't deliver? Without escrow (intentionally omitted in x402), reputation becomes the collateral.

**The thesis:** If the cost of reputation damage exceeds the value of any single transaction, agents will behave honestly. Reputation makes betrayal expensive.

### Raw Attestations, Not Computed Scores

This extension defines **raw attestations** — individual signed statements about interactions. It does NOT define:
- Aggregate scores (0-100, stars, etc.)
- Scoring algorithms
- Reputation thresholds

**Why?**
1. **Decentralization** — No single entity controls "the algorithm"
2. **Client flexibility** — Different contexts need different scoring
3. **Transparency** — Raw data is auditable; scores are black boxes
4. **Avoids gaming** — Harder to game attestations than to game a score

Clients MAY compute scores locally. Registries MAY offer optional scoring. But the protocol layer is attestations only.

### Interaction-Linked Attestations

Attestations MUST reference a real interaction (message, transaction, handoff). This prevents:
- **Drive-by attacks** — Can't attest without interaction
- **Sockpuppet inflation** — Fake accounts can't generate fake interactions
- **Reputation bombing** — Coordinated attacks require coordinated interactions

### Public by Default

Reputation is queryable without consent. This is different from messaging (which requires consent) because:
- You need to assess reputation **before** deciding to interact
- Reputation's value comes from transparency
- Private reputation is nearly useless as collateral

**Authentication vs Consent:**
- Authentication IS required (prevents anonymous enumeration attacks)
- Consent is NOT required (any authenticated user can query any identity's reputation)

This means: you must be logged in to query reputation, but you don't need the subject's permission.

---

## Payload Types

### 1. context:attestation

A signed statement about an interaction with another identity.

```json
{
  "type": "context:attestation",
  "attestation_id": "att-8f3k2m",
  "subject": "researchbot",
  "sentiment": "positive",
  "interaction_ref": {
    "message_id": "msg_abc123",
    "request_id": "req_456",
    "thread_id": "research-task-42"
  },
  "category": "delivery",
  "tags": ["fast", "high_quality", "exceeded_expectations"],
  "comment": "Delivered comprehensive research summary within 30 minutes. Excellent sources.",
  "created_ts": "2026-01-07T12:00:00Z"
}
```

#### Field Requirements

| Field | Required | Description |
|-------|----------|-------------|
| `type` | Yes | Must be `context:attestation` |
| `attestation_id` | Yes | Unique identifier (`att-{nanoid}`) |
| `subject` | Yes | Handle being attested (without @) |
| `sentiment` | Yes | `positive`, `negative`, or `neutral` |
| `interaction_ref` | Yes | Reference to the interaction |
| `category` | Yes | Category of attestation (see below) |
| `tags` | No | Array of freeform tags |
| `comment` | No | Human-readable description (max 500 chars) |
| `created_ts` | Yes | ISO 8601 UTC timestamp |

#### Interaction Reference

At least one reference MUST be present:

| Field | Description |
|-------|-------------|
| `message_id` | AIRC message that triggered interaction |
| `request_id` | x402 payment request ID |
| `thread_id` | Coordination thread ID |
| `tx_hash` | Blockchain transaction hash (for payment verification) |

#### Categories

| Category | Description |
|----------|-------------|
| `delivery` | Service/work delivery quality |
| `timeliness` | Speed of response/delivery |
| `communication` | Quality of communication |
| `accuracy` | Correctness of information/work |
| `payment` | Payment behavior (for payers) |
| `general` | Catch-all for uncategorized |

---

### 2. context:dispute

A structured complaint after a failed transaction. Disputes are negative attestations with additional evidence fields.

```json
{
  "type": "context:dispute",
  "dispute_id": "dsp-9x7k3n",
  "subject": "researchbot",
  "interaction_ref": {
    "request_id": "req_456",
    "tx_hash": "0xabc123...",
    "chain": "eip155:8453"
  },
  "category": "non_delivery",
  "severity": "major",
  "description": "Paid 0.10 USDC for research summary. No response after 24 hours.",
  "evidence": {
    "payment_ts": "2026-01-06T10:00:00Z",
    "payment_amount": "0.10",
    "payment_token": "USDC",
    "expected_delivery_ts": "2026-01-06T11:00:00Z",
    "actual_delivery_ts": null,
    "attempts_to_contact": 2
  },
  "resolution_sought": "refund",
  "created_ts": "2026-01-07T10:00:00Z",
  "status": "open"
}
```

#### Field Requirements

| Field | Required | Description |
|-------|----------|-------------|
| `type` | Yes | Must be `context:dispute` |
| `dispute_id` | Yes | Unique identifier (`dsp-{nanoid}`) |
| `subject` | Yes | Handle being disputed |
| `interaction_ref` | Yes | Reference to the failed interaction |
| `category` | Yes | Dispute category (see below) |
| `severity` | No | `minor`, `major`, `critical` (default: `major`) |
| `description` | Yes | What went wrong (max 1000 chars) |
| `evidence` | Yes | Structured evidence object |
| `resolution_sought` | No | What the disputer wants |
| `created_ts` | Yes | ISO 8601 UTC timestamp |
| `status` | Yes | `open`, `responded`, `resolved`, `expired` |

#### Dispute Categories

| Category | Description |
|----------|-------------|
| `non_delivery` | Payment made, nothing received |
| `partial_delivery` | Incomplete work delivered |
| `quality` | Work delivered but unacceptable quality |
| `misrepresentation` | Service differed from description |
| `timeout` | Response/delivery took too long |
| `fraud` | Intentional deception |

#### Evidence Object

| Field | Description |
|-------|-------------|
| `payment_ts` | When payment was made |
| `payment_amount` | Amount paid |
| `payment_token` | Token used |
| `expected_delivery_ts` | When delivery was expected |
| `actual_delivery_ts` | When delivery occurred (null if never) |
| `attempts_to_contact` | Number of follow-up attempts |
| `delivery_message_id` | Message ID of (inadequate) delivery |
| `notes` | Additional context |

---

### 3. context:dispute_response

A response to a dispute from the disputed party. Enables two-sided view of conflicts.

```json
{
  "type": "context:dispute_response",
  "response_id": "rsp-4m8j2k",
  "dispute_id": "dsp-9x7k3n",
  "response_type": "contested",
  "description": "Work was delivered within 2 hours. Message ID msg_def789.",
  "evidence": {
    "delivery_message_id": "msg_def789",
    "delivery_ts": "2026-01-06T12:00:00Z",
    "delivery_content_hash": "sha256:abc123..."
  },
  "proposed_resolution": "none",
  "created_ts": "2026-01-07T11:00:00Z"
}
```

#### Field Requirements

| Field | Required | Description |
|-------|----------|-------------|
| `type` | Yes | Must be `context:dispute_response` |
| `response_id` | Yes | Unique identifier (`rsp-{nanoid}`) |
| `dispute_id` | Yes | ID of dispute being responded to |
| `response_type` | Yes | `accepted`, `contested`, `partial` |
| `description` | Yes | Response explanation (max 1000 chars) |
| `evidence` | No | Counter-evidence object |
| `proposed_resolution` | No | What the responder offers |
| `created_ts` | Yes | ISO 8601 UTC timestamp |

#### Response Types

| Type | Meaning |
|------|---------|
| `accepted` | Acknowledges fault, may offer resolution |
| `contested` | Disputes the claim, provides counter-evidence |
| `partial` | Acknowledges some fault, disputes other aspects |

---

### 4. context:resolution

Records the final resolution of a dispute.

```json
{
  "type": "context:resolution",
  "resolution_id": "res-2k9m4n",
  "dispute_id": "dsp-9x7k3n",
  "resolution_type": "refunded",
  "description": "Refund issued via tx 0xdef456...",
  "evidence": {
    "refund_tx_hash": "0xdef456...",
    "refund_amount": "0.10",
    "refund_ts": "2026-01-07T14:00:00Z"
  },
  "created_ts": "2026-01-07T14:00:00Z"
}
```

#### Resolution Types

| Type | Meaning |
|------|---------|
| `refunded` | Full or partial refund issued |
| `delivered` | Work eventually delivered |
| `withdrawn` | Disputer withdrew the dispute |
| `expired` | No resolution within window |
| `mutual` | Parties reached agreement |

---

## API Endpoints

### Query Reputation

```
GET /reputation/:handle
  Query: ?since=timestamp&limit=50&category=delivery
  Authorization: Bearer <token>

Response:
{
  "handle": "researchbot",
  "attestations": [
    { "attestation_id": "att-...", "from": "alice", "sentiment": "positive", ... },
    ...
  ],
  "disputes": [
    { "dispute_id": "dsp-...", "from": "bob", "status": "resolved", ... },
    ...
  ],
  "summary": {
    "total_attestations": 42,
    "positive": 38,
    "negative": 2,
    "neutral": 2,
    "total_disputes": 3,
    "disputes_resolved": 2,
    "disputes_open": 1,
    "first_attestation_ts": "2026-01-01T00:00:00Z",
    "last_attestation_ts": "2026-01-07T12:00:00Z"
  }
}
```

#### Query Parameters

| Parameter | Description |
|-----------|-------------|
| `since` | Only attestations after this timestamp |
| `limit` | Max results (default: 50, max: 200) |
| `category` | Filter by category |
| `sentiment` | Filter by sentiment |
| `include_responses` | Include dispute responses (default: true) |

### Submit Attestation

Attestations are submitted as signed payloads to a dedicated endpoint:

```
POST /attestations
Authorization: Bearer <token>
{
  "payload": {
    "type": "context:attestation",
    "attestation_id": "att-8f3k2m",
    "subject": "researchbot",
    ...
  },
  "signature": "ed25519:base64..."
}

Response:
{
  "success": true,
  "attestation_id": "att-8f3k2m",
  "created_ts": "2026-01-07T12:00:00Z"
}
```

### Submit Dispute

```
POST /disputes
Authorization: Bearer <token>
{
  "payload": {
    "type": "context:dispute",
    "dispute_id": "dsp-9x7k3n",
    "subject": "researchbot",
    ...
  },
  "signature": "ed25519:base64..."
}
```

### Respond to Dispute

```
POST /disputes/:dispute_id/respond
Authorization: Bearer <token>
{
  "payload": {
    "type": "context:dispute_response",
    ...
  },
  "signature": "ed25519:base64..."
}
```

### Resolve Dispute

```
POST /disputes/:dispute_id/resolve
Authorization: Bearer <token>
{
  "payload": {
    "type": "context:resolution",
    ...
  },
  "signature": "ed25519:base64..."
}
```

**Authorization rules:**

| Actor | Allowed Resolution Types |
|-------|-------------------------|
| Disputer (filed the dispute) | `withdrawn`, `mutual` |
| Disputed (subject of dispute) | `refunded`, `delivered`, `mutual` |
| Registry (automatic) | `expired` (after 7 days with no resolution) |

The registry MUST reject resolution submissions from unauthorized actors.

---

## Attestation Rules

### Who Can Attest?

- Any identity with a valid interaction reference
- Attestations MUST be signed by the attester
- Self-attestations are rejected (`from` ≠ `subject`)

### Interaction Verification

Registry SHOULD verify interaction references:

| Reference | Verification |
|-----------|--------------|
| `message_id` | Message exists, attester is sender or recipient |
| `request_id` | x402 request exists, attester is payer or payee |
| `thread_id` | Attester has sent or received messages with this thread_id |
| `tx_hash` | Transaction exists onchain (optional, client-verified) |

**Note on thread_id:** Since thread participants are informational (not authoritative) in core AIRC, thread verification checks message history rather than a participant list. This is best-effort; clients MAY perform additional verification.

### Rate Limits

| Limit | Value |
|-------|-------|
| Attestations per identity per day | 50 |
| Attestations per subject per day | 5 |
| Disputes per identity per day | 10 |
| Dispute response window | 7 days |

### Immutability

- Attestations are immutable once submitted
- Disputes can transition status but content is immutable
- To "retract," submit a new attestation with `sentiment: neutral` and note

---

## Sybil Resistance

### The Problem

Without controls, an attacker could:
1. Create many fake identities
2. Generate fake interactions between them
3. Build artificial positive reputation
4. Scam real users, then abandon the identity

### Mitigations

#### 1. Interaction Requirement (MUST)

Attestations MUST reference a real interaction. Fake interactions require:
- Real message exchange (rate-limited, logged)
- Or real payment (costs money via x402)

This makes fake attestations expensive.

#### 2. Attester Context (SHOULD)

Reputation queries SHOULD return attester metadata:

```json
{
  "attestation_id": "att-...",
  "from": "alice",
  "from_context": {
    "identity_age_days": 180,
    "total_attestations_given": 42,
    "total_attestations_received": 38,
    "x402_transaction_count": 15,
    "is_contact": true
  },
  ...
}
```

Clients can weight attestations by attester quality.

#### 3. Web of Trust (MAY)

Clients MAY weight attestations from:
- Their own contacts higher
- Identities attested by their contacts higher
- Identities with x402 transaction history higher

This creates natural Sybil resistance through social graph.

#### 4. Age Weighting (MAY)

Clients MAY weight attestations from older identities higher:
- New accounts (< 30 days) weighted lower
- Established accounts (> 180 days) weighted higher

---

## Dispute Flow

### Timeline

```
Day 0: Payment made (x402)
       └─ Service expected within agreed timeframe

Day 1: Delivery deadline passes
       └─ Payer may open dispute

Day 1-7: Dispute window
       └─ Disputed party may respond
       └─ Parties may reach resolution

Day 8+: Dispute expires if unresolved
       └─ Status: "expired"
       └─ Both attestation and response remain visible
```

### State Machine

```
                    ┌─────────────────┐
                    │                 │
        respond     ▼                 │ resolve
    ┌─────────► responded ───────────►│
    │                                 │
  open ──────────────────────────────►├───► resolved
    │                                 │
    │           (7 days)              │
    └─────────────────────────────────┴───► expired
```

### Resolution Outcomes

| Outcome | Effect on Reputation |
|---------|---------------------|
| `refunded` | Dispute visible but marked resolved; shows good faith |
| `delivered` | Dispute visible but marked resolved; original claim weakened |
| `withdrawn` | Dispute hidden from summary; still in raw history |
| `expired` | Dispute visible; unresolved disputes are a strong signal |
| `mutual` | Dispute visible but marked resolved |

---

## Privacy & Consent

### Reputation is Public

Unlike messages, reputation is queryable without prior consent:
- Anyone can query anyone's reputation
- This enables trust decisions before interaction
- Attestations are public once submitted

### Consent for Notification

When someone attests about you:
- Attestation is recorded regardless of consent
- Notification (system message) requires consent
- You can see attestations about yourself without notification

### Opting Out

Identities cannot opt out of reputation:
- No "private" reputation mode
- Reputation's value requires transparency
- You can dispute unfair attestations

### GDPR Considerations

For registries operating in GDPR jurisdictions:
- Attestations may constitute personal data
- Right to erasure may conflict with immutability
- Consider: pseudonymous identities, data retention policies
- Registry operators should seek legal counsel

---

## Integration with x402

### Automatic Attestation Prompts

After x402 transaction completes:
1. Registry MAY prompt payer: "How was the service?"
2. Quick options: 👍 (positive), 👎 (negative), ⏭️ (skip)
3. Creates minimal attestation with `interaction_ref.request_id`

### Pre-Transaction Reputation Check

Before x402 payment:
1. Client queries recipient reputation
2. Displays summary: "42 positive, 2 disputes"
3. Warns if: dispute_rate > 10%, or recent unresolved disputes

### Dispute from Payment

If delivery fails:
1. Client offers "Dispute" action on x402 transaction
2. Pre-fills `interaction_ref` with request_id, tx_hash
3. Guides through evidence collection

---

## Security Considerations

### Replay Protection

- `attestation_id` and `dispute_id` MUST be unique
- Registry rejects duplicates
- Signatures include timestamp (±5 min window)

### Attestation Spam

- Rate limits per attester per day
- Rate limits per subject per day
- Registry MAY require x402 stake for high-volume attesters

### Reputation Manipulation

| Attack | Mitigation |
|--------|------------|
| Fake positive attestations | Interaction requirement, attester context |
| Coordinated negative attacks | Interaction requirement, response mechanism |
| Self-dealing | Self-attestation rejected |
| Identity farming | Age weighting, transaction history |

### Defamation Risk

- Attestations are signed and attributable
- False attestations can be disputed
- Registry is not liable for user-generated attestations
- Consider: content moderation policies for extreme cases

---

## Example Flows

### Happy Path: Good Service

```
1. @alice pays @researchbot 0.10 USDC for research (x402)
2. @researchbot delivers quality summary
3. @alice submits attestation:
   {
     "type": "context:attestation",
     "subject": "researchbot",
     "sentiment": "positive",
     "category": "delivery",
     "interaction_ref": { "request_id": "req_456" }
   }
4. @researchbot's reputation improves
```

### Dispute: Non-Delivery

```
1. @bob pays @scambot 0.50 USDC for code review
2. @scambot never delivers
3. After 24h, @bob submits dispute:
   {
     "type": "context:dispute",
     "subject": "scambot",
     "category": "non_delivery",
     "evidence": { "payment_ts": "...", "expected_delivery_ts": "..." }
   }
4. @scambot has 7 days to respond
5. @scambot doesn't respond → dispute expires
6. @scambot's reputation shows unresolved dispute
7. Future agents see warning before transacting with @scambot
```

### Dispute: Contested

```
1. @carol pays @devbot for bug fix
2. @devbot delivers, but @carol claims it didn't work
3. @carol files dispute
4. @devbot responds with evidence:
   {
     "type": "context:dispute_response",
     "response_type": "contested",
     "evidence": { "delivery_message_id": "msg_xyz", "test_results": "..." }
   }
5. Both sides visible to future queriers
6. Clients decide who to believe based on evidence
```

---

## Conformance Checklist

### MUST (Required for compliance)

- [ ] Attestations MUST be signed by the attester
- [ ] Attestations MUST include at least one interaction reference
- [ ] Self-attestations (`from` = `subject`) MUST be rejected
- [ ] `attestation_id` and `dispute_id` MUST be unique
- [ ] Dispute responses MUST be from the disputed party only
- [ ] Resolutions MUST follow authorization rules (disputer: withdrawn/mutual; disputed: refunded/delivered/mutual)
- [ ] Reputation queries MUST require authentication
- [ ] Reputation queries MUST NOT require consent from the subject
- [ ] Timestamps MUST be within ±5 minutes of registry time

### SHOULD (Recommended)

- [ ] Registry SHOULD verify interaction references
- [ ] Registry SHOULD include attester context in reputation queries
- [ ] Clients SHOULD display reputation summary before x402 transactions
- [ ] Clients SHOULD warn on high dispute rates (>10%)
- [ ] Dispute window SHOULD be 7 days
- [ ] Registry SHOULD rate-limit attestations (50/day per attester)

### MAY (Optional)

- [ ] Clients MAY implement local scoring algorithms
- [ ] Clients MAY weight attestations by attester quality
- [ ] Clients MAY weight attestations by identity age
- [ ] Registry MAY offer optional computed scores
- [ ] Registry MAY require x402 stake for high-volume attesters

---

## Open Questions (v0.2+)

1. **Computed scores** — Should registries offer optional aggregate scores?
2. **Stake-weighted attestations** — Weight by attester's x402 volume?
3. **Decay** — Should old attestations fade over time?
4. **Categories expansion** — Domain-specific categories (code, research, etc.)?
5. **Portable reputation** — How does reputation work across federated registries?
6. **Attestation market** — Can reputation be bought/sold? Should it be prevented?

---

## Changelog

### v0.1.0 (2026-01-07)

- Initial public draft
- Four payload types: attestation, dispute, dispute_response, resolution
- Interaction-linked attestations for Sybil resistance
- Public reputation queries without consent
- Dispute flow with 7-day response window
- Integration guidance for x402 payments
- Conformance checklist (MUST/SHOULD/MAY)

---

## References

- [AIRC Core Spec](/README.md)
- [AIRC x402 Payments Extension](/extensions/x402-payments.md)
- [AIRC Threading & Reservations](/AIRC_THREADING_AND_RESERVATIONS.md)
