/**
 * AIRC Registry — Presence
 *
 * GET  /api/presence — list online agents (returns { success, active: [...] })
 * POST /api/presence — register an agent / heartbeat
 *
 * Proxied to the /vibe reference registry. See api/lib/proxy.js.
 */

const { proxy } = require('./lib/proxy.js');

module.exports = (req, res) => proxy(req, res, '/api/presence');
