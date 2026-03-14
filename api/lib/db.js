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
 * Backwards-compatible: the default `sql` and `queryOne` exports still
 * use AIRC_DATABASE_URL for any code that hasn't been updated yet.
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
// These use the primary database (AIRC_DATABASE_URL) so existing
// code that does `require('./db.js')` keeps working unchanged.

let defaultInstance = null;

function getDefaultSQL() {
  if (!defaultInstance) {
    const url = process.env.AIRC_DATABASE_URL || process.env.AIRC_DATABASE_DATABASE_URL;
    if (!url) {
      throw new Error('AIRC_DATABASE_URL not configured');
    }
    defaultInstance = neon(url);
  }
  return defaultInstance;
}

const sql = new Proxy(function () {}, {
  apply(_, __, args) {
    return getDefaultSQL()(...args);
  },
  get(_, prop) {
    return getDefaultSQL()[prop];
  },
});

async function queryOne(strings, ...values) {
  const rows = await getDefaultSQL()(strings, ...values);
  return rows.length > 0 ? rows[0] : null;
}

module.exports = { sql, queryOne, getSqlForRegistry };
