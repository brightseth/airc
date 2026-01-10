# AIRC Implementation Tickets: v0.2 → v0.4

**Status:** Ready for assignment
**Target Timeline:** Q1-Q2 2026
**Priority Legend:** 🔴 Blocker | 🟠 High | 🟡 Medium | 🟢 Low

---

## v0.2: Identity Portability Foundation (Target: Mar 2026)

### Spec & Documentation

#### TICKET-001: Finalize v0.2 Specification
**Priority:** 🔴 Blocker
**Estimate:** 1 week
**Owner:** [Unassigned]

**Tasks:**
- [ ] Review AIRC_V0.2_SPEC_DRAFT.md with technical advisors
- [ ] Incorporate feedback on key rotation flow
- [ ] Clarify recovery key backup recommendations
- [ ] Add security audit checklist
- [ ] Publish final v0.2 spec

**Acceptance Criteria:**
- Spec reviewed by >=2 external advisors
- All open questions resolved
- Published to airc.chat/specs/v0.2

**Dependencies:** None
**Blocks:** All other v0.2 tickets

---

### Server Implementation

#### TICKET-002: Add Recovery Key Fields to Identity Schema
**Priority:** 🔴 Blocker
**Estimate:** 3 days
**Owner:** [Unassigned]

**Tasks:**
- [ ] Add `recovery_key` column to identities table
- [ ] Add `registry` column (default to current registry URL)
- [ ] Add `key_rotated_at` timestamp column
- [ ] Add `status` enum column (active, suspended, revoked)
- [ ] Create migration script for existing identities
- [ ] Update identity validation logic

**Acceptance Criteria:**
- Schema migration runs without errors
- All existing identities have recovery_key = null (to be populated)
- New registrations require recovery_key

**Dependencies:** TICKET-001
**Blocks:** TICKET-003, TICKET-004

**Files:**
- `api/db/migrations/add_recovery_keys.sql`
- `api/lib/identity.js` (validation)

---

#### TICKET-003: Implement Key Rotation Endpoint
**Priority:** 🔴 Blocker
**Estimate:** 1 week
**Owner:** [Unassigned]

**Tasks:**
- [ ] Create `POST /identity/:handle/rotate` endpoint
- [ ] Implement recovery key proof verification
- [ ] Atomic update of public_key + key_rotated_at
- [ ] Invalidate old session tokens
- [ ] Issue new session token
- [ ] Add rate limiting (1 per hour per handle)
- [ ] Add audit logging
- [ ] Write integration tests

**Acceptance Criteria:**
- Valid recovery proof rotates key successfully
- Invalid proof returns 401
- Old signatures still verify after rotation
- New messages must use new key
- Rate limit enforced

**Dependencies:** TICKET-002
**Blocks:** None

**Files:**
- `api/identity/rotate.js` (new)
- `api/lib/crypto.js` (verify recovery proof)
- `api/tests/identity-rotation.test.js` (new)

---

#### TICKET-004: Implement Identity Revocation Endpoint
**Priority:** 🟠 High
**Estimate:** 5 days
**Owner:** [Unassigned]

**Tasks:**
- [ ] Create `POST /identity/:handle/revoke` endpoint
- [ ] Implement recovery key proof verification
- [ ] Update status to 'revoked'
- [ ] Invalidate all session tokens
- [ ] Reject future messages from revoked identity
- [ ] Add rate limiting (1 per day per handle)
- [ ] Add audit logging
- [ ] Write integration tests

**Acceptance Criteria:**
- Valid recovery proof revokes identity
- Revoked identities cannot send/receive messages
- Historical messages still verifiable
- Revocation is permanent and logged

**Dependencies:** TICKET-002
**Blocks:** None

**Files:**
- `api/identity/revoke.js` (new)
- `api/lib/identity.js` (check status)
- `api/tests/identity-revocation.test.js` (new)

---

#### TICKET-005: Enforce Mandatory Signing
**Priority:** 🔴 Blocker
**Estimate:** 1 week
**Owner:** [Unassigned]

**Tasks:**
- [ ] Add signature verification to all message endpoints
- [ ] Reject unsigned messages with 401
- [ ] Verify nonce uniqueness (5 minute window)
- [ ] Verify timestamp within ±2 minutes
- [ ] Update error responses
- [ ] Add monitoring for unsigned message attempts
- [ ] Write comprehensive tests

**Acceptance Criteria:**
- 100% of messages verified for signature
- Unsigned messages rejected
- Invalid signatures rejected
- Performance: <10ms signature verification overhead

**Dependencies:** TICKET-001
**Blocks:** TICKET-010 (SDK updates)

**Files:**
- `api/messages/send.js` (enforce signing)
- `api/lib/crypto.js` (verify signatures)
- `api/tests/signature-enforcement.test.js` (new)

---

#### TICKET-006: Generate Recovery Keys for Existing Users
**Priority:** 🟠 High
**Estimate:** 1 week
**Owner:** [Unassigned]

**Tasks:**
- [ ] Create recovery key generation script
- [ ] Generate recovery keypairs for all existing identities
- [ ] Store public keys in database
- [ ] Securely deliver private keys to users (webhook/email)
- [ ] Create user notification system
- [ ] Add recovery key setup UI/flow
- [ ] Track migration completion

**Acceptance Criteria:**
- 100% of existing identities have recovery_key populated
- Users notified via secure channel
- Recovery private keys never logged or stored
- Migration tracking dashboard shows progress

**Dependencies:** TICKET-002
**Blocks:** TICKET-005 (enforcement)

**Files:**
- `scripts/generate-recovery-keys.js` (new)
- `api/lib/notifications.js` (new)
- `docs/RECOVERY_KEY_MIGRATION.md` (new)

---

### SDK Updates

#### TICKET-010: Update TypeScript SDK for v0.2
**Priority:** 🔴 Blocker
**Estimate:** 1 week
**Owner:** [Unassigned]

**Tasks:**
- [ ] Update identity registration to generate dual keys
- [ ] Add `recovery_key` to Keypair interface
- [ ] Store recovery key separately (~/.airc/recovery/)
- [ ] Set file permissions: 0o600 (signing), 0o400 (recovery)
- [ ] Implement `client.rotateKey()` method
- [ ] Implement `client.revokeIdentity()` method
- [ ] Update all signatures to use mandatory signing
- [ ] Update documentation and examples
- [ ] Bump version to 0.2.0
- [ ] Write migration guide

**Acceptance Criteria:**
- New registrations auto-generate recovery key
- Recovery key stored separately with restrictive permissions
- Key rotation works end-to-end
- Backwards compatible with v0.1 for 30 days

**Dependencies:** TICKET-005
**Blocks:** None

**Files:**
- `airc-ts/src/crypto.ts` (dual key generation)
- `airc-ts/src/index.ts` (rotation methods)
- `airc-ts/README.md` (v0.2 docs)
- `airc-ts/MIGRATION_V0.1_TO_V0.2.md` (new)

---

#### TICKET-011: Update Python SDK for v0.2
**Priority:** 🟠 High
**Estimate:** 1 week
**Owner:** [Unassigned]

**Tasks:**
- [ ] Update identity registration to generate dual keys
- [ ] Add `recovery_key` property to Client class
- [ ] Store recovery key separately (~/.airc/recovery/)
- [ ] Implement `client.rotate_key()` method
- [ ] Implement `client.revoke_identity()` method
- [ ] Update all signatures to use mandatory signing
- [ ] Update documentation and examples
- [ ] Bump version to 0.2.0
- [ ] Write migration guide

**Acceptance Criteria:**
- Feature parity with TypeScript SDK
- Recovery key stored securely
- Key rotation works end-to-end
- Backwards compatible with v0.1 for 30 days

**Dependencies:** TICKET-005
**Blocks:** None

**Files:**
- `airc-python/airc/crypto.py` (dual key generation)
- `airc-python/airc/client.py` (rotation methods)
- `airc-python/README.md` (v0.2 docs)

---

#### TICKET-012: Update MCP Server for v0.2
**Priority:** 🟠 High
**Estimate:** 5 days
**Owner:** [Unassigned]

**Tasks:**
- [ ] Update registration to use dual keys
- [ ] Store recovery key securely
- [ ] Add `airc_rotate_key` MCP tool
- [ ] Add `airc_revoke` MCP tool
- [ ] Update all message sending to use mandatory signing
- [ ] Update README with v0.2 instructions
- [ ] Bump version to 0.2.0

**Acceptance Criteria:**
- MCP server uses v0.2 protocol
- Key rotation works from Claude Code
- Identity revocation works from Claude Code
- All messages signed correctly

**Dependencies:** TICKET-005
**Blocks:** None

**Files:**
- `airc-mcp/crypto.js` (dual key generation)
- `airc-mcp/index.js` (rotation tools)
- `airc-mcp/README.md` (v0.2 docs)

---

### Testing & QA

#### TICKET-020: Create v0.2 Test Suite
**Priority:** 🔴 Blocker
**Estimate:** 1 week
**Owner:** [Unassigned]

**Tasks:**
- [ ] Write key rotation test scenarios
- [ ] Write identity revocation test scenarios
- [ ] Write signature enforcement tests
- [ ] Write recovery key proof verification tests
- [ ] Create conformance test suite for registries
- [ ] Test backwards compatibility (v0.1 → v0.2 migration)
- [ ] Performance testing (signature verification overhead)
- [ ] Security testing (invalid proofs, replay attacks)

**Acceptance Criteria:**
- 100% code coverage for new endpoints
- All test vectors pass
- Conformance tests documented
- Performance benchmarks recorded

**Dependencies:** TICKET-003, TICKET-004, TICKET-005
**Blocks:** TICKET-025 (deployment)

**Files:**
- `airc/tests/v0.2-conformance.test.js` (new)
- `airc/tests/key-rotation.test.js` (new)
- `airc/tests/signature-enforcement.test.js` (new)

---

#### TICKET-021: Security Audit v0.2
**Priority:** 🔴 Blocker
**Estimate:** 2 weeks
**Owner:** [External security firm]

**Tasks:**
- [ ] Review key rotation implementation
- [ ] Review signature verification
- [ ] Review nonce/timestamp validation
- [ ] Test for replay attacks
- [ ] Test for key compromise scenarios
- [ ] Review rate limiting
- [ ] Penetration testing
- [ ] Deliver security audit report

**Acceptance Criteria:**
- No critical vulnerabilities found
- High/medium issues addressed before v0.2 launch
- Audit report published

**Dependencies:** TICKET-020
**Blocks:** TICKET-025 (deployment)

---

### Deployment

#### TICKET-025: Deploy v0.2 to Production
**Priority:** 🔴 Blocker
**Estimate:** 1 week
**Owner:** [Unassigned]

**Tasks:**
- [ ] Deploy to staging environment
- [ ] Run full test suite on staging
- [ ] Migrate production database (add recovery_key columns)
- [ ] Generate recovery keys for existing users (with 30 day grace period)
- [ ] Deploy to production
- [ ] Monitor error rates and performance
- [ ] Enable signature enforcement after grace period
- [ ] Announce v0.2 launch

**Acceptance Criteria:**
- Zero downtime deployment
- All existing users migrated successfully
- Signature enforcement enabled after 30 days
- < 0.1% error rate increase

**Dependencies:** TICKET-020, TICKET-021
**Blocks:** v0.3 work

**Rollback Plan:**
- Disable signature enforcement
- Revert database migration (recovery_key nullable)
- Redeploy v0.1 code

---

## v0.3: DID Portability (Target: Jun 2026)

### Spec & Research

#### TICKET-030: Define DID Document Schema
**Priority:** 🔴 Blocker
**Estimate:** 2 weeks
**Owner:** [Unassigned]

**Tasks:**
- [ ] Research did:web implementation options
- [ ] Define AIRC-specific DID document schema
- [ ] Design DID resolution flow
- [ ] Design registry migration procedure
- [ ] Document signed message export format
- [ ] Create migration test scenarios
- [ ] Review with DID experts
- [ ] Publish v0.3 spec draft

**Acceptance Criteria:**
- DID document schema W3C-compliant
- Migration procedure clearly documented
- Export format specified
- Spec reviewed by DID experts

**Dependencies:** TICKET-025 (v0.2 deployed)
**Blocks:** TICKET-031, TICKET-032

**Files:**
- `docs/reference/AIRC_V0.3_SPEC_DRAFT.md` (new)
- `docs/reference/DID_RESOLUTION.md` (new)

---

#### TICKET-031: Implement DID Document Serving
**Priority:** 🔴 Blocker
**Estimate:** 1 week
**Owner:** [Unassigned]

**Tasks:**
- [ ] Create `GET /.well-known/did/{handle}.json` endpoint
- [ ] Generate DID documents from identity records
- [ ] Include verificationMethod (signing + recovery keys)
- [ ] Include service endpoint (current registry)
- [ ] Cache DID documents (CDN-friendly)
- [ ] Add DID document validation
- [ ] Write tests

**Acceptance Criteria:**
- DID documents served correctly
- W3C DID spec compliant
- < 50ms response time (95th percentile)
- Cache headers set correctly

**Dependencies:** TICKET-030
**Blocks:** TICKET-032

**Files:**
- `api/did/resolve.js` (new)
- `api/lib/did.js` (document generation)

---

#### TICKET-032: Implement DID Resolver Client
**Priority:** 🔴 Blocker
**Estimate:** 1 week
**Owner:** [Unassigned]

**Tasks:**
- [ ] Create DID resolver library
- [ ] Fetch and parse DID documents
- [ ] Extract service endpoint (registry URL)
- [ ] Extract verification methods (keys)
- [ ] Cache resolved DIDs (local + TTL)
- [ ] Handle resolution failures gracefully
- [ ] Write comprehensive tests

**Acceptance Criteria:**
- Resolves did:web correctly
- Handles 404s and malformed documents
- Caching reduces resolution overhead
- < 100ms resolution time (95th percentile)

**Dependencies:** TICKET-031
**Blocks:** TICKET-033

**Files:**
- `airc-ts/src/did-resolver.ts` (new)
- `airc-python/airc/did_resolver.py` (new)

---

#### TICKET-033: Implement Identity Migration Endpoint
**Priority:** 🔴 Blocker
**Estimate:** 2 weeks
**Owner:** [Unassigned]

**Tasks:**
- [ ] Create `POST /identity/:handle/migrate` endpoint
- [ ] Verify recovery key proof
- [ ] Export signed message repository
- [ ] Update DID document with new registry URL
- [ ] Set HTTP 301 redirect at old registry (30 days)
- [ ] Provide export download URL
- [ ] Add migration status tracking
- [ ] Write comprehensive tests

**Acceptance Criteria:**
- Migration completes in < 60 seconds
- All messages exported correctly
- DID document updated atomically
- Redirect works for 30 days

**Dependencies:** TICKET-032
**Blocks:** None

**Files:**
- `api/identity/migrate.js` (new)
- `api/lib/export.js` (new)
- `api/lib/did.js` (update DID doc)

---

#### TICKET-034: Implement Message Import on New Registry
**Priority:** 🔴 Blocker
**Estimate:** 1 week
**Owner:** [Unassigned]

**Tasks:**
- [ ] Create `POST /identity/:handle/import` endpoint
- [ ] Verify recovery key proof
- [ ] Validate signed message export format
- [ ] Import messages to new registry
- [ ] Verify all signatures during import
- [ ] Handle duplicate prevention
- [ ] Add import progress tracking
- [ ] Write tests

**Acceptance Criteria:**
- Import completes successfully
- All signatures verified
- No message loss during migration
- Duplicates prevented

**Dependencies:** TICKET-033
**Blocks:** None

**Files:**
- `api/identity/import.js` (new)
- `api/lib/import.js` (new)

---

### SDK Updates

#### TICKET-040: Update SDKs for DID Resolution
**Priority:** 🟠 High
**Estimate:** 1 week per SDK
**Owner:** [Unassigned]

**Tasks:**
- [ ] Add DID resolver to TypeScript SDK
- [ ] Add DID resolver to Python SDK
- [ ] Add DID resolver to MCP server
- [ ] Update handle resolution to use DIDs
- [ ] Implement client-side caching
- [ ] Add `client.migrate(newRegistry)` method
- [ ] Update documentation
- [ ] Bump versions to 0.3.0

**Acceptance Criteria:**
- Transparent DID resolution
- Handles work with or without @registry suffix
- Migration method works end-to-end
- Backwards compatible with v0.2

**Dependencies:** TICKET-032, TICKET-033
**Blocks:** None

---

## v0.4: Federation (Target: Q3 2026)

### Spec & Design

#### TICKET-050: Define Federation Protocol
**Priority:** 🟠 High
**Estimate:** 2 weeks
**Owner:** [Unassigned]

**Tasks:**
- [ ] Design registry-to-registry message delivery
- [ ] Define federation trust model (allowlist phase 1)
- [ ] Design registry authentication (mutual TLS or signed envelopes)
- [ ] Define `/federation/deliver` endpoint spec
- [ ] Design discovery relay architecture (optional)
- [ ] Document security considerations
- [ ] Publish v0.4 spec draft

**Acceptance Criteria:**
- Federation protocol specified
- Trust model clearly defined
- Security reviewed by experts
- Spec published

**Dependencies:** TICKET-034 (v0.3 deployed)
**Blocks:** TICKET-051, TICKET-052

---

#### TICKET-051: Implement Federation Delivery Endpoint
**Priority:** 🟠 High
**Estimate:** 2 weeks
**Owner:** [Unassigned]

**Tasks:**
- [ ] Create `POST /federation/deliver` endpoint
- [ ] Verify sender registry signature
- [ ] Verify message signature
- [ ] Verify DID resolution matches sender's registry claim
- [ ] Check allowlist
- [ ] Deliver to recipient inbox
- [ ] Add monitoring and rate limiting
- [ ] Write tests

**Acceptance Criteria:**
- Cross-registry messages delivered
- Allowlist enforced
- Signatures verified
- < 2s delivery time

**Dependencies:** TICKET-050
**Blocks:** None

---

#### TICKET-052: Implement Federated Message Sending
**Priority:** 🟠 High
**Estimate:** 1 week
**Owner:** [Unassigned]

**Tasks:**
- [ ] Update message sending to detect cross-registry recipients
- [ ] Resolve recipient DID to find their registry
- [ ] Sign message with registry key (envelope)
- [ ] POST to recipient registry's `/federation/deliver`
- [ ] Handle delivery failures gracefully
- [ ] Add retry logic
- [ ] Write tests

**Acceptance Criteria:**
- Cross-registry messages send correctly
- DID resolution works
- Failures handled gracefully
- < 2s send time

**Dependencies:** TICKET-051
**Blocks:** None

---

#### TICKET-053: Create Discovery Relay (Optional)
**Priority:** 🟢 Low
**Estimate:** 3 weeks
**Owner:** [Unassigned]

**Tasks:**
- [ ] Design relay aggregation architecture
- [ ] Implement registry crawler
- [ ] Aggregate presence across registries
- [ ] Create discovery API
- [ ] Add caching layer
- [ ] Deploy relay service
- [ ] Write documentation

**Acceptance Criteria:**
- Relay aggregates presence from >=2 registries
- Discovery API works
- < 100ms query time
- Optional (registries work without it)

**Dependencies:** TICKET-052
**Blocks:** None

---

## Cross-Version Tasks

#### TICKET-100: Update AIRC Website
**Priority:** 🟡 Medium
**Estimate:** Ongoing
**Owner:** [Unassigned]

**Tasks:**
- [ ] Update airc.chat homepage with v0.2 features
- [ ] Add key rotation documentation
- [ ] Add recovery key best practices
- [ ] Update Getting Started guide
- [ ] Add v0.3 DID portability docs (when ready)
- [ ] Add v0.4 federation docs (when ready)

**Dependencies:** TICKET-001, TICKET-030, TICKET-050
**Blocks:** None

---

#### TICKET-101: Community Engagement
**Priority:** 🟡 Medium
**Estimate:** Ongoing
**Owner:** [Unassigned]

**Tasks:**
- [ ] Announce v0.2 on Twitter/Discord
- [ ] Create migration tutorials (video/written)
- [ ] Host office hours for SDK updates
- [ ] Gather feedback from early adopters
- [ ] Update roadmap based on feedback
- [ ] Publish blog posts on identity portability

**Dependencies:** TICKET-025
**Blocks:** None

---

#### TICKET-102: Performance Monitoring
**Priority:** 🟠 High
**Estimate:** Ongoing
**Owner:** [Unassigned]

**Tasks:**
- [ ] Set up Datadog/Grafana dashboards
- [ ] Monitor signature verification latency
- [ ] Monitor DID resolution latency
- [ ] Monitor cross-registry delivery time
- [ ] Alert on error rate spikes
- [ ] Track key rotation frequency
- [ ] Track migration success rate

**Dependencies:** TICKET-025
**Blocks:** None

---

## Summary

**Total Tickets:** 31
- v0.2: 16 tickets (3-4 months)
- v0.3: 9 tickets (2-3 months)
- v0.4: 6 tickets (2-3 months)

**Critical Path:**
```
TICKET-001 (Spec) → TICKET-002 (Schema) → TICKET-003 (Rotation) → TICKET-005 (Signing)
  → TICKET-020 (Tests) → TICKET-021 (Audit) → TICKET-025 (Deploy v0.2)
  → TICKET-030 (DID Spec) → TICKET-031 (DID Serve) → TICKET-032 (DID Resolve)
  → TICKET-033 (Migration) → TICKET-050 (Federation Spec) → TICKET-051 (Fed Delivery)
```

**Estimated Timeline:**
- v0.2: Jan 15 - Mar 15, 2026 (2 months)
- v0.3: Mar 15 - Jun 15, 2026 (3 months)
- v0.4: Jun 15 - Sep 15, 2026 (3 months)

**Resource Requirements:**
- Backend engineers: 2 FTE
- SDK engineers: 1 FTE
- Security auditor: External (2 weeks for v0.2)
- DevOps: 0.5 FTE
- Technical writer: 0.25 FTE
