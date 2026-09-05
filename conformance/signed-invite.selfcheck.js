#!/usr/bin/env node
// Tests the reference verifier (conformance/lib/signed-invite-verify.js) against the rev-2
// spec: independent fixed-seed keys, golden vectors, injected clock/pins/ledger/actions,
// isolated single-field mutations, cancel, rotation, envelope/type binding, replay vs
// idempotent repeat, malformed input (fail closed), dates (fail closed).
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const V = require('./lib/signed-invite-verify.js');

// deterministic keys from fixed seeds (Ed25519 private key = 32-byte seed)
function keyFromSeed(hex) {
  const seed = Buffer.from(hex, 'hex');
  const pkcs8 = Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), seed]);
  const privateKey = crypto.createPrivateKey({ key: pkcs8, format: 'der', type: 'pkcs8' });
  const raw = crypto.createPublicKey(privateKey).export({ type: 'spki', format: 'der' }).subarray(-32);
  return { privateKey, raw, keyId: V.keyIdOf(raw) };
}
const OP = keyFromSeed('11'.repeat(32));      // operator's real key
const OP2 = keyFromSeed('22'.repeat(32));     // operator's rotated key
const MAL = keyFromSeed('33'.repeat(32));     // attacker key

const T0 = Date.parse('2026-09-04T18:00:00Z');
const mkClock = (ms) => () => ms;
function mkPins(entries) { return { get: (op, reg) => entries[`${op}@${reg}`] || null }; }
function mkLedger() { const m = new Map(); return { seen: (k, n) => m.get(`${k}:${n}`) || false, record: (k, n, c) => m.set(`${k}:${n}`, c) }; }
function mkActions(map) { return { get: (id) => (map && id in map ? map[id] : null) }; }

const base = {
  domain: V.DOMAIN, protocol_version: '0.2', type: 'meet:invite', from: 'brightseth', to: 'grokbot',
  invite_id: 'mi_20260904_grokbot_003', url: 'https://meet.google.com/mrq-ujjh-qna', surface: 'google-meet',
  starts_at: null, expires_at: '2026-09-04T18:30:00Z', issued_at: '2026-09-04T18:00:00Z', nonce: 'AAAAAAAAAAAAAAAAAAAAAA',
};
function envelope(signed, key, opts = {}) {
  const data = { ...signed };
  if (key) data.sig = opts.sig || V.sign(signed, key.privateKey);
  const msg = { type: opts.envType || signed.type, payload: { type: opts.payloadType || signed.type, data: { ...data, invite_id: opts.envInvite || signed.invite_id } } };
  return JSON.stringify(msg);
}
const pinnedOp = { 'brightseth@https://www.slashvibe.dev': { raw: OP.raw, keyId: OP.keyId, version: 1, retired: false, signedRequired: true } };
const ctx = (over = {}) => ({ me: 'grokbot', operator: 'brightseth', registry: 'https://www.slashvibe.dev', pinStore: mkPins(pinnedOp), nonceLedger: mkLedger(), actions: mkActions(null), now: mkClock(T0 + 60e3), ...over });

const results = [];
const check = (name, res, want) => results.push([(res.ok ? 'accepted:' + (res.provenance || '') + (res.repeat ? ':repeat' : '') : res.reason) === want ? '✓' : '✗', name, res.ok ? 'accepted:' + res.provenance + (res.repeat ? ':repeat' : '') : res.reason, want]);
const run = (raw, over) => V.verify({ ...ctx(over), rawJson: raw });

// golden vector: fixed key + fixed object → fixed canonical bytes + signature
const golden = { canonical: V.canonical(base), signature: V.sign(base, OP.privateKey).value, key_id: OP.keyId, operator_seed: '11'.repeat(32) };
fs.writeFileSync(path.join(__dirname, 'vectors', 'signed-invite-v0.1.json'), JSON.stringify({ profile: 'airc-meet-v1', object: base, ...golden }, null, 1) + '\n');
const goldenAgain = V.sign(base, OP.privateKey).value;
results.push([goldenAgain === golden.signature ? '✓' : '✗', 'golden: deterministic signature for fixed key+object', goldenAgain === golden.signature, true]);

check('signed invite accepted', run(envelope(base, OP)), 'accepted:signed');
check('identical delivery again → idempotent repeat', (() => { const l = mkLedger(); const c = { nonceLedger: l }; run(envelope(base, OP), c); return run(envelope(base, OP), c); })(), 'accepted:signed:repeat');
check('same nonce, different bytes → replay', (() => { const l = mkLedger(); const c = { nonceLedger: l }; run(envelope(base, OP), c); return run(envelope({ ...base, url: 'https://meet.google.com/zzz-zzzz-zzz' }, OP), c); })(), 'replay');
check('unsigned after pin → unsigned', run(envelope(base, null)), 'unsigned');
check('unsigned before any pin → accepted:unsigned', run(envelope(base, null), { pinStore: mkPins({}) }), 'accepted:unsigned');
check('signed but nothing pinned → unknown_key (no TOFU from wire)', run(envelope(base, OP), { pinStore: mkPins({}) }), 'unknown_key');
check('attacker key, correct key_id claim → key_mismatch', run(envelope(base, MAL)), 'key_mismatch');
check('attacker signs but relabels key_id to the pinned one → bad_signature', run(envelope(base, MAL, { sig: { ...V.sign(base, MAL.privateKey), key_id: OP.keyId } })), 'bad_signature');
check('retired key → key_retired', run(envelope(base, OP), { pinStore: mkPins({ 'brightseth@https://www.slashvibe.dev': { ...pinnedOp['brightseth@https://www.slashvibe.dev'], retired: true } }) }), 'key_retired');
check('rotation: new key pinned, old signature → key_mismatch', run(envelope(base, OP), { pinStore: mkPins({ 'brightseth@https://www.slashvibe.dev': { raw: OP2.raw, keyId: OP2.keyId, version: 2, retired: false, signedRequired: true } }) }), 'key_mismatch');
check('rotation: new key pinned, new signature → accepted', run(envelope(base, OP2), { pinStore: mkPins({ 'brightseth@https://www.slashvibe.dev': { raw: OP2.raw, keyId: OP2.keyId, version: 2, retired: false, signedRequired: true } }) }), 'accepted:signed');
check('url tampered on the wire (signature over original) → bad_signature', run(envelope({ ...base, url: 'https://evil.example/x' }, OP, { sig: V.sign(base, OP.privateKey) })), 'bad_signature');
check('wrong operator signs → not_my_operator', run(envelope({ ...base, from: 'mallory' }, OP)), 'not_my_operator');
check('addressed to someone else → not_my_operator', run(envelope({ ...base, to: 'spirit_sedona' }, OP)), 'not_my_operator');
check('relabeled: signed invite sent as meet:leave → envelope_mismatch', run(envelope(base, OP, { envType: 'meet:leave', payloadType: 'meet:leave' })), 'envelope_mismatch');
check('invite_id tampered on the wire → bad_signature', run(envelope(base, OP, { envInvite: 'mi_other' })), 'bad_signature');
check('wrong domain → bad_shape', run(envelope({ ...base, domain: 'airc-x' }, OP)), 'bad_shape');
check('unknown field → bad_shape', run(envelope({ ...base, extra: 'x' }, OP)), 'bad_shape');
check('number in signed object → bad_shape', run(JSON.stringify({ type: 'meet:invite', payload: { type: 'meet:invite', data: { ...base, starts_at: 5, sig: V.sign({ ...base, starts_at: 5 }, OP.privateKey) } } })), 'bad_shape');
check('expired (now+skew ≥ expires_at) → expired', run(envelope(base, OP), { now: mkClock(Date.parse('2026-09-04T18:28:30Z')) }), 'expired');
check('delivered 4 min late (no freshness window) → accepted', run(envelope(base, OP), { now: mkClock(T0 + 4 * 60e3) }), 'accepted:signed');
check('issued_at 3 min in the future → bad_time', run(envelope(base, OP), { now: mkClock(T0 - 3 * 60e3) }), 'bad_time');
check('malformed timestamp → bad_time (fail closed)', run(envelope({ ...base, expires_at: 'tomorrow' }, OP)), 'bad_time');
check('expires_at before issued_at → bad_time', run(envelope({ ...base, expires_at: '2026-09-04T17:00:00Z' }, OP)), 'bad_time');
check('missing nonce → bad_shape', run(envelope((() => { const b = { ...base }; delete b.nonce; return b; })(), OP)), 'bad_shape');
check('short nonce → bad_nonce', run(envelope({ ...base, nonce: 'abc' }, OP)), 'bad_nonce');
check('null replaced by 1e400 on the wire → malformed', run(envelope(base, OP).replace('"starts_at":null', '"starts_at":1e400')), 'malformed');
check('duplicate url key injected → malformed', run(envelope(base, OP).replace('"url":', '"url":"https://evil.example/","url":')), 'malformed');
check('lone surrogate → malformed', run(envelope(base, OP).replace('grokbot', 'grok\ud800bot')), 'malformed');
check('null payload → malformed (no throw)', run('{"type":"meet:invite","payload":null}'), 'malformed');
check('signature value garbage → bad_signature (no throw)', run(envelope(base, OP, { sig: { alg: 'ed25519', key_id: OP.keyId, value: '!!!' } })), 'bad_signature');
check('action record matches → accepted', run(envelope(base, OP), { actions: mkActions({ mi_20260904_grokbot_003: { to: 'grokbot', expires_at: base.expires_at, status: 'pending' } }) }), 'accepted:signed');
check('action expires_at differs → action_mismatch', run(envelope(base, OP), { actions: mkActions({ mi_20260904_grokbot_003: { to: 'grokbot', expires_at: '2026-09-04T19:00:00Z', status: 'pending' } }) }), 'action_mismatch');
check('action already cancelled → action_not_pending', run(envelope(base, OP), { actions: mkActions({ mi_20260904_grokbot_003: { to: 'grokbot', expires_at: base.expires_at, status: 'cancelled' } }) }), 'action_not_pending');
check('action lookup unavailable → action_unavailable (no fallback)', run(envelope(base, OP), { actions: mkActions({ mi_20260904_grokbot_003: 'unavailable' }) }), 'action_unavailable');
const cancel = { domain: V.DOMAIN, protocol_version: '0.2', type: 'meet:leave', from: 'brightseth', to: 'grokbot', invite_id: base.invite_id, issued_at: '2026-09-04T19:30:00Z', nonce: 'BBBBBBBBBBBBBBBBBBBBBB', reason: 'done' };
check('signed cancel after the invite deadline → accepted (cancel has its own clock)', run(envelope(cancel, OP), { now: mkClock(Date.parse('2026-09-04T19:31:00Z')) }), 'accepted:signed');
check('forged cancel (attacker key) → key_mismatch', run(envelope(cancel, MAL), { now: mkClock(Date.parse('2026-09-04T19:31:00Z')) }), 'key_mismatch');
check('cancel carrying an invite-only field → bad_shape', run(envelope({ ...cancel, url: 'https://x' }, OP), { now: mkClock(Date.parse('2026-09-04T19:31:00Z')) }), 'bad_shape');

for (const [m, n, got, want] of results) console.log(`${m} ${n}${m === '✗' ? `  (got ${got}, want ${want})` : ''}`);
const fails = results.filter((r) => r[0] === '✗').length;
console.log(`\n${results.length - fails}/${results.length} pass`);
process.exit(fails ? 1 : 0);
