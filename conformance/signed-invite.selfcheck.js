#!/usr/bin/env node
// Tests conformance/lib/signed-invite-verify.js (rev 3). Golden vectors are COMPARED against
// conformance/vectors/signed-invite-v0.1.json; regenerate only with --regen.
const crypto = require('crypto'); const fs = require('fs'); const path = require('path');
const V = require('./lib/signed-invite-verify.js');
const REGEN = process.argv.includes('--regen');
const VEC = path.join(__dirname, 'vectors', 'signed-invite-v0.1.json');

function keyFromSeed(hex) {
  const privateKey = crypto.createPrivateKey({ key: Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), Buffer.from(hex, 'hex')]), format: 'der', type: 'pkcs8' });
  const raw = crypto.createPublicKey(privateKey).export({ type: 'spki', format: 'der' }).subarray(-32);
  return { privateKey, raw, keyId: V.keyIdOf(raw) };
}
const OP = keyFromSeed('11'.repeat(32)), OP2 = keyFromSeed('22'.repeat(32)), MAL = keyFromSeed('33'.repeat(32));
const T0 = Date.parse('2026-09-04T18:00:00Z'); const at = (iso) => () => Date.parse(iso); const clock = (ms) => () => ms;

function mkLedger(opts = {}) {
  const byNonce = new Map(), byInvite = new Map(), tomb = new Set();
  return {
    claim: ({ keyId, nonce, inviteId, type, canonical }) => {
      if (opts.fail) throw new Error('ledger down');
      const k = `${keyId}:${nonce}`;
      if (byNonce.has(k)) return { status: byNonce.get(k) === canonical ? 'repeat' : 'conflict' };
      if (type === 'meet:invite' && byInvite.has(inviteId) && byInvite.get(inviteId) !== canonical) return { status: 'invite_conflict' };
      byNonce.set(k, canonical); if (type === 'meet:invite') byInvite.set(inviteId, canonical); return { status: 'new' };
    },
    tombstone: (id) => tomb.add(id), isTombstoned: (id) => tomb.has(id), hasInvite: (id) => byInvite.has(id),
  };
}
const pins = (state, key = OP, extra = {}) => ({ get: () => (state === 'none' ? { state: 'none' } : { state, raw: key.raw, keyId: key.keyId, ...extra }) });
const actions = (map, fail) => ({ get: (id) => { if (fail) throw new Error('db down'); return map && id in map ? map[id] : null; } });

const base = { domain: V.DOMAIN, protocol_version: '0.2', type: 'meet:invite', from: 'brightseth', to: 'grokbot', invite_id: 'mi_20260904_grokbot_003', url: 'https://meet.google.com/mrq-ujjh-qna', surface: 'google-meet', starts_at: null, expires_at: '2026-09-04T18:30:00Z', issued_at: '2026-09-04T18:00:00Z', nonce: 'AAAAAAAAAAAAAAAAAAAAAA' };
const cancel = { domain: V.DOMAIN, protocol_version: '0.2', type: 'meet:leave', from: 'brightseth', to: 'grokbot', invite_id: base.invite_id, issued_at: '2026-09-04T19:30:00Z', nonce: 'BBBBBBBBBBBBBBBBBBBBBB', reason: 'done' };
function env(signed, key, o = {}) {
  const data = { ...signed }; if (key) data.sig = o.sig || V.sign(signed, key.privateKey);
  const msg = { type: o.envType === undefined ? signed.type : o.envType, payload: { type: o.payloadType || signed.type, data } };
  if (o.outerInvite) msg.invite_id = o.outerInvite; if (o.envType === null) delete msg.type;
  return JSON.stringify(msg);
}
const ctx = (over = {}) => ({ expect: 'meet:invite', me: 'grokbot', operator: 'brightseth', registry: 'https://www.slashvibe.dev', pinStore: pins('pinned'), ledger: mkLedger(), actions: actions(null), now: clock(T0 + 60e3), ...over });
const run = (raw, over) => V.verify({ ...ctx(over), rawJson: raw });
const R = []; const show = (r) => (r.ok ? `accepted:${r.provenance}${r.repeat ? ':repeat' : ''}${r.effect ? ':' + r.effect : ''}` : r.reason);
const check = (name, res, want) => R.push([show(res) === want ? '✓' : '✗', name, show(res), want]);

// ---- golden vectors: compared, never overwritten by a test run
const vectors = {
  profile: 'airc-meet-v1', operator_seed: '11'.repeat(32), key_id: OP.keyId,
  cases: [
    { name: 'base invite', object: base },
    { name: 'starts_at absent (distinct from null)', object: (() => { const b = { ...base, nonce: 'CCCCCCCCCCCCCCCCCCCCCC' }; delete b.starts_at; return b; })() },
    { name: 'escaped quotes and backslash in reason (cancel)', object: { ...cancel, nonce: 'DDDDDDDDDDDDDDDDDDDDDD', reason: 'say "hi" \\ done' } },
    { name: 'supplementary-plane text in surface (JCS code-unit order)', object: { ...base, nonce: 'EEEEEEEEEEEEEEEEEEEEEE', surface: 'g\u{1F600}m' } },
    { name: 'cancel', object: cancel },
  ].map((c) => ({ ...c, canonical: V.canonical(c.object), signature: V.sign(c.object, OP.privateKey).value })),
};
if (REGEN) { fs.writeFileSync(VEC, JSON.stringify(vectors, null, 1) + '\n'); console.log('golden vectors regenerated'); }
const golden = JSON.parse(fs.readFileSync(VEC, 'utf8'));
for (const c of golden.cases) {
  const mine = vectors.cases.find((x) => x.name === c.name);
  R.push([mine && mine.canonical === c.canonical && mine.signature === c.signature ? '✓' : '✗', `golden: ${c.name}`, 'match', 'match']);
}
R.push([golden.key_id === OP.keyId ? '✓' : '✗', 'golden: key id from fixed seed', golden.key_id, OP.keyId]);

// ---- acceptance, pin states, keys
check('signed invite accepted', run(env(base, OP)), 'accepted:signed');
check('unsigned, pin state none → accepted:unsigned', run(env(base, null), { pinStore: pins('none') }), 'accepted:unsigned');
check('unsigned, pin pending → unsigned', run(env(base, null), { pinStore: pins('pending') }), 'unsigned');
check('signed, pin pending → pin_pending', run(env(base, OP), { pinStore: pins('pending') }), 'pin_pending');
check('unsigned after pin → unsigned', run(env(base, null)), 'unsigned');
check('signed but pin none → unknown_key', run(env(base, OP), { pinStore: pins('none') }), 'unknown_key');
check('retired key → key_retired', run(env(base, OP), { pinStore: pins('retired') }), 'key_retired');
check('pin store throws → pin_unavailable', run(env(base, OP), { pinStore: { get: () => { throw new Error('x'); } } }), 'pin_unavailable');
check('attacker key → key_mismatch', run(env(base, MAL)), 'key_mismatch');
check('attacker relabels key_id → bad_signature', run(env(base, MAL, { sig: { ...V.sign(base, MAL.privateKey), key_id: OP.keyId } })), 'bad_signature');
check('rotation: old sig under new pin → key_mismatch', run(env(base, OP), { pinStore: pins('pinned', OP2) }), 'key_mismatch');
check('rotation: new sig under new pin → accepted', run(env(base, OP2), { pinStore: pins('pinned', OP2) }), 'accepted:signed');
// ---- envelope / dispatch
check('handler expects leave, payload is invite → envelope_mismatch', run(env(base, OP), { expect: 'meet:leave' }), 'envelope_mismatch');
check('relabeled outer+payload type → envelope_mismatch', run(env(base, OP, { envType: 'meet:leave', payloadType: 'meet:leave' }), { expect: 'meet:leave' }), 'envelope_mismatch');
check('missing outer type is fine (payload governs)', run(env(base, OP, { envType: null })), 'accepted:signed');
check('outer invite_id differs → envelope_mismatch', run(env(base, OP, { outerInvite: 'mi_other' })), 'envelope_mismatch');
check('unknown handler → bad_handler', run(env(base, OP), { expect: 'meet:say' }), 'bad_handler');
// ---- shape / parser
check('tampered url on the wire → bad_signature', run(env({ ...base, url: 'https://evil.example/x' }, OP, { sig: V.sign(base, OP.privateKey) })), 'bad_signature');
check('wrong domain → bad_shape', run(env({ ...base, domain: 'airc-x' }, OP)), 'bad_shape');
check('unknown field → bad_shape', run(env({ ...base, extra: 'x' }, OP)), 'bad_shape');
check('number in signed object → bad_shape', run(env({ ...base, starts_at: 5 }, OP)), 'bad_shape');
check('cancel carrying invite-only field → bad_shape', run(env({ ...cancel, url: 'https://x' }, OP), { expect: 'meet:leave', now: at('2026-09-04T19:31:00Z') }), 'bad_shape');
check('null → 1e400 on the wire → malformed', run(env(base, OP).replace('"starts_at":null', '"starts_at":1e400')), 'malformed');
check('duplicate url key → malformed', run(env(base, OP).replace('"url":', '"url":"https://evil.example/","url":')), 'malformed');
check('escaped duplicate key (\\u0075rl) → malformed', run(env(base, OP).replace('"url":', '"\\u0075rl":"https://evil.example/","url":')), 'malformed');
check('distinct escaped keys are NOT duplicates → (shape refuses unknown key, not malformed)', run(env(base, OP).replace('"surface":', '"a\\"b":"x","surface":')), 'bad_shape');
check('raw lone surrogate → malformed', run(env(base, OP).replace('grokbot', 'grok\ud800bot')), 'malformed');
check('escaped lone surrogate → malformed', run(env(base, OP).replace('"surface":"google-meet"', '"surface":"g\\ud800m"')), 'malformed');
check('deep nested arrays → malformed (no crash)', run('[[[[[[[[[[1]]]]]]]]]]'), 'malformed');
check('oversize (bytes) → malformed', run(env({ ...base, surface: '\u{1F600}'.repeat(5000) }, OP)), 'malformed');
check('null payload → malformed', run('{"type":"meet:invite","payload":null}'), 'malformed');
check('garbage signature value → bad_signature', run(env(base, OP, { sig: { alg: 'ed25519', key_id: OP.keyId, value: '!!!' } })), 'bad_signature');
// ---- time
check('expired (now+skew ≥ expires_at) → expired', run(env(base, OP), { now: at('2026-09-04T18:28:30Z') }), 'expired');
check('delivered 4 min late → accepted', run(env(base, OP), { now: clock(T0 + 4 * 60e3) }), 'accepted:signed');
check('issued 3 min in the future → bad_time', run(env(base, OP), { now: clock(T0 - 3 * 60e3) }), 'bad_time');
check('malformed timestamp → bad_time', run(env({ ...base, expires_at: 'tomorrow' }, OP)), 'bad_time');
check('calendar-invalid timestamp (02-30) → bad_time', run(env({ ...base, expires_at: '2026-02-30T18:30:00Z' }, OP)), 'bad_time');
check('expires before issued → bad_time', run(env({ ...base, expires_at: '2026-09-04T17:00:00Z' }, OP)), 'bad_time');
check('starts_at after expires_at → bad_time', run(env({ ...base, starts_at: '2026-09-04T19:00:00Z' }, OP)), 'bad_time');
check('short nonce → bad_nonce', run(env({ ...base, nonce: 'abc' }, OP)), 'bad_nonce');
// ---- ledger / replay / idempotency
check('identical delivery again → repeat', (() => { const c = { ledger: mkLedger() }; run(env(base, OP), c); return run(env(base, OP), c); })(), 'accepted:signed:repeat');
check('same nonce, different bytes → replay', (() => { const c = { ledger: mkLedger() }; run(env(base, OP), c); return run(env({ ...base, url: 'https://meet.google.com/zzz-zzzz-zzz' }, OP), c); })(), 'replay');
check('same invite_id, fresh nonce, different content → action_conflict', (() => { const c = { ledger: mkLedger() }; run(env(base, OP), c); return run(env({ ...base, nonce: 'FFFFFFFFFFFFFFFFFFFFFF', url: 'https://meet.google.com/zzz-zzzz-zzz' }, OP), c); })(), 'action_conflict');
check('ledger claim throws → ledger_unavailable (never accept on failed record)', run(env(base, OP), { ledger: mkLedger({ fail: true }) }), 'ledger_unavailable');
// ---- actions
check('action matches → accepted', run(env(base, OP), { actions: actions({ [base.invite_id]: { from: 'brightseth', to: 'grokbot', url: base.url, expires_at: base.expires_at, status: 'pending' } }) }), 'accepted:signed');
check('action url differs → action_mismatch', run(env(base, OP), { actions: actions({ [base.invite_id]: { from: 'brightseth', to: 'grokbot', url: 'https://meet.google.com/other', expires_at: base.expires_at, status: 'pending' } }) }), 'action_mismatch');
check('action from differs → action_mismatch', run(env(base, OP), { actions: actions({ [base.invite_id]: { from: 'mallory', to: 'grokbot', url: base.url, expires_at: base.expires_at, status: 'pending' } }) }), 'action_mismatch');
check('action status absent → action_not_pending', run(env(base, OP), { actions: actions({ [base.invite_id]: { from: 'brightseth', to: 'grokbot', url: base.url, expires_at: base.expires_at } }) }), 'action_not_pending');
check('action completed, resend → action_not_pending', run(env(base, OP), { actions: actions({ [base.invite_id]: { from: 'brightseth', to: 'grokbot', url: base.url, expires_at: base.expires_at, status: 'completed' } }) }), 'action_not_pending');
check('actions required, none found → action_unavailable (no fallback)', run(env(base, OP), { actionsRequired: true }), 'action_unavailable');
check('action lookup throws → action_unavailable', run(env(base, OP), { actions: actions(null, true) }), 'action_unavailable');
// ---- cancel lifecycle
check('signed cancel after invite deadline → accepted:cancel', (() => { const c = { ledger: mkLedger() }; run(env(base, OP), c); return run(env(cancel, OP), { ...c, expect: 'meet:leave', now: at('2026-09-04T19:31:00Z') }); })(), 'accepted:signed:cancel');
check('cancel for unknown invite → accepted:tombstone', run(env(cancel, OP), { expect: 'meet:leave', now: at('2026-09-04T19:31:00Z') }), 'accepted:signed:tombstone');
check('cancel before invite → later invite refuses action_not_pending', (() => { const c = { ledger: mkLedger() }; run(env({ ...cancel, issued_at: '2026-09-04T17:59:00Z' }, OP), { ...c, expect: 'meet:leave', now: clock(T0) }); return run(env(base, OP), c); })(), 'action_not_pending');
check('forged cancel → key_mismatch', run(env(cancel, MAL), { expect: 'meet:leave', now: at('2026-09-04T19:31:00Z') }), 'key_mismatch');

for (const [m, n, got, want] of R) console.log(`${m} ${n}${m === '✗' ? `  (got ${got}, want ${want})` : ''}`);
const fails = R.filter((r) => r[0] === '✗').length; console.log(`\n${R.length - fails}/${R.length} pass`); process.exit(fails ? 1 : 0);
