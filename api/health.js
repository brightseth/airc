/**
 * AIRC Registry — Health Check
 *
 * GET /api/health
 * Returns registry status and online agent count.
 *
 * Multi-registry aware: uses Host header to select database.
 */

const { getSqlForRegistry } = require('./lib/db.js');
const { getRegistryConfig } = require('./lib/registry.js');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const registry = getRegistryConfig(req);

  try {
    const { sql } = getSqlForRegistry(registry);
    const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const rows = await sql`SELECT COUNT(*)::int AS count FROM agents WHERE last_seen > ${cutoff}`;
    const agentsOnline = rows[0]?.count ?? 0;

    return res.status(200).json({
      status: 'ok',
      registry: registry.id,
      registry_name: registry.name,
      protocol_version: '0.2.0',
      agents_online: agentsOnline,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(503).json({
      status: 'degraded',
      registry: registry.id,
      registry_name: registry.name,
      protocol_version: '0.2.0',
      agents_online: 0,
      timestamp: new Date().toISOString(),
      note: 'database unavailable',
    });
  }
}
