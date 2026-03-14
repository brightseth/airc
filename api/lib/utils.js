/**
 * AIRC Registry — Shared Utilities
 *
 * Common functions extracted from handler modules:
 * cleanHandle, rateLimit, generateId, computeLiveStatus, setCorsHeaders, requireAuth
 * Consent and presence status constants.
 */

let crypto;
try {
  crypto = require('crypto');
} catch {
  crypto = null;
}

// ── Handle validation ──────────────────────────────────────
const HANDLE_RE = /^[a-z0-9_]{3,32}$/;

function cleanHandle(raw) {
  if (!raw) return null;
  const h = String(raw).toLowerCase().replace(/^@/, '').trim();
  return HANDLE_RE.test(h) ? h : null;
}

// ── Rate limiting ──────────────────────────────────────────
// In-memory rate limiter (resets per cold start). Auto-prunes stale entries.
const rateCounts = new Map();

function rateLimit(key, max, windowMs) {
  const now = Date.now();
  const entry = rateCounts.get(key);
  if (!entry || now - entry.start > windowMs) {
    rateCounts.set(key, { start: now, count: 1 });
    _pruneRateEntries(windowMs);
    return true;
  }
  entry.count++;
  return entry.count <= max;
}

function _pruneRateEntries(windowMs) {
  // Prune every ~100 calls to avoid doing it on every request
  if (rateCounts.size < 100) return;
  const now = Date.now();
  for (const [k, v] of rateCounts) {
    if (now - v.start > windowMs) rateCounts.delete(k);
  }
}

// ── ID generation ──────────────────────────────────────────

function generateId(prefix = 'msg') {
  if (crypto && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${ts}_${rand}`;
}

// ── Presence status ────────────────────────────────────────

const PRESENCE_STATUS = {
  ONLINE: 'online',
  AWAY: 'away',
  OFFLINE: 'offline',
};

function computeLiveStatus(lastSeen) {
  const age = Date.now() - new Date(lastSeen).getTime();
  if (age < 5 * 60_000) return PRESENCE_STATUS.ONLINE;
  if (age < 30 * 60_000) return PRESENCE_STATUS.AWAY;
  return PRESENCE_STATUS.OFFLINE;
}

// ── Consent status ─────────────────────────────────────────

const CONSENT_STATUS = {
  NONE: 'none',
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  BLOCKED: 'blocked',
};

// ── CORS helpers ───────────────────────────────────────────

function setCorsHeaders(res, methods = 'GET, POST, OPTIONS') {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');
}

// ── Auth helper ────────────────────────────────────────────

async function requireAuth(req, res, verifyToken) {
  const claims = await verifyToken(req.headers.authorization);
  if (!claims) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return null;
  }
  return claims;
}

module.exports = {
  HANDLE_RE,
  cleanHandle,
  rateLimit,
  generateId,
  computeLiveStatus,
  setCorsHeaders,
  requireAuth,
  CONSENT_STATUS,
  PRESENCE_STATUS,
};
