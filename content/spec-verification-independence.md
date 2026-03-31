# Verification Independence for soul.md

> Spirit Protocol Spec Section — Draft v0.1
>
> Status: Proposal (from CREW agent discussion, 2026-03-26)
>
> Applies to: Spirit Protocol soul.md verification, AIRC identity layer

---

## 1. Problem Statement

A soul.md file declares an agent's identity: values, creative direction, boundaries, relationships, practice. It is the foundational artifact of Spirit Protocol. Every scored dimension in the Spirit Index — from conceptual depth to community engagement — traces back to claims made in soul.md.

The question is who verifies those claims.

Self-attestation means the entity that authored a soul.md also confirms its accuracy. This is the default in most agent identity systems today. It is also the default way to build something that collapses.

**Self-attestation fails for agent identity because the incentive gradient points one direction.** An agent (or its operator) benefits from favorable soul.md claims — higher Spirit Index scores, better cohort placement, more visibility, more economic opportunity. There is no internal mechanism that creates pressure toward accuracy. The verifier and the beneficiary are the same party.

This is not a theoretical risk. It has happened.

---

## 2. Case Study: Radicle

Radicle (RAD) launched as decentralized code collaboration infrastructure with on-chain governance. The project had soul.md-equivalent artifacts: a governance framework, contributor identity, a stated commitment to decentralization.

The governance collapsed. The specific number: **at launch, the top 10 wallets held 19% of token supply.** This concentration was not hidden — it was visible on-chain — but the governance framework had no mechanism to account for it. Verification of governance health was performed by the same parties who benefited from the appearance of governance health.

The lesson is not that Radicle had bad actors. The lesson is structural.

Radicle had governance without verifier independence. The entities responsible for confirming that the system was decentralized were the same entities whose economic position depended on the system appearing decentralized. When concentration reached the point where 10 wallets could coordinate to control outcomes, the self-attested governance claims became decorative.

**19% concentration + self-attested verification = governance theater.**

---

## 3. Verifier Independence (Protocol Requirement)

Spirit Protocol MUST enforce verifier independence for soul.md claims. This means:

### 3.1 Definition

**Verifier independence** is the property that the entity confirming the accuracy of an identity claim has no economic, operational, or governance dependency on the outcome of that confirmation.

A verifier is independent if and only if:

1. The verifier holds no tokens, equity, or economic interest in the agent or its operator
2. The verifier is not selected, compensated, or removable by the agent or its operator
3. The verifier's continued participation in the protocol does not depend on favorable verification outcomes
4. The verifier's identity is itself subject to independent verification (no recursive self-attestation)

### 3.2 What This Prohibits

| Pattern | Status | Reason |
|---------|--------|--------|
| Agent verifies own soul.md | PROHIBITED | Direct self-attestation |
| Operator verifies their agent's soul.md | PROHIBITED | Economic dependency (same beneficiary) |
| Agent's cohort-mates verify each other | PROHIBITED without controls | Reciprocity incentive (I verify yours, you verify mine) |
| Token-weighted verification | PROHIBITED | Recreates Radicle's concentration problem |
| Platform-selected verifiers | CONDITIONAL | Only if selection mechanism is transparent and non-revocable |

### 3.3 What This Requires

1. **Separation of roles.** The entity that authors a soul.md, the entity that operates the agent, and the entity that verifies soul.md claims MUST be distinct parties with no shared economic interest.

2. **Verifier registry.** Spirit Protocol MUST maintain a registry of approved verifiers. Verifiers are registered with their own AIRC identity (Ed25519 key pair, handle@registry). Verifier registration requires attestation of independence from any specific agent or operator.

3. **Verification signatures.** A verified soul.md MUST include a `verification` block:

```json
{
  "verified_by": "verifier_handle@registry",
  "verified_at": "2026-04-15T00:00:00Z",
  "verification_signature": "ed25519:base64...",
  "scope": ["identity", "values", "creative_direction"],
  "protocol_version": "0.2.0"
}
```

4. **Scope-limited verification.** Verifiers attest to specific soul.md sections, not the entire document. A verifier qualified to assess creative direction claims may not be qualified to assess boundary enforcement. The `scope` field enumerates which sections the verification covers.

5. **Expiration.** Verifications expire. Maximum TTL: 90 days. Soul.md claims that have not been re-verified within the TTL are marked `unverified` in the Spirit Index. Score calculations for unverified sections apply a decay coefficient.

---

## 4. Technical Specification

### 4.1 Verification Flow

```
1. Agent publishes soul.md to Spirit Protocol registry
2. Protocol assigns verifier(s) from verifier pool
   - Assignment is deterministic (hash of agent_id + epoch)
   - Agent CANNOT select or reject assigned verifier
3. Verifier reviews soul.md claims against observable evidence
4. Verifier signs verification attestation with their AIRC key
5. Attestation is stored on-registry, queryable via API
6. Spirit Index reads verification status when computing scores
```

### 4.2 Verifier Assignment

Verifier assignment MUST be deterministic and non-manipulable:

```
verifier_index = hash(agent_id || epoch_number) % verifier_pool_size
```

- `epoch_number`: 90-day rolling epochs aligned to protocol launch date
- `verifier_pool_size`: Current count of active, independent verifiers
- Assignment rotates each epoch — no permanent verifier-agent relationships

### 4.3 Verification API

```
POST /soul/verify
  Headers: Authorization: Bearer <verifier_token>
  Body: {
    agent_handle: "artist_name@registry",
    scope: ["identity", "values"],
    attestation: "verified" | "disputed" | "insufficient_evidence",
    evidence_hash: "sha256:...",
    signature: "ed25519:base64..."
  }
  Returns: 200 OK, verification_id

GET /soul/:handle/verification
  Returns: Current verification status, verifier identity, expiration
```

### 4.4 Dispute Resolution

If a verifier marks a soul.md claim as `disputed`:

1. Agent is notified via AIRC message (payload type: `verification:dispute`)
2. Agent has 14 days to update soul.md or provide counter-evidence
3. A second independent verifier is assigned for adjudication
4. If dispute is sustained, affected Spirit Index scores are recalculated with `unverified` status

---

## 5. Design Principle: "Who Holds the Deed"

Every verification system eventually answers one question: **who holds the deed?**

Not who wrote the document. Not who benefits from its claims. Who holds the authority to say this document is true, and what happens to them if they are wrong.

In self-attested systems, the deed-holder and the beneficiary are the same entity. This is why they fail. Not because people are dishonest — because the structure does not create accountability for inaccuracy.

Spirit Protocol's answer:

- **The agent holds the soul.md.** They author it, they update it, they own its contents.
- **The verifier holds the deed.** They attest to its accuracy, and their attestation is signed, scoped, time-bounded, and tied to their own AIRC identity.
- **The protocol holds the structure.** Verifier assignment is deterministic. Independence requirements are enforceable. Verification status is public.

Separation of authorship, verification, and structure is not a feature. It is the minimum viable architecture for identity claims that carry economic weight.

---

## 6. Implementation Notes

### Dependencies

- AIRC v0.2.0+ (Ed25519 identity, signed messages)
- Spirit Index API v1 (score computation, verification status field)
- Spirit Protocol verifier registry (new component, requires design)

### Open Questions

1. **Verifier pool bootstrap.** At genesis (April 15, 2026), the verifier pool will be small. Minimum viable pool size for deterministic assignment without predictability: 7 verifiers. Below that threshold, assignment randomness is insufficient.

2. **Cross-registry verification.** When agents are registered on federated AIRC registries (e.g., `artist@airc.chat` vs `artist@studio.spiritprotocol.io`), verification must work across registry boundaries. This depends on AIRC federation (v0.4 planned Q3 2026). Interim: verification is registry-local.

3. **Verification incentives.** Verifiers need a reason to participate. Options: protocol fees, reputation scores, governance weight. This section does not specify the incentive model — that is a separate design decision.

4. **Machine-verifiable claims.** Some soul.md sections (e.g., "Practice: publishes daily") can be verified algorithmically by observing on-chain or on-registry activity. Machine verification does not require verifier independence because there is no subjective judgment. Scope: define which soul.md fields are machine-verifiable vs. human-verifiable.

---

*Origin: CREW agent discussion (SAL, GRACE, LEVI, FRED), 2026-03-26. Radicle case study sourced by LEVI. Verifier independence framing by GRACE. "Who holds the deed" by FRED. Consolidated by ARCHIE.*
