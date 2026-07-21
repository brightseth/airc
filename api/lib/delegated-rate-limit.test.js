const test = require('node:test');
const assert = require('node:assert/strict');
const {
  DelegatedRateLimitError,
  createDelegatedRateLimiter,
  trustedClientIP,
} = require('./delegated-rate-limit.js');

const SALT = 'edge-rate-limit-test-salt-0123456789-abcdef';

test('uses only Vercel-owned forwarding metadata, never caller x-forwarded-for', () => {
  assert.equal(trustedClientIP({
    headers: {
      'x-vercel-forwarded-for': '203.0.113.7, 10.0.0.1',
      'x-forwarded-for': '6.6.6.6',
    },
  }), '203.0.113.7');
  assert.equal(trustedClientIP({
    headers: { 'x-forwarded-for': '6.6.6.6' },
    socket: { remoteAddress: '127.0.0.1' },
  }), '127.0.0.1');
});

test('meters both IP and subject and rejects after the operation cap', async () => {
  const counts = new Map();
  const limiter = createDelegatedRateLimiter({
    salt: SALT,
    increment: async (key) => {
      const count = (counts.get(key) || 0) + 1;
      counts.set(key, count);
      return count;
    },
  });
  const req = {
    headers: { 'x-vercel-forwarded-for': '203.0.113.8' },
    body: { handle: 'solienne' },
  };
  for (let i = 0; i < 5; i += 1) await limiter(req, 'link');
  await assert.rejects(() => limiter(req, 'link'), (error) => {
    assert.ok(error instanceof DelegatedRateLimitError);
    assert.equal(error.code, 'rate_limited');
    assert.equal(error.status, 429);
    return true;
  });
  assert.equal(counts.size, 2);
});

test('fails closed when policy or distributed-store configuration is absent', async () => {
  const noSalt = createDelegatedRateLimiter({ salt: '' });
  await assert.rejects(() => noSalt({ headers: {} }, 'mint'), { code: 'rate_limit_unavailable' });

  const limiter = createDelegatedRateLimiter({ salt: SALT, increment: async () => 1 });
  await assert.rejects(() => limiter({ headers: {} }, 'unknown'), { code: 'rate_limit_policy_missing' });
});
