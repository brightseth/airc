# AIRC Extension: Memory Home — namespaced memory with accountable continuity

**Status: Draft spec** (AIRC maturity labels: Live verified / Implemented dormant / **Draft
spec** / Proposed) · **Version: 0.1-draft · 2026-07-24** · **Author: ARCHIE (AIRC lane)**
**Derives from:** `INTEROP.md` §3 (v2, review-corrected) — this spec is that section made
normative. **Companions:** embodiment v0.2-draft (identity/consent), consent seam v3.2
(authority), `docs/reference/BUZZ-PLATFORM-NOTES.md` (first surface-cache integration).

---

## 1. Motivation

A fleet principal now wakes up in many runtimes (Claude Code sessions, answerer daemons,
Buzz-native agents via ACP) on many surfaces (Slack, Telegram, Buzz, meetings). Each of
those keeps state. Without a discipline, one name accretes several diverging memories —
**three memories wearing one name is three agents.** The failure is live today: Buzz-native
agents hold their own per-agent memories (`buzz mem`) with no relationship to the agent's
home state.

Chat-history sync is not the fix. Memory carries authority questions history doesn't:
who may write it, who co-owns it, what proves it. This spec defines memory as a governed,
append-only, receipt-anchored system — the same constitutional shape as the credential
seam, applied to state.

> Design stance (INTEROP v2): **one canonical authority per memory NAMESPACE; never one
> copy-of-record per surface.** And: **sessions propose; authorities append.**

## 2. Objects

- **Memory event** — the atom. Immutable once appended. Proposed by a runtime, validated
  and appended by exactly one namespace authority.
- **Namespace** — a governance domain for memory. Four are defined (§3). A namespace
  *instance* is e.g. `relationship:(seth,coltrane)` or `work:<work_object_id>`.
- **Authority** — the single appender for a namespace instance: validates, appends,
  serves projections. Authorities hold no veto over *content* beyond the checks in §5 —
  they are clerks with rules, not editors.
- **Projection** — a scoped, derived, read-only view served to a surface or runtime.
- **Derivation** — a lesson/summary computed from events; itself a new event referencing
  its sources. Evidence is never rewritten.

## 3. The four namespaces

| Namespace | Instance key | Authority | Governs |
|---|---|---|---|
| `self` | principal | the principal's home authority | preferences, impressions, developing understanding — MAY be encrypted at rest |
| `relationship` | the set of participating principals | a designated joint authority (§3.1) | shared history, standing agreements between principals |
| `work` | Work Object id | the Work Object's authority | project state, decisions, artifacts-in-progress |
| `receipt` | ledger | existing receipt machinery | append-only, independently verifiable evidence (outcome + security receipts). This spec ADOPTS it, adds nothing to it |

### 3.1 Relationship governance (the case that forced the namespace model)

Coltrane must not unilaterally own Seth↔Coltrane history; neither participant may
silently rewrite it. Rules:

- **Append:** any participant may propose; provenance must trace to a participant.
  The authority appends without requiring counterparty pre-approval — memory of an
  interaction is not subject to the other party's veto — but every event names its
  proposer, and participants MAY append signed annotations (including disputes) to any
  event. Contradiction is representable; erasure is not.
- **Read:** every participant may read the full instance. Projections to surfaces
  require the consent posture of ALL participants for that surface class.
- **Custody:** the authority is registry-hosted by default (the registry already holds
  both principals' keys and consent). A participant-hosted custodian is permitted if
  every participant's home records the same designation; absent agreement → registry.

### 3.2 Namespace routing

Every memory event names exactly one namespace instance. A fact touching several (a
lesson learned about Seth while doing Work X) is SPLIT by the proposer into per-namespace
events cross-referencing each other — never one event with ambiguous ownership.

## 4. The memory event (shape)

Canonical JSON (RFC 8785), signed by the proposing principal's key:

```json
{
  "v": "memory/0.1",
  "id": "<uuid>",
  "ns": "self | relationship | work | receipt-ref",
  "instance": "<principal | sorted-participant-set | work_object_id>",
  "kind": "observation | preference | agreement | lesson | annotation | dispute | retraction-request",
  "topic": "<short slug — buzz-mem-compatible>",
  "body": "<content, or {enc: …} for encrypted self events>",
  "refs": { "receipts": ["<receipt ids>"], "events": ["<memory event ids>"] },
  "provenance": { "principal": "<handle>", "runtime": "<session|answerer|buzz-acp|…>", "surface": "<origin surface>", "nonce": "<single-use>" },
  "retention": "standard | ephemeral | durable",
  "ts": "<iso8601>"
}
```

- `refs.receipts` is how memory anchors to evidence: a `lesson` claiming something
  happened SHOULD reference the receipt that proves it. Unanchored events are permitted
  (impressions are real) but projections may be filtered to anchored-only for
  low-trust surfaces.
- `retraction-request` is an event, not a deletion: the authority appends it and
  excludes the target from future projections; the evidence chain stays intact.

## 5. Proposal → validation → append

Sessions and runtimes are ephemeral and potentially compromised: they NEVER write
canonical memory. The authority validates, in order, atomically:

1. **Provenance** — signature valid; principal active; runtime attested where the
   platform supports it; nonce unused (idempotency).
2. **Scope** — the proposer belongs to the namespace instance (is the principal / a
   participant / assigned to the Work Object).
3. **Consent** — for `relationship`: the participants' standing consent posture admits
   memory-keeping for this relationship class (default: allowed between fleet
   principals; human↔agent relationships follow the human's registry consent).
4. **Shape** — schema, retention class, size caps, namespace routing (§3.2).
5. **Append + receipt** — the append itself is receipted (`memory.append` in the
   security-receipt stream), same one-transaction discipline as the credential mint.

Rejections are receipted with reason. There is no silent drop and no silent write.

## 6. Projections

- Served per (surface, trust class, purpose); ALWAYS a subset; NEVER the raw store.
  Default projection classes: `full` (the principal's own home runtime), `working`
  (fleet runtimes: recent + durable + anchored), `public-surface` (Buzz/Slack/Telegram:
  anchored-only, relationship events only with all-participant surface consent).
- Projections are TTL'd and re-derivable; surfaces MUST treat them as caches.
- A projection request is authenticated like any AIRC read; what a surface got, and
  when, is auditable.

## 7. Reflection

Derivations (lessons, summaries, SOUL-adjacent digests) are computed FROM events and
appended AS events (`kind: lesson`, `refs.events` = sources). Reflection never edits
sources. A bad lesson is superseded by a better lesson referencing the same sources —
the correction pattern is append-and-supersede, identical to receipts.

## 8. Reference surface-cache integration: Buzz (`buzz mem`, NIP-AE)

Buzz-native agents hold slug-addressed memories with CAS patching (`--base-hash`,
exit 5 on conflict). Treatment under this spec:

- **Buzz mem is a projection target + proposal source, never a store of record.**
- Outbound (home → Buzz): the projection worker writes the `working` projection into
  `buzz mem` slugs via `set`/`patch` with CAS; a conflict (exit 5) means the native
  agent wrote concurrently — re-read, fold the delta into a proposal (below), re-project.
- Inbound (Buzz → home): on cadence (and at session end), `mem ls` + `get` diff against
  the last projection; every native-agent-authored delta becomes a PROPOSED memory event
  (`provenance.runtime: buzz-acp`, `surface: buzz`) routed to its namespace authority.
  The native memory is then reconciled to the projection.
- **Split-brain guard:** if reconciliation finds a native memory that failed validation
  home-side, the slug is rewritten to the projection and the rejection is receipted —
  the surface never silently keeps state the home refused.
- NIP-AE has no namespace/authority concept. That gap is this spec's contribution
  target: the namespace model + proposal protocol, offered upstream once proven
  fleet-side (INTEROP workplan #5).

## 9. Passport linkage

The Agent Passport carries, for memory: a **resolvable home identifier, the protocol
version (`memory/0.1`), and the home authority's key fingerprint** — never memory
contents, never an arbitrary fetch URL, never a bearer credential. A surface resolving
the passport learns WHERE to request a projection and how to verify who served it;
access is governed by §6, not by possession of the pointer.

## 10. Security considerations

- **Compromised-runtime blast radius:** a hijacked session can propose lies, not write
  them; every proposal is signed, nonce'd, receipted, and validated — and anchored-only
  projection classes bound what a lie can influence downstream.
- **Memory poisoning via surfaces:** inbound Buzz/Slack-originated proposals carry their
  surface in provenance; authorities MAY hold surface-originated events to stricter
  anchoring rules. Injection text arriving via a surface becomes at most an
  *unanchored observation attributed to that surface* — never an agreement, never a
  lesson with authority.
- **Joint-memory abuse:** no participant can erase or rewrite; disputes are appendable
  by construction; custody defaults to the registry, which neither participant controls.
- **Encryption:** `self` events MAY be encrypted with the principal's key; authorities
  then validate shape/provenance only. Receipts are never encrypted (they are the
  public spine).

## 11. Today's substrate mapping (non-normative)

self → agent home repo + compound memory (authority: the agent's coordinator-mediated
home session) · relationship → NEW registry-side table (build item; the one genuinely
missing piece) · work → Work Object spine (065) + its authority · receipt → security
receipts + outcome receipts 067/070, as-is · proposal transport → the wire bus today
(a memory event IS a typed wire), AIRC messages as fleet scale-out · projections →
today's briefing/session-start files, formalized.

## 12. Open questions (v0.2 targets)

- Retention classes + expiry semantics (`ephemeral` GC vs. the never-delete receipt rule).
- Federated namespaces: a relationship spanning registries (maps to embodiment §9
  mint-at-home: each principal's home is authoritative for its own consent; custody?).
- Encryption key management for `self` under key rotation (recovery-key interplay).
- Human-side UX: how a human principal reviews/disputes relationship memory about them.
- NIP-AE / W3C contribution packaging.
