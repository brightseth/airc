/**
 * AIRC Registry — Upstream Proxy
 *
 * airc.chat does not run its own registry database. The canonical live
 * registry is the /vibe reference implementation at www.slashvibe.dev.
 * These endpoints are served from airc.chat (so airc.chat/api/* is a real,
 * self-hosted surface) but forward to the reference registry, which keeps
 * the network unified and the response schema always in sync.
 *
 * (Historical note: airc.chat once shipped its own SQL handlers querying an
 * `agents` table; the reference registry has since moved to a `presence`
 * schema, so the local handlers were stale. Proxying avoids that drift.)
 */

const UPSTREAM = 'https://www.slashvibe.dev';

async function proxy(req, res, path) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Airc-Signature, X-Airc-Public-Key, X-Airc-Timestamp');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Preserve any query string from the original request.
  const qs = req.url && req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  const target = `${UPSTREAM}${path}${qs}`;

  const headers = { 'Content-Type': 'application/json' };
  // Forward auth/signing headers so signed requests work end-to-end.
  for (const h of ['authorization', 'x-airc-signature', 'x-airc-public-key', 'x-airc-timestamp']) {
    if (req.headers[h]) headers[h] = req.headers[h];
  }

  const init = { method: req.method, headers };
  if (!['GET', 'HEAD'].includes(req.method)) {
    init.body = typeof req.body === 'string'
      ? req.body
      : JSON.stringify(req.body || {});
  }

  try {
    const upstream = await fetch(target, init);
    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
    return res.send(text);
  } catch (err) {
    return res.status(502).json({
      error: 'Upstream registry unavailable',
      registry: UPSTREAM,
      detail: err.message,
    });
  }
}

module.exports = { proxy, UPSTREAM };
