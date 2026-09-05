/**
 * Cross-runtime loop tooling. Senders come ONLY from conformance/lib/live-sender.js (allowlist;
 * never Seth; missing credential = blocked). Every send carries idempotency_key and the
 * composition-boundary digest (content consistency — NOT human approval; there is no human here).
 */
const crypto = require('crypto');
const { liveSender } = require('../lib/live-sender.js');
const REGISTRY = process.env.AIRC_REGISTRY || 'https://www.slashvibe.dev';

/**
 * body_rule_v2 (composition-boundary 0.1.2, vibe-platform#406) — exactly api/lib/sanitize.js stripHtml then trim.
 * Published so a client MAY pre-normalize and send with no round trip. server_text stays authoritative; the
 * rule is NOT guaranteed idempotent (entity decode stops at 5 passes), which is why recovery may take rounds.
 */
function normalizeBody(input) {
  if (typeof input !== 'string') return input;
  const once = (t) => t.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(parseInt(c, 10))).replace(/&#x([0-9a-fA-F]+);/g, (_, c) => String.fromCharCode(parseInt(c, 16)));
  let r = input;
  for (let i = 0; i < 5; i++) { const n = once(r); if (n === r) break; r = n; }
  r = r.replace(/[\u200B-\u200F\uFEFF\u2060-\u2064]/g, '');
  r = r.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u0080-\u009F]/g, '');
  r = r.replace(/<[^>]*>/g, '');
  return r.trim();
}

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

async function send(me, { to, body, payload, replyTo, idempotencyKey, approvedSha256 }) {
  // approvedSha256: pass the digest the approver saw (e.g. server_sha256 after a fresh approval); default = digest over `body` as given.
  const req = { to, body, idempotency_key: idempotencyKey, approved_sha256: approvedSha256 || digest(to, body), origin: 'context_move' };
  if (payload) req.payload = payload; if (replyTo) req.reply_to = replyTo;
  const r = await fetch(`${REGISTRY}/api/v2/messages`, { method: 'POST', headers: { Authorization: `Bearer ${me.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(req) });
  const j = await r.json().catch(() => ({}));
  if (r.status === 409 && j.error === 'approved_content_mismatch') {
    // Consumption rule (Seth, 2026-09-05; vibe-platform#406): the server would store different text.
    // That text must come back as a NEW exact preview and get a FRESH approval (a new digest over the
    // server's text, approved again). This client never re-digests and resends on its own.
    return { status: 409, ...j, fresh_approval_required: true, server_text: typeof j.server_text === 'string' ? j.server_text : null, server_sha256: typeof j.server_sha256 === 'string' ? j.server_sha256 : null, resent: false };
  }
  return { status: r.status, ...j };
}

/**
 * Recovery from a 409 (contract 0.1.2 `recovery`): EVERY round presents server_text as a NEW preview and calls
 * `approve(serverText, round)` — an explicit decision supplied by the caller (a human, or a scripted approver that
 * is labelled as such in the receipt). Only a literal `true` sends; anything else stops with nothing sent. The
 * client never rehashes on its own and never sends text the approver did not see. Bounded by maxRounds.
 */
async function recover(me, refusal, { to, payload, replyTo, idempotencyKey, approve, maxRounds = 4 }) {
  const rounds = [];
  let current = refusal;
  for (let round = 1; round <= maxRounds; round++) {
    if (!(current && current.status === 409 && current.error === 'approved_content_mismatch')) return { outcome: 'not_recoverable', rounds, last: current };
    if (!current.server_text || !current.server_sha256) return { outcome: 'no_server_text', rounds, last: current };   // old deployment: nothing to preview
    const decision = await approve(current.server_text, round);
    rounds.push({ round, preview: current.server_text, server_sha256: current.server_sha256, reason: current.reason || null, approved: decision === true });
    if (decision !== true) return { outcome: 'declined', rounds, last: current };
    current = await send(me, { to, body: current.server_text, payload, replyTo, idempotencyKey: `${idempotencyKey}-r${round}`, approvedSha256: current.server_sha256 });
    if (current.status >= 200 && current.status < 300) return { outcome: 'sent', rounds, last: current };
  }
  return { outcome: 'rounds_exhausted', rounds, last: current };
}

async function thread(me, peer, limit = 500) {   // the route returns OLDEST first; a small limit hides recent messages
  const r = await fetch(`${REGISTRY}/api/messages?user=${me.handle}&with=${peer}&limit=${limit}`, { headers: { Authorization: `Bearer ${me.token}` } });
  const j = await r.json().catch(() => ({}));
  return j.messages || [];
}

module.exports = { session, send, thread, digest, normalizeBody, recover, REGISTRY };
