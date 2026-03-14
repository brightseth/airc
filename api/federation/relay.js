/**
 * AIRC Registry — Federation Relay Endpoint
 *
 * POST /api/federation/relay — receive inbound messages from other AIRC registries
 *
 * Flow:
 * 1. Validate origin registry via .well-known/airc
 * 2. Check recipient exists locally
 * 3. Check/create consent (federated identity: handle@registry)
 * 4. Dedup by message_id
 * 5. Deliver to local inbox
 * 6. Rate limit per origin registry
 *
 * Multi-registry aware: uses Host header to select database.
 */

const { getSqlForRegistry } = require('../lib/db.js');
const { getRegistryConfig } = require('../lib/registry.js');
const { verifyRegistry, federatedIdentity } = require('../lib/federation.js');

// Rate limit: per origin registry
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

// Dedup cache: message_id -> timestamp (in-memory, cleared on cold start)
const seenMessages = new Map();
const DEDUP_TTL_MS = 10 * 60 * 1000; // 10 minutes

function isDuplicate(messageId) {
  if (!messageId) return false;
  const seen = seenMessages.get(messageId);
  if (seen && Date.now() - seen < DEDUP_TTL_MS) return true;
  seenMessages.set(messageId, Date.now());
  // Prune old entries periodically
  if (seenMessages.size > 10000) {
    const cutoff = Date.now() - DEDUP_TTL_MS;
    for (const [id, ts] of seenMessages) {
      if (ts < cutoff) seenMessages.delete(id);
    }
  }
  return false;
}

function generateId() {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `msg_${ts}_${rand}`;
}

function cleanHandle(raw) {
  if (!raw) return null;
  return String(raw).toLowerCase().replace(/^@/, '').trim() || null;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const registry = getRegistryConfig(req);
  const { sql, queryOne } = getSqlForRegistry(registry);

  try {
    const {
      origin_registry,
      from,
      to,
      body,
      payload,
      message_id,
      timestamp,
    } = req.body || {};

    // ── Validate required fields ────────────────────────
    if (!origin_registry) {
      return res.status(400).json({ success: false, error: 'Missing origin_registry' });
    }
    if (!from) {
      return res.status(400).json({ success: false, error: 'Missing from handle' });
    }
    if (!to) {
      return res.status(400).json({ success: false, error: 'Missing to handle' });
    }
    if (!body || typeof body !== 'string' || !body.trim()) {
      return res.status(400).json({ success: false, error: 'Missing or empty body' });
    }
    if (body.length > 4000) {
      return res.status(400).json({ success: false, error: 'Message too long (max 4000 chars)' });
    }

    const fromHandle = cleanHandle(from);
    const toHandle = cleanHandle(to);
    const originReg = String(origin_registry).toLowerCase().trim();

    if (!fromHandle || !toHandle) {
      return res.status(400).json({ success: false, error: 'Invalid handle format' });
    }

    // ── Prevent relay to self ─────────────────────────────
    if (originReg === registry.id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot relay messages to the same registry',
      });
    }

    // ── Rate limit: 10 relayed messages per origin registry per minute ──
    if (!rateLimit(`fed:${originReg}`, 10, 60_000)) {
      return res.status(429).json({ success: false, error: 'Rate limited — max 10 relayed messages per minute per origin registry' });
    }

    // ── Dedup by message_id ─────────────────────────────
    if (message_id && isDuplicate(message_id)) {
      return res.status(200).json({ success: true, deduplicated: true, message: 'Message already delivered' });
    }

    // ── Verify origin registry ──────────────────────────
    // Skip verification for known registries in the same project
    const trustedRegistries = ['airc.chat', 'demo.airc.chat'];
    if (!trustedRegistries.includes(originReg)) {
      const originWellKnown = await verifyRegistry(originReg);
      if (!originWellKnown) {
        return res.status(403).json({
          success: false,
          error: 'FEDERATION_BLOCKED',
          message: `Cannot verify ${originReg} as a valid AIRC registry`,
        });
      }
    }

    // ── Check recipient exists locally ──────────────────
    const recipient = await queryOne`SELECT handle FROM agents WHERE handle = ${toHandle}`;
    if (!recipient) {
      return res.status(404).json({
        success: false,
        error: 'REMOTE_IDENTITY_NOT_FOUND',
        message: `Agent @${toHandle} not found on ${registry.id}`,
      });
    }

    // ── Consent check ───────────────────────────────────
    // Federated senders are namespaced as handle@registry
    const federatedFrom = federatedIdentity(fromHandle, originReg);

    const consent = await queryOne`
      SELECT status FROM consent WHERE from_handle = ${federatedFrom} AND to_handle = ${toHandle}
    `;

    if (consent?.status === 'blocked') {
      return res.status(403).json({
        success: false,
        error: 'REMOTE_CONSENT_BLOCKED',
        message: `@${toHandle} has blocked messages from @${federatedFrom}`,
      });
    }

    if (!consent || consent.status === 'pending') {
      // Auto-create consent as pending for first federated contact
      if (!consent) {
        await sql`
          INSERT INTO consent (from_handle, to_handle, status)
          VALUES (${federatedFrom}, ${toHandle}, 'pending')
          ON CONFLICT (from_handle, to_handle) DO NOTHING
        `;
      }
      return res.status(403).json({
        success: false,
        error: 'REMOTE_CONSENT_REQUIRED',
        message: `Consent required. @${toHandle} must accept messages from @${federatedFrom}.`,
        consent_status: 'pending',
      });
    }

    // ── Consent accepted — deliver message ──────────────
    // Get or create thread using the federated identity
    const threadRows = await sql`SELECT get_or_create_thread(${federatedFrom}, ${toHandle})`;
    const threadId = threadRows[0].get_or_create_thread;

    const msgId = message_id || generateId();
    await sql`
      INSERT INTO messages (id, from_handle, to_handle, thread_id, body, payload)
      VALUES (${msgId}, ${federatedFrom}, ${toHandle}, ${threadId}, ${body.trim()}, ${payload ? JSON.stringify(payload) : null})
    `;

    return res.status(201).json({
      success: true,
      message: {
        id: msgId,
        from: federatedFrom,
        to: toHandle,
        thread_id: threadId,
        body: body.trim(),
        federated: true,
        origin_registry: originReg,
        receiving_registry: registry.id,
        created_at: timestamp || new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('Federation relay error:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal federation error',
      detail: err.message,
    });
  }
};
