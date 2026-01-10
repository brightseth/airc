#!/usr/bin/env node
/**
 * AIRC Test Vector Generator
 *
 * Generates real Ed25519 signatures for test vectors.
 * Run this to verify the test vectors document is accurate.
 */

import { sign as cryptoSign, verify as cryptoVerify, createPublicKey, createPrivateKey } from 'crypto';

// Test keypair (fixed for reproducibility)
const TEST_KEYPAIR = {
  publicKey: "MCowBQYDK2VwAyEAhT4X7iWhZhMldR4fJmQMYhqSUKQdFbYgV1SZkvwiJQo=",
  privateKey: "MC4CAQAwBQYDK2VwBCIEIIwjKaqojasURJNw+oek9desGOmugdOFIr45XTBPykd8"
};

// ============ Canonical JSON ============

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

// ============ Signing ============

function sign(obj, privateKeyBase64) {
  const toSign = { ...obj };
  delete toSign.signature;

  const canonical = canonicalJSON(toSign);

  const privateKey = createPrivateKey({
    key: Buffer.from(privateKeyBase64, 'base64'),
    format: 'der',
    type: 'pkcs8',
  });

  // Use crypto.sign() which handles Ed25519 properly
  const signature = cryptoSign(null, Buffer.from(canonical, 'utf8'), privateKey);

  return signature.toString('base64');
}

function verify(obj, publicKeyBase64) {
  if (!obj.signature || typeof obj.signature !== 'string') return false;

  const toVerify = { ...obj };
  const signature = toVerify.signature;
  delete toVerify.signature;

  const canonical = canonicalJSON(toVerify);

  try {
    const publicKey = createPublicKey({
      key: Buffer.from(publicKeyBase64, 'base64'),
      format: 'der',
      type: 'spki',
    });

    // Use crypto.verify() - pass public key directly
    return cryptoVerify(
      null,
      Buffer.from(canonical, 'utf8'),
      publicKey,
      Buffer.from(signature, 'base64')
    );
  } catch (e) {
    console.error('Verification error:', e.message);
    return false;
  }
}

// ============ Test Cases ============

console.log('='.repeat(70));
console.log('AIRC Ed25519 Signing Test Vector Generator');
console.log('='.repeat(70));
console.log();

// Test 1: Canonical JSON
console.log('TEST 1: Canonical JSON');
console.log('-'.repeat(70));
const test1 = {
  "v": "0.2",
  "from": "alice",
  "to": "bob",
  "timestamp": 1704672000,
  "id": "msg_test123",
  "nonce": "abc123xyz789",
  "body": "Hello, Bob!"
};
const canonical1 = canonicalJSON(test1);
console.log('Input:', JSON.stringify(test1));
console.log('Canonical:', canonical1);
console.log('Expected: {"body":"Hello, Bob!","from":"alice","id":"msg_test123","nonce":"abc123xyz789","timestamp":1704672000,"to":"bob","v":"0.2"}');
console.log('Match:', canonical1 === '{"body":"Hello, Bob!","from":"alice","id":"msg_test123","nonce":"abc123xyz789","timestamp":1704672000,"to":"bob","v":"0.2"}' ? '✓' : '✗');
console.log();

// Test 2: Simple Message Signing
console.log('TEST 2: Simple Message Signing');
console.log('-'.repeat(70));
const test2 = {
  "v": "0.2",
  "id": "msg_test123",
  "from": "alice",
  "to": "bob",
  "timestamp": 1704672000,
  "nonce": "abc123xyz789",
  "body": "Hello, Bob!"
};
const signature2 = sign(test2, TEST_KEYPAIR.privateKey);
const signed2 = { ...test2, signature: signature2 };
console.log('Message:', JSON.stringify(test2, null, 2));
console.log('Canonical for signing:', canonicalJSON(test2));
console.log('Signature:', signature2);
const verifyResult = verify(signed2, TEST_KEYPAIR.publicKey);
console.log('Canonical for verify:', canonicalJSON({...signed2, signature: undefined}));
console.log('Verification:', verifyResult ? '✓ VALID' : '✗ INVALID');
console.log();

// Test 3: Message with Payload
console.log('TEST 3: Message with Payload');
console.log('-'.repeat(70));
const test3 = {
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
};
const canonical3 = canonicalJSON(test3);
const signature3 = sign(test3, TEST_KEYPAIR.privateKey);
const signed3 = { ...test3, signature: signature3 };
console.log('Canonical:', canonical3);
console.log('Signature:', signature3);
console.log('Verification:', verify(signed3, TEST_KEYPAIR.publicKey) ? '✓ VALID' : '✗ INVALID');
console.log();

// Test 4: Nested Object Sorting
console.log('TEST 4: Nested Object Sorting');
console.log('-'.repeat(70));
const test4 = {
  "z": 1,
  "a": {
    "z": 2,
    "a": 3
  },
  "m": [3, 2, 1]
};
const canonical4 = canonicalJSON(test4);
console.log('Input:', JSON.stringify(test4));
console.log('Canonical:', canonical4);
console.log('Expected: {"a":{"a":3,"z":2},"m":[3,2,1],"z":1}');
console.log('Match:', canonical4 === '{"a":{"a":3,"z":2},"m":[3,2,1],"z":1}' ? '✓' : '✗');
console.log();

// Test 5: Special Characters
console.log('TEST 5: Special Characters');
console.log('-'.repeat(70));
const test5 = {
  "message": "Hello \"World\"!\n\tTab and newline",
  "emoji": "🚀",
  "unicode": "中文"
};
const canonical5 = canonicalJSON(test5);
console.log('Input:', JSON.stringify(test5));
console.log('Canonical:', canonical5);
const expected5 = '{"emoji":"🚀","message":"Hello \\"World\\"!\\n\\tTab and newline","unicode":"中文"}';
console.log('Expected:', expected5);
console.log('Match:', canonical5 === expected5 ? '✓' : '✗');
console.log();

// Test 6: Undefined Values
console.log('TEST 6: Undefined Values');
console.log('-'.repeat(70));
const test6 = {
  "a": 1,
  "b": null,
  "c": undefined,
  "d": 2
};
const canonical6 = canonicalJSON(test6);
console.log('Input:', JSON.stringify(test6));
console.log('Canonical:', canonical6);
console.log('Expected: {"a":1,"b":null,"d":2}');
console.log('Match:', canonical6 === '{"a":1,"b":null,"d":2}' ? '✓' : '✗');
console.log('Note: undefined excluded, null included ✓');
console.log();

// Summary
console.log('='.repeat(70));
console.log('Test Vector Generation Complete');
console.log('='.repeat(70));
console.log();
console.log('Use these signatures in SIGNING_TEST_VECTORS.md:');
console.log('- Test 2 signature:', signature2);
console.log('- Test 3 signature:', signature3);
console.log();
console.log('Test keypair (fixed):');
console.log('- Public:', TEST_KEYPAIR.publicKey);
console.log('- Private:', TEST_KEYPAIR.privateKey);
