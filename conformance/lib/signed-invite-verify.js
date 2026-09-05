/**
 * Reference verifier for content/spec-signed-operator-invite-v0.1-draft.md (rev 3).
 * Pure: clock, pin store, ledger and action lookup are injected. Every failure is a named
 * refusal; malformed input never throws.
 */
const crypto = require('crypto');

const DOMAIN = 'airc-meet-v1';
const COMMANDS = new Set(['meet:invite', 'meet:leave']);
const REQUIRED = ['domain', 'protocol_version', 'type', 'from', 'to', 'invite_id', 'issued_at', 'nonce'];
const INVITE_REQUIRED = ['url', 'expires_at'];
const INVITE_OPTIONAL = new Set(['surface', 'starts_at']);
const LEAVE_OPTIONAL = new Set(['reason']);
const ISO_UTC = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d{1,3})?Z$/;
const NONCE_RE = /^[A-Za-z0-9_-]{22,43}$/;
const SKEW_MS = 2 * 60e3;
const MAX_BYTES = 16384, MAX_DEPTH = 4;
const CANCEL_RETENTION_MS = 24 * 3600e3;

// ---------- strict JSON: duplicate keys, non-finite numbers, lone surrogates (raw or escaped), depth, size
function parseStrict(text) {
  if (typeof text !== 'string' || Buffer.byteLength(text, 'utf8') > MAX_BYTES) return null;
  let i = 0; const n = text.length;
  const ws = () => { while (i < n && ' \t\n\r'.includes(text[i])) i++; };
  const fail = () => { throw new Error('strict'); };
  function str() {
    if (text[i] !== '"') fail(); i++;
    let out = '';
    while (i < n) {
      const c = text[i++];
      if (c === '"') return out;
      if (c === '\\') {
        const e = text[i++];
        if (e === 'u') {
          const h = text.slice(i, i + 4); if (!/^[0-9a-fA-F]{4}$/.test(h)) fail(); i += 4;
          let cp = parseInt(h, 16);
          if (cp >= 0xD800 && cp <= 0xDBFF) {
            if (text.slice(i, i + 2) !== '\\u') fail();
            const h2 = text.slice(i + 2, i + 6); if (!/^[0-9a-fA-F]{4}$/.test(h2)) fail();
            const lo = parseInt(h2, 16); if (lo < 0xDC00 || lo > 0xDFFF) fail(); i += 6;
            out += String.fromCharCode(cp, lo);
          } else if (cp >= 0xDC00 && cp <= 0xDFFF) fail();
          else out += String.fromCharCode(cp);
        } else if ('"\\/bfnrt'.includes(e)) out += { '"': '"', '\\': '\\', '/': '/', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t' }[e];
        else fail();
      } else {
        const cc = c.charCodeAt(0);
        if (cc < 0x20) fail();
        if (cc >= 0xD800 && cc <= 0xDBFF) { const d = text.charCodeAt(i); if (!(d >= 0xDC00 && d <= 0xDFFF)) fail(); out += c + text[i++]; }
        else if (cc >= 0xDC00 && cc <= 0xDFFF) fail();
        else out += c;
      }
    }
    fail();
  }
  function value(depth) {
    ws(); if (i >= n) fail();
    const c = text[i];
    if (c === '{') {
      if (depth >= MAX_DEPTH) fail(); i++; const o = Object.create(null); const seen = new Set(); ws();
      if (text[i] === '}') { i++; return o; }
      for (;;) { ws(); const k = str(); if (seen.has(k)) fail(); seen.add(k); ws(); if (text[i++] !== ':') fail(); Object.defineProperty(o, k, { value: value(depth + 1), enumerable: true, writable: true, configurable: true }); ws(); const d = text[i++]; if (d === '}') return o; if (d !== ',') fail(); }
    }
    if (c === '[') {
      if (depth >= MAX_DEPTH) fail(); i++; const a = []; ws();
      if (text[i] === ']') { i++; return a; }
      for (;;) { a.push(value(depth + 1)); ws(); const d = text[i++]; if (d === ']') return a; if (d !== ',') fail(); }
    }
    if (c === '"') return str();
    if (text.startsWith('true', i)) { i += 4; return true; }
    if (text.startsWith('false', i)) { i += 5; return false; }
    if (text.startsWith('null', i)) { i += 4; return null; }
    const m = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/.exec(text.slice(i)); if (!m) fail();
    i += m[0].length; const num = Number(m[0]); if (!Number.isFinite(num)) fail(); return num;
  }
  try { const v = value(0); ws(); if (i !== n) return null; return v; } catch { return null; }
}

function canonical(o) {
  if (o === null || typeof o !== 'object') return JSON.stringify(o);
  if (Array.isArray(o)) return '[' + o.map(canonical).join(',') + ']';
  return '{' + Object.keys(o).sort().map((k) => JSON.stringify(k) + ':' + canonical(o[k])).join(',') + '}';
}
function keyIdOf(raw32) { return 'sha256:' + crypto.createHash('sha256').update(raw32).digest('hex'); }
function pubKeyFromRaw(raw32) { return crypto.createPublicKey({ key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), raw32]), format: 'der', type: 'spki' }); }
function strictIso(s) {
  const m = ISO_UTC.exec(s); if (!m) return NaN;
  const t = Date.parse(s); if (!Number.isFinite(t)) return NaN;
  const d = new Date(t); // reject calendar-normalized dates (e.g. 02-30 → 03-02)
  if (d.getUTCFullYear() !== +m[1] || d.getUTCMonth() + 1 !== +m[2] || d.getUTCDate() !== +m[3] || d.getUTCHours() !== +m[4] || d.getUTCMinutes() !== +m[5] || d.getUTCSeconds() !== +m[6]) return NaN;
  return t;
}

/**
 * @param p { rawJson, expect, me, operator, registry, pinStore, ledger, actions, actionsRequired, now }
 *  expect: the command the executing handler is running ('meet:invite' | 'meet:leave')
 *  pinStore.get(operator, registry) → { state: 'none'|'pending'|'pinned'|'retired', raw?, keyId?, signedRequired? }
 *  ledger.claim({keyId, nonce, inviteId, canonical, retainUntil}) → {status:'new'|'repeat'|'conflict'|'invite_conflict'}  (atomic; may throw)
 *  ledger.tombstone(inviteId) ; ledger.isTombstoned(inviteId) ; ledger.hasInvite(inviteId)
 *  actions.get(inviteId) → { from, to, url, expires_at, status } | null  (may throw)
 */
function verify(p) {
  const { me, operator, registry, pinStore, ledger, actions, expect } = p;
  const now = typeof p.now === 'function' ? p.now() : Date.now();
  const refuse = (reason) => ({ ok: false, reason });
  if (!COMMANDS.has(expect)) return refuse('bad_handler');
  const msg = parseStrict(p.rawJson);
  if (!msg || typeof msg !== 'object' || Array.isArray(msg)) return refuse('malformed');
  const payload = msg.payload; const data = payload && payload.data;
  if (!payload || typeof payload !== 'object' || !data || typeof data !== 'object' || Array.isArray(data)) return refuse('malformed');
  if (payload.type !== expect || msg.type !== expect) return refuse('envelope_mismatch'); // outer type is required and must match
  if (msg.invite_id !== undefined && msg.invite_id !== data.invite_id) return refuse('envelope_mismatch');

  let pin; try { pin = pinStore.get(operator, registry) || { state: 'none' }; } catch { return refuse('pin_unavailable'); }
  const { sig, ...signed } = data;
  if (!sig) {
    if (pin.state !== 'none') return refuse('unsigned');        // pending, pinned or retired: nothing unsigned
    if (expect !== 'meet:invite') return refuse('unsigned');    // every network cancel is signed, in every pin state
    // an unsigned invite is accepted only in state 'none' — and still fully bound to tombstones and the Action
    if (typeof signed.invite_id !== 'string' || typeof signed.url !== 'string' || !/^https:\/\/[^\s"'<>]+$/.test(signed.url)) return refuse('bad_shape');
    if (signed.expires_at !== undefined) { const exp = strictIso(signed.expires_at); if (!Number.isFinite(exp)) return refuse('bad_time'); if (now + SKEW_MS >= exp) return refuse('expired'); }
    if (typeof signed.from === 'string' && signed.from !== operator) return refuse('not_my_operator');
    if (typeof signed.to === 'string' && signed.to !== me) return refuse('not_my_operator');
    try { if (ledger.isTombstoned(signed.invite_id)) return refuse('action_not_pending'); } catch { return refuse('ledger_unavailable'); }
    let action; try { action = actions ? actions.get(signed.invite_id) : null; } catch { return refuse('action_unavailable'); }
    if (!action && p.actionsRequired) return refuse('action_unavailable');
    if (action) {
      if (action.from !== operator || action.to !== me || action.url !== signed.url || (signed.expires_at !== undefined && action.expires_at !== signed.expires_at)) return refuse('action_mismatch');
      if (action.status !== 'pending') return refuse('action_not_pending');
      const aexp = strictIso(action.expires_at); if (!Number.isFinite(aexp) || now + SKEW_MS >= aexp) return refuse('expired');
    }
    return { ok: true, provenance: 'unsigned', signed };
  }
  if (pin.state !== 'pinned') return refuse(pin.state === 'retired' ? 'key_retired' : pin.state === 'pending' ? 'pin_pending' : 'unknown_key');
  if (typeof sig !== 'object' || sig.alg !== 'ed25519' || typeof sig.key_id !== 'string' || typeof sig.value !== 'string') return refuse('bad_signature');
  if (sig.key_id !== pin.keyId) return refuse('key_mismatch');
  // shape
  for (const k of REQUIRED) if (typeof signed[k] !== 'string') return refuse('bad_shape');
  if (signed.domain !== DOMAIN || signed.protocol_version !== '0.2' || !COMMANDS.has(signed.type)) return refuse('bad_shape');
  const allowed = new Set(REQUIRED); if (signed.type === 'meet:invite') { INVITE_REQUIRED.forEach((k) => allowed.add(k)); INVITE_OPTIONAL.forEach((k) => allowed.add(k)); } else LEAVE_OPTIONAL.forEach((k) => allowed.add(k));
  for (const [k, v] of Object.entries(signed)) { if (!allowed.has(k)) return refuse('bad_shape'); if (!(v === null || typeof v === 'string')) return refuse('bad_shape'); }
  if (signed.type === 'meet:invite') for (const k of INVITE_REQUIRED) if (typeof signed[k] !== 'string') return refuse('bad_shape');
  if (signed.type !== expect) return refuse('envelope_mismatch');
  let sigBytes; try { sigBytes = Buffer.from(sig.value, 'base64'); } catch { return refuse('bad_signature'); }
  if (sigBytes.length !== 64 || sigBytes.toString('base64') !== sig.value) return refuse('bad_signature');
  let valid = false; try { valid = crypto.verify(null, Buffer.from(canonical(signed)), pubKeyFromRaw(pin.raw), sigBytes); } catch { valid = false; }
  if (!valid) return refuse('bad_signature');
  if (signed.from !== operator || signed.to !== me) return refuse('not_my_operator');
  const issued = strictIso(signed.issued_at); if (!Number.isFinite(issued) || issued > now + SKEW_MS) return refuse('bad_time');
  if (!NONCE_RE.test(signed.nonce)) return refuse('bad_nonce');

  // identical resend → the stored prior outcome, before any action-state check (idempotency beats staleness)
  if (typeof ledger.peek !== 'function') return refuse('ledger_unavailable');   // peek is part of the ledger contract
  let prior; try { prior = ledger.peek(pin.keyId, signed.nonce); } catch { return refuse('ledger_unavailable'); }
  if (prior && prior.canonical === canonical(signed)) return { ok: true, provenance: 'signed', repeat: true, signed, effect: 'none', prior: prior.outcome };
  if (prior) return refuse('replay');

  let retainUntil, tombstoned = false;
  if (signed.type === 'meet:invite') {
    const exp = strictIso(signed.expires_at); if (!Number.isFinite(exp) || exp <= issued) return refuse('bad_time');
    if (signed.starts_at != null) { const st = strictIso(signed.starts_at); if (!Number.isFinite(st) || st > exp || st < issued - SKEW_MS) return refuse('bad_time'); }
    if (now + SKEW_MS >= exp) return refuse('expired');
    if (!/^https:\/\/[^\s"'<>]+$/.test(signed.url)) return refuse('bad_shape');
    try { if (ledger.isTombstoned(signed.invite_id)) return refuse('action_not_pending'); } catch { return refuse('ledger_unavailable'); }
    let action; try { action = actions ? actions.get(signed.invite_id) : null; } catch { return refuse('action_unavailable'); }
    if (!action && p.actionsRequired) return refuse('action_unavailable');
    if (action) {
      if (action.from !== operator || action.to !== me || action.url !== signed.url || action.expires_at !== signed.expires_at) return refuse('action_mismatch');
      if (action.status !== 'pending') return refuse('action_not_pending');
    }
    retainUntil = Math.max(exp, now) + CANCEL_RETENTION_MS;
  } else {
    try { tombstoned = ledger.isTombstoned(signed.invite_id); } catch { return refuse('ledger_unavailable'); }
    retainUntil = Math.max(issued, now) + CANCEL_RETENTION_MS;   // retention counts from acceptance, never earlier
  }
  // every read that can fail happens BEFORE the one atomic write, so a failed lookup never consumes a nonce
  let known = false, terminal = tombstoned;
  if (signed.type === 'meet:leave') {
    try { known = ledger.hasInvite(signed.invite_id); } catch { return refuse('ledger_unavailable'); }
    let a; try { a = actions ? actions.get(signed.invite_id) : null; } catch { return refuse('action_unavailable'); }
    if (a) { known = true; if (a.status !== 'pending' && a.status !== 'accepted') terminal = true; }
  }
  const VALID = new Set(['new', 'repeat', 'conflict', 'invite_conflict']);
  let claim; try { claim = ledger.claim({ keyId: pin.keyId, nonce: signed.nonce, inviteId: signed.invite_id, type: signed.type, canonical: canonical(signed), retainUntil, tombstone: signed.type === 'meet:leave' }); } catch { return refuse('ledger_unavailable'); }
  if (!claim || typeof claim !== 'object' || !VALID.has(claim.status)) return refuse('ledger_unavailable');   // an unknown result never accepts
  if (claim.status === 'repeat') return { ok: true, provenance: 'signed', repeat: true, signed, effect: 'none' };
  if (claim.status === 'conflict') return refuse('replay');
  if (claim.status === 'invite_conflict') return refuse('action_conflict');
  if (signed.type === 'meet:leave') {
    // the claim persisted the tombstone atomically (tombstone:true); reads above already decided the effect
    return { ok: true, provenance: 'signed', signed, effect: terminal ? 'none' : known ? 'cancel' : 'tombstone' };
  }
  return { ok: true, provenance: 'signed', signed };
}

function sign(signed, privateKey) {
  const raw = crypto.createPublicKey(privateKey).export({ type: 'spki', format: 'der' }).subarray(-32);
  return { alg: 'ed25519', key_id: keyIdOf(raw), value: crypto.sign(null, Buffer.from(canonical(signed)), privateKey).toString('base64') };
}
module.exports = { verify, sign, canonical, parseStrict, keyIdOf, DOMAIN, SKEW_MS };
