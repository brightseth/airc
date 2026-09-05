#!/usr/bin/env node
const { liveSender, allowlist, FORBIDDEN } = require('./lib/live-sender.js');
const R = []; const t = (n, fn, want) => { let got; try { got = fn(); } catch (e) { got = e.code || e.message; } R.push([got === want ? '✓' : '✗', n, got, want]); };
t('brightseth is refused even if credentials existed', () => liveSender('brightseth'), 'BLOCKED_ON_FIXTURE');
t('seth is refused', () => liveSender('seth'), 'BLOCKED_ON_FIXTURE');
t('a handle not on the allowlist is refused', () => liveSender('vibetester1'), 'BLOCKED_ON_FIXTURE');
t('allowlist names only dedicated test principals', () => allowlist().every((h) => !FORBIDDEN.has(h)) ? 'ok' : 'forbidden-name-present', 'ok');
t('northstar_p (allowlisted, unprovisioned) → blocked on fixture, not a fallback', () => { try { return liveSender('northstar_p').handle; } catch (e) { return e.code; } }, 'BLOCKED_ON_FIXTURE');
t('northstar_a (allowlisted, provisioned) → sender or blocked, never Seth', () => { try { const s = liveSender('northstar_a'); return FORBIDDEN.has(s.handle) ? 'SETH' : 'sender'; } catch (e) { return e.code; } }, require('fs').existsSync(require('os').homedir() + '/.seth/northstar_a/vibe-mint-credential') ? 'sender' : 'BLOCKED_ON_FIXTURE');
for (const [m, n, g, w] of R) console.log(`${m} ${n}${m === '✗' ? ` (got ${g}, want ${w})` : ''}`);
process.exit(R.some((r) => r[0] === '✗') ? 1 : 0);
