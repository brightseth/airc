#!/usr/bin/env node
/**
 * End-to-end consumption of composition-boundary 0.1.2 (vibe-platform#406) against production, lab principals ONLY
 * (northstar_b → northstar_a via the allowlist guard; never a human credential). For each vector:
 *   positive path: digest over the normalized text → 2xx, stored body == expected
 *   raw path:      digest over the raw text → 409 reason/server_text/server_sha256 as published, nothing stored
 *                  → recovery with a SCRIPTED approver (no human here; labelled as such) → 2xx, stored == server_text
 * Exit 0 all pass · 1 a check failed · 2 blocked (old deployment: 409 without server_text, or fixture missing).
 */
const L = require('./lib.js');
const VEC = [
  { id: 'CB-004', raw: ' <b>hi</b> ', expect: 'hi' },
  { id: 'CB-009', raw: 'hello ', expect: 'hello' },
  { id: 'CB-010', raw: '&lt;b&gt;hi&lt;/b&gt;', expect: 'hi' },
  { id: 'CB-011', raw: 'hi​there', expect: 'hithere' },
  { id: 'multi-round', raw: '&<b>amp;', expect: '&', rounds: 2 },
];
const R = []; let blocked = false;
const rec = (id, name, pass, detail) => { R.push({ id, name, pass, detail }); console.log(`${pass ? '✓' : '✗'} ${id} ${name}${detail ? ' — ' + detail : ''}`); };
(async () => {
  const me = await L.session('northstar_b'); const peer = 'northstar_a'; const run = Date.now().toString(36);
  const stored = async (id) => (await L.thread(me, peer, 500)).find((m) => m.id === id);
  for (const v of VEC) {
    const tag = `${v.id.toLowerCase()}-${run}`;
    // positive path
    const norm = L.normalizeBody(v.raw);
    const p = await L.send(me, { to: peer, body: norm, payload: { type: 'probe', data: { vector: v.id, path: 'normalized' } }, idempotencyKey: `${tag}-pos` });
    if (v.rounds) {
      // non-idempotent input: the published rule says a pre-normalized send can be normalized AGAIN → 409 with the next preview, never a silent change
      const again = L.normalizeBody(norm);
      const nonIdem = p.status === 409 && p.reason === 'server_normalized' && p.server_text === again && p.server_sha256 === L.digest(peer, again);
      rec(v.id, 'pre-normalized digest of a non-idempotent input → 409 with the NEXT preview (rule not idempotent, as published)', nonIdem, `HTTP ${p.status} server_text=${JSON.stringify(p.server_text)}`);
    } else {
      const pm = p.message && p.message.id && (await stored(p.message.id));
      const positive = p.status >= 200 && p.status < 300 && !!pm && pm.body === v.expect && norm === v.expect;
      rec(v.id, 'normalized digest → stored first time', positive, `HTTP ${p.status}${pm ? ` stored=${JSON.stringify(pm.body)}` : ''}`);
    }
    // raw path
    const r = await L.send(me, { to: peer, body: v.raw, payload: { type: 'probe', data: { vector: v.id, path: 'raw' } }, idempotencyKey: `${tag}-raw` });
    if (r.status === 409 && !r.server_text) { blocked = true; rec(v.id, 'raw digest → 409 with server_text', false, 'BLOCKED: 409 carries no server_text (old deployment)'); continue; }
    const firstPreview = v.rounds ? L.normalizeBody(v.raw) : v.expect;
    const storedNothing = !(r.message && typeof r.message === 'object' && r.message.id);   // the 409's `message` is human-readable text, not a stored message
    const refused = r.status === 409 && r.error === 'approved_content_mismatch' && r.reason === 'server_normalized' && r.server_text === firstPreview && r.server_sha256 === L.digest(peer, r.server_text) && storedNothing;
    rec(v.id, 'raw digest → 409 server_normalized + server_text + server_sha256, nothing stored', refused, `HTTP ${r.status} reason=${r.reason} server_text=${JSON.stringify(r.server_text)}`);
    const previews = [];
    const rc = await L.recover(me, r, { to: peer, payload: { type: 'probe', data: { vector: v.id, path: 'recovered' } }, idempotencyKey: `${tag}-rec`, approve: async (text, round) => { previews.push(text); return true; } });  // SCRIPTED approver
    const sm = rc.last && rc.last.message && (await stored(rc.last.message.id));
    const recovered = rc.outcome === 'sent' && rc.rounds.length === (v.rounds || 1) && !!sm && sm.body === v.expect && previews[previews.length - 1] === v.expect;
    rec(v.id, `recovery: ${v.rounds || 1} round(s), each a fresh (scripted) approval → stored == last preview`, recovered, `outcome=${rc.outcome} rounds=${rc.rounds.length} previews=${JSON.stringify(previews)} stored=${sm ? JSON.stringify(sm.body) : 'none'}`);
  }
  const fails = R.filter((x) => !x.pass).length;
  console.log(`\ncb-406: ${R.length - fails}/${R.length} pass${blocked ? ' — BLOCKED on deployment (0.1.2 refusal shape not live)' : ''}`);
  process.exit(blocked ? 2 : fails ? 1 : 0);
})().catch((e) => { console.error(e.code === 'BLOCKED_ON_FIXTURE' ? `BLOCKED: ${e.message}` : e); process.exit(2); });
