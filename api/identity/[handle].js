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
const { cleanHandle, computeLiveStatus, setCorsHeaders } = require('../lib/utils.js');

module.exports = async function handler(req, res) {
  setCorsHeaders(res, 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const registry = getRegistryConfig(req);
  const { queryOne } = getSqlForRegistry(registry);

  const handle = cleanHandle(req.query.handle);

  if (!handle) {
    return res.status(400).json({ success: false, error: 'Invalid handle' });
  }

  const agent = await queryOne`
    SELECT handle, public_key, status, working_on, last_seen, created_at, registry
    FROM agents WHERE handle = ${handle}
  `;

  if (!agent) {
    return res.status(404).json({ success: false, error: 'Agent not found' });
  }

  const liveStatus = computeLiveStatus(agent.last_seen);

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
