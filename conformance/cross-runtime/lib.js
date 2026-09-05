/**
 * Cross-runtime loop tooling. Senders come ONLY from conformance/lib/live-sender.js (allowlist;
 * never Seth; missing credential = blocked). Every send carries idempotency_key and the
 * composition-boundary digest (content consistency — NOT human approval; there is no human here).
 */
const crypto = require('crypto');
const { liveSender } = require('../lib/live-sender.js');
const REGISTRY = process.env.AIRC_REGISTRY || 'https://www.slashvibe.dev';

function digest(to, body) { return crypto.createHash('sha256').update(`${String(to).toLowerCase().replace(/^@/, '')}\n${body}`, 'utf8').digest('hex'); }

async function session(handle) {
  const s = liveSender(handle);                       // throws BLOCKED_ON_FIXTURE — never falls back
  if (s.token) return { handle, token: s.token };
  const { publicKey } = crypto.generateKeyPairSync('ed25519');
  const raw = publicKey.export({ type: 'spki', format: 'der' }).subarray(-32);
  const r = await fetch(`${REGISTRY}/api/presence`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-mint': s.mint }, body: JSON.stringify({ action: 'register', username: handle, status: 'available', workingOn: 'cross-runtime loop', publicKey: `ed25519:${raw.toString('base64')}`, isAgent: true, human_present: false }) });
  const j = await r.json().catch(() => ({}));
  if (!j.token) throw Object.assign(new Error(`BLOCKED_ON_FIXTURE: register ${handle} → HTTP ${r.status} ${JSON.stringify(j).slice(0, 120)}`), { code: 'BLOCKED_ON_FIXTURE', exitCode: 2 });
  return { handle, token: j.token };
}

async function send(me, { to, body, payload, replyTo, idempotencyKey }) {
  const req = { to, body, idempotency_key: idempotencyKey, approved_sha256: digest(to, body), origin: 'context_move' };
  if (payload) req.payload = payload; if (replyTo) req.reply_to = replyTo;
  const r = await fetch(`${REGISTRY}/api/v2/messages`, { method: 'POST', headers: { Authorization: `Bearer ${me.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(req) });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, ...j };
}

async function thread(me, peer, limit = 500) {   // the route returns OLDEST first; a small limit hides recent messages
  const r = await fetch(`${REGISTRY}/api/messages?user=${me.handle}&with=${peer}&limit=${limit}`, { headers: { Authorization: `Bearer ${me.token}` } });
  const j = await r.json().catch(() => ({}));
  return j.messages || [];
}

module.exports = { session, send, thread, digest, REGISTRY };
