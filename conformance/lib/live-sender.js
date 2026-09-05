/**
 * The ONLY sanctioned way for AIRC conformance code to obtain a sender for live tests.
 *
 * Seth's rule (2026-09-04): never send as Seth; dedicated test credentials from an explicit
 * allowlist; no fallback to ambient session credentials; missing credentials = blocked on a
 * fixture. A prompt memory or handle prefix is insufficient — this module enforces it.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const ALLOWLIST_FILE = path.join(__dirname, '..', 'TEST-SENDERS.allowlist');
const FORBIDDEN = new Set(['brightseth', 'seth']);
const AMBIENT = [path.join(os.homedir(), '.vibe', 'auth.json'), path.join(os.homedir(), '.vibe', 'config.json')];

function allowlist() {
  return fs.readFileSync(ALLOWLIST_FILE, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
}

/** Returns { handle, mint?, token? } or throws BlockedOnFixture. Never reads ~/.vibe. */
function liveSender(handle) {
  const h = String(handle || '').toLowerCase();
  if (FORBIDDEN.has(h)) throw blocked(`refusing to send as ${h}: Seth's identity is never a test sender`);
  if (!allowlist().includes(h)) throw blocked(`${h} is not in conformance/TEST-SENDERS.allowlist`);
  const dir = path.join(os.homedir(), '.seth', h);
  const read = (f) => { const p = path.join(dir, f); if (!fs.existsSync(p)) return null; const st = fs.statSync(p); if (st.mode & 0o077) throw blocked(`${p} must be mode 600`); return fs.readFileSync(p, 'utf8').trim(); };
  const mint = read('vibe-mint-credential'); const token = read('session-token');
  if (!mint && !token) throw blocked(`no credential for ${h} under ${dir} — provision it (blocked on a fixture)`);
  for (const a of AMBIENT) if (fs.existsSync(a)) { /* present on disk is fine; it is simply never read here */ }
  return { handle: h, mint: mint || undefined, token: token || undefined };
}
function blocked(msg) { const e = new Error(`BLOCKED_ON_FIXTURE: ${msg}`); e.code = 'BLOCKED_ON_FIXTURE'; e.exitCode = 2; return e; }

module.exports = { liveSender, allowlist, FORBIDDEN, ALLOWLIST_FILE };
