/**
 * AIRC Registry — Federation Helper
 *
 * Handles outbound federation: well-known discovery, caching, relay sending.
 * CJS module. No Ed25519 signing in MVP — HTTPS trust only.
 */

// In-memory cache for .well-known/airc lookups
// Key: registry hostname, Value: { data, fetchedAt }
const wellKnownCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Parse a federated handle like "agent_b@demo.airc.chat"
 * Returns { handle, registry } or null if it's a local handle.
 */
function parseFederatedHandle(raw) {
  if (!raw) return null;
  const cleaned = String(raw).toLowerCase().replace(/^@/, '').trim();
  const atIdx = cleaned.indexOf('@');
  if (atIdx === -1) return null; // local handle, no registry
  const handle = cleaned.slice(0, atIdx);
  const registry = cleaned.slice(atIdx + 1);
  if (!handle || !registry || !registry.includes('.')) return null;
  return { handle, registry };
}

/**
 * Build the full federated identity string: handle@registry
 */
function federatedIdentity(handle, registry) {
  return `${handle}@${registry}`;
}

/**
 * Fetch and cache a remote registry's .well-known/airc document.
 * Returns the parsed JSON or null on failure.
 */
async function fetchWellKnown(registry) {
  // Check cache first
  const cached = wellKnownCache.get(registry);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const url = `https://${registry}/.well-known/airc`;
    const resp = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    if (!resp.ok) return null;

    const data = await resp.json();

    // Validate it looks like an AIRC registry
    if (!data.protocol && !data.protocol_version && !data.endpoints) {
      return null;
    }

    wellKnownCache.set(registry, { data, fetchedAt: Date.now() });
    return data;
  } catch {
    return null;
  }
}

/**
 * Verify a registry is a valid AIRC registry by checking its .well-known/airc.
 * Returns the well-known data if valid, null otherwise.
 */
async function verifyRegistry(registry) {
  const wk = await fetchWellKnown(registry);
  if (!wk) return null;

  // Must have protocol field or endpoints
  if (wk.protocol === 'AIRC' || wk.protocol_version || wk.endpoints) {
    return wk;
  }
  return null;
}

/**
 * Discover the federation relay endpoint for a remote registry.
 * Returns the full URL or null.
 */
async function discoverRelayEndpoint(registry) {
  const wk = await fetchWellKnown(registry);
  if (!wk) return null;

  // Check federation config
  if (wk.federation?.relay_endpoint) {
    return `https://${registry}${wk.federation.relay_endpoint}`;
  }
  if (wk.federation?.relay) {
    return `https://${registry}${wk.federation.relay}`;
  }

  // Fallback to standard path
  return `https://${registry}/api/federation/relay`;
}

/**
 * Send a message to a remote registry's relay endpoint.
 * Returns { success, data } or { success: false, error }.
 */
async function relayMessage({ originRegistry, from, to, body, payload, messageId, timestamp }) {
  const parsed = parseFederatedHandle(to);
  if (!parsed) {
    return { success: false, error: 'Invalid federated handle' };
  }

  const relayUrl = await discoverRelayEndpoint(parsed.registry);
  if (!relayUrl) {
    return { success: false, error: `Cannot discover relay endpoint for ${parsed.registry}` };
  }

  try {
    const resp = await fetch(relayUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin_registry: originRegistry,
        from: from,
        to: parsed.handle,
        body: body,
        payload: payload || null,
        message_id: messageId,
        timestamp: timestamp || new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(10000),
    });

    const data = await resp.json();

    if (!resp.ok) {
      return { success: false, error: data.error || `Relay returned ${resp.status}`, status: resp.status };
    }

    return { success: true, data };
  } catch (err) {
    return { success: false, error: `Federation relay failed: ${err.message}` };
  }
}

module.exports = {
  parseFederatedHandle,
  federatedIdentity,
  fetchWellKnown,
  verifyRegistry,
  discoverRelayEndpoint,
  relayMessage,
};
