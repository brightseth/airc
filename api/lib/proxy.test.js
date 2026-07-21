const test = require('node:test');
const assert = require('node:assert/strict');
const { DelegatedRateLimitError } = require('./delegated-rate-limit.js');
const { proxy, __setProxyTestDependencies } = require('./proxy.js');

const UPSTREAM_SECRET = 'airc-upstream-test-secret-0123456789-abcdef';

function response() {
  return {
    statusCode: 200,
    body: undefined,
    headers: {},
    status(code) { this.statusCode = code; return this; },
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    json(value) { this.body = value; return this; },
    send(value) { this.body = value; return this; },
    end() { return this; },
  };
}

test.beforeEach(() => {
  process.env.NODE_ENV = 'test';
  process.env.AIRC_DELEGATED_CREDENTIALS_ENABLED = '1';
  __setProxyTestDependencies(null);
});

test.after(() => {
  delete process.env.AIRC_DELEGATED_CREDENTIALS_ENABLED;
  __setProxyTestDependencies(null);
});

test('stays fingerprint-free while dormant', async () => {
  delete process.env.AIRC_DELEGATED_CREDENTIALS_ENABLED;
  const res = response();
  await proxy({ method: 'OPTIONS', headers: {} }, res, '/x', {
    delegated: true, operation: 'mint',
  });
  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.body, { code: 'not_found' });
  assert.deepEqual(res.headers, {});
});

test('meters before lookup and replaces any caller-supplied upstream credential', async () => {
  let metered = false;
  let fetchInit;
  __setProxyTestDependencies({
    upstreamSecret: UPSTREAM_SECRET,
    limiter: async () => { metered = true; },
    fetch: async (_url, init) => {
      fetchInit = init;
      return { ok: true, status: 200, headers: { get: () => 'application/json' }, text: async () => '{"ok":true}' };
    },
  });
  const res = response();
  await proxy({
    method: 'POST',
    url: '/api/delegated-credentials/mint',
    headers: { 'x-airc-upstream-secret': 'attacker', authorization: 'Bearer signed' },
    body: { handle: 'sal' },
  }, res, '/api/airc/v1/delegated-credentials/mint', {
    delegated: true, operation: 'mint',
  });
  assert.equal(metered, true);
  assert.equal(fetchInit.headers['x-airc-upstream-secret'], UPSTREAM_SECRET);
  assert.equal(fetchInit.headers.authorization, 'Bearer signed');
  assert.equal(res.statusCode, 200);
});

test('fails closed when the limiter or upstream proof is unavailable', async () => {
  __setProxyTestDependencies({ upstreamSecret: '', limiter: async () => {} });
  const unconfigured = response();
  await proxy({ method: 'POST', headers: {}, body: {} }, unconfigured, '/x', {
    delegated: true, operation: 'mint',
  });
  assert.equal(unconfigured.statusCode, 503);

  __setProxyTestDependencies({
    upstreamSecret: UPSTREAM_SECRET,
    limiter: async () => { throw new DelegatedRateLimitError('rate_limit_unavailable', 503); },
  });
  const unavailable = response();
  await proxy({ method: 'POST', headers: {}, body: {} }, unavailable, '/x', {
    delegated: true, operation: 'mint',
  });
  assert.equal(unavailable.statusCode, 503);
  assert.deepEqual(unavailable.body, { code: 'rate_limit_unavailable' });
});

test('rejects wrong methods and oversized bodies before the limiter', async () => {
  let calls = 0;
  __setProxyTestDependencies({
    upstreamSecret: UPSTREAM_SECRET,
    limiter: async () => { calls += 1; },
  });
  const wrongMethod = response();
  await proxy({ method: 'GET', headers: {} }, wrongMethod, '/x', {
    delegated: true, operation: 'mint',
  });
  assert.equal(wrongMethod.statusCode, 405);

  const oversized = response();
  await proxy({ method: 'POST', headers: {}, body: 'x'.repeat(32 * 1024 + 1) }, oversized, '/x', {
    delegated: true, operation: 'mint',
  });
  assert.equal(oversized.statusCode, 413);
  assert.equal(calls, 0);
});
