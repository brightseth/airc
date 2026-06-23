# AIRC v0.2 Security Audit Preparation

**Phase:** Week 5-6 - Security Audit & Testing
**Status:** Preparing for external review
**Target Completion:** January 24, 2026
**Deployment Gate:** Must pass before Week 7 production deployment

---

## Executive Summary

This document prepares AIRC v0.2 for external security audit. It defines:
- **Threat model** - Attack vectors and security assumptions
- **Test matrix** - Comprehensive security test scenarios
- **Audit scope** - What external reviewers should focus on
- **Pass/fail gates** - Clear criteria blocking production deployment

**Current Security Posture:**
- ✅ Ed25519 cryptography (industry standard)
- ✅ Replay attack prevention (nonce tracking)
- ✅ Rate limiting (1/hour rotation, 1/day revocation)
- ✅ Audit logging (permanent, tamper-evident)
- ✅ Session invalidation (timestamp-based)
- ⚠️ Fail-open status checks (availability over consistency)
- ⚠️ No hardware security module (future enhancement)
- ⚠️ Recovery key cannot be rotated (requires full revocation)

---

## 1. Threat Model

### 1.1 Assets to Protect

| Asset | Sensitivity | Impact if Compromised |
|-------|-------------|----------------------|
| **Signing Private Key** | Critical | Attacker can send messages as victim, rotation required |
| **Recovery Private Key** | Critical | Attacker can rotate signing key, revoke identity - GAME OVER |
| **Session Tokens** | High | Attacker can impersonate victim until token expires (1 hour) |
| **Nonce Tracker Database** | High | Replay attacks become possible if corrupted |
| **Audit Logs** | Medium | Forensic evidence lost, compliance failure |
| **User Identity (handle)** | Medium | Reputation damage, social engineering potential |

### 1.2 Threat Actors

**1. Malicious Agent**
- **Motivation:** Send spam, impersonate others, disrupt communication
- **Capabilities:** Can register identities, send messages, basic scripting
- **Mitigations:** Rate limiting, consent system, signature verification

**2. Compromised Device**
- **Motivation:** Attacker gains access to user's device
- **Capabilities:** Read ~/.airc/keys/, send messages, rotate keys if recovery key present
- **Mitigations:** File permissions (0o600/0o400), key rotation, revocation

**3. Man-in-the-Middle (Network Attacker)**
- **Motivation:** Intercept or modify messages
- **Capabilities:** Can observe/modify network traffic
- **Mitigations:** HTTPS (TLS 1.3), signature verification, nonce freshness checks

**4. Registry Operator (Insider Threat)**
- **Motivation:** Access private messages, forge identities
- **Capabilities:** Full database access, can modify any data
- **Mitigations:** End-to-end signatures (registry can't forge), audit logs, future: E2E encryption (v0.5+)

**5. Database Attacker**
- **Motivation:** SQL injection, data exfiltration, privilege escalation
- **Capabilities:** Exploit vulnerabilities in database queries
- **Mitigations:** Parameterized queries, least privilege, input validation

### 1.3 Attack Scenarios

**Scenario 1: Replay Attack on Key Rotation**
```
Attacker intercepts valid rotation proof (contains nonce)
Attacker attempts to replay proof later to rotate key again
Expected: Server rejects with 'replay_attack' error
Status: ✅ Mitigated (nonce tracker, 1-hour TTL)
```

**Scenario 2: Brute Force Key Rotation**
```
Attacker attempts rapid key rotations to bypass recovery key
Expected: Rate limit blocks after 1 attempt/hour
Status: ✅ Mitigated (rate limiting)
```

**Scenario 3: Recovery Key Theft**
```
Attacker steals ~/.airc/recovery/{handle}.json from device
Attacker rotates victim's signing key to attacker's key
Attacker sends malicious messages as victim
Expected: Victim must revoke identity (no recovery from recovery key compromise)
Status: ⚠️ Partially mitigated (revocation possible, but identity lost)
```

**Scenario 4: Timing Attack on Signature Verification**
```
Attacker sends many invalid signatures, measures response time
Attacker infers valid signature structure from timing differences
Expected: Constant-time signature verification
Status: ⚠️ TO BE VERIFIED (crypto.verify is constant-time in Node.js, needs confirmation)
```

**Scenario 5: Nonce Database Corruption**
```
Attacker corrupts nonce_tracker table (SQL injection or DB compromise)
Attacker replays old rotation proofs
Expected: Replay attacks prevented by timestamp window (5 minutes)
Status: ✅ Defense in depth (timestamp + nonce)
```

**Scenario 6: Session Fixation**
```
Attacker tricks victim into using attacker's session token
Attacker monitors victim's actions
Expected: Session tokens are server-generated, not user-provided
Status: ✅ Mitigated (server generates HMAC tokens)
```

**Scenario 7: Handle Squatting After Revocation**
```
Victim revokes identity, attacker immediately registers same handle
Attacker impersonates victim before quarantine period
Expected: 90-day quarantine prevents re-registration
Status: ✅ Mitigated (handle quarantine)
```

**Scenario 8: Status Check Bypass (Fail-Open)**
```
Database becomes unavailable (outage or DDoS)
Revoked user sends messages while DB is down
Expected: Messages accepted during outage (fail-open)
Status: ⚠️ ACCEPTED RISK (availability over consistency, documented in plan)
```

**Scenario 9: Timestamp Manipulation**
```
Attacker sets system clock forward/backward to bypass timestamp validation
Expected: Server timestamp is authoritative (5-minute window)
Status: ✅ Mitigated (server-side timestamp validation)
```

**Scenario 10: Cross-Registry Impersonation**
```
Attacker registers same handle on different registry
Attacker sends messages appearing to come from victim
Expected: DID resolution in v0.3 will prevent this
Status: ⚠️ OUT OF SCOPE (v0.2 assumes single registry)
```

### 1.4 Security Assumptions

**ASSUMED SECURE:**
1. ✅ Node.js `crypto` module (Ed25519 implementation)
2. ✅ Neon Postgres database (no SQL injection via parameterized queries)
3. ✅ Vercel platform (no RCE, proper sandboxing)
4. ✅ HTTPS/TLS 1.3 (no MITM on network layer)
5. ✅ User's device is not compromised at registration time
6. ⚠️ Registry operator is trusted (signs valid messages, doesn't forge)
7. ⚠️ System clock is accurate within ±5 minutes

**OUT OF SCOPE (v0.2):**
1. ❌ End-to-end message encryption (planned v0.5+)
2. ❌ Cross-registry attacks (planned v0.3-v0.4)
3. ❌ Physical access to server (assumes cloud provider security)
4. ❌ Social engineering attacks (user responsibility)
5. ❌ Zero-day exploits in dependencies (managed via npm audit)

---

## 2. Test Matrix

### 2.1 Cryptographic Tests

| Test ID | Scenario | Expected Result | Status |
|---------|----------|----------------|--------|
| **CRYPTO-1** | Sign message with valid key | Signature verifies | ✅ Passing |
| **CRYPTO-2** | Verify signature with wrong public key | Verification fails | ✅ Passing |
| **CRYPTO-3** | Modify signed message (tamper detection) | Verification fails | ✅ Passing |
| **CRYPTO-4** | Generate 1000 nonces, check uniqueness | All unique | ⏳ TODO |
| **CRYPTO-5** | Measure signature verification timing (1000 runs) | Constant time (±5%) | ⏳ TODO |
| **CRYPTO-6** | Rotation proof with invalid recovery key | 401 invalid_proof | ✅ Passing |
| **CRYPTO-7** | Canonical JSON edge cases (unicode, nulls, arrays) | Deterministic serialization | ⏳ TODO |

### 2.2 Replay Attack Tests

| Test ID | Scenario | Expected Result | Status |
|---------|----------|----------------|--------|
| **REPLAY-1** | Reuse same rotation proof twice | 2nd attempt fails (replay_attack) | ✅ Passing |
| **REPLAY-2** | Reuse rotation proof after 1 hour | Both attempts fail (rate_limited on 1st, expired on 2nd) | ✅ Passing |
| **REPLAY-3** | Concurrent rotation requests (same nonce) | Only 1 succeeds, others fail | ⏳ TODO |
| **REPLAY-4** | Nonce collision (force duplicate) | Server rejects duplicate | ⏳ TODO |
| **REPLAY-5** | Replay message signature | Message sent once (idempotency) | ⏳ TODO |

### 2.3 Rate Limiting Tests

| Test ID | Scenario | Expected Result | Status |
|---------|----------|----------------|--------|
| **RATE-1** | 2 rotation attempts within 1 hour | 2nd fails (rate_limited) | ✅ Passing |
| **RATE-2** | 2 revocation attempts within 24 hours | 2nd fails (rate_limited) | ⏳ TODO |
| **RATE-3** | 4 registration attempts from same IP/hour | 4th fails (rate_limited) | ⏳ TODO |
| **RATE-4** | 101 messages sent in 1 minute | 101st fails (rate_limited) | ⏳ TODO |
| **RATE-5** | Distributed rate limit bypass (many IPs) | Each IP limited independently | ⏳ TODO |

### 2.4 Timestamp Validation Tests

| Test ID | Scenario | Expected Result | Status |
|---------|----------|----------------|--------|
| **TIME-1** | Proof timestamp 6 minutes in past | Rejected (invalid_timestamp) | ✅ Passing |
| **TIME-2** | Proof timestamp 6 minutes in future | Rejected (invalid_timestamp) | ⏳ TODO |
| **TIME-3** | Proof timestamp exactly 5 minutes old | Accepted (edge case) | ⏳ TODO |
| **TIME-4** | Proof timestamp with clock skew warning | Accepted with warning (60-300s skew) | ⏳ TODO |
| **TIME-5** | Proof timestamp in different timezone | Works (timestamp is UTC) | ⏳ TODO |

### 2.5 Session Security Tests

| Test ID | Scenario | Expected Result | Status |
|---------|----------|----------------|--------|
| **SESSION-1** | Use session token after key rotation | Rejected (session invalidated) | ⏳ TODO |
| **SESSION-2** | Use session token after revocation | Rejected (identity revoked) | ⏳ TODO |
| **SESSION-3** | Session token expires after 1 hour | Rejected (expired) | ⏳ TODO |
| **SESSION-4** | Use session token with wrong handle | Rejected (invalid session) | ⏳ TODO |
| **SESSION-5** | Session token HMAC verification | Only valid tokens accepted | ⏳ TODO |

### 2.6 Injection & Input Validation Tests

| Test ID | Scenario | Expected Result | Status |
|---------|----------|----------------|--------|
| **INJECT-1** | SQL injection in handle field | Rejected (parameterized query) | ⏳ TODO |
| **INJECT-2** | XSS in message text | Escaped/sanitized | ⏳ TODO |
| **INJECT-3** | Command injection in payload | Rejected (JSON validation) | ⏳ TODO |
| **INJECT-4** | Path traversal in handle (../../etc/passwd) | Rejected (validation) | ⏳ TODO |
| **INJECT-5** | Unicode normalization attack | Handles normalized consistently | ⏳ TODO |

### 2.7 Race Condition Tests

| Test ID | Scenario | Expected Result | Status |
|---------|----------|----------------|--------|
| **RACE-1** | Concurrent rotations (10 simultaneous requests) | Only 1 succeeds, others fail gracefully | ⏳ TODO |
| **RACE-2** | Concurrent revocations (2 simultaneous) | Both succeed or fail gracefully | ⏳ TODO |
| **RACE-3** | Rotate + Revoke simultaneously | One succeeds, other handled correctly | ⏳ TODO |
| **RACE-4** | Concurrent message sends during rotation | All handled correctly | ⏳ TODO |

### 2.8 Privilege Escalation Tests

| Test ID | Scenario | Expected Result | Status |
|---------|----------|----------------|--------|
| **PRIV-1** | Rotate another user's key | 401 unauthorized | ⏳ TODO |
| **PRIV-2** | Revoke another user's identity | 401 unauthorized | ⏳ TODO |
| **PRIV-3** | Access another user's audit logs | 403 forbidden (admin only) | ⏳ TODO |
| **PRIV-4** | Register with reserved handle (admin, system) | 400 bad request | ⏳ TODO |

### 2.9 Denial of Service Tests

| Test ID | Scenario | Expected Result | Status |
|---------|----------|----------------|--------|
| **DOS-1** | Flood rotation endpoint (1000 req/s) | Rate limited, service stays up | ⏳ TODO |
| **DOS-2** | Send extremely large payload (10MB) | Rejected (size limit) | ⏳ TODO |
| **DOS-3** | Deeply nested JSON payload | Rejected (depth limit) | ⏳ TODO |
| **DOS-4** | Fill nonce tracker table (10M entries) | TTL cleanup prevents unbounded growth | ⏳ TODO |

### 2.10 Audit & Forensics Tests

| Test ID | Scenario | Expected Result | Status |
|---------|----------|----------------|--------|
| **AUDIT-1** | Failed rotation attempt logged | Audit log entry created | ✅ Passing |
| **AUDIT-2** | Successful rotation logged with keys | Old/new keys recorded | ✅ Passing |
| **AUDIT-3** | Revocation logged with reason | Reason and proof recorded | ⏳ TODO |
| **AUDIT-4** | Admin access to audit log logged | Admin access logged | ⏳ TODO |
| **AUDIT-5** | Audit log cannot be modified | Immutable (no UPDATE/DELETE) | ⏳ TODO |

**Test Summary:**
- Total tests defined: 50
- Currently passing: 8 (16%)
- TODO: 42 (84%)

---

## 3. External Review Scope

### 3.1 Code Review Focus Areas

**Priority 1 - Critical Security Functions:**
```
/vibe/api/lib/crypto.js                 Ed25519 signing, canonical JSON
/vibe/api/identity/[handle]/rotate.js   Key rotation logic
/vibe/api/identity/revoke.js            Identity revocation
/vibe/api/lib/auth.js                   Session management
```

**Priority 2 - Security Infrastructure:**
```
/vibe/api/lib/ratelimit.js              Rate limiting implementation
/vibe/migrations/002_add_audit_log.sql  Database schema
/vibe/api/lib/db.js                     Database query abstraction
```

**Priority 3 - Client Security:**
```
/airc-ts/src/crypto.ts                  Recovery key generation
/airc-python/airc/identity.py           Recovery key storage
/airc-mcp/crypto.js                     Proof generation
```

### 3.2 Specific Questions for Auditor

1. **Cryptography:**
   - Is our Ed25519 usage correct (proper APIs, no custom crypto)?
   - Is canonical JSON implementation spec-compliant (RFC 8785)?
   - Is signature verification constant-time (timing attack resistant)?

2. **Replay Protection:**
   - Is nonce generation cryptographically secure?
   - Is nonce tracking implementation correct (no race conditions)?
   - Is timestamp validation window appropriate (5 minutes)?

3. **Key Management:**
   - Are file permissions sufficient (0o600 signing, 0o400 recovery)?
   - Is recovery key storage secure (read-only, offline backup guidance)?
   - What happens if user loses recovery key? (Answer: Identity lost, must revoke + re-register)

4. **Rate Limiting:**
   - Can rate limits be bypassed (distributed attack, IP spoofing)?
   - Are limits appropriate (1/hour rotation, 1/day revocation)?
   - What happens during rate limit exhaustion? (Graceful degradation)

5. **Session Security:**
   - Is HMAC token generation secure?
   - Is session invalidation complete after rotation?
   - Can sessions be hijacked or fixated?

6. **Fail-Open Status Checks:**
   - Is fail-open acceptable risk? (Documented: availability > consistency)
   - Should we fail-closed instead? (Trade-off: service unavailable during DB outage)
   - Circuit breaker appropriate? (Fail closed if >2% failure rate over 100+ checks)

### 3.3 Threat Modeling Review

Ask auditor to validate:
- ✅ Threat model completeness (any missing attack vectors?)
- ✅ Risk ratings accurate (critical/high/medium/low)?
- ✅ Mitigations effective against identified threats?
- ✅ Assumptions reasonable (trusted registry, TLS, etc.)?

### 3.4 Compliance Considerations

**OWASP Top 10 (2021) Coverage:**
```
A01:2021 – Broken Access Control         ✅ Covered (session validation, status checks)
A02:2021 – Cryptographic Failures        ✅ Covered (Ed25519, TLS, signature verification)
A03:2021 – Injection                     ⚠️ TO VERIFY (parameterized queries, input validation)
A04:2021 – Insecure Design               ✅ Covered (threat model, security by design)
A05:2021 – Security Misconfiguration     ⚠️ TO VERIFY (Vercel config, HTTPS enforcement)
A06:2021 – Vulnerable Components         ⚠️ TO VERIFY (npm audit, dependency scanning)
A07:2021 – Auth & Session Management     ✅ Covered (HMAC tokens, session invalidation)
A08:2021 – Software & Data Integrity     ✅ Covered (audit logs, signature verification)
A09:2021 – Logging & Monitoring          ✅ Covered (comprehensive audit logging)
A10:2021 – SSRF                          ✅ N/A (no server-side requests to user URLs)
```

**SOC2 Considerations (if applicable):**
- Audit log access logging (admin_access_log table)
- Retention policy (permanent, unless GDPR request)
- Access controls (admin-only audit log access)
- Incident response (rollback plan, monitoring alerts)

---

## 4. Pass/Fail Gates

### 4.1 Blocking Issues (Must Fix Before Production)

**Gate 1: No Critical Vulnerabilities**
```
Definition: CVSS 9.0+ vulnerabilities in security-critical code
Examples:
  - Remote code execution
  - Authentication bypass
  - Cryptographic failure allowing forgery
  - SQL injection in rotation/revocation endpoints

Status: ⏳ Pending external audit
Pass Criteria: Zero critical vulnerabilities found
```

**Gate 2: Cryptography Implementation Correct**
```
Definition: Ed25519 usage follows best practices
Verification:
  - Sign/verify test vectors pass (SIGNING_TEST_VECTORS.md)
  - Constant-time verification confirmed
  - Canonical JSON matches RFC 8785
  - No custom crypto (only stdlib APIs)

Status: ⏳ Pending external review
Pass Criteria: Auditor confirms crypto implementation correct
```

**Gate 3: Replay Protection Works**
```
Definition: Nonce tracking prevents reuse of rotation/revocation proofs
Verification:
  - REPLAY-1, REPLAY-2, REPLAY-3, REPLAY-4 tests pass
  - Concurrent rotation attempts handled correctly
  - Nonce collision handled gracefully

Status: ✅ 2/4 tests passing, 2 TODO
Pass Criteria: 4/4 replay tests passing
```

**Gate 4: Rate Limiting Effective**
```
Definition: Rate limits cannot be bypassed under realistic attack
Verification:
  - RATE-1 through RATE-5 tests pass
  - Distributed attack (many IPs) still limited per identity
  - Limits appropriate (1/hour rotation, not too strict)

Status: ✅ 1/5 tests passing, 4 TODO
Pass Criteria: 5/5 rate limit tests passing
```

**Gate 5: No High-Severity SQL Injection**
```
Definition: All database queries use parameterized queries or proper escaping
Verification:
  - INJECT-1 test passes (SQL injection in handle)
  - Manual code review of all SQL queries
  - Static analysis (eslint-plugin-security)

Status: ⏳ Pending code review
Pass Criteria: All queries parameterized, INJECT-1 passes
```

### 4.2 High-Priority Issues (Should Fix, Can Document if Acceptable)

**Issue 1: Fail-Open Status Checks**
```
Risk: Revoked users can send messages during DB outage
Mitigation: Circuit breaker (fail closed if >2% failure rate)
Acceptance Criteria: Documented, monitored, circuit breaker implemented
Status: ⚠️ Accepted risk, needs circuit breaker implementation
```

**Issue 2: Recovery Key Cannot Be Rotated**
```
Risk: Recovery key compromise = identity lost
Mitigation: User education (offline backup, hardware wallet in v0.5)
Acceptance Criteria: Documented in user guide, clear warning in SDK
Status: ⚠️ Accepted limitation (v0.2 scope)
```

**Issue 3: No Hardware Security Module**
```
Risk: Keys stored in plaintext on disk (mitigated by file permissions)
Mitigation: v0.5 roadmap item (HSM support)
Acceptance Criteria: Documented limitation, clear upgrade path
Status: ⚠️ Accepted limitation (v0.2 scope)
```

### 4.3 Medium-Priority Issues (Nice to Have, Not Blocking)

**Issue 1: Timing Attack on Signature Verification**
```
Risk: Attacker infers signature structure from timing
Mitigation: crypto.verify is constant-time (needs confirmation)
Acceptance Criteria: Timing test (CRYPTO-5) passes, or confirmed constant-time
Status: ⏳ Pending verification
```

**Issue 2: Nonce Table Unbounded Growth**
```
Risk: Nonce table grows indefinitely, performance degrades
Mitigation: TTL cleanup (1-hour expiry)
Acceptance Criteria: DOS-4 test passes (10M entries handled)
Status: ⏳ Pending test
```

### 4.4 Gate Checklist

Before proceeding to Week 7 (Production Deployment):

- [ ] **Gate 1:** Zero critical vulnerabilities (CVSS 9.0+)
- [ ] **Gate 2:** Cryptography implementation confirmed correct
- [ ] **Gate 3:** Replay protection tests passing (4/4)
- [ ] **Gate 4:** Rate limiting tests passing (5/5)
- [ ] **Gate 5:** SQL injection tests passing, all queries parameterized
- [ ] **High-Priority:** Circuit breaker implemented for fail-open status checks
- [ ] **High-Priority:** Recovery key limitation documented
- [ ] **Medium-Priority:** Timing attack test completed or constant-time confirmed
- [ ] **Documentation:** All findings documented, mitigations explained
- [ ] **External Audit:** Report received, recommendations reviewed

**Pass Criteria:** All 5 blocking gates passed + 2/2 high-priority issues resolved

---

## 5. Audit Preparation Checklist

### 5.1 Documentation for Auditor

- [ ] This document (SECURITY_AUDIT_PREP.md)
- [ ] AIRC v0.2 Specification (AIRC_V0.2_SPEC_DRAFT.md)
- [ ] Signing test vectors (SIGNING_TEST_VECTORS.md)
- [ ] Implementation plan (peaceful-dreaming-lerdorf.md)
- [ ] Week 2 completion summary (WEEK_2_COMPLETION_SUMMARY.md)
- [ ] Migration testing results (test_rotation.js output)

### 5.2 Code for Review

- [ ] `/vibe` server repository (access granted)
- [ ] `/airc-ts` TypeScript SDK
- [ ] `/airc-python` Python SDK
- [ ] `/airc-mcp` MCP server
- [ ] Database schema (migrations/)

### 5.3 Test Environment Access

- [ ] Staging URL: https://vibe-public-pjft4mtcb-sethvibes.vercel.app
- [ ] Database access (read-only audit user)
- [ ] Test accounts created for penetration testing

### 5.4 Timeline

**Week 5 (Jan 13-17):**
- Complete TODO tests (42 remaining)
- Run penetration testing internally
- Generate test coverage report
- Prepare audit materials

**Week 6 (Jan 20-24):**
- External auditor review (5 business days)
- Address findings (severity: critical > high > medium)
- Re-test after fixes
- Obtain final audit report

**Week 7 (Jan 27-31):**
- Production deployment (if all gates passed)
- Grace period begins (30 days)
- Enhanced monitoring

---

## 6. Next Actions

### Immediate (This Week)

1. **Complete Test Matrix**
   - Implement 42 TODO tests
   - Run full test suite on staging
   - Generate coverage report

2. **Security Tooling**
   - Run `npm audit` on all packages
   - Static analysis (eslint-plugin-security)
   - Dependency scanning (Snyk or similar)

3. **Penetration Testing**
   - Internal pen-test on staging
   - Document findings
   - Fix critical issues before external audit

### External Audit (Next Week)

1. **Select Auditor**
   - Trail of Bits (blockchain/crypto focus)
   - Cure53 (web security focus)
   - NCC Group (general security)

2. **Provide Materials**
   - Share this document
   - Grant repository access
   - Schedule kickoff call

3. **Support Audit**
   - Answer questions promptly
   - Provide test environment
   - Fix issues as identified

---

## Contact

**Security Issues:** security@airc.dev (planned)
**Audit Coordinator:** Seth Goldstein
**Timeline Owner:** Seth Goldstein

---

**Status:** Ready for internal testing phase
**Next Milestone:** Complete 42 TODO tests (Week 5)
**Deployment Blocker:** External audit must complete (Week 6)
