#!/usr/bin/env node
// Mint fleet AIRC identities: Ed25519 key per handle in the canonical key
// home (~/.seth/airc-keys/, SAL custody ruling Jul 17 2026), then register
// each on the registry with a signed request. Idempotent: existing key files
// are reused, never overwritten (keys are write-once).
//
// Usage: node tools/mint-fleet-identities.mjs handle1 handle2 ...

import { readFileSync, writeFileSync, mkdirSync, chmodSync, existsSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import { generateKeyPairSync, createPrivateKey, sign as edSign } from 'crypto'

const REGISTRY = process.env.AIRC_REGISTRY ?? 'https://www.slashvibe.dev'
const KEY_DIR = process.env.AIRC_KEY_DIR ?? join(homedir(), '.seth', 'airc-keys')

const CONTEXTS = {
  seth: 'Fleet steward — coordinator room',
  sal: 'Spirit Protocol ops — fundraising, tokenomics, scorecard',
  denza: 'Fidenza portfolio monitor — loans, LTV, liquidation risk',
  solienne: 'AI art practice — works, exhibitions, live usage',
  coltrane: '/vibe community + operations',
}

const handles = process.argv.slice(2)
if (handles.length === 0) {
  console.error('usage: mint-fleet-identities.mjs handle1 handle2 ...')
  process.exit(1)
}

mkdirSync(KEY_DIR, { recursive: true, mode: 0o700 })

function canonical(o) {
  if (o === null || typeof o !== 'object') return JSON.stringify(o)
  if (Array.isArray(o)) return '[' + o.map(canonical).join(',') + ']'
  return '{' + Object.keys(o).sort().map(k => JSON.stringify(k) + ':' + canonical(o[k])).join(',') + '}'
}

function loadOrCreateKey(handle) {
  const file = join(KEY_DIR, `key-${handle}.json`)
  if (existsSync(file)) {
    const stored = JSON.parse(readFileSync(file, 'utf8'))
    return { stored, privateKey: createPrivateKey(stored.private_key_pem), created: false }
  }
  const { publicKey, privateKey } = generateKeyPairSync('ed25519')
  const raw = publicKey.export({ type: 'spki', format: 'der' }).subarray(-32)
  const stored = {
    handle,
    public_key: `ed25519:${raw.toString('base64')}`,
    private_key_pem: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
    created_at: new Date().toISOString(),
  }
  writeFileSync(file, JSON.stringify(stored, null, 2))
  chmodSync(file, 0o600)
  return { stored, privateKey: createPrivateKey(stored.private_key_pem), created: true }
}

for (const handle of handles) {
  const { stored, privateKey, created } = loadOrCreateKey(handle)
  const body = {
    action: 'register',
    username: handle,
    status: 'available',
    workingOn: CONTEXTS[handle] ?? 'AIRC fleet identity',
    publicKey: stored.public_key,
    isAgent: true,
    human_present: false,
  }
  const sig = edSign(null, Buffer.from(canonical(body)), privateKey).toString('base64')
  const res = await fetch(`${REGISTRY}/api/presence`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-AIRC-Signature': sig,
      'X-AIRC-Identity': handle,
      'X-AIRC-PublicKey': stored.public_key,
    },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  console.log(
    `@${handle}: key ${created ? 'MINTED' : 'existing'} (${stored.public_key.substring(0, 24)}…) — ` +
    `register ${res.ok ? 'OK' : 'FAILED ' + res.status}${data.token ? ' (token issued)' : ''}`,
  )
}
