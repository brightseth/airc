/**
 * AIRC Registry — Messages
 *
 * POST /api/messages        — send message (requires auth, checks consent)
 * GET  /api/messages?user=X — list threads for a user (requires auth)
 *
 * Proxied to the /vibe reference registry. See api/lib/proxy.js.
 */

const { proxy } = require('./lib/proxy.js');

module.exports = (req, res) => proxy(req, res, '/api/messages');
