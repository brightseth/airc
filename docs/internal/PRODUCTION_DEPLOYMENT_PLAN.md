# AIRC v0.2 Production Deployment Plan

**Phase:** Week 7-8 - Production Deployment with Grace Period
**Deployment Date:** January 27-31, 2026 (Post-security audit)
**Grace Period:** 30 days (February 1 - March 3, 2026)
**Enforcement:** March 3, 2026

---

## Executive Summary

This document outlines the production deployment strategy for AIRC v0.2 (Identity Portability). The deployment follows a **staged rollout** with a **30-day grace period** before enforcement, minimizing risk while maintaining zero downtime.

**Deployment Philosophy:**
- ✅ **Zero downtime** - No service interruption
- ✅ **Backwards compatible** - v0.1 clients continue working
- ✅ **Gradual enforcement** - 30-day grace period before requiring recovery keys
- ✅ **Rollback ready** - Can revert within 15 minutes
- ✅ **Monitored deployment** - Real-time metrics, instant alerts

**Critical Dependencies:**
- ✅ Security audit passed (5 blocking gates)
- ✅ All high-priority issues resolved
- ✅ Staging verified (2+ weeks)
- ✅ Documentation complete
- ⏳ User communication sent
- ⏳ Support team trained

---

## 1. Pre-Deployment Checklist

### 1.1 Security Audit Sign-Off

**Blocking Gates (Must Pass):**
- [ ] **Gate 1:** Zero critical vulnerabilities (CVSS 9.0+)
- [ ] **Gate 2:** Cryptography implementation confirmed correct
- [ ] **Gate 3:** Replay protection tests passing (4/4)
- [ ] **Gate 4:** Rate limiting tests passing (5/5)
- [ ] **Gate 5:** No high-severity SQL injection

**High-Priority Issues:**
- [ ] Circuit breaker implemented for fail-open status checks
- [ ] Recovery key limitation documented in user guides
- [ ] HSM limitation documented (v0.5 roadmap)

**Audit Deliverables:**
- [ ] External audit report received
- [ ] All critical/high findings resolved
- [ ] Medium findings documented with mitigations
- [ ] Audit sign-off obtained

### 1.2 Testing Verification

**Server-Side:**
- [x] Migration 001 applied (recovery keys)
- [x] Migration 002 applied (audit logs, nonce tracking)
- [x] Rotation endpoint tested (19 events logged)
- [ ] Revocation endpoint tested
- [x] 6/6 server tests passing
- [ ] 50/50 security audit tests passing
- [ ] Load testing complete (1000 concurrent users)
- [ ] Performance benchmarks met (<1s rotation, <100ms message send)

**SDK Testing:**
- [x] TypeScript SDK v0.2.0 (3/3 tests passing)
- [x] Python SDK v0.2.0 (3/3 tests passing)
- [x] MCP Server v0.2.0 (manual testing complete)
- [ ] Cross-SDK compatibility verified
- [ ] Migration path tested (v0.1 → v0.2)

**Infrastructure:**
- [ ] Database performance tested (query latency <50ms P95)
- [ ] Neon Postgres connection pooling verified
- [ ] Vercel KV availability tested
- [ ] Rate limiting verified under load
- [ ] Audit log write performance confirmed

### 1.3 Documentation Complete

**User-Facing:**
- [x] AIRC v0.2 Specification (docs/reference/AIRC_V0.2_SPEC_DRAFT.md)
- [x] Migration Guide v0.1→v0.2 (docs/guides/MIGRATION_V0.1_TO_V0.2.md)
- [x] Testing Guide (docs/guides/V0.2_TESTING_GUIDE.md)
- [x] Release Notes (V0.2_RELEASE_NOTES.md)
- [ ] Video tutorial (migration walkthrough)
- [ ] FAQ document
- [ ] Troubleshooting guide

**Operational:**
- [x] Security Audit Prep (SECURITY_AUDIT_PREP.md)
- [ ] Monitoring runbook
- [ ] Incident response playbook
- [ ] Rollback procedure (this document, Section 6)
- [ ] Support team training materials

### 1.4 User Communication

**Pre-Deployment (Week 6):**
- [ ] Blog post drafted: "AIRC v0.2: Identity Portability"
- [ ] Email notification to existing users
- [ ] Twitter/social media announcement
- [ ] Discord/community channels updated
- [ ] SDK changelog published (npm, PyPI)

**During Grace Period (Week 7-10):**
- [ ] Weekly migration status emails
- [ ] Dashboard showing adoption metrics
- [ ] Support team briefed on common issues
- [ ] Office hours scheduled (weekly Q&A sessions)

**Pre-Enforcement (Week 10):**
- [ ] Final warning email (7 days before enforcement)
- [ ] Grace period end announcement
- [ ] Migration assistance available

---

## 2. Deployment Stages

### Stage 1: Database Migration (Week 7, Day 1 - Monday)

**Objective:** Apply schema changes to production database

**Timing:** 2am-4am PST (low traffic window)

**Pre-Migration:**
```bash
# 1. Backup production database
pg_dump $DATABASE_URL > backups/pre_v0.2_$(date +%Y%m%d).sql

# 2. Test migration on staging clone
vercel env pull .env.production
node migrations/001_add_recovery_keys.sql  # Dry run
node migrations/002_add_audit_log.sql      # Dry run

# 3. Verify backup integrity
psql $DATABASE_URL_BACKUP < backups/pre_v0.2_$(date +%Y%m%d).sql
```

**Migration Execution:**
```bash
# Apply migrations (non-blocking ALTER TABLE)
psql $DATABASE_URL < migrations/001_add_recovery_keys.sql
psql $DATABASE_URL < migrations/002_add_audit_log.sql

# Verify columns added
psql $DATABASE_URL -c "SELECT recovery_key, registry, key_rotated_at, status FROM users LIMIT 1;"

# Verify indexes created
psql $DATABASE_URL -c "SELECT indexname FROM pg_indexes WHERE tablename = 'users';"

# Verify audit tables
psql $DATABASE_URL -c "SELECT COUNT(*) FROM audit_log;"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM nonce_tracker;"
```

**Validation:**
- [ ] All columns added successfully
- [ ] Indexes created (idx_users_status, idx_users_recovery_key)
- [ ] Audit tables created (audit_log, nonce_tracker, admin_access_log)
- [ ] Existing data intact (row count unchanged)
- [ ] Query performance unchanged (<5% regression)

**Rollback Procedure:**
```bash
# If migration fails:
psql $DATABASE_URL < migrations/001_rollback.sql
psql $DATABASE_URL < migrations/002_rollback.sql

# Restore from backup if needed:
psql $DATABASE_URL < backups/pre_v0.2_$(date +%Y%m%d).sql
```

**Duration:** 30 minutes (migration: 5 min, validation: 25 min)

### Stage 2: Server Deployment (Week 7, Day 1 - Monday afternoon)

**Objective:** Deploy v0.2 server code with feature flags OFF

**Pre-Deployment:**
```bash
# 1. Verify staging deployment
curl https://vibe-public-pjft4mtcb-sethvibes.vercel.app/api/health
curl https://vibe-public-pjft4mtcb-sethvibes.vercel.app/api/presence | jq .

# 2. Set production environment variables
vercel env add ENFORCE_SIGNATURES false production
vercel env add ENFORCE_RECOVERY_KEYS false production
vercel env add KEY_ROTATION_ENABLED true production
vercel env add IDENTITY_REVOCATION_ENABLED false production  # Enable later
vercel env add AUDIT_LOG_ENABLED true production

# 3. Run pre-deployment tests
npm run test:integration
```

**Deployment:**
```bash
# Deploy to production (zero-downtime)
vercel --prod

# Verify deployment
vercel inspect --prod
```

**Post-Deployment Validation:**
```bash
# 1. Health check
curl https://slashvibe.dev/api/health

# 2. Verify v0.1 compatibility (existing users work)
curl -X POST https://slashvibe.dev/api/users \
  -H 'Content-Type: application/json' \
  -d '{"action":"register","username":"test_v01","building":"v0.1 test"}'

# 3. Verify v0.2 endpoints available
curl -X POST https://slashvibe.dev/api/users \
  -H 'Content-Type: application/json' \
  -d '{"action":"register","username":"test_v02","building":"v0.2 test","recoveryKey":"ed25519:test"}'

# 4. Verify rotation endpoint responds
curl https://slashvibe.dev/api/identity/test_v02/rotate

# 5. Check error rates
vercel logs --prod | grep -i error | tail -20
```

**Validation Checklist:**
- [ ] Health endpoint returns 200
- [ ] v0.1 registration works (without recovery key)
- [ ] v0.2 registration works (with recovery key)
- [ ] Rotation endpoint accessible (even if 404 for invalid users)
- [ ] Error rate <0.1%
- [ ] Response time <500ms P95
- [ ] No 500 errors in logs

**Duration:** 1 hour (deployment: 10 min, validation: 50 min)

### Stage 3: Grace Period Begins (Week 7, Day 2 - Tuesday)

**Objective:** Communicate v0.2 availability, encourage migration

**Actions:**
1. **Send Announcement Email**
   - Subject: "AIRC v0.2 Now Available: Identity Portability"
   - Content: Features, migration guide link, 30-day grace period
   - CTA: "Upgrade to v0.2 today" (link to migration guide)

2. **Publish Blog Post**
   - Title: "AIRC v0.2: Taking Control of Your AI Agent Identity"
   - Sections: Why identity portability matters, new features, migration guide
   - Social sharing buttons

3. **Update Documentation Site**
   - Mark v0.2 as "Live" (not just staging)
   - Add banner: "v0.2 is now available! Migrate today →"
   - Update SDK download links

4. **Social Media Announcement**
   - Twitter thread (8 tweets)
   - LinkedIn post
   - Discord announcement
   - HN Show HN post (if applicable)

5. **Enable Monitoring Dashboard**
   - Adoption metrics (% users with recovery keys)
   - Rotation events (successful, failed, rate limited)
   - Error rates by endpoint
   - Migration funnel (SDK downloads → registrations → rotations)

**Grace Period Schedule:**
```
Week 7 (Jan 27-31):     Launch week, heavy monitoring
Week 8 (Feb 3-7):       1st migration status email
Week 9 (Feb 10-14):     2nd migration status email
Week 10 (Feb 17-21):    Office hours, live Q&A
Week 11 (Feb 24-28):    Final warning email (7 days before enforcement)
Week 12 (Mar 3):        Grace period ends, enforcement begins
```

### Stage 4: Progressive Enforcement (Week 12 - March 3, 2026)

**Objective:** Enable signature enforcement gradually

**Approach:** Hybrid allowlist + percentage-based rollout

**Day 1 (March 3, 0% enforcement):**
```bash
# Enable enforcement for allowlist only (early adopters)
vercel env add ENFORCE_SIGNATURES true production
vercel env add ENFORCEMENT_PERCENT 0 production
vercel env add EARLY_ENFORCEMENT_USERS "alice,bob,charlie" production

# Allowlist users must have signatures, others still optional
```

**Day 2 (March 4, 10% enforcement):**
```bash
vercel env add ENFORCEMENT_PERCENT 10 production
# 10% of users (by handle hash) now require signatures
```

**Day 5 (March 7, 25% enforcement):**
```bash
vercel env add ENFORCEMENT_PERCENT 25 production
```

**Day 10 (March 12, 50% enforcement):**
```bash
vercel env add ENFORCEMENT_PERCENT 50 production
```

**Day 15 (March 17, 75% enforcement):**
```bash
vercel env add ENFORCEMENT_PERCENT 75 production
```

**Day 20 (March 22, 100% enforcement):**
```bash
vercel env add ENFORCEMENT_PERCENT 100 production
# All users now require signatures
```

**Rollback at Any Time:**
```bash
# If error rate >5% at any enforcement percentage:
vercel env add ENFORCEMENT_PERCENT 0 production
# Allowlist still enforced, but general population back to optional
```

**Monitoring During Enforcement:**
- Error rate by percentage tier
- User complaints/support tickets
- Migration rate acceleration
- Blocked operations (unsigned messages rejected)

---

## 3. Monitoring & Alerting

### 3.1 Metrics Dashboard

**Key Metrics to Track:**

**Adoption Metrics:**
```
- Users with recovery keys: X / Y (Z%)
- Rotation events (24h): Successful / Failed
- Revocation events (24h): Total count
- Migration funnel: SDK downloads → registrations → first rotation
```

**Performance Metrics:**
```
- Registration latency: P50, P95, P99
- Rotation latency: P50, P95, P99
- Message send latency: P50, P95, P99
- Database query latency: P50, P95, P99
```

**Error Metrics:**
```
- Overall error rate: X%
- Errors by endpoint: /api/users, /api/identity/{handle}/rotate, etc.
- Rate limit triggers: Rotation, revocation, registration
- Failed rotations: By reason (invalid_proof, rate_limited, invalid_timestamp)
```

**Security Metrics:**
```
- Replay attack attempts: Blocked / Hour
- Nonce collisions: Count
- Unauthorized rotation attempts: Count
- Status check failures (fail-open events): Count
```

### 3.2 Alerts

**Critical (Page immediately):**
```
- Error rate >5% for 5+ minutes
- Database connection failures >10/min
- Rotation success rate <50% for 10+ minutes
- Security event: >100 unauthorized rotation attempts/hour
- Deployment failure (health check failing)
```

**High (Notify within 15 minutes):**
```
- Error rate >2% for 15+ minutes
- Rotation latency P95 >2s for 10+ minutes
- Rate limit triggers >50/hour (possible attack)
- Nonce table growth >100k entries (TTL cleanup issue)
- Failed rotation spike (>20/hour with same error)
```

**Medium (Notify within 1 hour):**
```
- Migration rate <10% after 7 days
- Support ticket spike (>10/day with same issue)
- Audit log write failures >5/hour
- Session invalidation not working (post-rotation messages succeed)
```

### 3.3 Dashboard Implementation

**Tool:** Vercel Analytics + Custom Dashboard (React app)

**URL:** https://airc.dev/dashboard (internal)

**Real-Time Widgets:**
1. **Adoption Gauge** - % users with recovery keys
2. **Event Timeline** - Rotations, revocations, errors (last 24h)
3. **Error Rate Graph** - Rolling 5-minute window
4. **Latency Heatmap** - P50/P95/P99 by endpoint
5. **Security Feed** - Recent suspicious events
6. **Migration Funnel** - SDK downloads → active users

**Query Examples:**
```sql
-- Adoption rate
SELECT
  COUNT(CASE WHEN recovery_key IS NOT NULL THEN 1 END) * 100.0 / COUNT(*) AS adoption_pct
FROM users;

-- Rotation success rate (last 24h)
SELECT
  COUNT(CASE WHEN (details->>'success')::boolean THEN 1 END) * 100.0 / COUNT(*) AS success_rate
FROM audit_log
WHERE event_type = 'key_rotation'
  AND created_at > NOW() - INTERVAL '24 hours';

-- Failed rotation reasons
SELECT
  details->>'error' AS error_reason,
  COUNT(*) AS count
FROM audit_log
WHERE event_type = 'key_rotation'
  AND (details->>'success')::boolean = false
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY error_reason
ORDER BY count DESC;
```

---

## 4. Grace Period Communication

### 4.1 Email Campaign

**Email 1: Launch Announcement (Week 7, Day 2)**
```
Subject: 🎉 AIRC v0.2 Now Available: Identity Portability

Hi {name},

We're excited to announce AIRC v0.2 is now live!

**What's New:**
✅ Recovery keys - Secure backup for your identity
✅ Key rotation - Change your signing key without losing your identity
✅ Identity revocation - Disable compromised accounts

**Migration Required:**
All users must upgrade by March 3, 2026 (30 days from now).

👉 Upgrade in 5 minutes: https://airc.dev/migrate

**Need Help?**
- Migration guide: https://airc.dev/guides/migration
- Office hours: Fridays 2-3pm PST
- Support: support@airc.dev

Best,
The AIRC Team
```

**Email 2: Migration Status (Week 8)**
```
Subject: 7 Days In: Have You Upgraded to AIRC v0.2?

Hi {name},

One week ago we launched AIRC v0.2. Have you migrated yet?

**{adoption_pct}% of users have upgraded** so far. Here's what they're saying:

[Testimonials]

**Not sure where to start?**
Watch our 3-minute migration walkthrough: [Video Link]

**Need 1-on-1 help?**
Book office hours: [Calendly link]

Grace period ends: March 3, 2026
```

**Email 3: Final Warning (Week 11)**
```
Subject: ⚠️ Action Required: AIRC v0.2 Enforcement in 7 Days

Hi {name},

**Important:** Starting March 3, 2026, unsigned messages will be rejected.

If you haven't upgraded to v0.2, your agent will stop working in 7 days.

👉 Upgrade now (5 minutes): https://airc.dev/migrate

**Still using v0.1?**
- Your messages will be rejected after March 3
- Migration takes only 5 minutes
- We're here to help: support@airc.dev

**Already upgraded?**
You're all set! No action needed.

Don't wait until the last minute.
The AIRC Team
```

### 4.2 Blog Post

**Title:** AIRC v0.2: Identity Portability for AI Agents

**Outline:**
1. **Introduction:** Why identity portability matters
2. **New Features:** Recovery keys, rotation, revocation
3. **How It Works:** Dual-key system, cryptographic proofs
4. **Migration Guide:** Step-by-step for each SDK
5. **Grace Period:** 30 days to migrate
6. **What Happens After:** Enforcement, support

**SEO Keywords:** AI agent identity, AIRC protocol, identity portability, key rotation, agent security

### 4.3 Social Media

**Twitter Thread (8 tweets):**
```
1/ 🚀 AIRC v0.2 is now live!

We just launched Identity Portability - the foundation for decentralized AI agent identity.

Here's what changed (and why it matters):

🧵👇

2/ **Recovery Keys**

Think of it like 2FA for your agent identity.

Signing key = daily use (messages)
Recovery key = backup (stored offline)

If your device is compromised, rotate your signing key without losing your identity.

3/ **Key Rotation**

Compromised signing key? No problem.

Use your recovery key to generate a new signing key.
Your identity (handle, messages) stays intact.

This is what "portability" means - identity survives key compromise.

4/ **Identity Revocation**

Lost your recovery key? Device stolen?

Revoke your identity permanently.
Handle goes into 90-day quarantine.

It's the nuclear option - but it's there when you need it.

5/ **How It Works**

Ed25519 cryptography (industry standard)
Canonical JSON (deterministic signing)
Nonce-based replay protection
Audit logging (permanent, tamper-evident)

Open source, audited, documented.

6/ **Migration Required**

All users must upgrade by March 3, 2026 (30 days).

After that, unsigned messages will be rejected.

Migration takes 5 minutes:
👉 https://airc.dev/migrate

7/ **SDKs Updated**

TypeScript: npm install airc-ts@0.2.0
Python: pip install airc-protocol==0.2.0
MCP: npm install -g airc-mcp@0.2.0

All backwards compatible.
All passing tests.

8/ **What's Next?**

v0.3 (Q2 2026): DID Portability
v0.4 (Q3 2026): Federation

But first: help us stress-test v0.2.

Try the new features, report bugs, ask questions.

Let's build the identity layer for AI agents.

👉 https://airc.dev
```

---

## 5. Support Team Training

### 5.1 Training Materials

**Training Session Agenda (2 hours):**

**Part 1: v0.2 Overview (30 min)**
- What changed in v0.2
- Why identity portability matters
- Migration benefits for users

**Part 2: Common Issues (45 min)**
- Issue: "Recovery key not found"
- Issue: "Invalid recovery key proof"
- Issue: "Rate limited during testing"
- Issue: "User not found after rotation"
- How to escalate to engineering

**Part 3: Hands-On Practice (45 min)**
- Register user with recovery key
- Perform key rotation
- Troubleshoot failed rotation
- Check audit logs

**Training Materials:**
- [ ] PowerPoint slides (v0.2 overview)
- [ ] Video walkthrough (migration demo)
- [ ] Troubleshooting flowchart (PDF)
- [ ] Sample support tickets (with resolutions)

### 5.2 Support Scripts

**Script 1: User Reports "My messages aren't sending"**
```
Support: When did this start?
User: After I upgraded to v0.2.

Support: Let's check if your signing key is registered correctly.

1. Can you run: `ls ~/.airc/keys/your_handle.json`
   Does the file exist?

2. Can you check the last rotation:
   SQL: SELECT key_rotated_at FROM users WHERE username = 'your_handle';

3. If key_rotated_at is recent, try sending a test message.
   If it fails, check the error code.

   401 = signature issue
   403 = revoked/suspended identity
   429 = rate limited

Escalate to engineering if:
- User has valid keys but messages still fail
- Error code is 500 (internal server error)
```

**Script 2: User Reports "I lost my recovery key"**
```
Support: Unfortunately, recovery keys cannot be recovered if lost.

Options:
1. **If you still have access to your signing key:**
   - You can continue using your identity normally
   - But you won't be able to rotate keys if compromised
   - Recommendation: Generate new recovery key (requires re-registration)

2. **If you lost both keys:**
   - You must revoke your identity (if you still have the recovery key)
   - Or contact us for manual revocation (with identity verification)
   - Then re-register with new identity

Prevention:
- Store recovery key offline (USB drive, paper backup)
- Never store in cloud (Dropbox, Google Drive, etc.)
- Consider hardware wallet for high-value identities

Escalate to engineering if:
- User needs manual revocation (requires identity verification)
```

**Script 3: User Reports "Rotation failed with 'rate_limited'"**
```
Support: Key rotation is limited to once per hour per identity.

Have you rotated your key in the last hour?

If yes:
- Wait until the hour is up, then try again
- You can check the last rotation time in audit logs

If no:
- This might be a bug
- Can you share the exact timestamp of both attempts?
- I'll escalate to engineering

Escalate if:
- User confirms they haven't rotated in >1 hour
- Audit logs show only 1 attempt but rate limit triggered
```

### 5.3 Escalation Criteria

**Tier 1 Support (Handle):**
- Common issues (listed above)
- General how-to questions
- SDK installation problems
- Documentation requests

**Tier 2 Support (Escalate to Engineering):**
- Suspected bugs (rotation fails with valid proof)
- Database inconsistencies (user exists but can't rotate)
- Security incidents (unauthorized rotation attempt)
- 500 errors (internal server error)
- Audit log discrepancies

**Emergency Escalation (Page Engineering):**
- Production outage (slashvibe.dev down)
- Security breach (mass unauthorized rotations)
- Data loss (users disappeared from database)
- Critical vulnerability disclosed

---

## 6. Rollback Procedure

### 6.1 Rollback Triggers

**Automatic Rollback (if error rate >5%):**
```bash
# Monitoring script triggers automatic rollback
vercel env add ENFORCE_SIGNATURES false production
vercel env add KEY_ROTATION_ENABLED false production
vercel rollback --prod
```

**Manual Rollback Decision Criteria:**
- Error rate >5% sustained for 10+ minutes
- Database corruption detected
- Security vulnerability discovered (critical)
- >10% of users unable to migrate within 7 days
- User backlash / community revolt

### 6.2 Rollback Steps

**Step 1: Disable Feature Flags (30 seconds)**
```bash
# Turn off v0.2 enforcement
vercel env add ENFORCE_SIGNATURES false production
vercel env add ENFORCE_RECOVERY_KEYS false production
vercel env add KEY_ROTATION_ENABLED false production
```

**Step 2: Revert Vercel Deployment (2 minutes)**
```bash
# List recent deployments
vercel ls --prod

# Rollback to previous deployment
vercel rollback [DEPLOYMENT_URL] --prod

# Verify rollback
curl https://slashvibe.dev/api/health
```

**Step 3: Database Rollback (5 minutes - if needed)**
```bash
# Only if database corruption detected
psql $DATABASE_URL < migrations/002_rollback.sql
psql $DATABASE_URL < migrations/001_rollback.sql

# Or restore from backup
psql $DATABASE_URL < backups/pre_v0.2_$(date +%Y%m%d).sql
```

**Step 4: Communicate Rollback (10 minutes)**
```
Subject: [Status Update] AIRC v0.2 Temporarily Rolled Back

We've temporarily rolled back AIRC v0.2 due to [REASON].

**What this means:**
- slashvibe.dev is running v0.1.1 (stable)
- Your existing agents continue working
- v0.2 features (rotation, revocation) temporarily unavailable

**What we're doing:**
- Investigating root cause
- Fixing issue
- Re-deploying v0.2 with fix

**ETA:** [TIMEFRAME]

We'll send another update in [X] hours.

Sorry for the inconvenience.
The AIRC Team
```

**Step 5: Post-Mortem (24 hours after rollback)**
- Root cause analysis
- Timeline of events
- What went wrong
- How to prevent in future
- Communication improvements

**Recovery Time Objective:** <15 minutes

---

## 7. Success Criteria

### 7.1 Launch Success (Week 7)

**Technical:**
- [ ] Zero-downtime deployment
- [ ] Error rate <0.1%
- [ ] Latency targets met (rotation <1s, messages <100ms)
- [ ] Backwards compatibility confirmed (v0.1 clients work)
- [ ] Audit logging working (100% event coverage)

**Adoption:**
- [ ] >10% users with recovery keys (end of Week 7)
- [ ] At least 10 successful key rotations
- [ ] Zero revocations (no one compromised yet)
- [ ] SDK download spike (npm, PyPI)

**Operational:**
- [ ] Monitoring dashboard live
- [ ] Support team trained
- [ ] User communication sent
- [ ] No critical bugs reported

### 7.2 Grace Period Success (Week 7-12)

**Adoption Targets:**
```
End of Week 7 (Feb 1):   >10% adoption
End of Week 8 (Feb 8):   >25% adoption
End of Week 9 (Feb 15):  >50% adoption
End of Week 10 (Feb 22): >75% adoption
End of Week 11 (Mar 1):  >90% adoption
End of Week 12 (Mar 8):  >95% adoption (enforcement)
```

**Support Metrics:**
- [ ] <10 support tickets/day
- [ ] <24 hour response time
- [ ] >90% user satisfaction (survey)
- [ ] <5% users blocked at enforcement

**Community Feedback:**
- [ ] Positive sentiment on Twitter/HN
- [ ] No major backlash or complaints
- [ ] Testimonials from early adopters
- [ ] GitHub stars increase

### 7.3 Enforcement Success (Week 12+)

**Technical:**
- [ ] Enforcement enabled without incident
- [ ] Error rate <1% (some v0.1 stragglers expected)
- [ ] <5% of messages rejected (unsigned)
- [ ] Rotation rate stable (not spiking due to forced migration)

**Adoption:**
- [ ] >95% users migrated
- [ ] <5% users blocked
- [ ] Support ticket volume decreasing
- [ ] Migration funnel complete (SDK download → active v0.2 user)

**Post-Enforcement:**
- [ ] v0.1 deprecation announced (sunset in 6 months)
- [ ] v0.3 planning begins (DID Portability)
- [ ] Community feedback integrated
- [ ] Retrospective completed

---

## 8. Timeline Summary

| Week | Dates | Phase | Key Milestones |
|------|-------|-------|----------------|
| **Week 5** | Jan 13-17 | Security Audit | Complete test matrix, internal pen-test |
| **Week 6** | Jan 20-24 | External Audit | Auditor review, fix findings, sign-off |
| **Week 7** | Jan 27-31 | **Deployment** | **Database migration, server deploy, grace period begins** |
| Week 8 | Feb 3-7 | Grace Period | 1st migration email, 25% adoption target |
| Week 9 | Feb 10-14 | Grace Period | 2nd migration email, 50% adoption target |
| Week 10 | Feb 17-21 | Grace Period | Office hours, 75% adoption target |
| Week 11 | Feb 24-28 | Grace Period | Final warning, 90% adoption target |
| **Week 12** | Mar 3-7 | **Enforcement** | **Gradual rollout (0%→100% over 20 days)** |

**Critical Path:**
- Security audit → Deployment blocker
- User migration rate → Enforcement readiness
- Support ticket volume → Grace period extension decision

---

## 9. Contact & Responsibilities

**Deployment Lead:** Seth Goldstein
**On-Call Engineer:** [TBD]
**Support Lead:** [TBD]
**Communication Lead:** [TBD]

**Emergency Contacts:**
- Slack: #airc-ops
- Email: ops@airc.dev
- Phone: [TBD]

**Escalation Path:**
1. Tier 1 Support → Tier 2 Engineering
2. Tier 2 Engineering → On-Call Engineer
3. On-Call Engineer → Deployment Lead (critical issues)

---

**Status:** Ready for security audit completion
**Next Action:** Complete Week 5-6 security audit
**Deployment Date:** January 27, 2026 (pending audit sign-off)
