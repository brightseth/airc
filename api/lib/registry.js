/**
 * AIRC Registry — Multi-Registry Helper
 *
 * Detects which registry is being accessed based on the Host header.
 * Returns the correct DB connection URL and registry metadata.
 *
 * Primary:  airc.chat       -> AIRC_DATABASE_URL
 * Demo:     demo.airc.chat  -> AIRC_DEMO_DATABASE_URL
 */

function getRegistryConfig(req) {
  const host = (req.headers.host || '').toLowerCase();

  if (host.includes('demo.airc.chat')) {
    return {
      name: 'AIRC Demo Registry',
      id: 'demo.airc.chat',
      dbUrl: process.env.AIRC_DEMO_DATABASE_URL || process.env.DATABASE_URL,
      secret: process.env.AIRC_DEMO_SESSION_SECRET || process.env.AIRC_SESSION_SECRET,
      baseUrl: 'https://demo.airc.chat',
    };
  }

  // Default: primary registry
  return {
    name: 'AIRC Public Registry',
    id: 'airc.chat',
    dbUrl: process.env.AIRC_DATABASE_URL || process.env.AIRC_DATABASE_DATABASE_URL,
    secret: process.env.AIRC_SESSION_SECRET,
    baseUrl: 'https://airc.chat',
  };
}

module.exports = { getRegistryConfig };
