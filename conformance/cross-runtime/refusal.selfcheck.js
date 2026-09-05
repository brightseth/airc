#!/usr/bin/env node
/**
 * Hermetic (no network): pins the #406 consumption rule — a 409 approved_content_mismatch is
 * terminal for that approval. The client returns the refusal (with any server_text) for a new
 * preview + fresh approval, and NEVER re-digests and resends by itself. Run: node conformance/cross-runtime/refusal.selfcheck.js
 */
const assert = require('assert');
const calls = [];
global.fetch = async (url, opts) => {
  calls.push({ url, body: JSON.parse(opts.body) });
  const body = { success: false, error: 'approved_content_mismatch', message: 'The server would alter this message before storing it.', server_text: 'probe: see bold here' };
  return { status: 409, json: async () => body };
};
const L = require('./lib.js');
(async () => {
  const me = { handle: 'northstar_b', token: 'hermetic' };
  const r = await L.send(me, { to: 'northstar_a', body: 'probe: see <b>bold</b> here', idempotencyKey: 'k1' });
  assert.strictEqual(r.status, 409);
  assert.strictEqual(r.fresh_approval_required, true, 'refusal must demand a fresh approval');
  assert.strictEqual(r.resent, false, 'client must not resend');
  assert.strictEqual(r.server_text, 'probe: see bold here', 'server text surfaces for a new exact preview');
  assert.strictEqual(calls.length, 1, `exactly one request must have been made, saw ${calls.length}`);
  // the one request carried the digest over what the client previewed — not over server_text
  assert.strictEqual(calls[0].body.approved_sha256, L.digest('northstar_a', 'probe: see <b>bold</b> here'));
  assert.notStrictEqual(calls[0].body.approved_sha256, L.digest('northstar_a', 'probe: see bold here'));
  // a caller that wants to proceed must approve the server text explicitly — a new digest, a new call
  const fresh = L.digest('northstar_a', r.server_text);
  assert.notStrictEqual(fresh, calls[0].body.approved_sha256);
  console.log('refusal.selfcheck: 7/7 — 409 mismatch is terminal; one request; no auto-resend; server_text needs fresh approval');
})().catch((e) => { console.error('refusal.selfcheck FAILED:', e.message); process.exit(1); });
