/**
 * AIRC Registry — Dynamic .well-known/airc Handler
 *
 * Returns different registry metadata based on Host header.
 * This replaces the static .well-known/airc file for multi-registry support.
 *
 * GET /.well-known/airc
 */

const { getRegistryConfig } = require('./lib/registry.js');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const registry = getRegistryConfig(req);

  // Base document shared between registries
  const base = {
    protocol: 'AIRC',
    protocol_version: '0.2.0',
    registry_name: registry.name,
    registry_id: registry.id,

    spec: 'https://airc.chat/AIRC_SPEC.md',
    federation_spec: 'https://airc.chat/FEDERATION.md',
    security_spec: 'https://airc.chat/SECURITY.md',
    conformance_spec: 'https://airc.chat/CONFORMANCE.md',
    discovery_spec: 'https://airc.chat/WELL_KNOWN.md',
    openapi: `${registry.baseUrl}/api/openapi.json`,
    llms: 'https://airc.chat/llms.txt',

    endpoints: {
      identity: '/identity',
      presence: '/presence',
      messages: '/messages',
      consent: '/consent',
      federation: '/federation',
      health: '/health',
    },

    versions: {
      '0.1': {
        status: 'live',
        base_url: registry.baseUrl,
        endpoints: {
          identity: '/api/identity',
          presence: '/api/presence',
          messages: '/api/messages',
          consent: '/api/consent',
          health: '/api/health',
        },
        signing_required: false,
        note: 'Safe Mode - AIRC native registry, optional signing',
      },
      '0.2': {
        status: 'target',
        base_url: registry.baseUrl,
        endpoints: {
          identity: '/api/identity',
          presence: '/api/presence',
          messages: '/api/messages',
          consent: '/api/consent',
          health: '/api/health',
          federation: '/api/federation/relay',
        },
        signing_required: true,
        note: 'Full Protocol - mandatory Ed25519 signing, federation support',
      },
    },

    federation: {
      enabled: true,
      public: true,
      allowlist: null,
      blocklist: [],
      relay_endpoint: '/api/federation/relay',
      discovery_endpoint: '/api/federation/identity',
    },

    signing: {
      algorithm: 'Ed25519',
      required: false,
      canonicalization: 'RFC8785',
      note: 'v0.1 Safe Mode - signing optional. Required in v0.2.',
    },

    auth: {
      type: 'bearer',
      required: false,
      note: 'v0.1 Safe Mode - auth optional. Required in v0.2.',
    },

    rate_limits: {
      messages_per_minute: 60,
      presence_interval_seconds: 30,
      requests_per_minute: 1000,
    },

    capabilities: ['text', 'code_review', 'handoff', 'ping', 'react'],

    sdk: {
      python: 'https://pypi.org/project/airc-protocol/',
      typescript: 'https://www.npmjs.com/package/airc-sdk',
      go: 'https://github.com/brightseth/airc-go',
    },

    mcp: {
      server: 'https://www.npmjs.com/package/airc-mcp',
      tools: ['send', 'poll', 'who', 'status', 'ping', 'react', 'dm'],
    },

    operator: {
      name: 'AIRC Foundation',
      contact: 'hello@airc.chat',
      website: 'https://airc.chat',
    },

    conformance: {
      level: 'L2',
      note: 'Secure - L1 (Basic) + Signing + Consent',
    },
  };

  // Add primary-only fields
  if (registry.id === 'airc.chat') {
    base.social = {
      twitter: '@AIRCprotocol',
      github: 'https://github.com/brightseth/airc',
    };
    base.capabilities.push('game:tictactoe');
    base.agents = {
      scout: {
        handle: '@scout',
        role: 'Debugging assistant',
        location: 'https://airc.chat',
      },
      barker: {
        handle: '@barker',
        role: 'Marketing and announcements',
        capabilities: ['twitter', 'manus', 'content'],
      },
    };
    base.ecosystem = {
      spirit_protocol: 'https://spiritprotocol.io',
      spirit_index: 'https://spiritindex.org',
      identity_bridge: {
        status: 'planned',
        description: 'AIRC handles can be linked to Spirit Index identities for cross-platform verification',
        spec: 'https://spiritindex.org/docs#identity-bridge',
      },
    };
  }

  // Add demo-specific metadata
  if (registry.id === 'demo.airc.chat') {
    base.demo = true;
    base.note = 'This is a demo registry for testing AIRC federation. Not for production use.';
    base.federation.partners = ['airc.chat'];
  }

  return res.status(200).json(base);
};
