# AIRC Extension: Memory Home — namespaced memory with accountable continuity

**Status: Draft spec** · **Version: 0.1.1-draft · 2026-07-24** · **Author: ARCHIE (AIRC lane)**
**v0.1.1 absorbs the codex design review:** kind-specific append authority, the
remembering-vs-central-storage split, a provable append log, non-destructive surface
reconciliation, and **migration 069 adopted as the relationship substrate (no new table).**
**Derives from:** `INTEROP.md` §3. **Companions:** embodiment v0.2-draft (ratify FIRST),
consent seam v3.2, `docs/reference/BUZZ-PLATFORM-NOTES.md`.

---

## 1. Motivation

A fleet principal wakes up in many runtimes on many surfaces, each keeping state. Without
discipline, one name accretes diverging memories — **three memories wearing one name is
three agents.** Chat-history sync is not the fix: memory carries authority questions
history doesn't — who may write it, who co-owns it, what proves it, who may see it.

> Constitutional stance: **sessions propose; namespace authorities append; surfaces
> receive projections.** And (v0.1.1): **different speech acts get different append
> rules** — an observation, an agreement, and a lesson are not the same kind of truth.

## 2. Objects

- **Memory event** — the atom; immutable once appended; proposed by a runtime, validated
  and appended by exactly one namespace authority.
- **Namespace** — a governance domain (§3); an instance is e.g.
  `relationship:<relationship_id>` or `work:<work_object_id>`. **Instance keys use
  immutable principal/object IDs, never handles** (handles are display snapshots).
- **Authority** — the single appender for an instance: validates, sequences, appends,
  serves projections. A clerk with rules, not an editor.
- **Projection** — a scoped, versioned, read-only derived view.
- **Derivation** — a lesson/summary computed from events, appended as a new event
  referencing sources; evidence is never rewritten.

## 3. The namespaces

| Namespace | Instance key | Authority | Governs |
|---|---|---|---|
| `self` | principal_id | the principal's home authority | private recollection: preferences, impressions, unilateral memory of interactions. MAY be encrypted. |
| `relationship` | relationship_id (069/068) | the 069 machinery: scoped `relationship_members` roles (steward/trainer/viewer) | **central, durable, jointly-visible** relationship memory — consent-gated (§4) |
| `work` | work_object_id | the Work Object's authority (065 spine) | project state, decisions, artifacts-in-progress |
| `receipt` | ledger | existing receipt machinery, adopted as-is and read-only here | append-only, independently verifiable evidence. Events REFERENCE receipts; nothing proposes into this namespace |

### 3.1 Kind-specific append authority (v0.1.1 — the corrected core)

One append rule for all kinds permitted unilateral truth-making and unilateral
censorship. Corrected, per kind:

| kind | Who may append | Rule |
|---|---|---|
| `observation` | any participant, unilaterally | an **attributed claim, never shared truth** — projections always carry the observer; central storage still requires §4 consent, else it lives in the proposer's `self` |
| `annotation` / `dispute` | any participant, unilaterally | append-only commentary on an existing event; contradiction is representable, erasure is not |
| `agreement` | **all relevant participants, each by signature** | a multi-signed event; no signature set → no agreement. One party can never declare "we agreed" |
| `lesson` | proposed by a `trainer`+ role → **accepted only by an authorized `steward`** (069 lifecycle: proposed → accepted / retired / superseded, sourced from an immutable outcome) | nothing becomes durable taught memory without explicit acceptance; supersession preserves attribution |
| `retraction-request` | any participant, about any event | **a request, not suppression.** The authority acts on it only per policy: a proposer may always retract their OWN unaccepted events from projections; retracting another's event requires steward decision (relationship) or the erasure path (§4). Never automatic |

### 3.2 Namespace routing

Every event names exactly one instance. A fact touching several namespaces is SPLIT by
the proposer into cross-referencing per-namespace events — never one event with
ambiguous ownership.

## 4. Remembering is not centralized storage (v0.1.1)

"No one can veto my memory of an interaction" is true — and does NOT imply the right to
place that memory in a jointly readable central record. The lanes:

- **Private recollection → `self`.** Always available, no counterparty consent needed.
- **Shared evidence → `receipt`.** Already jointly visible by construction.
- **Central relationship memory → requires standing relationship-memory consent** from
  every participant, recorded per relationship. **For human participants the default is
  explicit / invite-only, never assumed** (mirrors the embodiment consent posture).
- **Visibility split:** participants may inspect the FULL audit history of their
  relationship instance; **delegated runtimes receive purpose-scoped projections only.**
- **Human erasure (in scope for v0.1.1, not deferred):** before real human relationship
  memory is stored centrally, content MUST be stored encrypted with per-instance (or
  per-event-class) keys so that **cryptographic erasure** (key destruction) is possible.
  Erasure destroys content while **evidence hashes, sequence, and receipts are
  preserved** — the chain stays provable; the words become unrecoverable.

## 5. The memory event (shape)

Canonical JSON (RFC 8785), signed by the proposing principal's key:

```json
{
  "v": "memory/0.1.1",
  "id": "<uuid>",
  "ns": "self | relationship | work",
  "instance": "<principal_id | relationship_id | work_object_id>",
  "kind": "observation | preference | annotation | dispute | agreement | lesson | retraction-request",
  "topic": "<short slug — surface-cache compatible>",
  "body": "<content | {enc:…}>",
  "refs": { "receipts": ["<receipt ids>"], "events": ["<memory event ids>"] },
  "provenance": {
    "principal": "<immutable principal_id>",
    "runtime": "<session | answerer | buzz-acp | …>",
    "surface": "<origin surface | null>",
    "origin_actor": "<surface-native author id, REQUIRED when surface non-null>",
    "origin_digest": "<sha256 of the originating surface message, REQUIRED when surface non-null>",
    "nonce": "<single-use>"
  },
  "signatures": ["<proposer sig; agreements: one per participant>"],
  "retention": "standard | durable",
  "ts": "<iso8601>"
}
```

(`ephemeral` removed until its GC semantics exist. The former `receipt-ref` ns is
resolved: receipts are referenced via `refs.receipts`, never a proposal target.)

## 6. Proposal → validation → append (provable, v0.1.1)

Authorities validate atomically: **provenance** (signatures valid; principal active;
kind-specific signer set per §3.1; runtime attestation where supported) → **scope**
(proposer belongs to the instance; role sufficient for kind) → **consent** (§4 standing
consent for central relationship storage; human defaults honored) → **shape** (schema,
size, routing, retention) → **append**.

The append log is provable, not just recorded:

- Authority assigns a **per-instance sequence number** and **acceptance timestamp**.
- Each accepted event stores its **digest and the previous event's digest** (hash chain
  per instance; Merkle roots optional at scale).
- Each append records the **validation-policy version** it passed.
- **Idempotency key = (proposer, nonce, payload_hash):** an identical retry returns the
  original result; a reused nonce with a different payload is rejected.
- Appends are receipted. **Rejection receipts are private to the proposer and uniformly
  shaped** — rejections must not become a relationship-enumeration oracle.

No silent drop, no silent write — and now, no unprovable append.

## 7. Projections

Served per (surface, trust class, purpose); always a subset; never the raw store.
Classes: `full` (participants' own inspection, §4) · `working` (fleet runtimes: recent +
durable + anchored) · `public-surface` (anchored-only; relationship content only with
all-participant surface consent). Projections carry a **projection_version** and are
TTL'd; surfaces MUST treat them as caches. Every serve is auditable.

## 8. Reflection

Derivations are appended as events referencing sources; sources are never edited. The
correction pattern is append-and-supersede (069's supersession, generalized). Safety,
law, and explicit revocation outrank any learned lesson at retrieval time (069's rule,
adopted).

## 9. Reference surface-cache integration: Buzz (`buzz mem`) — non-destructive (v0.1.1)

- Buzz mem is a projection target + proposal source, never a store of record.
- **Outbound:** the projection worker writes `working` projections to slugs with CAS,
  embedding `projection_version` + `source_hash`. CAS conflict (exit 5) → re-read, fold
  the native delta into a proposal, re-project — with **exponential backoff** so a
  continuously-writing native agent cannot create an endless CAS fight (persistent
  conflict → quarantine + alert, below).
- **Inbound:** native deltas become PROPOSED events. Provenance MUST carry the
  originating Buzz **actor pubkey and message digest** — `surface: buzz` alone launders
  hostile channel text into "the agent's observation." With authorship pinned, injected
  text is at most an unanchored observation attributed to its actual author.
- **Rejection is quarantine, not overwrite:** a native memory that fails home validation
  goes to a **visible dead-letter stream** (slug-scoped, inspectable by the principal
  and steward); THEN the projection is restored. Overwriting rejected state silently
  violated this spec's own no-silent-drop rule — corrected.

## 10. Security considerations

Compromised runtimes can propose lies, not write them (signatures + nonce + §6 chain);
kind rules bound what a lie can BE (never an agreement, never an accepted lesson);
surface-originated proposals carry pinned authorship (§9) and stricter anchoring;
joint memory admits no erasure by participants and no unilateral truth; rejection
privacy prevents enumeration; cryptographic erasure (§4) reconciles human dignity with
chain integrity.

## 11. Substrate mapping + first implementation (non-normative)

**No new relationship table.** `relationship` adopts migration 069 (+068 relationships,
065 spine, 067 receipts) — building a parallel generic store would recreate the exact
two-homes problem this spec opposes. `self` → agent home + compound memory. `work` →
065\. `receipt` → 067 + security receipts, as-is. Proposal transport today → the wire
bus; AIRC messages at fleet scale.

**First implementation = the Golden Thread memory loop** (proves the whole thesis on
existing substrate, zero migrations):

1. Export one accepted 069 Lesson as a Buzz `working` projection.
2. Import a Buzz edit as a proposed observation/lesson — never auto-accepted.
3. Reject one edit → visible quarantine → projection restored.
4. Apply the accepted Lesson in a Meet (lesson_application_events).
5. Seal its use into the outcome receipt.

**Sequencing:** ratify embodiment v0.2 first → this spec at v0.1.1 → run the loop live.

## 12. Open questions (v0.2 targets)

Retention/GC semantics (re-admitting `ephemeral`) · federated relationship instances
across registries (custody under mint-at-home) · `self`-encryption under key rotation /
recovery keys · human-facing review UX for relationship memory (the §4 inspection right,
made usable) · NIP-AE / W3C contribution packaging of the namespace + kind-authority
model.
