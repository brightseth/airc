#!/usr/bin/env node
// Self-check for content/spec-signed-operator-invite-v0.1-draft.md: the sign/verify recipe
// round-trips with the harness's canonical form, and each refusal case refuses.
const crypto = require('crypto');
function canonical(o) {
  if (o === null || typeof o !== 'object') return JSON.stringify(o);
  if (Array.isArray(o)) return '[' + o.map(canonical).join(',') + ']';
  return '{' + Object.keys(o).sort().map((k) => JSON.stringify(k) + ':' + canonical(o[k])).join(',') + '}';
}
const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
const raw = publicKey.export({ type: 'spki', format: 'der' }).subarray(-32);
const keyId = 'sha256:' + crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16);
const now = new Date();
const data = {
  protocol_version: '0.2', type: 'meet:invite', from: 'brightseth', to: 'grokbot',
  invite_id: 'mi_selfcheck_001', url: 'https://meet.google.com/abc-defg-hij', surface: 'google-meet',
  starts_at: null, expires_at: new Date(now.getTime() + 30 * 60e3).toISOString(),
  issued_at: now.toISOString(), nonce: crypto.randomBytes(16).toString('base64url'),
};
const sign = (d) => ({ alg: 'ed25519', key_id: keyId, value: crypto.sign(null, Buffer.from(canonical(d)), privateKey).toString('base64') });
const seen = new Set();
function verify(payload, pinnedKeyId, me, operator) {
  const { sig, ...d } = payload;
  if (!sig || sig.alg !== 'ed25519') return 'unsigned';
  if (sig.key_id !== pinnedKeyId) return 'key_mismatch';
  if (!crypto.verify(null, Buffer.from(canonical(d)), publicKey, Buffer.from(sig.value, 'base64'))) return 'bad_signature';
  if (d.from !== operator || d.to !== me) return 'not_my_operator';
  const t = Date.parse(d.issued_at); if (Math.abs(Date.now() - t) > 5 * 60e3) return 'expired';
  if (Date.parse(d.expires_at) <= Date.now()) return 'expired';
  if (seen.has(sig.key_id + ':' + d.nonce)) return 'replay'; seen.add(sig.key_id + ':' + d.nonce);
  return 'accepted';
}
const results = [];
const ok = (name, got, want) => results.push([got === want ? '✓' : '✗', name, got]);
const good = { ...data, sig: sign(data) };
ok('signed invite accepted', verify(good, keyId, 'grokbot', 'brightseth'), 'accepted');
ok('replayed nonce refused', verify(good, keyId, 'grokbot', 'brightseth'), 'replay');
ok('unsigned refused', verify({ ...data, nonce: 'x1' }, keyId, 'grokbot', 'brightseth'), 'unsigned');
const tampered = { ...data, nonce: 'x2', url: 'https://evil.example/room' }; tampered.sig = good.sig;
ok('tampered url refused', verify(tampered, keyId, 'grokbot', 'brightseth'), 'bad_signature');
ok('key mismatch refused', verify({ ...data, nonce: 'x3', sig: sign({ ...data, nonce: 'x3' }) }, 'sha256:0000000000000000', 'grokbot', 'brightseth'), 'key_mismatch');
const wrongOp = { ...data, nonce: 'x4', from: 'mallory' }; wrongOp.sig = sign(wrongOp);
ok('not my operator refused', verify(wrongOp, keyId, 'grokbot', 'brightseth'), 'not_my_operator');
const old = { ...data, nonce: 'x5', expires_at: new Date(Date.now() - 1000).toISOString() }; old.sig = sign(old);
ok('expired refused', verify(old, keyId, 'grokbot', 'brightseth'), 'expired');
for (const [m, n, g] of results) console.log(`${m} ${n} — ${g}`);
process.exit(results.every((r) => r[0] === '✓') ? 0 : 1);
