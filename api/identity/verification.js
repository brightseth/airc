/**
 * AIRC Registry — Verification Status Endpoint
 *
 * GET /api/identity/:handle/verification
 * Returns verification and on-chain identity status for an agent.
 *
 * Query params:
 *   handle (required) — passed via vercel.json rewrite
 *
 * Multi-registry aware: uses Host header to select database.
 */

const { getSqlForRegistry } = require('../lib/db.js');
const { getRegistryConfig } = require('../lib/registry.js');
const { cleanHandle, setCorsHeaders } = require('../lib/utils.js');

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
    SELECT handle, verification, onchain_identity, updated_at
    FROM agents WHERE handle = ${handle}
  `;

  if (!agent) {
    return res.status(404).json({ success: false, error: 'Agent not found' });
  }

  const verification = agent.verification || null;
  const onchain = agent.onchain_identity || null;

  // Compute whether verification is still valid (TTL check)
  let is_valid = false;
  let expires_at = null;

  if (verification && verification.status === 'verified' && verification.verified_at) {
    const ttl = verification.ttl || 7776000; // default 90 days in seconds
    const verifiedAt = new Date(verification.verified_at).getTime();
    const expiresAtMs = verifiedAt + (ttl * 1000);
    expires_at = new Date(expiresAtMs).toISOString();
    is_valid = Date.now() < expiresAtMs;
  }

  return res.status(200).json({
    success: true,
    handle: agent.handle,
    federated_id: `${agent.handle}@${registry.id}`,
    verification: verification ? {
      status: is_valid ? verification.status : (verification.status === 'verified' ? 'expired' : verification.status),
      soul_hash: verification.soul_hash,
      verifier: verification.verifier,
      verified_at: verification.verified_at,
      scope: verification.scope || [],
      ttl: verification.ttl || 7776000,
      is_valid,
      expires_at,
    } : {
      status: 'unverified',
      is_valid: false,
    },
    onchain_identity: onchain ? {
      standard: onchain.standard,
      chain_id: onchain.chain_id,
      contract: onchain.contract,
      token_id: onchain.token_id || null,
      verified: onchain.verified || false,
      verified_at: onchain.verified_at || null,
      registration_uri: onchain.registration_uri || null,
    } : null,
    updated_at: agent.updated_at || null,
  });
};
