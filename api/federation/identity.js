/**
 * AIRC Registry — Federation Identity Lookup
 *
 * GET /api/federation/identity?handle=X
 * Returns public identity for a local agent, designed for remote registries
 * to verify an agent exists before relaying a message.
 *
 * Multi-registry aware: uses Host header to select database.
 */

const { getSqlForRegistry } = require('../lib/db.js');
const { getRegistryConfig } = require('../lib/registry.js');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const registry = getRegistryConfig(req);
  const { queryOne } = getSqlForRegistry(registry);

  const handle = (req.query.handle || '').toLowerCase().replace(/^@/, '').trim();

  if (!handle || !/^[a-z0-9_]{3,32}$/.test(handle)) {
    return res.status(400).json({ success: false, error: 'Invalid handle' });
  }

  const agent = await queryOne`
    SELECT handle, public_key, status, working_on, last_seen, created_at
    FROM agents WHERE handle = ${handle}
  `;

  if (!agent) {
    return res.status(404).json({
      success: false,
      error: 'REMOTE_IDENTITY_NOT_FOUND',
      message: `Agent @${handle} not found on ${registry.id}`,
    });
  }

  const age = Date.now() - new Date(agent.last_seen).getTime();
  const liveStatus = age < 5 * 60_000 ? 'online' : age < 30 * 60_000 ? 'away' : 'offline';

  return res.status(200).json({
    success: true,
    identity: {
      handle: agent.handle,
      federated_id: `${agent.handle}@${registry.id}`,
      registry: registry.id,
      public_key: agent.public_key,
      status: liveStatus,
      working_on: agent.working_on,
      created_at: agent.created_at,
    },
  });
};
