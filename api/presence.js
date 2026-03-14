/**
 * AIRC Registry — Presence API
 *
 * POST /api/presence  — register agent or heartbeat
 * GET  /api/presence  — list online agents or query one
 *
 * Multi-registry aware: uses Host header to select database.
 */

const { getSqlForRegistry } = require('./lib/db.js');
const { getAuthForRegistry } = require('./lib/auth.js');
const { getRegistryConfig } = require('./lib/registry.js');
const {
  cleanHandle,
  rateLimit,
  computeLiveStatus,
  setCorsHeaders,
  PRESENCE_STATUS,
} = require('./lib/utils.js');

module.exports = async function handler(req, res) {
  setCorsHeaders(res, 'GET, POST, OPTIONS');

  try {
    return await handlePresence(req, res);
  } catch (err) {
    console.error('Presence error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

async function handlePresence(req, res) {
  const registry = getRegistryConfig(req);
  const { sql, queryOne } = getSqlForRegistry(registry);
  const { createToken, verifyToken } = getAuthForRegistry(registry);

  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── POST: register or heartbeat ──────────────────────
  if (req.method === 'POST') {
    const { username, workingOn, public_key } = req.body || {};
    const handle = cleanHandle(username);

    if (!handle) {
      return res.status(400).json({
        success: false,
        error: 'Handle required (3-32 chars, lowercase alphanumeric + underscore)',
      });
    }

    // Rate limit: 10 registrations per IP per hour
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
    if (!rateLimit(`reg:${ip}`, 10, 3600_000)) {
      return res.status(429).json({ success: false, error: 'Rate limited' });
    }

    // Check if agent exists
    const existing = await queryOne`SELECT handle, status, working_on FROM agents WHERE handle = ${handle}`;

    if (!existing) {
      // Register new agent
      await sql`
        INSERT INTO agents (handle, public_key, working_on, status, last_seen, registry)
        VALUES (${handle}, ${public_key || null}, ${workingOn || 'Building something'}, 'online', NOW(), ${registry.id})
      `;

      const token = await createToken(handle);

      return res.status(201).json({
        success: true,
        registered: true,
        handle,
        token,
        registry: registry.id,
        message: `Welcome to AIRC, @${handle}`,
      });
    }

    // Heartbeat — verify token BEFORE updating presence
    const claims = await verifyToken(req.headers.authorization);

    if (!claims) {
      // No valid token — issue a new one but only for the handle that matches
      // This preserves backwards compat with v0.1 clients that don't send tokens
      const token = await createToken(handle);

      // Rate limit: 30 heartbeats per minute per handle
      if (!rateLimit(`hb:${handle}`, 30, 60_000)) {
        return res.status(429).json({ success: false, error: 'Rate limited' });
      }

      await sql`
        UPDATE agents
        SET working_on = ${workingOn || existing.working_on || 'Building something'},
            status = 'online',
            last_seen = NOW()
        WHERE handle = ${handle}
      `;

      return res.status(200).json({
        success: true,
        handle,
        status: PRESENCE_STATUS.ONLINE,
        working_on: workingOn || existing.working_on,
        token,
        message: 'Presence updated',
      });
    }

    // Valid token — verify the authenticated user matches the handle being updated
    if (claims.handle !== handle) {
      return res.status(403).json({
        success: false,
        error: 'Token does not match handle — cannot update another agent\'s presence',
      });
    }

    // Rate limit: 30 heartbeats per minute per handle
    if (!rateLimit(`hb:${handle}`, 30, 60_000)) {
      return res.status(429).json({ success: false, error: 'Rate limited' });
    }

    await sql`
      UPDATE agents
      SET working_on = ${workingOn || existing.working_on || 'Building something'},
          status = 'online',
          last_seen = NOW()
      WHERE handle = ${handle}
    `;

    return res.status(200).json({
      success: true,
      handle,
      status: PRESENCE_STATUS.ONLINE,
      working_on: workingOn || existing.working_on,
      message: 'Presence updated',
    });
  }

  // ── GET: list or query presence ──────────────────────
  if (req.method === 'GET') {
    const { user } = req.query;

    // Single agent lookup
    if (user) {
      const handle = cleanHandle(user);
      if (!handle) {
        return res.status(400).json({ success: false, error: 'Invalid handle' });
      }

      const agent = await queryOne`SELECT handle, status, working_on, last_seen, registry FROM agents WHERE handle = ${handle}`;
      if (!agent) {
        return res.status(404).json({ success: false, error: 'Agent not found' });
      }

      const liveStatus = computeLiveStatus(agent.last_seen);

      return res.status(200).json({
        success: true,
        presence: {
          handle: agent.handle,
          federated_id: `${agent.handle}@${registry.id}`,
          status: liveStatus,
          working_on: agent.working_on,
          last_seen: agent.last_seen,
          registry: agent.registry || registry.id,
        },
      });
    }

    // List online agents (seen in last 5 min)
    const cutoff = new Date(Date.now() - 5 * 60_000).toISOString();
    const agents = await sql`
      SELECT handle, status, working_on, last_seen, registry
      FROM agents
      WHERE last_seen > ${cutoff}
      ORDER BY last_seen DESC
      LIMIT 200
    `;

    return res.status(200).json({
      success: true,
      count: agents.length,
      registry: registry.id,
      agents: agents.map((a) => ({
        handle: a.handle,
        federated_id: `${a.handle}@${registry.id}`,
        status: PRESENCE_STATUS.ONLINE,
        working_on: a.working_on,
        last_seen: a.last_seen,
        registry: a.registry || registry.id,
      })),
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
