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
  // Durable fixture: mutate a COPY, persist atomically (tmp + rename), then swap — a failed
  // write leaves memory untouched; torn writes cannot happen. Retention is enforced on load.
  let st = { byNonce: {}, byInvite: {}, tomb: [], outcomes: {}, retain: {} };
  const load = () => { if (opts.file && fs.existsSync(opts.file)) { st = JSON.parse(fs.readFileSync(opts.file, 'utf8')); const t = opts.now ? opts.now() : Date.now(); for (const k of Object.keys(st.retain)) if (st.retain[k] < t) { delete st.byNonce[k]; delete st.outcomes[k]; delete st.retain[k]; } } };
  load();
  const persist = (next) => { if (opts.failWrite) throw new Error('disk full'); if (opts.file) { const tmp = opts.file + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(next)); fs.renameSync(tmp, opts.file); } st = next; };
  return {
    peek: (keyId, nonce) => { const k = `${keyId}:${nonce}`; return k in st.byNonce ? { canonical: st.byNonce[k], outcome: st.outcomes[k] } : null; },
    claim: ({ keyId, nonce, inviteId, type, canonical, retainUntil, tombstone }) => {
      if (opts.fail) throw new Error('ledger down');
      if (opts.badResult !== undefined) return opts.badResult;
      const k = `${keyId}:${nonce}`;
      if (k in st.byNonce) return { status: st.byNonce[k] === canonical ? 'repeat' : 'conflict' };
      if (type === 'meet:invite' && inviteId in st.byInvite && st.byInvite[inviteId] !== canonical) return { status: 'invite_conflict' };
      const next = JSON.parse(JSON.stringify(st));
      next.byNonce[k] = canonical; next.outcomes[k] = 'accepted'; next.retain[k] = retainUntil; if (type === 'meet:invite') next.byInvite[inviteId] = canonical;
      if (tombstone && !next.tomb.includes(inviteId)) next.tomb.push(inviteId);   // atomic with the claim
      persist(next); return { status: 'new' };
    },
    tombstone: (id) => { const next = JSON.parse(JSON.stringify(st)); if (!next.tomb.includes(id)) next.tomb.push(id); persist(next); },
    isTombstoned: (id) => st.tomb.includes(id), hasInvite: (id) => id in st.byInvite,
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
    { name: 'supplementary-plane text in a value (profile keys are fixed ASCII; ordering moot)', object: { ...base, nonce: 'EEEEEEEEEEEEEEEEEEEEEE', surface: 'g\u{1F600}m' } },
    { name: 'cancel', object: cancel },
  ].map((c) => ({ ...c, canonical: V.canonical(c.object), signature: V.sign(c.object, OP.privateKey).value })),
};
if (REGEN) { fs.writeFileSync(VEC, JSON.stringify(vectors, null, 1) + '\n'); console.log('golden vectors regenerated'); }
const golden = JSON.parse(fs.readFileSync(VEC, 'utf8'));
const EXPECTED = vectors.cases.map((c) => c.name);
for (const name of EXPECTED) {
  const c = (golden.cases || []).find((x) => x.name === name);
  const mine = vectors.cases.find((x) => x.name === name);
  if (!c) { R.push(['✗', `golden: ${name}`, 'missing from file', 'present']); continue; }
  const fromFile = V.canonical(c.object) === c.canonical && V.sign(c.object, OP.privateKey).value === c.signature;   // recomputed from the FILE's object
  const same = JSON.stringify(c.object) === JSON.stringify(mine.object) && c.canonical === mine.canonical;             // file object == test object
  R.push([fromFile && same ? '✓' : '✗', `golden: ${name}`, `${fromFile ? 'sig-ok' : 'sig-BAD'}/${same ? 'obj-ok' : 'obj-CHANGED'}`, 'sig-ok/obj-ok']);
}
R.push([(golden.cases || []).length === EXPECTED.length ? '✓' : '✗', 'golden: exact case count', (golden.cases || []).length, EXPECTED.length]);
R.push([golden.key_id === OP.keyId ? '✓' : '✗', 'golden: key id from fixed seed', golden.key_id, OP.keyId]);
R.push([golden.profile === 'airc-meet-v1' && golden.operator_seed === '11'.repeat(32) ? '✓' : '✗', 'golden: profile + operator seed pinned', `${golden.profile}/${(golden.operator_seed || '').slice(0, 4)}…`, 'airc-meet-v1/1111…']);

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
check('missing outer type → envelope_mismatch (outer type required)', run(env(base, OP, { envType: null })), 'envelope_mismatch');
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
check('identical delivery again → repeat (effect none)', (() => { const c = { ledger: mkLedger() }; run(env(base, OP), c); return run(env(base, OP), c); })(), 'accepted:signed:repeat:none');
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

// ---- rev 4: new-defect coverage
check('__proto__ injected as unsigned field → bad_shape (not prototype mutation)', run(env(base, OP).replace('"surface":', '"__proto__":{"x":1},"surface":')), 'bad_shape');
check('claim returns {status:"failed"} → ledger_unavailable', run(env(base, OP), { ledger: mkLedger({ badResult: { status: 'failed' } }) }), 'ledger_unavailable');
check('claim returns null → ledger_unavailable (no throw)', run(env(base, OP), { ledger: mkLedger({ badResult: null }) }), 'ledger_unavailable');
check('unsigned invite in state none still refuses when actionsRequired', run(env(base, null), { pinStore: pins('none'), actionsRequired: true }), 'action_unavailable');
check('unsigned invite in state none refuses a tombstoned id', (() => { const l = mkLedger(); l.tombstone(base.invite_id); return run(env(base, null), { pinStore: pins('none'), ledger: l }); })(), 'action_not_pending');
check('identical resend after action completed → repeat (stored outcome), not a refusal', (() => { const l = mkLedger(); const a = { [base.invite_id]: { from: 'brightseth', to: 'grokbot', url: base.url, expires_at: base.expires_at, status: 'pending' } }; run(env(base, OP), { ledger: l, actions: actions(a) }); a[base.invite_id].status = 'completed'; return run(env(base, OP), { ledger: l, actions: actions(a) }); })(), 'accepted:signed:repeat:none');
check('cancel of a terminal action → effect none', run(env(cancel, OP), { expect: 'meet:leave', now: at('2026-09-04T19:31:00Z'), actions: actions({ [base.invite_id]: { from: 'brightseth', to: 'grokbot', url: base.url, expires_at: base.expires_at, status: 'completed' } }) }), 'accepted:signed:none');
check('second distinct cancel for an already-tombstoned id → effect none', (() => { const l = mkLedger(); run(env(cancel, OP), { expect: 'meet:leave', now: at('2026-09-04T19:31:00Z'), ledger: l }); return run(env({ ...cancel, nonce: 'GGGGGGGGGGGGGGGGGGGGGG' }, OP), { expect: 'meet:leave', now: at('2026-09-04T19:32:00Z'), ledger: l }); })(), 'accepted:signed:none');
check('tombstone survives a restart (file-backed ledger)', (() => { const f = path.join(require('os').tmpdir(), `airc-ledger-${process.pid}.json`); try { fs.unlinkSync(f); } catch {} run(env(cancel, OP), { expect: 'meet:leave', now: at('2026-09-04T19:31:00Z'), ledger: mkLedger({ file: f }) }); const r = run(env(base, OP), { ledger: mkLedger({ file: f }) }); fs.unlinkSync(f); return r; })(), 'action_not_pending');
check('repeat survives a restart (file-backed ledger)', (() => { const f = path.join(require('os').tmpdir(), `airc-ledger2-${process.pid}.json`); try { fs.unlinkSync(f); } catch {} run(env(base, OP), { ledger: mkLedger({ file: f }) }); const r = run(env(base, OP), { ledger: mkLedger({ file: f }) }); fs.unlinkSync(f); return r; })(), 'accepted:signed:repeat:none');

// ---- rev 5: cancel ordering, unsigned cancels, unsigned binding, fixture durability, TTL
check('cancel: Action lookup fails → refuse and NOTHING consumed; retry after recovery → cancel', (() => { const l = mkLedger(); let fail = true; const a = { get: () => { if (fail) throw new Error('db'); return { from: 'brightseth', to: 'grokbot', url: base.url, expires_at: base.expires_at, status: 'pending' }; } }; const first = run(env(cancel, OP), { expect: 'meet:leave', now: at('2026-09-04T19:31:00Z'), ledger: l, actions: a }); if (show(first) !== 'action_unavailable') return first; fail = false; return run(env(cancel, OP), { expect: 'meet:leave', now: at('2026-09-04T19:31:00Z'), ledger: l, actions: a }); })(), 'accepted:signed:cancel');
check('unsigned cancel in pin state none → unsigned (every network cancel is signed)', run(env(cancel, null), { expect: 'meet:leave', pinStore: pins('none'), now: at('2026-09-04T19:31:00Z') }), 'unsigned');
check('unsigned invite, Action from differs → action_mismatch', run(env(base, null), { pinStore: pins('none'), actions: actions({ [base.invite_id]: { from: 'mallory', to: 'grokbot', url: base.url, expires_at: base.expires_at, status: 'pending' } }) }), 'action_mismatch');
check('unsigned invite, Action expired → expired', run(env(base, null), { pinStore: pins('none'), actions: actions({ [base.invite_id]: { from: 'brightseth', to: 'grokbot', url: base.url, expires_at: base.expires_at, status: 'pending' } }), now: at('2026-09-04T18:29:00Z') }), 'expired');
check('unsigned invite claiming a different operator → not_my_operator', run(env({ ...base, from: 'mallory' }, null), { pinStore: pins('none') }), 'not_my_operator');
check('ledger write fails → ledger_unavailable, memory untouched; retry → new (not repeat)', (() => { const f = path.join(require('os').tmpdir(), `airc-ledger3-${process.pid}.json`); try { fs.unlinkSync(f); } catch {} const l1 = mkLedger({ file: f, failWrite: true }); const r1 = run(env(base, OP), { ledger: l1 }); if (show(r1) !== 'ledger_unavailable') return r1; const l2 = mkLedger({ file: f }); const r2 = run(env(base, OP), { ledger: l2 }); try { fs.unlinkSync(f); } catch {} return r2; })(), 'accepted:signed');
check('retention: an entry past retainUntil is evicted on load; tombstone persists', (() => { const f = path.join(require('os').tmpdir(), `airc-ledger4-${process.pid}.json`); try { fs.unlinkSync(f); } catch {} run(env(cancel, OP), { expect: 'meet:leave', now: at('2026-09-04T19:31:00Z'), ledger: mkLedger({ file: f }) }); const later = mkLedger({ file: f, now: at('2026-09-07T00:00:00Z') }); const evicted = later.peek(OP.keyId, cancel.nonce) === null; const tomb = later.isTombstoned(base.invite_id); try { fs.unlinkSync(f); } catch {} return { ok: evicted && tomb, provenance: 'evicted-and-tombstoned', reason: `evicted=${evicted} tomb=${tomb}` }; })(), 'accepted:evicted-and-tombstoned');
check('ledger without peek → ledger_unavailable', run(env(base, OP), { ledger: { claim: () => ({ status: 'new' }), isTombstoned: () => false, hasInvite: () => false } }), 'ledger_unavailable');

for (const [m, n, got, want] of R) console.log(`${m} ${n}${m === '✗' ? `  (got ${got}, want ${want})` : ''}`);
const fails = R.filter((r) => r[0] === '✗').length; console.log(`\n${R.length - fails}/${R.length} pass`); process.exit(fails ? 1 : 0);
