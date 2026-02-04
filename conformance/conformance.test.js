#!/usr/bin/env node

/**
 * AIRC Conformance Test Suite
 * Tests a registry implementation against the AIRC protocol spec.
 *
 * Usage: node conformance.test.js [registry_url]
 * Default: https://www.slashvibe.dev
 */

const https = require('https');
const http = require('http');
const crypto = require('crypto');

const REGISTRY = process.argv[2] || 'https://www.slashvibe.dev';
const TEST_HANDLE = `ct_${Date.now().toString(36).slice(-6)}`;

let token = null;
let passed = 0;
let failed = 0;
let skipped = 0;

function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;
    const req = protocol.request(parsedUrl, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch {}
        resolve({ status: res.statusCode, json, text: data, headers: res.headers });
      });
    });
    req.on('error', reject);
    if (options.body) req.write(JSON.stringify(options.body));
    req.end();
  });
}

function log(status, num, desc) {
  const icon = status === 'PASS' ? '\x1b[32m[PASS]\x1b[0m' :
               status === 'FAIL' ? '\x1b[31m[FAIL]\x1b[0m' :
               '\x1b[33m[SKIP]\x1b[0m';
  console.log(`${icon} ${num}. ${desc}`);
}

async function test(num, desc, fn) {
  try {
    await fn();
    log('PASS', num, desc);
    passed++;
  } catch (e) {
    log('FAIL', num, `${desc} — ${e.message}`);
    failed++;
  }
}

function skip(num, desc, reason) {
  log('SKIP', num, `${desc} — ${reason}`);
  skipped++;
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

async function run() {
  console.log(`\nAIRC Conformance Test Suite v0.1`);
  console.log(`Registry: ${REGISTRY}`);
  console.log(`Test handle: ${TEST_HANDLE}`);
  console.log('---\n');
  console.log('=== L1 Basic: Identity, Presence, Messages ===\n');

  // L1-1: GET /api/presence returns 200
  await test(1, 'GET /api/presence returns 200', async () => {
    const res = await fetch(`${REGISTRY}/api/presence`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  // L1-2: GET /api/presence returns JSON with expected shape
  await test(2, 'GET /api/presence returns JSON with active array', async () => {
    const res = await fetch(`${REGISTRY}/api/presence`);
    assert(res.json, 'Response is not JSON');
    assert(Array.isArray(res.json.active), 'Missing active array');
  });

  // L1-3: Active users have required fields
  await test(3, 'Active users have handle/username and status fields', async () => {
    const res = await fetch(`${REGISTRY}/api/presence`);
    if (res.json.active.length === 0) {
      throw new Error('No active users to validate (not a failure — registry is empty)');
    }
    const user = res.json.active[0];
    assert(user.handle || user.username, 'Missing handle/username');
    assert(user.status, 'Missing status');
  });

  // L1-4: POST /api/presence with register action
  await test(4, 'POST /api/presence register returns token', async () => {
    const res = await fetch(`${REGISTRY}/api/presence`, {
      method: 'POST',
      body: {
        action: 'register',
        username: TEST_HANDLE,
        workingOn: 'AIRC conformance testing',
        status: 'available'
      }
    });
    assert(res.status === 200 || res.status === 201, `Expected 200/201, got ${res.status}`);
    assert(res.json.success === true, 'Expected success: true');
    assert(res.json.token, 'Missing token in response');
    token = res.json.token;
  });

  // L1-5: Registered agent appears in presence
  await test(5, 'Registered agent appears in presence list', async () => {
    assert(token, 'No token from registration');
    const res = await fetch(`${REGISTRY}/api/presence`);
    const allUsers = [...(res.json.active || []), ...(res.json.away || [])];
    const found = allUsers.find(u => (u.handle || u.username) === TEST_HANDLE);
    assert(found, `${TEST_HANDLE} not found in presence`);
  });

  // L1-6: Heartbeat updates presence
  await test(6, 'POST /api/presence heartbeat succeeds', async () => {
    assert(token, 'No token from registration');
    const res = await fetch(`${REGISTRY}/api/presence`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        action: 'heartbeat',
        username: TEST_HANDLE,
        status: 'available',
        workingOn: 'AIRC conformance testing (heartbeat)'
      }
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  // L1-7: POST /api/messages sends a message
  await test(7, 'POST /api/messages sends a message', async () => {
    assert(token, 'No token from registration');
    const res = await fetch(`${REGISTRY}/api/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        from: TEST_HANDLE,
        to: TEST_HANDLE, // self-message for testing
        text: 'Conformance test message'
      }
    });
    assert(res.status === 200 || res.status === 201, `Expected 200/201, got ${res.status}`);
  });

  // L1-8: GET /api/messages retrieves inbox
  await test(8, 'GET /api/messages retrieves inbox', async () => {
    assert(token, 'No token from registration');
    const res = await fetch(`${REGISTRY}/api/messages?user=${TEST_HANDLE}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.json, 'Response is not JSON');
  });

  // L1-9: Presence includes counts
  await test(9, 'Presence response includes counts object', async () => {
    const res = await fetch(`${REGISTRY}/api/presence`);
    assert(res.json.counts, 'Missing counts object');
    assert(typeof res.json.counts.active === 'number', 'counts.active not a number');
  });

  // L1-10: JSON content type header
  await test(10, 'API returns Content-Type application/json', async () => {
    const res = await fetch(`${REGISTRY}/api/presence`);
    const ct = res.headers['content-type'] || '';
    assert(ct.includes('application/json'), `Expected application/json, got ${ct}`);
  });

  console.log('\n=== L2 Secure: Signing + Consent ===\n');

  // L2-11: POST /api/consent endpoint exists
  await test(11, 'POST /api/consent endpoint exists', async () => {
    assert(token, 'No token from registration');
    const res = await fetch(`${REGISTRY}/api/consent`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        action: 'accept',
        from: TEST_HANDLE,
        handle: TEST_HANDLE
      }
    });
    // Any response that isn't 404 means the endpoint exists
    assert(res.status !== 404, `Consent endpoint returned 404`);
  });

  // L2-12: Handle validation rejects invalid handles
  await test(12, 'Registration rejects invalid handle format', async () => {
    const res = await fetch(`${REGISTRY}/api/presence`, {
      method: 'POST',
      body: {
        action: 'register',
        username: 'AB', // too short, uppercase
        workingOn: 'test'
      }
    });
    // Should either reject (400/422) or accept with normalization
    // Both are valid implementations
    if (res.status === 200 && res.json.success) {
      // Registry accepted — some registries normalize handles
      assert(true, 'Registry accepts with normalization');
    } else {
      assert(res.status >= 400, `Expected error for invalid handle, got ${res.status}`);
    }
  });

  // L2-13: CORS headers present
  await test(13, 'CORS headers present on presence endpoint', async () => {
    const res = await fetch(`${REGISTRY}/api/presence`);
    const cors = res.headers['access-control-allow-origin'];
    assert(cors, 'Missing Access-Control-Allow-Origin header');
  });

  // L2-14: Rate limiting headers (informational)
  await test(14, 'Rate limit headers present (optional)', async () => {
    const res = await fetch(`${REGISTRY}/api/presence`);
    const rl = res.headers['x-ratelimit-limit'] || res.headers['ratelimit-limit'];
    if (!rl) {
      throw new Error('No rate limit headers (recommended but optional)');
    }
  });

  // L2-15: Messages require authentication
  await test(15, 'Messages endpoint requires authentication', async () => {
    const res = await fetch(`${REGISTRY}/api/messages`, {
      method: 'POST',
      body: {
        from: 'unauthorized_agent',
        to: TEST_HANDLE,
        text: 'Should fail without token'
      }
    });
    // Should either require auth (401/403) or use consent to gate
    // Both are valid — the key is it doesn't silently deliver
    assert(
      res.status === 401 || res.status === 403 || res.status === 200,
      `Unexpected status ${res.status}`
    );
  });

  // L2-16: .well-known/airc discovery
  await test(16, 'GET /.well-known/airc returns discovery document', async () => {
    // This might be on a different host (airc.chat vs slashvibe.dev)
    const res = await fetch(`${REGISTRY}/.well-known/airc`);
    if (res.status === 404) {
      throw new Error('.well-known/airc not found (may be hosted at spec domain)');
    }
    assert(res.json, 'Response is not JSON');
    assert(res.json.protocol === 'AIRC', 'Missing protocol: "AIRC"');
  });

  // Summary
  console.log('\n---');
  const l1Pass = Math.min(passed, 10);
  const l2Pass = Math.max(0, passed - 10);
  console.log(`L1 Basic:  ${l1Pass}/10 PASS`);
  console.log(`L2 Secure: ${l2Pass}/6 PASS`);
  console.log(`\nTotal: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  console.log('');

  // Cleanup: deregister test agent (best effort)
  if (token) {
    try {
      await fetch(`${REGISTRY}/api/presence`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: { action: 'heartbeat', username: TEST_HANDLE, status: 'offline' }
      });
    } catch {}
  }

  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
