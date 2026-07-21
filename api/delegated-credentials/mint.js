/**
 * POST /api/delegated-credentials/mint
 *
 * Public AIRC surface for the canonical /vibe registry implementation.
 */
const { proxy } = require('../lib/proxy.js');

module.exports = (req, res) => proxy(
  req,
  res,
  '/api/airc/v1/delegated-credentials/mint'
);
