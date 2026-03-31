/**
 * AIRC Registry — Identity Lookup & Update
 *
 * GET   /api/identity/:handle  — Returns public profile for an agent.
 * PATCH /api/identity/:handle  — Updates on-chain identity and/or verification data.
 *
 * Multi-registry aware: uses Host header to select database.
 */

const { getSqlForRegistry } = require('../lib/db.js');
const { getAuthForRegistry } = require('../lib/auth.js');
const { getRegistryConfig } = require('../lib/registry.js');
const { cleanHandle, computeLiveStatus, setCorsHeaders, requireAuth } = require('../lib/utils.js');

module.exports = async function handler(req, res) {
  setCorsHeaders(res, 'GET, PATCH, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const registry = getRegistryConfig(req);
  const { sql, queryOne } = getSqlForRegistry(registry);

  const handle = cleanHandle(req.query.handle);

  if (!handle) {
    return res.status(400).json({ success: false, error: 'Invalid handle' });
  }

  // ── GET: public identity lookup ──────────────────────
  if (req.method === 'GET') {
    const agent = await queryOne`
      SELECT handle, public_key, status, working_on, last_seen, created_at, registry,
             onchain_identity, verification
      FROM agents WHERE handle = ${handle}
    `;

    if (!agent) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }

    const liveStatus = computeLiveStatus(agent.last_seen);

    const identity = {
      handle: agent.handle,
      federated_id: `${agent.handle}@${registry.id}`,
      public_key: agent.public_key,
      status: liveStatus,
      working_on: agent.working_on,
      registry: agent.registry || registry.id,
      created_at: agent.created_at,
      capabilities: ['text'],
    };

    // Include on-chain identity if present
    if (agent.onchain_identity) {
      identity.onchain_identity = agent.onchain_identity;
    }

    // Include verification if present
    if (agent.verification) {
      identity.verification = {
        status: agent.verification.status,
        verifier: agent.verification.verifier,
        verified_at: agent.verification.verified_at,
        scope: agent.verification.scope,
      };
    }

    return res.status(200).json({ success: true, identity });
  }

  // ── PATCH: update identity with on-chain / verification data ──
  if (req.method === 'PATCH') {
    const { verifyToken } = getAuthForRegistry(registry);
    const claims = await requireAuth(req, res, verifyToken);
    if (!claims) return; // requireAuth already sent 401

    // Verify the authenticated user owns this handle
    if (claims.handle !== handle) {
      return res.status(403).json({
        success: false,
        error: 'Cannot update another agent\'s identity',
      });
    }

    // Check agent exists
    const agent = await queryOne`
      SELECT handle, onchain_identity, verification
      FROM agents WHERE handle = ${handle}
    `;

    if (!agent) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }

    const { onchain_identity, verification } = req.body || {};
    const updates = [];

    // Validate and apply on-chain identity update
    if (onchain_identity !== undefined) {
      if (onchain_identity === null) {
        // Allow clearing on-chain identity
        updates.push('onchain_identity');
      } else {
        const validationError = validateOnchainIdentity(onchain_identity);
        if (validationError) {
          return res.status(400).json({ success: false, error: validationError });
        }
        updates.push('onchain_identity');
      }
    }

    // Validate and apply verification update
    if (verification !== undefined) {
      if (verification === null) {
        // Allow clearing verification
        updates.push('verification');
      } else {
        const validationError = validateVerification(verification);
        if (validationError) {
          return res.status(400).json({ success: false, error: validationError });
        }
        updates.push('verification');
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update. Provide onchain_identity and/or verification.',
      });
    }

    // Build the update — use separate queries per field to keep the tagged
    // template approach consistent with the rest of the codebase.
    if (updates.includes('onchain_identity') && updates.includes('verification')) {
      await sql`
        UPDATE agents
        SET onchain_identity = ${onchain_identity ? JSON.stringify(onchain_identity) : null}::jsonb,
            verification = ${verification ? JSON.stringify(verification) : null}::jsonb,
            updated_at = NOW()
        WHERE handle = ${handle}
      `;
    } else if (updates.includes('onchain_identity')) {
      await sql`
        UPDATE agents
        SET onchain_identity = ${onchain_identity ? JSON.stringify(onchain_identity) : null}::jsonb,
            updated_at = NOW()
        WHERE handle = ${handle}
      `;
    } else if (updates.includes('verification')) {
      await sql`
        UPDATE agents
        SET verification = ${verification ? JSON.stringify(verification) : null}::jsonb,
            updated_at = NOW()
        WHERE handle = ${handle}
      `;
    }

    // Fetch updated record
    const updated = await queryOne`
      SELECT handle, onchain_identity, verification, updated_at
      FROM agents WHERE handle = ${handle}
    `;

    return res.status(200).json({
      success: true,
      message: `Identity updated for @${handle}`,
      updated_fields: updates,
      identity: {
        handle: updated.handle,
        federated_id: `${updated.handle}@${registry.id}`,
        onchain_identity: updated.onchain_identity || null,
        verification: updated.verification || null,
        updated_at: updated.updated_at,
      },
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};

// ── Validation helpers ──────────────────────────────────────

/**
 * Validate on-chain identity payload (ERC-8004 linking).
 * Returns error string or null if valid.
 */
function validateOnchainIdentity(data) {
  if (typeof data !== 'object' || Array.isArray(data)) {
    return 'onchain_identity must be a JSON object';
  }

  const { standard, chain_id, contract } = data;

  if (!standard || typeof standard !== 'string') {
    return 'onchain_identity.standard is required (e.g. "ERC-8004")';
  }

  if (!chain_id || (typeof chain_id !== 'string' && typeof chain_id !== 'number')) {
    return 'onchain_identity.chain_id is required (e.g. "8453" for Base)';
  }

  if (!contract || typeof contract !== 'string') {
    return 'onchain_identity.contract is required (contract address)';
  }

  // Basic Ethereum address format check
  if (!/^0x[a-fA-F0-9]{40}$/.test(contract)) {
    return 'onchain_identity.contract must be a valid Ethereum address (0x...)';
  }

  return null;
}

/**
 * Validate verification payload (soul.md verification).
 * Returns error string or null if valid.
 */
function validateVerification(data) {
  if (typeof data !== 'object' || Array.isArray(data)) {
    return 'verification must be a JSON object';
  }

  const { soul_hash, status } = data;

  if (!soul_hash || typeof soul_hash !== 'string') {
    return 'verification.soul_hash is required (e.g. "sha256:...")';
  }

  if (!soul_hash.startsWith('sha256:')) {
    return 'verification.soul_hash must start with "sha256:"';
  }

  const validStatuses = ['pending', 'verified', 'revoked', 'expired'];
  if (!status || !validStatuses.includes(status)) {
    return `verification.status must be one of: ${validStatuses.join(', ')}`;
  }

  if (data.scope && !Array.isArray(data.scope)) {
    return 'verification.scope must be an array';
  }

  if (data.ttl !== undefined && (typeof data.ttl !== 'number' || data.ttl < 0)) {
    return 'verification.ttl must be a positive number (seconds)';
  }

  return null;
}
