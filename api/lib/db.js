/**
 * AIRC Registry — Database Helper
 *
 * Neon Postgres connection via tagged template literals.
 * Supports multiple registry databases (primary + demo).
 *
 * Usage:
 *   const { getSqlForRegistry } = require('./db.js');
 *   const { sql, queryOne } = getSqlForRegistry(registryConfig);
 *
 * Backwards-compatible: the default `sql` and `queryOne` exports
 * delegate to getSqlForRegistry with a default config.
 */

const { neon } = require('@neondatabase/serverless');

// Cache sql instances by connection URL to avoid re-creating per request
const sqlCache = new Map();

function getSqlInstance(url) {
  if (!url) {
    throw new Error('Database URL not configured');
  }
  if (!sqlCache.has(url)) {
    sqlCache.set(url, neon(url));
  }
  return sqlCache.get(url);
}

/**
 * Get sql + queryOne bound to a specific registry's database.
 *
 * @param {{ dbUrl: string }} registryConfig — from getRegistryConfig(req)
 * @returns {{ sql: Function, queryOne: Function }}
 */
function getSqlForRegistry(registryConfig) {
  const instance = getSqlInstance(registryConfig.dbUrl);

  const sqlProxy = new Proxy(function () {}, {
    apply(_, __, args) {
      return instance(...args);
    },
    get(_, prop) {
      return instance[prop];
    },
  });

  async function queryOne(strings, ...values) {
    const rows = await instance(strings, ...values);
    return rows.length > 0 ? rows[0] : null;
  }

  return { sql: sqlProxy, queryOne };
}

// ── Backwards-compatible default exports ─────────────────────
// Delegate to getSqlForRegistry with a default config that lazily
// reads the env var, so logic isn't duplicated.
//
// IMPORTANT: instantiation is deferred until first query. If we eagerly call
// getSqlForRegistry(defaultConfig) at module load and AIRC_DATABASE_URL is
// unset, getSqlInstance() throws here — and because every endpoint does
// `require('./lib/db.js')`, that turns a recoverable "DB unavailable" into a
// hard FUNCTION_INVOCATION_FAILED (500) across the entire API, before any
// handler's try/catch can downgrade it to a graceful 503. So bind lazily.
const defaultConfig = {
  get dbUrl() {
    return process.env.AIRC_DATABASE_URL || process.env.AIRC_DATABASE_DATABASE_URL;
  },
};

const sql = new Proxy(function () {}, {
  apply(_, __, args) {
    return getSqlForRegistry(defaultConfig).sql(...args);
  },
  get(_, prop) {
    return getSqlForRegistry(defaultConfig).sql[prop];
  },
});

function queryOne(strings, ...values) {
  return getSqlForRegistry(defaultConfig).queryOne(strings, ...values);
}

module.exports = { sql, queryOne, getSqlForRegistry };
