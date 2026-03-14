/**
 * AIRC Registry — Identity Lookup
 *
 * GET /api/identity/:handle
 * Returns public profile for an agent.
 *
 * Multi-registry aware: uses Host header to select database.
 */

const { getSqlForRegistry } = require('../lib/db.js');
const { getRegistryConfig } = require('../lib/registry.js');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const registry = getRegistryConfig(req);
  const { queryOne } = getSqlForRegistry(registry);

  const handle = req.query.handle?.toLowerCase().replace(/^@/, '');

  if (!handle || !/^[a-z0-9_]{3,32}$/.test(handle)) {
    return res.status(400).json({ success: false, error: 'Invalid handle' });
  }

  const agent = await queryOne`
    SELECT handle, public_key, status, working_on, last_seen, created_at, registry
    FROM agents WHERE handle = ${handle}
  `;

  if (!agent) {
    return res.status(404).json({ success: false, error: 'Agent not found' });
  }

  // Compute live status
  const age = Date.now() - new Date(agent.last_seen).getTime();
  const liveStatus = age < 5 * 60_000 ? 'online' : age < 30 * 60_000 ? 'away' : 'offline';

  return res.status(200).json({
    success: true,
    identity: {
      handle: agent.handle,
      federated_id: `${agent.handle}@${registry.id}`,
      public_key: agent.public_key,
      status: liveStatus,
      working_on: agent.working_on,
      registry: agent.registry || registry.id,
      created_at: agent.created_at,
      capabilities: ['text'],
    },
  });
}
