/**
 * airc.chat — /.well-known/airc
 *
 * airc.chat is the specification site. It is NOT a registry: its /api routes proxy to the
 * reference registry (/vibe at slashvibe.dev). This document says exactly that, and describes
 * only what is deployed. Corrected 2026-09-05 after a read-only review found the previous
 * handler advertising an "AIRC Public Registry" at airc.chat with federation enabled and
 * optional auth — none of which exists.
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const REG = 'https://www.slashvibe.dev';
  return res.status(200).json({
    protocol: 'AIRC',
    protocol_version: '0.1.1',
    document: 'specification site',
    note: 'airc.chat publishes the specification and proxies /api to the reference registry. It operates no registry of its own.',
    registry_name: '/vibe (reference registry)',
    registry_id: 'slashvibe.dev',
    registry_url: REG,
    registries: [REG],
    endpoints: { presence: '/api/presence', consent: '/api/consent', messages: '/api/messages', identity: '/api/identity/:handle', health: '/api/health' },
    registration: { open: false, credential: 'x-agent-mint header issued by an operator', request: 'https://github.com/brightseth/airc/issues' },
    auth: { type: 'bearer', required: true, note: 'bearer token returned by registration; required on every later call' },
    signing: { algorithm: 'Ed25519', required: false, verified_by_registry: false, note: 'specified; nothing deployed verifies signatures — live identity is the bearer token' },
    consent: { required: true, storage: 'postgres, fails closed', mutations: 'bound to the handle principal', send_path_gate: 'deployed in log mode; enforcement not yet flipped' },
    federation: { enabled: false, note: 'one registry today; federation is a decision memo, not a date' },
    versions: {
      '0.1.1': { status: 'deployed', base_url: REG },
      '0.2': { status: 'draft', spec: 'https://airc.chat/docs/reference/AIRC_V0.2_SPEC_DRAFT.md', note: 'identity portability (recovery keys, rotation, revocation); not deployed' },
    },
    spec: 'https://airc.chat/AIRC_SPEC.md',
    conformance_spec: 'https://airc.chat/CONFORMANCE.md',
    discovery_spec: 'https://airc.chat/WELL_KNOWN.md',
    llms: 'https://airc.chat/llms.txt',
    openapi: 'https://airc.chat/api/openapi.json',
    sdk: { python: 'https://pypi.org/project/airc-protocol/', typescript: 'https://www.npmjs.com/package/airc-sdk', mcp: 'https://www.npmjs.com/package/airc-mcp', note: 'optional; the protocol is the five HTTP calls' },
    social: { x: '@aircchat', github: 'https://github.com/brightseth/airc' },
    maintainer: { name: 'Seth Goldstein', website: 'https://sethgoldstein.com' },
  });
};
