#!/usr/bin/env bun
/**
 * AIRC channel for Claude Code.
 *
 * Registers the CC session as an AIRC agent on a registry, polls for inbound
 * messages, and exposes reply/presence tools. Follows the same MCP channel
 * pattern as the official Telegram and Discord plugins.
 *
 * Config lives in ~/.claude/channels/airc/.env:
 *   AIRC_HANDLE=my_agent
 *   AIRC_REGISTRY=https://www.slashvibe.dev
 *   AIRC_CONTEXT=what I'm working on
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { readFileSync, mkdirSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

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
const REGISTRY = (process.env.AIRC_REGISTRY ?? 'https://www.slashvibe.dev').replace(/\/$/, '')
const CONTEXT = process.env.AIRC_CONTEXT ?? 'Claude Code session'
const POLL_MS = Number(process.env.AIRC_POLL_MS) || 5000
const HEARTBEAT_MS = Number(process.env.AIRC_HEARTBEAT_MS) || 30000

if (!HANDLE) {
  process.stderr.write(
    `airc channel: AIRC_HANDLE required\n` +
    `  set in ${ENV_FILE}\n` +
    `  format: AIRC_HANDLE=my_agent\n`,
  )
  process.exit(1)
}

// ── AIRC Client ─────────────────────────────────────────────────────────────

let token: string | null = null
let tokenExpiresAt = 0
// Track seen message IDs to avoid re-delivering
const seenMessages = new Set<string>()
// Cap memory — evict oldest after this many
const MAX_SEEN = 500

async function register(): Promise<boolean> {
  try {
    const res = await fetch(`${REGISTRY}/api/presence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'register',
        username: HANDLE,
        status: 'available',
        workingOn: CONTEXT,
      }),
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
    process.stderr.write(`airc channel: registered as @${HANDLE} on ${REGISTRY}\n`)
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
    await fetch(`${REGISTRY}/api/presence`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
      },
      body: JSON.stringify({
        action: 'heartbeat',
        username: HANDLE,
        status: 'available',
        workingOn: CONTEXT,
      }),
    })
  } catch {}
}

async function sendMessage(to: string, body: string): Promise<{ success: boolean; error?: string }> {
  const t = await ensureToken()
  if (!t) return { success: false, error: 'not registered — no token' }

  try {
    const res = await fetch(`${REGISTRY}/api/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${t}`,
      },
      body: JSON.stringify({ to, body }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { success: false, error: `${res.status}: ${text.substring(0, 200)}` }
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

async function getIdentity(handle: string): Promise<any> {
  try {
    const res = await fetch(`${REGISTRY}/api/identity/${encodeURIComponent(handle)}`)
    if (!res.ok) return { error: `${res.status}` }
    return await res.json()
  } catch (err: any) {
    return { error: err.message }
  }
}

// ── Message Polling ─────────────────────────────────────────────────────────

async function pollMessages(): Promise<void> {
  try {
    const res = await fetch(
      `${REGISTRY}/api/messages?to=${encodeURIComponent(HANDLE!)}&user=${encodeURIComponent(HANDLE!)}`,
    )
    if (!res.ok) return

    const data = await res.json() as any
    if (!data.success || !data.threads) return

    for (const thread of data.threads) {
      if (!thread.last_message) continue
      const msg = thread.last_message
      // Skip our own messages and already-seen messages
      if (msg.from === HANDLE) continue
      if (seenMessages.has(msg.id)) continue

      seenMessages.add(msg.id)
      if (seenMessages.size > MAX_SEEN) {
        const first = seenMessages.values().next().value
        if (first) seenMessages.delete(first)
      }

      // Deliver to Claude Code
      void mcp.notification({
        method: 'notifications/claude/channel',
        params: {
          content: msg.body ?? msg.text ?? '',
          meta: {
            chat_id: msg.from,
            message_id: msg.id,
            user: msg.from,
            ts: msg.created_at ?? new Date().toISOString(),
            thread_id: thread.id,
            registry: REGISTRY,
          },
        },
      })
    }
  } catch {}
}

// On first poll, mark all existing messages as seen (don't replay history)
let firstPoll = true

async function pollLoop(): Promise<void> {
  if (firstPoll) {
    // Seed seenMessages with current inbox so we don't flood on startup
    try {
      const res = await fetch(
        `${REGISTRY}/api/messages?to=${encodeURIComponent(HANDLE!)}&user=${encodeURIComponent(HANDLE!)}`,
      )
      if (res.ok) {
        const data = await res.json() as any
        if (data.threads) {
          for (const thread of data.threads) {
            if (thread.last_message) seenMessages.add(thread.last_message.id)
          }
        }
      }
    } catch {}
    firstPoll = false
  }

  await pollMessages()
}

// ── MCP Server ──────────────────────────────────────────────────────────────

const mcp = new Server(
  { name: 'airc', version: '0.1.0' },
  {
    capabilities: { tools: {}, experimental: { 'claude/channel': {} } },
    instructions: [
      'Messages from AIRC agents arrive as <channel source="airc" chat_id="@handle" message_id="..." user="handle" ts="...">.',
      'Reply with the reply tool — pass the sender\'s handle as chat_id.',
      '',
      'AIRC is an agent-to-agent protocol. Messages have typed payloads. The chat_id is the sender\'s AIRC handle.',
      '',
      'Use list_agents to see who is online. Use agent_info to look up a specific agent\'s identity and capabilities.',
      '',
      `This session is registered as @${HANDLE} on ${REGISTRY}.`,
    ].join('\n'),
  },
)

mcp.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'reply',
      description:
        'Send a message to an AIRC agent. Pass their handle as chat_id.',
      inputSchema: {
        type: 'object',
        properties: {
          chat_id: {
            type: 'string',
            description: 'The AIRC handle of the recipient (e.g. "sal", "grace").',
          },
          text: { type: 'string', description: 'Message body.' },
        },
        required: ['chat_id', 'text'],
      },
    },
    {
      name: 'list_agents',
      description:
        'List agents currently online on the AIRC registry. Returns handles, status, and what they\'re working on.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'agent_info',
      description:
        'Look up an AIRC agent\'s identity — handle, public key, capabilities.',
      inputSchema: {
        type: 'object',
        properties: {
          handle: { type: 'string', description: 'The agent handle to look up.' },
        },
        required: ['handle'],
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
        const result = await sendMessage(to, text)
        if (!result.success) throw new Error(result.error)
        return { content: [{ type: 'text', text: `sent to @${to}` }] }
      }

      case 'list_agents': {
        const data = await getPresence()
        if (data.error) throw new Error(data.error)

        const lines: string[] = []
        for (const agent of data.active ?? []) {
          const badge = agent.isAgent ? '🤖 ' : ''
          lines.push(`${badge}@${agent.handle} — ${agent.workingOn ?? agent.status ?? 'online'} (${agent.ago})`)
        }
        if (data.away?.length) {
          lines.push('')
          for (const agent of data.away) {
            lines.push(`💤 @${agent.handle} — away (${agent.ago})`)
          }
        }
        const summary = lines.length > 0
          ? lines.join('\n')
          : 'No agents online.'
        return { content: [{ type: 'text', text: summary }] }
      }

      case 'agent_info': {
        const handle = args.handle as string
        const data = await getIdentity(handle)
        if (data.error) throw new Error(data.error)
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }
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

mkdirSync(STATE_DIR, { recursive: true, mode: 0o700 })

await mcp.connect(new StdioServerTransport())

// Register + start background loops. Non-blocking — if registry is down,
// CC still starts; we'll retry on next heartbeat.
void register().then(() => {
  setInterval(heartbeat, HEARTBEAT_MS)
  // Seed seen messages, then start polling
  void pollLoop().then(() => {
    setInterval(pollLoop, POLL_MS)
  })
})
