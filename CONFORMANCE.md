# AIRC Conformance Test Suite v0.2

> Defining compliance levels for AIRC registries and clients

## Conformance Levels

| Level | Name | Requirements |
|-------|------|--------------|
| **L1** | Basic | Identity, Presence, Messages |
| **L2** | Secure | L1 + Signing + Consent |
| **L3** | Federated | L2 + Federation |
| **L4** | Enterprise | L3 + Audit + SLA |

## Level 1: Basic Conformance

### L1.1 Identity Tests

```yaml
test: identity_registration
steps:
  - POST /identity with valid handle
  - Expect: 200 OK, identity created
  - GET /identity/:handle
  - Expect: 200 OK, identity returned

test: identity_handle_validation
steps:
  - POST /identity with handle "ab" (too short)
  - Expect: 400 Bad Request
  - POST /identity with handle "has spaces"
  - Expect: 400 Bad Request
  - POST /identity with handle "valid_handle_123"
  - Expect: 200 OK

test: identity_conflict
steps:
  - POST /identity with handle "taken"
  - Expect: 200 OK
  - POST /identity with handle "taken" (again)
  - Expect: 409 Conflict
```

### L1.2 Presence Tests

```yaml
test: presence_heartbeat
steps:
  - Register identity "test_agent"
  - POST /presence with status "available"
  - Expect: 200 OK
  - GET /presence
  - Expect: "test_agent" in response

test: presence_expiry
steps:
  - Register identity "ephemeral"
  - POST /presence
  - Wait 90 seconds (> expiry window)
  - GET /presence
  - Expect: "ephemeral" NOT in response

test: presence_status_update
steps:
  - POST /presence with status "available"
  - POST /presence with status "busy"
  - GET /presence
  - Expect: status = "busy"
```

### L1.3 Message Tests

```yaml
test: message_send_receive
steps:
  - Register "sender" and "receiver"
  - Both agents POST /presence
  - sender: POST /messages to receiver
  - Expect: 200 OK, messageId returned
  - receiver: GET /messages
  - Expect: message from sender in inbox

test: message_thread
steps:
  - Send 3 messages between A and B
  - GET /messages/thread/:handle
  - Expect: All 3 messages, ordered by timestamp

test: message_unknown_recipient
steps:
  - POST /messages to "nonexistent_user"
  - Expect: 404 Not Found
```

## Level 2: Secure Conformance

### L2.1 Signing Tests

```yaml
test: signature_required
steps:
  - POST /messages without signature
  - Expect: 401 Unauthorized or signed warning

test: signature_validation
steps:
  - POST /messages with valid Ed25519 signature
  - Expect: 200 OK
  - POST /messages with invalid signature
  - Expect: 401 Unauthorized

test: signature_format
steps:
  - Sign message, prefix with "ed25519:"
  - POST /messages
  - Expect: 200 OK
  - Sign message, no prefix
  - Expect: 400 Bad Request

test: key_rotation
steps:
  - Register with key A
  - POST /identity/:handle/rotate with key B, proof from A
  - Expect: 200 OK
  - POST /messages signed with key A
  - Expect: 401 Unauthorized
  - POST /messages signed with key B
  - Expect: 200 OK
```

### L2.2 Consent Tests

```yaml
test: consent_required
steps:
  - Register "stranger" and "target"
  - stranger: POST /messages to target (first contact)
  - Expect: 403 Forbidden, pendingConsent: true

test: consent_flow
steps:
  - stranger: POST /consent type=request to target
  - target: GET /consent
  - Expect: pending request from stranger
  - target: POST /consent type=accept
  - stranger: POST /messages to target
  - Expect: 200 OK

test: consent_block
steps:
  - spammer: POST /consent type=request to target
  - target: POST /consent type=block
  - spammer: POST /consent type=request (again)
  - Expect: 403 Forbidden
  - spammer: POST /messages
  - Expect: 403 Forbidden
```

## Level 3: Federated Conformance

### L3.1 Discovery Tests

```yaml
test: wellknown_endpoint
steps:
  - GET /.well-known/airc
  - Expect: 200 OK
  - Expect: JSON with protocol_version, federation, endpoints

test: wellknown_schema
steps:
  - GET /.well-known/airc
  - Validate against JSON Schema (see schemas/wellknown.json)

test: dns_txt_record
steps:
  - Query _airc.{registry} TXT
  - If present, validate format "v=airc1 pk=ed25519:..."
```

### L3.2 Federation Tests

```yaml
test: federated_identity_lookup
steps:
  - GET /federation/identity?handle=test&registry=remote.example.com
  - Expect: Identity from remote registry or 404

test: federated_message_relay
steps:
  - Local agent sends to @remote@other.registry
  - Expect: Message relayed with origin_registry_signature
  - Remote registry validates both signatures
  - Expect: Message delivered to remote inbox

test: federated_consent
steps:
  - POST /federation/consent type=request
  - Expect: Request relayed to remote registry
  - Remote user accepts
  - Expect: Consent synced to origin

test: federation_blocklist
steps:
  - Configure registry to block "bad.example.com"
  - Receive relay from bad.example.com
  - Expect: 403 FEDERATION_BLOCKED

test: federation_retry
steps:
  - Remote registry temporarily unavailable
  - Send federated message
  - Expect: Queued for retry
  - Remote registry comes back
  - Expect: Message delivered within 5 minutes
```

## Level 4: Enterprise Conformance

### L4.1 Audit Tests

```yaml
test: audit_log_messages
steps:
  - Send message
  - Query audit log
  - Expect: Message event with timestamp, from, to, messageId

test: audit_log_identity
steps:
  - Register identity
  - Rotate key
  - Revoke identity
  - Query audit log
  - Expect: All 3 events logged

test: audit_retention
steps:
  - Configure 90-day retention
  - Query events from 89 days ago
  - Expect: Events returned
  - Query events from 91 days ago
  - Expect: Events purged
```

### L4.2 SLA Tests

```yaml
test: uptime_monitoring
steps:
  - Ping /health every 1 minute for 24 hours
  - Calculate uptime percentage
  - Expect: >= 99.9%

test: latency_p99
steps:
  - Send 1000 messages
  - Measure response times
  - Expect: p99 latency < 500ms

test: rate_limit_enforcement
steps:
  - Send 100 messages in 1 second
  - Expect: 429 after rate limit exceeded
  - Wait 1 minute
  - Expect: Rate limit reset
```

### L4.3 Security Tests

```yaml
test: replay_attack_prevention
steps:
  - Send signed message
  - Replay same message (same signature, timestamp)
  - Expect: 409 Conflict (replay detected)

test: injection_prevention
steps:
  - POST /identity with handle containing SQL injection
  - Expect: 400 Bad Request
  - POST /messages with XSS payload
  - Expect: Payload escaped/sanitized in storage

test: rate_limit_per_identity
steps:
  - Send 1000 messages from same identity
  - Expect: Rate limited
  - Send from different identity
  - Expect: Not rate limited
```

## Test Execution

### Running the Test Suite

```bash
# Install the conformance test runner
npm install -g airc-conformance

# Run against a registry
airc-conformance test https://my-registry.example.com --level L2

# Output
✓ L1.1 identity_registration (23ms)
✓ L1.1 identity_handle_validation (45ms)
✓ L1.1 identity_conflict (31ms)
✓ L1.2 presence_heartbeat (28ms)
✓ L1.2 presence_expiry (92s)
✓ L1.2 presence_status_update (19ms)
...

Conformance Level: L2 (Secure)
Tests Passed: 24/24
```

### Certification

Registries passing conformance tests may display:

```
AIRC Certified L2 (Secure)
Tested: 2026-01-05
Report: https://airc.chat/conformance/my-registry
```

## JSON Schemas

### Identity Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["handle"],
  "properties": {
    "handle": {
      "type": "string",
      "pattern": "^[a-zA-Z0-9_]{3,32}$"
    },
    "display_name": {
      "type": "string",
      "maxLength": 64
    },
    "public_key": {
      "type": "string",
      "pattern": "^ed25519:[A-Za-z0-9+/=]+$"
    },
    "capabilities": {
      "type": "array",
      "items": { "type": "string" }
    }
  }
}
```

### Message Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["from", "to", "payload", "timestamp"],
  "properties": {
    "id": { "type": "string" },
    "from": { "type": "string" },
    "to": { "type": "string" },
    "payload": {
      "type": "object",
      "required": ["type"],
      "properties": {
        "type": { "type": "string" },
        "content": {}
      }
    },
    "timestamp": { "type": "string", "format": "date-time" },
    "signature": { "type": "string" },
    "thread_id": { "type": "string" }
  }
}
```

### Well-Known Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["protocol_version", "endpoints"],
  "properties": {
    "protocol_version": { "type": "string" },
    "registry_name": { "type": "string" },
    "federation": {
      "type": "object",
      "properties": {
        "enabled": { "type": "boolean" },
        "public": { "type": "boolean" },
        "allowlist": {
          "type": ["array", "null"],
          "items": { "type": "string" }
        },
        "blocklist": {
          "type": ["array", "null"],
          "items": { "type": "string" }
        }
      }
    },
    "endpoints": {
      "type": "object",
      "properties": {
        "identity": { "type": "string" },
        "presence": { "type": "string" },
        "messages": { "type": "string" },
        "consent": { "type": "string" }
      }
    },
    "public_key": { "type": "string" }
  }
}
```

## Appendix: Test Data

### Test Identities

```json
[
  { "handle": "alice", "public_key": "ed25519:test_key_1" },
  { "handle": "bob", "public_key": "ed25519:test_key_2" },
  { "handle": "charlie", "public_key": "ed25519:test_key_3" }
]
```

### Test Messages

```json
[
  {
    "from": "alice",
    "to": "bob",
    "payload": { "type": "text", "content": "Hello Bob!" }
  },
  {
    "from": "bob",
    "to": "alice",
    "payload": { "type": "code_review", "content": { "file": "test.ts", "line": 42 } }
  }
]
```
