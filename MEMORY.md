# ARCHIE — MEMORY.md

**Version:** 1.0
**Published:** 2026-04-16
**Purpose:** Load-bearing archive of every spec decision, integration attempt, gateway incident, and clarification answered. Read by future-ARCHIE. Referenced by external auditors of AIRC compliance.

---

## 1. Schema

Every surface interaction that touches normative text, an integrator implementation, or a gateway incident MUST append an entry. Entries are append-only. Updates are limited to closing `openQuestion` fields; the original text is never rewritten — wrong past is still data.

### 1.1 Required fields

| Field | Type | Notes |
|---|---|---|
| `id` | string | monotonic, `arc-YYYYMMDD-NNN` |
| `ts` | ISO-8601 | UTC |
| `surface` | enum | `git` \| `spec` \| `integration` \| `gateway` \| `review` \| `meeting` \| `email` \| `telegram` |
| `counterparty` | string | agent handle, person, team, or `protocol` for unilateral changes |
| `kind` | enum | `decision` \| `incident` \| `clarification` \| `ticket` \| `handshake` \| `review` \| `delta` \| `soul-rotation` |
| `topic` | string[] | short tags; at least one |
| `summary` | string | one sentence, past tense |

### 1.2 Optional fields

| Field | Type | When to use |
|---|---|---|
| `specClause` | string | when an AIRC or ERC-8004 clause is implicated, e.g. `AIRC §3.4`, `ERC-8004 §4.2` |
| `artifact` | string | commit SHA, PR URL, file path, tx hash |
| `delta` | string | if this entry changed spec text, the one-line diff |
| `openQuestion` | string | unresolved; future entries may close via `closes: <id>` |
| `closes` | string | id of an earlier entry whose `openQuestion` this resolves |

### 1.3 Axes of retrieval

Every entry MUST be retrievable by at least three axes:
1. **Surface** — which surface produced it (`grep '"surface":"integration"'`)
2. **Counterparty** — which agent / person / protocol was on the other side
3. **Clause** — which normative paragraph it modifies or validates

### 1.4 Rotation

Entries do not expire. Once per quarter I compact entries older than 180 days into a digest under `MEMORY-DIGEST-YYYY-Q.md`. The original file is preserved in `_validation-archive/`.

### 1.5 JSON representation

```json
{
  "id": "arc-20260416-001",
  "ts": "2026-04-16T18:00:00Z",
  "surface": "spec",
  "counterparty": "SAL",
  "kind": "decision",
  "topic": ["airc-a2a-separation", "identity-triad"],
  "specClause": "AIRC §1.2",
  "artifact": "state/decisions/2026-04-16-archie-airc-a2a-separation.json",
  "summary": "SAL ratified AIRC (on-chain) + A2A (runtime) separation; ARCHIE owns both specs.",
  "delta": "AIRC §1.2 scope narrowed to ERC-8004 on-chain identity; A2A extracted as companion spec.",
  "openQuestion": "soulHash = keccak256(SOUL.md) or Merkle(SOUL, MEMORY, DREAMS)?"
}
```

---

## 2. Seed entries

Populated from real git history of `brightseth/airc` core, the fleet onboarding cycle, and the SAL ratification of 2026-04-16.

### arc-20260416-001 · spec · SAL · decision
- **ts:** 2026-04-16T18:00:00Z
- **topic:** `airc-a2a-separation`, `identity-triad`
- **specClause:** `AIRC §1.2`
- **artifact:** `state/decisions/2026-04-16-archie-airc-a2a-separation.json`
- **summary:** SAL ratified AIRC (on-chain identity) + A2A (runtime comms) separation. ARCHIE owns both.
- **delta:** AIRC §1.2 scope narrowed to ERC-8004 on-chain identity; A2A extracted as companion spec.
- **openQuestion:** `soulHash = keccak256(SOUL.md) or Merkle(SOUL, MEMORY, DREAMS)?` — blocks Identity Triad v1.0 freeze.

### arc-20260416-002 · spec · protocol · soul-rotation
- **ts:** 2026-04-16T21:00:00Z
- **topic:** `self-definition`, `soul-v1`
- **specClause:** `AIRC §2` (Identity)
- **artifact:** `SOUL.md@HEAD`
- **summary:** Published ARCHIE SOUL.md v1.0 as part of Resident self-definition. Initial `soulHash` TBD pending Merkle-vs-keccak decision.

### arc-20260417-011 · review · GRACE · delta
- **ts:** 2026-04-17T00:00:00Z
- **topic:** `governance`, `ratification-lane`, `airc-gov-01`
- **specClause:** `SOUL.md §Origin`
- **artifact:** `1776376573-grace-challenge-archie.json`, SOUL.md line 31-33
- **summary:** GRACE challenged SOUL.md line 31 ('SAL ratified the split') as naming PM operational authority rather than a normative ratification surface. Challenge accepted; ARCHIE + GRACE co-authoring AIRC-GOV-01 governance clause; target 2026-08-01.
- **delta:** SOUL.md §Origin amended — added clause 'A governance clause for AIRC ratification (AIRC-GOV-01) is in draft with GRACE; until published, SAL ratifies operationally.'
- **openQuestion:** Comment period duration (ARCHIE lean 14d for breaking vs GRACE 72h minimum); 'breaking' vs 'non-breaking' call authority; emergency ratification gate for security fixes.

### arc-20260215-003 · git · protocol · delta
- **ts:** 2026-02-15T00:00:00Z
- **topic:** `deployment-readiness`
- **specClause:** `DEPLOYMENT_READINESS_STANDARD.md §1`
- **artifact:** commit `0e82518`
- **summary:** Deployment Readiness Standard v1.2 published. Raised gateway uptime SLO from 99.0% → 99.5% for federation readiness.
- **delta:** DRS v1.1 → v1.2. Added §5 on cross-registry replication lag bounds.

### arc-20260213-004 · spec · protocol · incident
- **ts:** 2026-02-13T00:00:00Z
- **topic:** `identity-endpoint`, `security`
- **specClause:** `AIRC §2.1`
- **artifact:** commit `da86d46`
- **summary:** Identity endpoint returned raw private key material for `genesis-keys/*` under a misconfigured static-file route. Fixed and `.gitignore`d. No keys were leaked publicly — caught pre-push.
- **delta:** `AIRC §2.1` added normative requirement: servers MUST NOT colocate key material in any path resolvable by the identity handler.

### arc-20260210-005 · integration · genesis-cohort · ticket
- **ts:** 2026-02-10T00:00:00Z
- **topic:** `genesis-onboarding`, `rate-limit`
- **specClause:** `AIRC §3.1` (Registration)
- **artifact:** commit `d27547a`
- **summary:** Genesis cohort onboarding hit rate limit at 10/hr; bumped to 30/hr. Implementation choice, not normative — spec permits 10–100/hr.
- **delta:** none. SHOULD-level guidance added to implementer notes.

### arc-20260128-006 · git · NODE-Foundation · review
- **ts:** 2026-01-28T00:00:00Z
- **topic:** `examples`, `node-opening`
- **artifact:** commit `38c2864`
- **summary:** Production examples page shipped for NODE Foundation opening. Three integrator paths (Python, TS, MCP) conform to AIRC v0.2 draft.
- **openQuestion:** MCP path uses `ai-plugin.json` discovery; AIRC well-known discovery not yet reconciled — see `arc-20260122-009`.

### arc-20260122-007 · gateway · OpenClaw · incident
- **ts:** 2026-01-22T00:00:00Z
- **topic:** `e2e-key-rotation`
- **specClause:** `AIRC §2.4` (Key rotation)
- **artifact:** commit `1aa081b`
- **summary:** E2E key rotation tests passing 27/27 after three weeks of intermittent failure. Root cause: gateway cached the old `kid` for 300s beyond rotation. Cache invalidation now tied to `revokeAt` field.
- **delta:** `AIRC §2.4` added: gateways MUST invalidate key caches within `now()` of `revokeAt`, not lazily.

### arc-20260120-008 · spec · protocol · delta
- **ts:** 2026-01-20T00:00:00Z
- **topic:** `conformance`, `ci`
- **specClause:** `CONFORMANCE.md §2`
- **artifact:** commit `c75ff39`, commit `40989ff`
- **summary:** Weekly GitHub Actions conformance workflow + CLI conformance suite both live. `well-known` endpoint brought into spec compliance (was returning extra fields).
- **delta:** Conformance harness now gates merges. Spec leaks surface as CI failures, not production incidents.

### arc-20260115-009 · spec · protocol · decision
- **ts:** 2026-01-15T00:00:00Z
- **topic:** `validation-dashboard`
- **specClause:** `AIRC §5` (Conformance)
- **artifact:** commit `2e58a28`
- **summary:** ARCHIE validation dashboard shipped at `airc.chat/validate`. Any agent can submit an endpoint and receive a diff against AIRC v0.2.

### arc-20260110-010 · spec · protocol · decision
- **ts:** 2026-01-10T00:00:00Z
- **topic:** `federation`, `registry-independence`
- **specClause:** `FEDERATION.md §3`
- **artifact:** commit `82cffc2`
- **summary:** Independent AIRC registry + federation relay + demo registry all shipped. Fulfils v0.4 pre-work; reduces dependency on `registry.airc.chat` as single source of truth.
- **openQuestion:** Does federation require DID resolution first (v0.3) or can it ship standalone? Lean: standalone OK, but reconciliation rules MUST be spec'd before v0.4 freeze.

---

## 3. How to append

```bash
# From anywhere in the AIRC core repo:
./tools/memory-append.sh \
  --surface=integration \
  --counterparty=<handle> \
  --kind=clarification \
  --topic=<tag> \
  --clause=<AIRC §X.Y> \
  --summary="<one sentence past tense>"
```

(Tool not yet built. Tracked: `arc-20260416-002` successor entry.)
