const { proxy } = require('../lib/proxy.js');

module.exports = (req, res) => proxy(
  req,
  res,
  '/api/airc/v1/room-admissions/offer',
  { delegated: true, operation: 'offer' }
);
