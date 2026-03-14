/**
 * AIRC Registry — Auth Helper
 *
 * JWT generation and verification using jose.
 * Supports per-registry secrets via getAuthForRegistry().
 *
 * Backwards-compatible: default exports use AIRC_SESSION_SECRET
 * by delegating to getAuthForRegistry with a default config.
 */

let joseModule = null;
async function getJose() {
  if (!joseModule) {
    joseModule = await import('jose');
  }
  return joseModule;
}

const ALG = 'HS256';
const TOKEN_TTL = '30d';

/**
 * Get auth functions bound to a specific registry.
 *
 * @param {{ id: string, secret: string }} registryConfig — from getRegistryConfig(req)
 * @returns {{ createToken: Function, verifyToken: Function }}
 */
function getAuthForRegistry(registryConfig) {
  const issuer = registryConfig.id; // e.g. 'airc.chat' or 'demo.airc.chat'

  function getSecret() {
    const secret = registryConfig.secret;
    if (!secret) {
      throw new Error(`Session secret not configured for ${issuer}`);
    }
    return new TextEncoder().encode(secret);
  }

  async function createToken(handle) {
    const { SignJWT } = await getJose();
    return new SignJWT({ handle })
      .setProtectedHeader({ alg: ALG })
      .setIssuer(issuer)
      .setSubject(handle)
      .setIssuedAt()
      .setExpirationTime(TOKEN_TTL)
      .sign(getSecret());
  }

  async function verifyToken(authHeader) {
    if (!authHeader?.startsWith('Bearer ')) return null;
    try {
      const { jwtVerify } = await getJose();
      const token = authHeader.slice(7);
      const { payload } = await jwtVerify(token, getSecret(), {
        issuer,
      });
      return { handle: payload.handle || payload.sub };
    } catch {
      return null;
    }
  }

  return { createToken, verifyToken };
}

// ── Backwards-compatible default exports ─────────────────────
// Delegate to getAuthForRegistry with the default (airc.chat) config
// so logic isn't duplicated.
const defaultConfig = {
  id: 'airc.chat',
  get secret() {
    return process.env.AIRC_SESSION_SECRET;
  },
};

const { createToken, verifyToken } = getAuthForRegistry(defaultConfig);

module.exports = { createToken, verifyToken, getAuthForRegistry };
