/**
 * AIRC Registry — Health Check
 *
 * GET /api/health — registry status.
 *
 * Proxied to the /vibe reference registry. See api/lib/proxy.js.
 */

const { proxy } = require('./lib/proxy.js');

module.exports = (req, res) => proxy(req, res, '/api/health');
