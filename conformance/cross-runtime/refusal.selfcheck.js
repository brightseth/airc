#!/usr/bin/env node
/**
 * Hermetic (no network): pins the #406 consumption rule (contract 0.1.2 `recovery`). A 409 approved_content_mismatch
 * is terminal for that approval; server_text is a NEW preview; every round needs an explicit fresh approval; the
 * client never rehashes and resends on its own. Run: node conformance/cross-runtime/refusal.selfcheck.js
 */
const assert = require('assert');
const L = require('./lib.js');
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const calls = [];
// fake server: normalizes with the published rule and answers like 0.1.2 (approved == stored)
global.fetch = async (url, opts) => {
  const b = JSON.parse(opts.body); calls.push(b);
  const stored = L.normalizeBody(b.body); const sha = L.digest(b.to, stored);
  if (b.approved_sha256 !== sha) return { status: 409, json: async () => ({ success: false, error: 'approved_content_mismatch', reason: stored === b.body ? 'content_differs' : 'server_normalized', server_text: stored, server_sha256: sha }) };
  return { status: 200, json: async () => ({ success: true, message: { id: `m${calls.length}`, body: stored } }) };
};
(async () => {
  const me = { handle: 'northstar_b', token: 'hermetic' };
  // 1. body rule matches the published vectors
  ok(L.normalizeBody(' <b>hi</b> ') === 'hi', 'CB-004 rule'); ok(L.normalizeBody('hello ') === 'hello', 'CB-009 rule');
  ok(L.normalizeBody('&lt;b&gt;hi&lt;/b&gt;') === 'hi', 'CB-010 rule'); ok(L.normalizeBody('hi​there') === 'hithere', 'CB-011 rule');
  ok(L.normalizeBody('&<b>amp;') === '&amp;', 'rule is not idempotent (one pass leaves &amp;)');
  // 2. raw digest → 409 with server_text; nothing resent by itself
  const r = await L.send(me, { to: 'northstar_a', body: 'probe: see <b>bold</b> here', idempotencyKey: 'k1' });
  ok(r.status === 409 && r.fresh_approval_required === true && r.resent === false, '409 is terminal for that approval');
  ok(r.server_text === 'probe: see bold here' && /^[a-f0-9]{64}$/.test(r.server_sha256), 'server_text + server_sha256 surfaced');
  ok(calls.length === 1, 'exactly one request; no auto-resend');
  // 3. recovery declined → nothing sent
  const d = await L.recover(me, r, { to: 'northstar_a', idempotencyKey: 'k1', approve: async () => false });
  ok(d.outcome === 'declined' && calls.length === 1 && d.rounds[0].approved === false, 'declined approval sends nothing');
  // 4. non-boolean approval (e.g. truthy string) is NOT an approval
  const t = await L.recover(me, r, { to: 'northstar_a', idempotencyKey: 'k1', approve: async () => 'yes' });
  ok(t.outcome === 'declined' && calls.length === 1, 'only a literal true approves');
  // 5. explicit approval → one send with body=server_text, approved_sha256=server_sha256
  const seen = [];
  const s = await L.recover(me, r, { to: 'northstar_a', idempotencyKey: 'k1', approve: async (text, round) => { seen.push([round, text]); return true; } });
  ok(s.outcome === 'sent' && calls.length === 2, 'approved recovery sends once');
  ok(calls[1].body === r.server_text && calls[1].approved_sha256 === r.server_sha256, 'resend carries exactly the previewed text and its server digest');
  ok(seen.length === 1 && seen[0][1] === r.server_text, 'the approver saw exactly what was sent');
  // 6. multi-round: every round is a fresh approval; stops when declined mid-way
  const r2 = await L.send(me, { to: 'northstar_a', body: '&<b>amp;', idempotencyKey: 'k2' });
  ok(r2.status === 409 && r2.server_text === '&amp;', 'round 1 preview is &amp;');
  const before = calls.length; const previews = [];
  const m = await L.recover(me, r2, { to: 'northstar_a', idempotencyKey: 'k2', approve: async (text, round) => { previews.push(text); return round === 1; } });
  ok(m.outcome === 'declined' && previews.join('|') === '&amp;|&' && calls.length === before + 1, 'round 2 (&) needed its own approval; declined → stopped');
  const m2 = await L.recover(me, r2, { to: 'northstar_a', idempotencyKey: 'k2', approve: async () => true });
  ok(m2.outcome === 'sent' && m2.rounds.length === 2 && m2.last.message.body === '&', 'two approved rounds converge to &');
  // 7. pre-normalized digest sends with no round trip
  const before2 = calls.length;
  const p = await L.send(me, { to: 'northstar_a', body: L.normalizeBody(' <b>hi</b> '), idempotencyKey: 'k3' });
  ok(p.status === 200 && calls.length === before2 + 1, 'normalized text passes first time');
  // 8. old deployment (no server_text) → recovery reports no_server_text, sends nothing
  const old = { status: 409, error: 'approved_content_mismatch', server_text: null, server_sha256: null };
  const o = await L.recover(me, old, { to: 'northstar_a', idempotencyKey: 'k4', approve: async () => true });
  ok(o.outcome === 'no_server_text' && calls.length === before2 + 1, 'nothing to preview → nothing sent');
  console.log(`refusal.selfcheck: ${n}/${n} — 409 terminal; fresh approval every round; never auto-resend; rule matches CB-004/009/010/011`);
})().catch((e) => { console.error('refusal.selfcheck FAILED:', e.message); process.exit(1); });
