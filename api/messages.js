/**
 * AIRC Registry — Messages API
 *
 * POST /api/messages           — send message (requires JWT, checks consent)
 * GET  /api/messages?user=X    — list threads for user (requires JWT)
 * GET  /api/messages?user=X&with=Y — get thread messages (requires JWT)
 *
 * Multi-registry aware: uses Host header to select database.
 */

const { getSqlForRegistry } = require('./lib/db.js');
const { getAuthForRegistry } = require('./lib/auth.js');
const { getRegistryConfig } = require('./lib/registry.js');
const { parseFederatedHandle, relayMessage, federatedIdentity } = require('./lib/federation.js');
const {
  cleanHandle,
  rateLimit,
  generateId,
  setCorsHeaders,
  requireAuth,
} = require('./lib/utils.js');

module.exports = async function handler(req, res) {
  setCorsHeaders(res, 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const registry = getRegistryConfig(req);
  const { sql, queryOne } = getSqlForRegistry(registry);
  const { verifyToken } = getAuthForRegistry(registry);

  // ── POST: send message ──────────────────────────────
  if (req.method === 'POST') {
    const claims = await requireAuth(req, res, verifyToken);
    if (!claims) return; // response already sent by requireAuth

    const from = claims.handle;
    const to = cleanHandle(req.body?.to);
    const body = req.body?.body?.trim();
    const payload = req.body?.payload || null;

    if (!to) return res.status(400).json({ success: false, error: 'Missing "to" field' });
    if (!body) return res.status(400).json({ success: false, error: 'Missing "body" field' });
    if (body.length > 4000) return res.status(400).json({ success: false, error: 'Message too long (max 4000 chars)' });

    // Rate limit: 60 messages per minute
    if (!rateLimit(`msg:${from}`, 60, 60_000)) {
      return res.status(429).json({ success: false, error: 'Rate limited' });
    }

    // ── Federated send: detect @handle@registry format ──
    const fedTarget = parseFederatedHandle(req.body?.to);
    if (fedTarget) {
      const msgId = generateId('msg');
      const result = await relayMessage({
        originRegistry: registry.id,
        from: from,
        to: req.body.to,
        body: body,
        payload: payload,
        messageId: msgId,
        timestamp: new Date().toISOString(),
      });

      if (!result.success) {
        const status = result.status || 502;
        return res.status(status).json({
          success: false,
          error: result.error,
          federated: true,
          target_registry: fedTarget.registry,
        });
      }

      return res.status(201).json({
        success: true,
        federated: true,
        target_registry: fedTarget.registry,
        message: {
          id: msgId,
          from: from,
          to: federatedIdentity(fedTarget.handle, fedTarget.registry),
          body: body,
          payload: payload,
          created_at: new Date().toISOString(),
        },
        relay_response: result.data,
      });
    }

    // ── Local send ──────────────────────────────────────
    // Check recipient exists + consent in parallel
    const [recipient, consent] = await Promise.all([
      queryOne`SELECT handle FROM agents WHERE handle = ${to}`,
      from !== to
        ? queryOne`SELECT status FROM consent WHERE from_handle = ${from} AND to_handle = ${to}`
        : Promise.resolve({ status: 'accepted' }),
    ]);

    if (!recipient) {
      return res.status(404).json({ success: false, error: `Agent @${to} not found` });
    }

    // Check consent (skip if messaging yourself)
    if (from !== to) {
      if (consent?.status === 'blocked') {
        return res.status(403).json({ success: false, error: 'You are blocked by this agent' });
      }

      if (!consent || consent.status === 'pending') {
        // Auto-request consent on first message
        if (!consent) {
          await sql`
            INSERT INTO consent (from_handle, to_handle, status)
            VALUES (${from}, ${to}, 'pending')
            ON CONFLICT (from_handle, to_handle) DO NOTHING
          `;
        }
        return res.status(403).json({
          success: false,
          error: 'consent_required',
          message: `Consent request sent to @${to}. They must accept before you can send messages.`,
        });
      }
    }

    // Get or create thread
    const threadRows = await sql`SELECT get_or_create_thread(${from}, ${to})`;
    const threadId = threadRows[0].get_or_create_thread;

    // Insert message
    const msgId = generateId('msg');
    await sql`
      INSERT INTO messages (id, from_handle, to_handle, thread_id, body, payload)
      VALUES (${msgId}, ${from}, ${to}, ${threadId}, ${body}, ${payload ? JSON.stringify(payload) : null})
    `;

    return res.status(201).json({
      success: true,
      message: {
        id: msgId,
        from: from,
        to: to,
        thread_id: threadId,
        body: body,
        payload: payload,
        created_at: new Date().toISOString(),
      },
    });
  }

  // ── GET: list threads or thread messages ─────────────
  if (req.method === 'GET') {
    const claims = await requireAuth(req, res, verifyToken);
    if (!claims) return; // response already sent by requireAuth

    const user = claims.handle;
    const withHandle = cleanHandle(req.query.with);
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);

    // Get thread messages
    if (withHandle) {
      // Read-only thread lookup — don't create a thread just for reading
      const [p1, p2] = [user, withHandle].sort();
      const thread = await queryOne`
        SELECT id FROM message_threads
        WHERE participant_a = ${p1} AND participant_b = ${p2}
      `;

      if (!thread) {
        // No thread exists — return empty results instead of creating one
        return res.status(200).json({
          success: true,
          user,
          with: withHandle,
          thread_id: null,
          messages: [],
          count: 0,
        });
      }

      const threadId = thread.id;
      const messages = await sql`
        SELECT id, from_handle, to_handle, thread_id, body, payload, created_at
        FROM messages
        WHERE thread_id = ${threadId}
        ORDER BY created_at ASC
        LIMIT ${limit} OFFSET ${offset}
      `;

      return res.status(200).json({
        success: true,
        user,
        with: withHandle,
        thread_id: threadId,
        messages,
        count: messages.length,
      });
    }

    // List threads (inbox)
    const threads = await sql`
      SELECT
        t.id,
        t.participant_a,
        t.participant_b,
        t.last_message_at,
        t.message_count
      FROM message_threads t
      WHERE t.participant_a = ${user} OR t.participant_b = ${user}
      ORDER BY t.last_message_at DESC NULLS LAST
      LIMIT ${limit} OFFSET ${offset}
    `;

    return res.status(200).json({
      success: true,
      user,
      threads: threads.map((t) => ({
        thread_id: t.id,
        with: t.participant_a === user ? t.participant_b : t.participant_a,
        last_message_at: t.last_message_at,
        message_count: t.message_count,
      })),
      count: threads.length,
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
