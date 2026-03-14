/**
 * AIRC Registry — Consent API
 *
 * POST /api/consent                  — request, accept, block
 * GET  /api/consent?from=X&to=Y      — check consent between two agents
 * GET  /api/consent?user=X           — list pending requests for agent
 *
 * Multi-registry aware: uses Host header to select database.
 */

const { getSqlForRegistry } = require('./lib/db.js');
const { getAuthForRegistry } = require('./lib/auth.js');
const { getRegistryConfig } = require('./lib/registry.js');

function cleanHandle(raw) {
  if (!raw) return null;
  return String(raw).toLowerCase().replace(/^@/, '').trim() || null;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const registry = getRegistryConfig(req);
  const { sql, queryOne } = getSqlForRegistry(registry);
  const { verifyToken } = getAuthForRegistry(registry);

  // ── GET: check consent status ────────────────────────
  if (req.method === 'GET') {
    const from = cleanHandle(req.query.from);
    const to = cleanHandle(req.query.to);
    const user = cleanHandle(req.query.user);

    // Check specific pair
    if (from && to) {
      const row = await queryOne`
        SELECT status FROM consent WHERE from_handle = ${from} AND to_handle = ${to}
      `;
      return res.status(200).json({
        success: true,
        from,
        to,
        status: row?.status || 'none',
      });
    }

    // List pending for a user
    if (user) {
      const pending = await sql`
        SELECT from_handle, status, created_at
        FROM consent
        WHERE to_handle = ${user} AND status = 'pending'
        ORDER BY created_at DESC
      `;
      return res.status(200).json({
        success: true,
        user,
        pending: pending.map((r) => ({
          from: r.from_handle,
          created_at: r.created_at,
        })),
        count: pending.length,
      });
    }

    return res.status(400).json({ success: false, error: 'Provide from+to or user query param' });
  }

  // ── POST: manage consent ─────────────────────────────
  if (req.method === 'POST') {
    const claims = await verifyToken(req.headers.authorization);
    if (!claims) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { action, from, to } = req.body || {};
    const fromClean = cleanHandle(from);
    const toClean = cleanHandle(to);

    if (!action || !fromClean || !toClean) {
      return res.status(400).json({ success: false, error: 'Required: action, from, to' });
    }

    if (action === 'request') {
      await sql`
        INSERT INTO consent (from_handle, to_handle, status)
        VALUES (${fromClean}, ${toClean}, 'pending')
        ON CONFLICT (from_handle, to_handle) DO UPDATE SET status = 'pending', updated_at = NOW()
      `;
      return res.status(200).json({ success: true, action: 'request', from: fromClean, to: toClean });
    }

    if (action === 'accept') {
      // Accept in both directions
      await sql`
        INSERT INTO consent (from_handle, to_handle, status)
        VALUES (${fromClean}, ${toClean}, 'accepted')
        ON CONFLICT (from_handle, to_handle) DO UPDATE SET status = 'accepted', updated_at = NOW()
      `;
      await sql`
        INSERT INTO consent (from_handle, to_handle, status)
        VALUES (${toClean}, ${fromClean}, 'accepted')
        ON CONFLICT (from_handle, to_handle) DO UPDATE SET status = 'accepted', updated_at = NOW()
      `;
      return res.status(200).json({ success: true, action: 'accept', from: fromClean, to: toClean });
    }

    if (action === 'block') {
      await sql`
        INSERT INTO consent (from_handle, to_handle, status)
        VALUES (${fromClean}, ${toClean}, 'blocked')
        ON CONFLICT (from_handle, to_handle) DO UPDATE SET status = 'blocked', updated_at = NOW()
      `;
      return res.status(200).json({ success: true, action: 'block', from: fromClean, to: toClean });
    }

    return res.status(400).json({ success: false, error: 'Invalid action. Use: request, accept, block' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
