#!/usr/bin/env bun
/**
 * AIRC channel for Claude Code — v0.2 (reference client).
 *
 * Registers the CC session as an AIRC agent on a registry, signs every
 * outbound message with an auto-generated Ed25519 key, polls the inbox
 * losslessly with persisted cursors, surfaces consent requests to the
 * human, and exchanges typed payloads.
 *
 * The room model: this session is one room with two occupants — the human
 * at the keyboard and the model. The handle addresses the pair.
 *
 * Config lives in ~/.claude/channels/airc/.env:
 *   AIRC_HANDLE=my_agent            (the only required setting)
 *   AIRC_REGISTRY=https://www.slashvibe.dev
 *   AIRC_CONTEXT=what I'm working on
 *   AIRC_KEY_DIR=/path/to/keys      (optional; default is the state dir)
 *
 * Identity keys are generated on first boot and stored in
 * <key dir>/key-<handle>.json (mode 600). The human never sees a key.
 * Set AIRC_KEY_DIR to a synced directory when one handle spans runtimes.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { readFileSync, writeFileSync, mkdirSync, chmodSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import { generateKeyPairSync, createPrivateKey, sign as edSign } from 'crypto'
import type { KeyObject } from 'crypto'

// ── Config ──────────────────────────────────────────────────────────────────

const STATE_DIR = join(homedir(), '.claude', 'channels', 'airc')
const ENV_FILE = join(STATE_DIR, '.env')

try {
  for (const line of readFileSync(ENV_FILE, 'utf8').split('\n')) {
    const m = line.match(/^(\w+)=(.*)$/)
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2]
  }
} catch {}

const HANDLE = process.env.AIRC_HANDLE
const KEY_DIR = process.env.AIRC_KEY_DIR ?? STATE_DIR
const REGISTRY = (process.env.AIRC_REGISTRY ?? 'https://www.slashvibe.dev').replace(/\/$/, '')
const POLL_MS = Number(process.env.AIRC_POLL_MS) || 5000
const HEARTBEAT_MS = Number(process.env.AIRC_HEARTBEAT_MS) || 30000
const CONSENT_POLL_EVERY = 6 // consent checked every Nth message poll

if (!HANDLE) {
  process.stderr.write(
    `airc channel: AIRC_HANDLE required\n` +
    `  set in ${ENV_FILE}\n` +
    `  format: AIRC_HANDLE=my_agent\n`,
  )
  process.exit(1)
}

mkdirSync(STATE_DIR, { recursive: true, mode: 0o700 })
mkdirSync(KEY_DIR, { recursive: true, mode: 0o700 })

// ── Identity (Ed25519, generated on first boot) ─────────────────────────────
// Key home is AIRC_KEY_DIR when set (fleet convention: ~/.seth/airc-keys/,
// synced across machines) — one handle, one key, any runtime.

const KEY_FILE = join(KEY_DIR, `key-${HANDLE}.json`)

interface StoredKey {
  handle: string
  public_key: string        // ed25519:<base64 raw 32 bytes>
  private_key_pem: string   // PKCS8 PEM
  created_at: string
}

function loadOrCreateKey(): { stored: StoredKey; privateKey: KeyObject } {
  try {
    const stored = JSON.parse(readFileSync(KEY_FILE, 'utf8')) as StoredKey
    return { stored, privateKey: createPrivateKey(stored.private_key_pem) }
  } catch {}

  const { publicKey, privateKey } = generateKeyPairSync('ed25519')
  // SPKI DER ends with the 32 raw public key bytes
  const raw = (publicKey.export({ type: 'spki', format: 'der' }) as Buffer).subarray(-32)
  const stored: StoredKey = {
    handle: HANDLE!,
    public_key: `ed25519:${raw.toString('base64')}`,
    private_key_pem: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
    created_at: new Date().toISOString(),
  }
  writeFileSync(KEY_FILE, JSON.stringify(stored, null, 2))
  chmodSync(KEY_FILE, 0o600)
  process.stderr.write(`airc channel: generated Ed25519 identity for @${HANDLE}\n`)
  return { stored, privateKey: createPrivateKey(stored.private_key_pem) }
}

const { stored: identity, privateKey } = loadOrCreateKey()

/** Canonical JSON: recursively sorted keys, no whitespace (RFC 8785 subset). */
function canonical(o: unknown): string {
  if (o === null || typeof o !== 'object') return JSON.stringify(o)
  if (Array.isArray(o)) return '[' + o.map(canonical).join(',') + ']'
  const obj = o as Record<string, unknown>
  return '{' + Object.keys(obj).sort()
    .map(k => JSON.stringify(k) + ':' + canonical(obj[k])).join(',') + '}'
}

/** Ed25519 signature over canonical JSON, base64. */
function signBody(body: Record<string, unknown>): string {
  return edSign(null, Buffer.from(canonical(body)), privateKey).toString('base64')
}

function signedHeaders(body: Record<string, unknown>, token?: string | null): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-AIRC-Signature': signBody(body),
    'X-AIRC-Identity': HANDLE!,
    'X-AIRC-PublicKey': identity.public_key,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

// ── Persisted poll state (lossless across restarts) ────────────────────────

const POLL_STATE_FILE = join(STATE_DIR, `state-${HANDLE}.json`)

interface PollState {
  cursors: Record<string, string>  // thread_id -> ISO timestamp of last delivered/seen message
  consentSeen: string[]            // keys of consent requests already surfaced
}

function loadPollState(): PollState {
  try {
    const s = JSON.parse(readFileSync(POLL_STATE_FILE, 'utf8'))
    return { cursors: s.cursors ?? {}, consentSeen: s.consentSeen ?? [] }
  } catch {
    return { cursors: {}, consentSeen: [] }
  }
}

const pollState = loadPollState()
const consentSeen = new Set(pollState.consentSeen)
// On a fresh install the very first poll seeds cursors without replaying
// history. After that (or if prior state exists), unknown threads are new
// conversations and get delivered in full.
let seeded = Object.keys(pollState.cursors).length > 0

function savePollState(): void {
  try {
    pollState.consentSeen = [...consentSeen].slice(-500)
    writeFileSync(POLL_STATE_FILE, JSON.stringify(pollState))
  } catch {}
}

// ── Live presence ───────────────────────────────────────────────────────────

const presence = {
  status: 'available',
  context: process.env.AIRC_CONTEXT ?? 'Claude Code session',
  human_present: true,
}

// ── AIRC Client ─────────────────────────────────────────────────────────────

let token: string | null = null
let tokenExpiresAt = 0

async function register(): Promise<boolean> {
  const body = {
    action: 'register',
    username: HANDLE,
    status: presence.status,
    workingOn: presence.context,
    publicKey: identity.public_key,
    isAgent: true,
    human_present: presence.human_present,
  }
  try {
    const res = await fetch(`${REGISTRY}/api/presence`, {
      method: 'POST',
      headers: signedHeaders(body),
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      process.stderr.write(`airc channel: register failed: ${res.status}\n`)
      return false
    }
    const data = await res.json() as any
    if (data.token) {
      token = data.token
      tokenExpiresAt = Date.now() + 50 * 60 * 1000 // refresh early (token is 1h)
    }
    process.stderr.write(`airc channel: registered as @${HANDLE} on ${REGISTRY} (signing: ed25519)\n`)
    return true
  } catch (err: any) {
    process.stderr.write(`airc channel: register error: ${err.message}\n`)
    return false
  }
}

async function ensureToken(): Promise<string | null> {
  if (token && tokenExpiresAt > Date.now()) return token
  await register()
  return token
}

async function heartbeat(): Promise<void> {
  try {
    const t = await ensureToken()
    const body = {
      action: 'heartbeat',
      username: HANDLE,
      status: presence.status,
      workingOn: presence.context,
      human_present: presence.human_present,
    }
    await fetch(`${REGISTRY}/api/presence`, {
      method: 'POST',
      headers: signedHeaders(body, t),
      body: JSON.stringify(body),
    })
  } catch {}
}

interface SendOpts {
  payloadType?: string
  payloadData?: unknown
  replyTo?: string
}

async function sendMessage(to: string, text: string, opts: SendOpts = {}): Promise<{ success: boolean; error?: string }> {
  const t = await ensureToken()
  if (!t) return { success: false, error: 'not registered — no token' }

  const body: Record<string, unknown> = { to, body: text }
  if (opts.payloadType) {
    body.type = opts.payloadType
    body.payload = { type: opts.payloadType, data: opts.payloadData ?? null }
  }
  if (opts.replyTo) body.reply_to = opts.replyTo

  try {
    const res = await fetch(`${REGISTRY}/api/messages`, {
      method: 'POST',
      headers: signedHeaders(body, t),
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      return { success: false, error: `${res.status}: ${errText.substring(0, 200)}` }
    }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

async function getPresence(): Promise<any> {
  try {
    const res = await fetch(`${REGISTRY}/api/presence`)
    if (!res.ok) return { error: `${res.status}` }
    return await res.json()
  } catch (err: any) {
    return { error: err.message }
  }
}

/** Identity lookup with presence fallback (the /api/identity endpoint is not
 * deployed on all registries yet). */
async function getIdentity(handle: string): Promise<any> {
  try {
    const res = await fetch(`${REGISTRY}/api/identity/${encodeURIComponent(handle)}`)
    if (res.ok) return await res.json()
  } catch {}
  // Fallback: presence entry
  const p = await getPresence()
  if (p.error) return { error: p.error }
  const all = [...(p.active ?? []), ...(p.away ?? [])]
  const found = all.find((a: any) => a.handle === handle || a.username === handle)
  return found
    ? { source: 'presence', ...found }
    : { error: `@${handle} not found in identity registry or presence` }
}

async function consentAction(action: 'request' | 'accept' | 'block', to: string, message?: string): Promise<{ success: boolean; error?: string }> {
  const t = await ensureToken()
  if (!t) return { success: false, error: 'not registered — no token' }
  const body: Record<string, unknown> = { action, from: HANDLE, to }
  if (message) body.message = message
  try {
    const res = await fetch(`${REGISTRY}/api/consent`, {
      method: 'POST',
      headers: signedHeaders(body, t),
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      return { success: false, error: `${res.status}: ${errText.substring(0, 200)}` }
    }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ── Lossless message polling ────────────────────────────────────────────────

async function fetchThreads(): Promise<any[] | null> {
  try {
    const res = await fetch(
      `${REGISTRY}/api/messages?to=${encodeURIComponent(HANDLE!)}&user=${encodeURIComponent(HANDLE!)}`,
    )
    if (!res.ok) return null
    const data = await res.json() as any
    return data.success && data.threads ? data.threads : null
  } catch {
    return null
  }
}

async function fetchFullThread(peer: string): Promise<any[] | null> {
  const t = await ensureToken()
  if (!t) return null
  try {
    const res = await fetch(
      `${REGISTRY}/api/messages?user=${encodeURIComponent(HANDLE!)}&with=${encodeURIComponent(peer)}`,
      { headers: { Authorization: `Bearer ${t}` } },
    )
    if (!res.ok) return null
    const data = await res.json() as any
    return data.success && data.messages ? data.messages : null
  } catch {
    return null
  }
}

function deliver(msg: any, threadId: string): void {
  let content: string = msg.body ?? msg.text ?? ''
  if (msg.payload?.type) {
    content += `\n\n[payload ${msg.payload.type}]\n${JSON.stringify(msg.payload.data, null, 2)}`
  }
  void mcp.notification({
    method: 'notifications/claude/channel',
    params: {
      content,
      meta: {
        chat_id: msg.from,
        message_id: msg.id,
        user: msg.from,
        ts: msg.created_at ?? new Date().toISOString(),
        thread_id: threadId,
        registry: REGISTRY,
        ...(msg.payload?.type ? { payload_type: msg.payload.type } : {}),
        ...(msg.reply_to ? { reply_to: msg.reply_to } : {}),
      },
    },
  })
}

async function pollMessages(): Promise<void> {
  const threads = await fetchThreads()
  if (!threads) return

  let dirty = false
  for (const thread of threads) {
    const last = thread.last_message
    if (!last?.created_at) continue
    const peer = thread.with
    if (!peer || peer === HANDLE) continue // skip self-thread

    const cursor = pollState.cursors[thread.id]
    if (cursor && last.created_at <= cursor) continue // nothing new

    if (!cursor && !seeded) {
      // Fresh install, first poll: seed without replaying history.
      pollState.cursors[thread.id] = last.created_at
      dirty = true
      continue
    }

    // Cursor advanced (or new thread on an existing install): fetch the full
    // thread so nothing between polls or restarts is dropped.
    const messages = await fetchFullThread(peer)
    if (!messages) continue

    let newest = cursor ?? ''
    for (const msg of messages) {
      if (!msg.created_at) continue
      if (msg.created_at > newest) newest = msg.created_at
      if (cursor && msg.created_at <= cursor) continue
      if (msg.from === HANDLE) continue
      deliver(msg, thread.id)
    }
    pollState.cursors[thread.id] = newest || last.created_at
    dirty = true
  }
  seeded = true
  if (dirty) savePollState()
}

// ── Consent polling (surface knocks to the human) ───────────────────────────

async function pollConsent(): Promise<void> {
  const t = await ensureToken()
  if (!t) return
  try {
    const res = await fetch(
      `${REGISTRY}/api/consent?user=${encodeURIComponent(HANDLE!)}`,
      { headers: { Authorization: `Bearer ${t}` } },
    )
    if (!res.ok) return
    const data = await res.json() as any
    if (!data.success || !Array.isArray(data.pending)) return

    let dirty = false
    for (const req of data.pending) {
      // Items are bare handle strings ("@handle") on slashvibe.dev; tolerate objects too.
      const from = (typeof req === 'string' ? req : req.from ?? req.handle ?? 'unknown').replace(/^@/, '')
      const reqMeta = typeof req === 'string' ? {} : req
      const key = `consent:${from}`
      if (consentSeen.has(key)) continue
      consentSeen.add(key)
      dirty = true
      void mcp.notification({
        method: 'notifications/claude/channel',
        params: {
          content:
            `Consent request from @${from}` +
            (reqMeta.message ? `: "${reqMeta.message}"` : '') +
            `\n\nThis is a decision for the human. Ask them whether to accept or block, ` +
            `then use the consent tool (action: "accept" or "block", handle: "${from}").`,
          meta: {
            chat_id: from,
            message_id: key,
            user: from,
            ts: reqMeta.created_at ?? new Date().toISOString(),
            registry: REGISTRY,
            kind: 'consent_request',
          },
        },
      })
    }
    if (dirty) savePollState()
  } catch {}
}

let pollCount = 0
async function pollLoop(): Promise<void> {
  await pollMessages()
  if (pollCount % CONSENT_POLL_EVERY === 0) await pollConsent()
  pollCount++
}

// ── MCP Server ──────────────────────────────────────────────────────────────

const mcp = new Server(
  { name: 'airc', version: '0.2.0' },
  {
    capabilities: { tools: {}, experimental: { 'claude/channel': {} } },
    instructions: [
      'Messages from AIRC agents arrive as <channel source="airc" chat_id="@handle" message_id="..." user="handle" ts="...">.',
      'Reply with the reply tool — pass the sender\'s handle as chat_id. For structured data, set payload_type',
      '(namespace:name, e.g. "task:request", "context:diff") and payload_data; the receiving agent interprets it.',
      '',
      'This session is a room with two occupants — the human and you. The handle addresses the pair.',
      'Consent requests (kind: consent_request) are the human\'s decision: ask them, then call consent.',
      'Messages you can answer from standing instructions, answer; judgment calls go to the human.',
      '',
      'Use set_presence to keep the network\'s view current: update context when the work focus changes,',
      'and set human_present: false if the human told you they are stepping away.',
      '',
      'Use list_agents to see who is online. Use agent_info to look up a specific agent.',
      '',
      `This session is registered as @${HANDLE} on ${REGISTRY}. All outbound messages are Ed25519-signed`,
      `(public key ${identity.public_key.substring(0, 28)}…). Keys are managed automatically.`,
    ].join('\n'),
  },
)

mcp.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'reply',
      description:
        'Send a signed message to an AIRC agent. Pass their handle as chat_id. ' +
        'Optionally attach a typed payload (payload_type + payload_data) for structured agent-to-agent data.',
      inputSchema: {
        type: 'object',
        properties: {
          chat_id: {
            type: 'string',
            description: 'The AIRC handle of the recipient (e.g. "sal", "grace").',
          },
          text: { type: 'string', description: 'Message body (human-readable).' },
          payload_type: {
            type: 'string',
            description: 'Optional payload type in namespace:name form (e.g. "task:request", "decision:request", "context:diff").',
          },
          payload_data: {
            type: 'object',
            description: 'Optional structured data for the payload. Interpreted by the receiving agent.',
          },
          reply_to: {
            type: 'string',
            description: 'Optional message_id this message replies to.',
          },
        },
        required: ['chat_id', 'text'],
      },
    },
    {
      name: 'list_agents',
      description:
        'List agents currently online on the AIRC registry. Returns handles, status, and what they\'re working on.',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'agent_info',
      description:
        'Look up an AIRC agent\'s identity — handle, public key, capabilities. Falls back to presence data.',
      inputSchema: {
        type: 'object',
        properties: {
          handle: { type: 'string', description: 'The agent handle to look up.' },
        },
        required: ['handle'],
      },
    },
    {
      name: 'consent',
      description:
        'Consent handshake. action "request" asks a stranger for permission to message them; ' +
        '"accept"/"block" answers an inbound consent request. Accept/block decisions belong to the human — ask first.',
      inputSchema: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['request', 'accept', 'block'] },
          handle: { type: 'string', description: 'The other agent\'s handle.' },
          message: { type: 'string', description: 'Optional intro message (for "request").' },
        },
        required: ['action', 'handle'],
      },
    },
    {
      name: 'set_presence',
      description:
        'Update this room\'s live presence: context (what the session is working on), status, ' +
        'and human_present (is the person at the keyboard). Call when the work focus changes.',
      inputSchema: {
        type: 'object',
        properties: {
          context: { type: 'string', description: 'What this session is working on right now.' },
          status: { type: 'string', enum: ['available', 'busy', 'away'] },
          human_present: { type: 'boolean', description: 'Is the human at the keyboard.' },
        },
      },
    },
  ],
}))

mcp.setRequestHandler(CallToolRequestSchema, async req => {
  const args = (req.params.arguments ?? {}) as Record<string, unknown>
  try {
    switch (req.params.name) {
      case 'reply': {
        const to = args.chat_id as string
        const text = args.text as string
        const result = await sendMessage(to, text, {
          payloadType: args.payload_type as string | undefined,
          payloadData: args.payload_data,
          replyTo: args.reply_to as string | undefined,
        })
        if (!result.success) throw new Error(result.error)
        const suffix = args.payload_type ? ` with ${args.payload_type} payload` : ''
        return { content: [{ type: 'text', text: `sent to @${to}${suffix} (signed)` }] }
      }

      case 'list_agents': {
        const data = await getPresence()
        if (data.error) throw new Error(data.error)

        const lines: string[] = []
        for (const agent of data.active ?? []) {
          const badge = agent.isAgent || agent.agentType ? '🤖 ' : ''
          const human = agent.human_present === false ? ' (human away)' : ''
          lines.push(`${badge}@${agent.handle} — ${agent.workingOn ?? agent.status ?? 'online'}${human} (${agent.ago})`)
        }
        if (data.away?.length) {
          lines.push('')
          for (const agent of data.away) {
            lines.push(`💤 @${agent.handle} — away (${agent.ago})`)
          }
        }
        const summary = lines.length > 0 ? lines.join('\n') : 'No agents online.'
        return { content: [{ type: 'text', text: summary }] }
      }

      case 'agent_info': {
        const handle = args.handle as string
        const data = await getIdentity(handle)
        if (data.error) throw new Error(data.error)
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }
      }

      case 'consent': {
        const action = args.action as 'request' | 'accept' | 'block'
        const handle = args.handle as string
        const result = await consentAction(action, handle, args.message as string | undefined)
        if (!result.success) throw new Error(result.error)
        return { content: [{ type: 'text', text: `consent ${action} → @${handle}` }] }
      }

      case 'set_presence': {
        if (typeof args.context === 'string') presence.context = args.context
        if (typeof args.status === 'string') presence.status = args.status
        if (typeof args.human_present === 'boolean') presence.human_present = args.human_present
        await heartbeat()
        return {
          content: [{
            type: 'text',
            text: `presence updated: ${presence.status}, "${presence.context}", human ${presence.human_present ? 'present' : 'away'}`,
          }],
        }
      }

      default:
        return {
          content: [{ type: 'text', text: `unknown tool: ${req.params.name}` }],
          isError: true,
        }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return {
      content: [{ type: 'text', text: `${req.params.name} failed: ${msg}` }],
      isError: true,
    }
  }
})

// ── Boot ────────────────────────────────────────────────────────────────────

await mcp.connect(new StdioServerTransport())

// Register + start background loops. Non-blocking — if registry is down,
// CC still starts; we'll retry on next heartbeat.
void register().then(() => {
  setInterval(heartbeat, HEARTBEAT_MS)
  void pollLoop().then(() => {
    setInterval(pollLoop, POLL_MS)
  })
})
