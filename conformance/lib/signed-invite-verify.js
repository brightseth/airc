/**
 * Reference verifier for content/spec-signed-operator-invite-v0.1-draft.md (rev 2).
 * Pure: clock, pin store, nonce ledger and action lookup are injected. Every failure
 * is a named refusal; nothing throws on malformed input.
 */
const crypto = require('crypto');

const DOMAIN = 'airc-meet-v1';
const COMMANDS = new Set(['meet:invite', 'meet:leave']);
const REQUIRED = ['domain', 'protocol_version', 'type', 'from', 'to', 'invite_id', 'issued_at', 'nonce'];
const INVITE_REQUIRED = ['url', 'expires_at'];
const OPTIONAL = new Set(['surface', 'starts_at', 'reason']);
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;
const NONCE_RE = /^[A-Za-z0-9_-]{22,43}$/; // base64url of 16..32 bytes
const SKEW_MS = 2 * 60e3;

function canonical(o) {
  if (o === null || typeof o !== 'object') return JSON.stringify(o);
  if (Array.isArray(o)) return '[' + o.map(canonical).join(',') + ']';
  return '{' + Object.keys(o).sort().map((k) => JSON.stringify(k) + ':' + canonical(o[k])).join(',') + '}';
}

/** Reject raw JSON with duplicate keys, non-finite numbers, or lone surrogates before use. */
function parseStrict(text) {
  if (typeof text !== 'string' || text.length > 16384) return null;
  if (/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(text)) return null;
  let depth = 0; const stack = []; const seen = [];
  // duplicate-key scan on the object level (strings/escapes aware)
  let i = 0, inStr = false, esc = false, cur = '';
  const keys = [];
  while (i < text.length) {
    const c = text[i];
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') { inStr = false; } else cur += c; }
    else if (c === '"') { inStr = true; cur = ''; }
    else if (c === '{') { depth++; if (depth > 4) return null; stack.push(new Set()); }
    else if (c === '}') { depth--; stack.pop(); }
    else if (c === ':' ) { const set = stack[stack.length - 1]; if (set) { if (set.has(cur)) return null; set.add(cur); } }
    i++;
  }
  let v; try { v = JSON.parse(text); } catch { return null; }
  const walk = (x) => { if (typeof x === 'number' && !Number.isFinite(x)) return false; if (x && typeof x === 'object') return Object.values(x).every(walk); return true; };
  return walk(v) ? v : null;
}

function keyIdOf(raw32) { return 'sha256:' + crypto.createHash('sha256').update(raw32).digest('hex'); }
function pubKeyFromRaw(raw32) {
  const spki = Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), raw32]);
  return crypto.createPublicKey({ key: spki, format: 'der', type: 'spki' });
}

/**
 * @param {object} p  { rawJson, me, operator, registry, pinStore, nonceLedger, actions, now }
 *   pinStore.get(operator, registry) → { raw: Buffer(32), keyId, version, retired: bool, signedRequired: bool } | null
 *   nonceLedger.seen(keyId, nonce) → bool ; nonceLedger.record(keyId, nonce, expiresAt)
 *   actions.get(inviteId) → { expires_at, to, status } | null | 'unavailable'
 */
function verify(p) {
  const { me, operator, registry, pinStore, nonceLedger, actions } = p;
  const now = typeof p.now === 'function' ? p.now() : Date.now();
  const refuse = (reason) => ({ ok: false, reason });
  const msg = parseStrict(p.rawJson);
  if (!msg || typeof msg !== 'object') return refuse('malformed');
  const payload = msg.payload; const data = payload && payload.data;
  if (!payload || !data || typeof data !== 'object') return refuse('malformed');
  const pin = pinStore.get(operator, registry);
  const { sig, ...signed } = data;
  if (!sig || typeof sig !== 'object') return pin && pin.signedRequired ? refuse('unsigned') : { ok: true, provenance: 'unsigned', signed };
  if (!pin) return refuse('unknown_key');           // signed but nothing pinned: never TOFU from the wire
  if (pin.retired) return refuse('key_retired');
  if (sig.alg !== 'ed25519' || typeof sig.key_id !== 'string' || typeof sig.value !== 'string') return refuse('bad_signature');
  if (sig.key_id !== pin.keyId) return refuse('key_mismatch');
  // shape: required fields, strings or null only, no unknown keys
  for (const k of REQUIRED) if (typeof signed[k] !== 'string') return refuse('bad_shape');
  for (const [k, v] of Object.entries(signed)) {
    if (!(REQUIRED.includes(k) || INVITE_REQUIRED.includes(k) || OPTIONAL.has(k))) return refuse('bad_shape');
    if (!(v === null || typeof v === 'string')) return refuse('bad_shape');
  }
  if (signed.domain !== DOMAIN || signed.protocol_version !== '0.2') return refuse('bad_shape');
  if (!COMMANDS.has(signed.type)) return refuse('bad_shape');
  if (signed.type !== payload.type || (msg.type && msg.type !== payload.type)) return refuse('envelope_mismatch');
  if (signed.type === 'meet:invite') { for (const k of INVITE_REQUIRED) if (typeof signed[k] !== 'string') return refuse('bad_shape'); }
  else { for (const k of ['url', 'expires_at', 'surface', 'starts_at']) if (k in signed) return refuse('bad_shape'); } // a cancel carries no invite fields
  let sigBytes; try { sigBytes = Buffer.from(sig.value, 'base64'); } catch { return refuse('bad_signature'); }
  if (sigBytes.length !== 64 || sigBytes.toString('base64') !== sig.value) return refuse('bad_signature');
  let valid = false; try { valid = crypto.verify(null, Buffer.from(canonical(signed)), pubKeyFromRaw(pin.raw), sigBytes); } catch { valid = false; }
  if (!valid) return refuse('bad_signature');
  if (signed.from !== operator || signed.to !== me) return refuse('not_my_operator');
  if (!ISO_UTC.test(signed.issued_at)) return refuse('bad_time');
  const issued = Date.parse(signed.issued_at); if (!Number.isFinite(issued)) return refuse('bad_time');
  if (issued > now + SKEW_MS) return refuse('bad_time');           // from the future
  if (!NONCE_RE.test(signed.nonce)) return refuse('bad_nonce');
  if (signed.type === 'meet:invite') {
    if (!ISO_UTC.test(signed.expires_at)) return refuse('bad_time');
    const exp = Date.parse(signed.expires_at); if (!Number.isFinite(exp) || exp <= issued) return refuse('bad_time');
    if (now + SKEW_MS >= exp) return refuse('expired');              // conservative: our clock may be behind
    if (signed.starts_at !== undefined && signed.starts_at !== null && !ISO_UTC.test(signed.starts_at)) return refuse('bad_time');
    if (!/^https:\/\/[^\s"']+$/.test(signed.url)) return refuse('bad_shape');
    const action = actions ? actions.get(signed.invite_id) : null;
    if (action === 'unavailable') return refuse('action_unavailable');
    if (action) {
      if (action.to !== me || action.expires_at !== signed.expires_at) return refuse('action_mismatch');
      if (action.status && action.status !== 'pending') return refuse('action_not_pending');
    }
  }
  // replay: identical signed content already accepted → idempotent repeat; same nonce with different content → refuse
  const prior = nonceLedger.seen(pin.keyId, signed.nonce);
  if (prior) return prior === canonical(signed) ? { ok: true, provenance: 'signed', repeat: true, signed } : refuse('replay');
  nonceLedger.record(pin.keyId, signed.nonce, canonical(signed), signed.expires_at || null);
  return { ok: true, provenance: 'signed', signed };
}

function sign(signed, privateKey) {
  const raw = crypto.createPublicKey(privateKey).export({ type: 'spki', format: 'der' }).subarray(-32);
  return { alg: 'ed25519', key_id: keyIdOf(raw), value: crypto.sign(null, Buffer.from(canonical(signed)), privateKey).toString('base64') };
}

module.exports = { verify, sign, canonical, parseStrict, keyIdOf, DOMAIN, SKEW_MS };
