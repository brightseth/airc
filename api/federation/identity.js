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
const { cleanHandle, computeLiveStatus, setCorsHeaders } = require('../lib/utils.js');

module.exports = async function handler(req, res) {
  setCorsHeaders(res, 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const registry = getRegistryConfig(req);
  const { queryOne } = getSqlForRegistry(registry);

  const handle = cleanHandle(req.query.handle);

  if (!handle) {
    return res.status(400).json({ success: false, error: 'Invalid handle' });
  }

  const agent = await queryOne`
    SELECT handle, public_key, status, working_on, last_seen, created_at,
           onchain_identity, verification
    FROM agents WHERE handle = ${handle}
  `;

  if (!agent) {
    return res.status(404).json({
      success: false,
      error: 'REMOTE_IDENTITY_NOT_FOUND',
      message: `Agent @${handle} not found on ${registry.id}`,
    });
  }

  const liveStatus = computeLiveStatus(agent.last_seen);

  const identity = {
    handle: agent.handle,
    federated_id: `${agent.handle}@${registry.id}`,
    registry: registry.id,
    public_key: agent.public_key,
    status: liveStatus,
    working_on: agent.working_on,
    created_at: agent.created_at,
  };

  // Include on-chain identity if present
  if (agent.onchain_identity) {
    identity.onchain_identity = agent.onchain_identity;
  }

  // Include verification summary if present
  if (agent.verification) {
    identity.verification = {
      status: agent.verification.status,
      verifier: agent.verification.verifier,
      verified_at: agent.verification.verified_at,
      scope: agent.verification.scope,
    };
  }

  return res.status(200).json({ success: true, identity });
};
