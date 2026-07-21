/** Fail-closed, distributed edge limits for the delegated-credential facade. */
const { createHmac } = require('node:crypto');

const LIMITS = Object.freeze({
  mint: { ip: [60, 60], subject: [20, 60] },
  verify: { ip: [600, 60], subject: [240, 60] },
  revoke: { ip: [30, 60], subject: [10, 60] },
  link: { ip: [20, 3600], subject: [5, 3600] },
  offer: { ip: [120, 3600], subject: [60, 3600] },
  decision: { ip: [120, 3600], subject: [60, 3600] },
});

class DelegatedRateLimitError extends Error {
  constructor(code, status, retryAfter = null) {
    super(code);
    this.name = 'DelegatedRateLimitError';
    this.code = code;
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

function bodyOf(req) {
  if (req?.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req?.body || '{}'); } catch { return {}; }
}

function trustedClientIP(req) {
  const vercel = req?.headers?.['x-vercel-forwarded-for'];
  if (typeof vercel === 'string' && vercel.trim()) return vercel.split(',')[0].trim();
  if (Array.isArray(vercel) && vercel[0]) return String(vercel[0]).split(',')[0].trim();
  return req?.socket?.remoteAddress || req?.connection?.remoteAddress || 'unknown';
}

function subjectOf(req, operation) {
  const body = bodyOf(req);
  if (operation === 'verify') return body.token || 'missing';
  if (operation === 'decision') return body.decision?.invitee || 'missing';
  if (operation === 'offer') return body.inviter || 'missing';
  return body.handle || 'missing';
}

function privateDigest(value, salt) {
  return createHmac('sha256', salt).update(String(value)).digest('hex').slice(0, 32);
}

async function upstashIncrement(key, windowSeconds, env = process.env) {
  const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;
  if (!url || !token) throw new DelegatedRateLimitError('rate_limit_unavailable', 503);

  const script = [
    "local n = redis.call('INCR', KEYS[1])",
    "if n == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end",
    'return n',
  ].join('\n');
  let response;
  try {
    response = await fetch(url.replace(/\/$/, ''), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(['EVAL', script, '1', key, String(windowSeconds)]),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    throw new DelegatedRateLimitError('rate_limit_unavailable', 503);
  }
  if (!response.ok) throw new DelegatedRateLimitError('rate_limit_unavailable', 503);
  const payload = await response.json().catch(() => null);
  const count = Number(payload?.result);
  if (!Number.isSafeInteger(count) || count < 1) {
    throw new DelegatedRateLimitError('rate_limit_unavailable', 503);
  }
  return count;
}

function createDelegatedRateLimiter(dependencies = {}) {
  const increment = dependencies.increment || ((key, seconds) => upstashIncrement(key, seconds));
  const salt = dependencies.salt === undefined
    ? process.env.AIRC_EDGE_RATE_LIMIT_SALT
    : dependencies.salt;

  return async function limit(req, operation) {
    const policy = LIMITS[operation];
    if (!policy) throw new DelegatedRateLimitError('rate_limit_policy_missing', 503);
    if (!salt || Buffer.byteLength(salt, 'utf8') < 32) {
      throw new DelegatedRateLimitError('rate_limit_unavailable', 503);
    }

    const dimensions = [
      ['ip', trustedClientIP(req)],
      ['subject', subjectOf(req, operation)],
    ];
    for (const [dimension, value] of dimensions) {
      const [max, windowSeconds] = policy[dimension];
      const digest = privateDigest(value, salt);
      const count = await increment(
        `airc:delegated:${operation}:${dimension}:${digest}`,
        windowSeconds
      );
      if (count > max) {
        throw new DelegatedRateLimitError('rate_limited', 429, windowSeconds);
      }
    }
  };
}

module.exports = {
  DelegatedRateLimitError,
  LIMITS,
  createDelegatedRateLimiter,
  subjectOf,
  trustedClientIP,
};
