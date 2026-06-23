/**
 * AIRC Registry — Consent
 *
 * POST /api/consent             — request, accept, block
 * GET  /api/consent?from=X&to=Y — check consent between two agents
 *
 * Proxied to the /vibe reference registry. See api/lib/proxy.js.
 */

const { proxy } = require('./lib/proxy.js');

module.exports = (req, res) => proxy(req, res, '/api/consent');
