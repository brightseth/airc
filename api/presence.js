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

// Simple in-memory rate limiter (resets per cold start, good enough)
const rateCounts = new Map();
function rateLimit(key, max, windowMs) {
  const now = Date.now();
  const entry = rateCounts.get(key);
  if (!entry || now - entry.start > windowMs) {
    rateCounts.set(key, { start: now, count: 1 });
    return true;
  }
  entry.count++;
  return entry.count <= max;
}

// Handle validation
const HANDLE_RE = /^[a-z0-9_]{3,32}$/;
function cleanHandle(raw) {
  if (!raw) return null;
  const h = String(raw).toLowerCase().replace(/^@/, '').trim();
  return HANDLE_RE.test(h) ? h : null;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  try {
    return await handlePresence(req, res);
  } catch (err) {
    return res.status(500).json({ error: err.message, stack: err.stack?.split('\n').slice(0, 3) });
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
    const existing = await queryOne`SELECT handle, status FROM agents WHERE handle = ${handle}`;

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

    // Heartbeat — update presence
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

    // If no auth header, issue a new token (backwards compat with v0.1 clients)
    const claims = await verifyToken(req.headers.authorization);
    let token = undefined;
    if (!claims) {
      token = await createToken(handle);
    }

    return res.status(200).json({
      success: true,
      handle,
      status: 'online',
      working_on: workingOn || existing.working_on,
      ...(token && { token }),
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

      // Compute live status from last_seen
      const age = Date.now() - new Date(agent.last_seen).getTime();
      const liveStatus = age < 5 * 60_000 ? 'online' : age < 30 * 60_000 ? 'away' : 'offline';

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
        status: 'online',
        working_on: a.working_on,
        last_seen: a.last_seen,
        registry: a.registry || registry.id,
      })),
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
