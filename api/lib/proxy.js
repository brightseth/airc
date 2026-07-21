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
const { timingSafeEqual } = require('node:crypto');
const {
  DelegatedRateLimitError,
  createDelegatedRateLimiter,
} = require('./delegated-rate-limit.js');

let testDependencies = null;

function delegatedEnabled() {
  const flag = String(process.env.AIRC_DELEGATED_CREDENTIALS_ENABLED || '').toLowerCase();
  return flag === '1' || flag === 'true' || flag === 'on';
}

function upstreamSecret() {
  return testDependencies?.upstreamSecret ?? process.env.AIRC_DELEGATED_UPSTREAM_SECRET;
}

function validUpstreamSecret(secret) {
  if (!secret || Buffer.byteLength(secret, 'utf8') < 32) return false;
  // The facade never receives the JWT signing key. Refuse accidental reuse if
  // somebody nevertheless configures both values in the same deployment.
  const forbidden = [
    process.env.AIRC_DELEGATED_TOKEN_SECRET,
    process.env.VIBE_ACTOR_TOKEN_SECRET,
    process.env.VIBE_SESSION_SECRET,
    process.env.VIBE_AUTH_SECRET,
  ].filter(Boolean);
  return !forbidden.some((candidate) => {
    const a = Buffer.from(secret);
    const b = Buffer.from(candidate);
    return a.length === b.length && timingSafeEqual(a, b);
  });
}

function edgeLimiter() {
  return testDependencies?.limiter || createDelegatedRateLimiter();
}

function __setProxyTestDependencies(dependencies) {
  if (process.env.NODE_ENV !== 'test') throw new Error('proxy dependencies are test-only');
  testDependencies = dependencies;
}

async function proxy(req, res, path, options = {}) {
  if (options.delegated && !delegatedEnabled()) {
    return res.status(404).json({ code: 'not_found' });
  }
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Airc-Signature, X-Airc-Public-Key, X-Airc-Timestamp');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (options.delegated && req.method !== 'POST') {
    return res.status(405).json({ code: 'method_not_allowed' });
  }

  let delegatedSecret = null;
  if (options.delegated) {
    let bodyBytes;
    try {
      const serialized = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
      bodyBytes = Buffer.byteLength(serialized, 'utf8');
    } catch {
      return res.status(400).json({ code: 'bad_request' });
    }
    if (bodyBytes > 32 * 1024) return res.status(413).json({ code: 'payload_too_large' });

    delegatedSecret = upstreamSecret();
    if (!validUpstreamSecret(delegatedSecret)) {
      return res.status(503).json({ code: 'delegated_facade_not_configured' });
    }
    try {
      await edgeLimiter()(req, options.operation);
    } catch (error) {
      if (error instanceof DelegatedRateLimitError) {
        if (error.retryAfter) res.setHeader('Retry-After', String(error.retryAfter));
        return res.status(error.status).json({ code: error.code });
      }
      console.error('[airc/delegated-rate-limit]', error);
      return res.status(503).json({ code: 'rate_limit_unavailable' });
    }
  }

  // Preserve any query string from the original request.
  const qs = req.url && req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  const target = `${UPSTREAM}${path}${qs}`;

  const headers = { 'Content-Type': 'application/json' };
  // Forward auth/signing headers so signed requests work end-to-end.
  for (const h of ['authorization', 'x-airc-signature', 'x-airc-public-key', 'x-airc-timestamp']) {
    if (req.headers[h]) headers[h] = req.headers[h];
  }
  if (delegatedSecret) headers['x-airc-upstream-secret'] = delegatedSecret;

  const init = { method: req.method, headers };
  if (!['GET', 'HEAD'].includes(req.method)) {
    init.body = typeof req.body === 'string'
      ? req.body
      : JSON.stringify(req.body || {});
  }

  try {
    init.signal = AbortSignal.timeout(10_000);
    const upstream = await (testDependencies?.fetch || fetch)(target, init);
    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
    return res.send(text);
  } catch (err) {
    return res.status(502).json({
      error: 'Upstream registry unavailable',
      registry: UPSTREAM,
    });
  }
}

module.exports = { proxy, UPSTREAM, __setProxyTestDependencies, delegatedEnabled };
