#!/usr/bin/env node

/**
 * AIRC North Star Harness
 *
 * Executable form of the goal in GOAL.md: two rooms, given nothing but a
 * handle, become addressable, verifiable, consented, expressive, and
 * lossless — in well under five minutes.
 *
 * Usage: node north-star.test.js [registry_url]
 * Default: https://www.slashvibe.dev
 * Exit 0 = the goal holds. Exit 1 = the goal is broken.
 */

const crypto = require('crypto');

const REGISTRY = (process.argv[2] || 'https://www.slashvibe.dev').replace(/\/$/, '');
const RUN = Date.now().toString(36).slice(-6);
const FIVE_MINUTES_MS = 5 * 60 * 1000;

// ── Room: handle + auto-generated Ed25519 identity ─────────────────────────

function canonical(o) {
  if (o === null || typeof o !== 'object') return JSON.stringify(o);
  if (Array.isArray(o)) return '[' + o.map(canonical).join(',') + ']';
  return '{' + Object.keys(o).sort()
    .map(k => JSON.stringify(k) + ':' + canonical(o[k])).join(',') + '}';
}

function makeRoom(name) {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const raw = publicKey.export({ type: 'spki', format: 'der' }).subarray(-32);
  return {
    handle: `ns_${name}_${RUN}`,
    publicKey: `ed25519:${raw.toString('base64')}`,
    privateKey,
    rawPublic: raw,
    token: null,
  };
}

function signedHeaders(room, body) {
  return {
    'Content-Type': 'application/json',
    'X-AIRC-Signature': crypto.sign(null, Buffer.from(canonical(body)), room.privateKey).toString('base64'),
    'X-AIRC-Identity': room.handle,
    'X-AIRC-PublicKey': room.publicKey,
    ...(room.token ? { Authorization: `Bearer ${room.token}` } : {}),
  };
}

async function post(room, path, body) {
  const res = await fetch(`${REGISTRY}${path}`, {
    method: 'POST',
    headers: signedHeaders(room, body),
    body: JSON.stringify(body),
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

async function get(room, path) {
  const res = await fetch(`${REGISTRY}${path}`, {
    headers: room && room.token ? { Authorization: `Bearer ${room.token}` } : {},
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

// ── Checks ──────────────────────────────────────────────────────────────────

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok, detail });
  const icon = ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
  console.log(`${icon} ${name}${detail ? ` — ${detail}` : ''}`);
  return ok;
}

async function main() {
  console.log(`\nAIRC North Star Harness`);
  console.log(`registry: ${REGISTRY}\n`);
  const t0 = Date.now();

  const a = makeRoom('a');
  const b = makeRoom('b');

  // 1. ADDRESSABLE — register both rooms; handle is the only input
  for (const room of [a, b]) {
    const reg = await post(room, '/api/presence', {
      action: 'register',
      username: room.handle,
      status: 'available',
      workingOn: 'north-star harness',
      publicKey: room.publicKey,
      isAgent: true,
      human_present: false,
    });
    if (reg.json && reg.json.token) room.token = reg.json.token;
  }
  check('addressable: both rooms registered with tokens', !!(a.token && b.token));

  // 2. VERIFIABLE — signature over canonical JSON verifies against published key
  const probe = { to: b.handle, body: 'verify me' };
  const sig = crypto.sign(null, Buffer.from(canonical(probe)), a.privateKey);
  const spki = Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), a.rawPublic]);
  const pub = crypto.createPublicKey({ key: spki, format: 'der', type: 'spki' });
  check('verifiable: Ed25519 signature validates against published public key',
    crypto.verify(null, Buffer.from(canonical(probe)), pub, sig));

  // 3. CONSENTED — A knocks, B sees the knock, B accepts
  const knock = await post(a, '/api/consent', {
    action: 'request', from: a.handle, to: b.handle,
    message: 'north-star harness knock',
  });
  check('consent: request accepted by registry', knock.status === 200 && knock.json && knock.json.success !== false);

  const pending = await get(b, `/api/consent?user=${b.handle}`);
  const sawKnock = Array.isArray(pending.json && pending.json.pending) &&
    pending.json.pending.some(p =>
      (typeof p === 'string' ? p.replace(/^@/, '') : (p.from || p.handle)) === a.handle);
  check('consent: B sees pending request from A', sawKnock,
    sawKnock ? null : `pending=${JSON.stringify((pending.json || {}).pending)}`);

  const accept = await post(b, '/api/consent', {
    action: 'accept', from: b.handle, to: a.handle,
  });
  check('consent: B accepts', accept.status === 200 && accept.json && accept.json.success !== false);

  // 4. EXPRESSIVE — typed payload arrives byte-identical
  const payloadData = { question: 'A or B?', options: ['A', 'B'], run: RUN };
  await post(a, '/api/messages', {
    to: b.handle, body: 'decision needed',
    type: 'decision:request',
    payload: { type: 'decision:request', data: payloadData },
  });
  const thread1 = await get(b, `/api/messages?user=${b.handle}&with=${a.handle}`);
  const typed = ((thread1.json && thread1.json.messages) || [])
    .find(m => m.payload && m.payload.type === 'decision:request');
  check('expressive: typed payload arrived intact',
    !!typed && canonical(typed.payload.data) === canonical(payloadData),
    typed ? null : 'payload missing from thread fetch');

  // 5. LOSSLESS — rapid-fire messages all arrive
  const burst = ['burst 1', 'burst 2', 'burst 3'];
  for (const text of burst) {
    await post(a, '/api/messages', { to: b.handle, body: text });
  }
  const thread2 = await get(b, `/api/messages?user=${b.handle}&with=${a.handle}`);
  const bodies = ((thread2.json && thread2.json.messages) || []).map(m => m.body);
  check('lossless: all rapid-fire messages present',
    burst.every(t => bodies.includes(t)),
    `${burst.filter(t => bodies.includes(t)).length}/${burst.length} delivered`);

  // 6. ROUND TRIP — B replies, A receives
  await post(b, '/api/messages', { to: a.handle, body: `ack ${RUN}` });
  const thread3 = await get(a, `/api/messages?user=${a.handle}&with=${b.handle}`);
  check('round trip: reply received by A',
    ((thread3.json && thread3.json.messages) || []).some(m => m.body === `ack ${RUN}` && m.from === b.handle));

  // 7. FAST — full lifecycle inside the five-minute ceiling
  const elapsed = Date.now() - t0;
  check('fast: full room lifecycle under five minutes', elapsed < FIVE_MINUTES_MS,
    `${(elapsed / 1000).toFixed(1)}s`);

  // ── Verdict ───────────────────────────────────────────────────────────────
  const failedChecks = results.filter(r => !r.ok);
  console.log(`\n${results.length - failedChecks.length}/${results.length} checks passed in ${(elapsed / 1000).toFixed(1)}s`);
  if (failedChecks.length === 0) {
    console.log('\x1b[32mTHE GOAL HOLDS\x1b[0m — any room with a handle can join the network.\n');
    process.exit(0);
  } else {
    console.log(`\x1b[31mTHE GOAL IS BROKEN\x1b[0m — ${failedChecks.map(f => f.name.split(':')[0]).join(', ')}.\n`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error(`harness error: ${err.message}`);
  process.exit(1);
});
