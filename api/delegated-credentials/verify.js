/**
 * POST /api/delegated-credentials/verify
 *
 * Public AIRC surface for the canonical /vibe registry implementation.
 */
const { proxy } = require('../lib/proxy.js');

module.exports = (req, res) => proxy(
  req,
  res,
  '/api/airc/v1/delegated-credentials/verify',
  { delegated: true, operation: 'verify' }
);
