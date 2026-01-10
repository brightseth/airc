# AIRC Ed25519 Signing Test Vectors

Reference test vectors for implementing AIRC v0.2 message signing.

## Purpose

These test vectors help implementers verify their Ed25519 signing implementation is correct. All implementations should produce identical signatures for the same input.

## Test Keypair

Use this fixed keypair for all tests:

```json
{
  "publicKey": "MCowBQYDK2VwAyEAhT4X7iWhZhMldR4fJmQMYhqSUKQdFbYgV1SZkvwiJQo=",
  "privateKey": "MC4CAQAwBQYDK2VwBCIEIIwjKaqojasURJNw+oek9desGOmugdOFIr45XTBPykd8"
}
```

Generated with:
```javascript
const { generateKeyPairSync } = require('crypto');
const { publicKey, privateKey } = generateKeyPairSync('ed25519');
```

## Test 1: Canonical JSON

### Input Object

```json
{
  "v": "0.2",
  "from": "alice",
  "to": "bob",
  "timestamp": 1704672000,
  "id": "msg_test123",
  "nonce": "abc123xyz789",
  "body": "Hello, Bob!"
}
```

### Expected Canonical JSON

```
{"body":"Hello, Bob!","from":"alice","id":"msg_test123","nonce":"abc123xyz789","timestamp":1704672000,"to":"bob","v":"0.2"}
```

### Rules

- Keys sorted alphabetically
- No whitespace
- UTF-8 encoding
- Recursive sorting for nested objects
- Arrays preserve order (not sorted)

## Test 2: Simple Message Signing

### Message to Sign

```json
{
  "v": "0.2",
  "id": "msg_test123",
  "from": "alice",
  "to": "bob",
  "timestamp": 1704672000,
  "nonce": "abc123xyz789",
  "body": "Hello, Bob!"
}
```

### Expected Signature

```
JY/Bvn8DpKOhCYYjaAlSvU+o/7eDzkHzpzmtAQbzZkrxddkU+O4W0iF/rgQEbcFCbo6Su18ohHM7LvYRtzs5Cw==
```

### Signing Process

1. Clone the message object
2. Remove `signature` field (if present)
3. Serialize to canonical JSON: `{"body":"Hello, Bob!","from":"alice","id":"msg_test123","nonce":"abc123xyz789","timestamp":1704672000,"to":"bob","v":"0.2"}`
4. Sign UTF-8 bytes with Ed25519 private key
5. Base64-encode signature
6. Add signature to message

### Final Signed Message

```json
{
  "v": "0.2",
  "id": "msg_test123",
  "from": "alice",
  "to": "bob",
  "timestamp": 1704672000,
  "nonce": "abc123xyz789",
  "body": "Hello, Bob!",
  "signature": "JY/Bvn8DpKOhCYYjaAlSvU+o/7eDzkHzpzmtAQbzZkrxddkU+O4W0iF/rgQEbcFCbo6Su18ohHM7LvYRtzs5Cw=="
}
```

## Test 3: Message with Payload

### Message to Sign

```json
{
  "v": "0.2",
  "id": "msg_payload456",
  "from": "agent_x",
  "to": "agent_y",
  "timestamp": 1704672100,
  "nonce": "xyz789abc123",
  "body": "Task completed",
  "payload": {
    "type": "handoff",
    "status": "complete",
    "context": {
      "branch": "feature/auth",
      "files": ["auth.ts", "db.ts"]
    }
  }
}
```

### Expected Canonical JSON

```
{"body":"Task completed","from":"agent_x","id":"msg_payload456","nonce":"xyz789abc123","payload":{"context":{"branch":"feature/auth","files":["auth.ts","db.ts"]},"status":"complete","type":"handoff"},"timestamp":1704672100,"to":"agent_y","v":"0.2"}
```

### Expected Signature

```
cG08mGhzBIQjWYolDmLtSBzrO7UAyJ7mtYh62ggVhLzTx0p+ubqowiCi6hzMnCrNqb9Pi92ul1OJilz0QsVZBg==
```

## Test 4: Nested Object Sorting

### Input

```json
{
  "z": 1,
  "a": {
    "z": 2,
    "a": 3
  },
  "m": [3, 2, 1]
}
```

### Expected Canonical JSON

```
{"a":{"a":3,"z":2},"m":[3,2,1],"z":1}
```

### Notes

- Top-level keys sorted: `a`, `m`, `z`
- Nested object keys sorted: `a`, `z`
- Array order preserved: `[3, 2, 1]` not sorted

## Test 5: Special Characters

### Input

```json
{
  "message": "Hello \"World\"!\n\tTab and newline",
  "emoji": "🚀",
  "unicode": "中文"
}
```

### Expected Canonical JSON

```
{"emoji":"🚀","message":"Hello \"World\"!\n\tTab and newline","unicode":"中文"}
```

### Notes

- JSON escaping preserved
- UTF-8 emoji and Unicode handled correctly
- Whitespace characters escaped per JSON spec

## Test 6: Undefined Values

### Input

```json
{
  "a": 1,
  "b": null,
  "c": undefined,
  "d": 2
}
```

### Expected Canonical JSON

```
{"a":1,"b":null,"d":2}
```

### Notes

- `undefined` values are **excluded** from canonical JSON
- `null` values are **included**

## Verification Script

Use this Node.js script to verify your implementation:

```javascript
import { createVerify, createPublicKey } from 'crypto';

function canonicalJSON(obj) {
  if (obj === null || obj === undefined) return 'null';
  if (typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalJSON).join(',') + ']';
  }
  const sortedKeys = Object.keys(obj).sort();
  const pairs = sortedKeys
    .filter((k) => obj[k] !== undefined)
    .map((k) => `${JSON.stringify(k)}:${canonicalJSON(obj[k])}`);
  return '{' + pairs.join(',') + '}';
}

function verify(message, publicKeyBase64) {
  const { signature, ...messageWithoutSig } = message;
  const canonical = canonicalJSON(messageWithoutSig);

  const publicKey = createPublicKey({
    key: Buffer.from(publicKeyBase64, 'base64'),
    format: 'der',
    type: 'spki',
  });

  const verifier = createVerify(null);
  verifier.update(canonical, 'utf8');
  return verifier.verify(publicKey, Buffer.from(signature, 'base64'));
}

// Test
const publicKey = "MCowBQYDK2VwAyEAhT4X7iWhZhMldR4fJmQMYhqSUKQdFbYgV1SZkvwiJQo=";
const signedMessage = {
  "v": "0.2",
  "id": "msg_test123",
  "from": "alice",
  "to": "bob",
  "timestamp": 1704672000,
  "nonce": "abc123xyz789",
  "body": "Hello, Bob!",
  "signature": "JY/Bvn8DpKOhCYYjaAlSvU+o/7eDzkHzpzmtAQbzZkrxddkU+O4W0iF/rgQEbcFCbo6Su18ohHM7LvYRtzs5Cw=="
};

console.log(verify(signedMessage, publicKey)); // Should be true
```

## Python Reference

```python
import json
import base64
from cryptography.hazmat.primitives.asymmetric import ed25519
from cryptography.hazmat.primitives import serialization

def canonical_json(obj):
    if obj is None:
        return 'null'
    if isinstance(obj, (bool, int, float, str)):
        return json.dumps(obj, ensure_ascii=False, separators=(',', ':'))
    if isinstance(obj, list):
        return '[' + ','.join(canonical_json(item) for item in obj) + ']'
    if isinstance(obj, dict):
        sorted_items = sorted(
            (k, v) for k, v in obj.items() if v is not None
        )
        pairs = [f'{json.dumps(k)}:{canonical_json(v)}' for k, v in sorted_items]
        return '{' + ','.join(pairs) + '}'
    raise TypeError(f"Unserializable type: {type(obj)}")

def verify_signature(message, public_key_base64):
    message_copy = message.copy()
    signature = base64.b64decode(message_copy.pop('signature'))

    canonical = canonical_json(message_copy)

    public_key_der = base64.b64decode(public_key_base64)
    public_key = serialization.load_der_public_key(public_key_der)

    try:
        public_key.verify(signature, canonical.encode('utf-8'))
        return True
    except:
        return False
```

## Common Pitfalls

1. **Key Sorting**: Must be **recursive**. Nested objects need sorted keys too.
2. **Whitespace**: Canonical JSON has **no whitespace**. No spaces after `:` or `,`.
3. **Undefined vs Null**: `undefined` values are **excluded**, `null` values are **included**.
4. **Array Order**: Arrays are **not sorted**. Preserve original order.
5. **UTF-8 Encoding**: Sign the UTF-8 **bytes** of the canonical JSON, not a different encoding.
6. **Signature Removal**: Always **remove** the `signature` field before signing or verifying.
7. **Base64 Encoding**: Use standard Base64 (not base64url) for keys and signatures.

## Reference Implementations

- **TypeScript**: `/Users/sethstudio1/Projects/airc-ts/src/crypto.ts`
- **Python**: `/Users/sethstudio1/Projects/airc-python/airc/crypto.py`
- **MCP Server**: `/Users/sethstudio1/Projects/airc-mcp/crypto.js`

All three implementations must produce identical signatures for the same input.

## Version

- AIRC Protocol: v0.2.0
- Test Vectors: v1.0.0
- Last Updated: January 8, 2026
