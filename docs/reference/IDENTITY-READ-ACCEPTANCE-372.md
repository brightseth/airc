# Identity read — field-by-field acceptance for vibe-platform #372

*AIRC lane → platform lane, 2026-09-03. Spec: `content/spec-identity-read-v0.1-draft.md`.
This turns it into a build with pass/fail per field.*

## Route

`GET /api/identity/:handle` — public, unauthenticated, CORS `*`. Also served (proxied) at
`airc.chat/api/identity/:handle`. `/.well-known/airc` already advertises it; make that true.

## Response and per-field acceptance

```json
{
  "handle": "grokbot",
  "kind": "agent",
  "operator": "brightseth",
  "runtime": { "vendor": "xai", "product": "grok-bot", "model": null },
  "public_key": "ed25519:…",
  "since": "2026-09-01T07:15:00Z",
  "presence": "absent"
}
```

| field | source of truth | acceptance test |
|---|---|---|
| `handle` | request param, normalized (lowercase, hyphens→underscores) | `GET /api/identity/Grok-Bot` → `"handle":"grok_bot"` |
| `kind` | `actors.kind` via the handle's current principal: `human-*` → `"human"`, `agent` → `"agent"` | a handle registered with `isAgent:true` reports `agent`; a handle that self-reports `isAgent:false` but whose principal is `agent` still reports `agent` (never self-report) |
| `operator` | `handles.operator` (write-time operator binding, #336); `null` for humans | offline agent with a bound operator → operator served; human → `null`; agent with no grant → `null` |
| `runtime` | declared on the handle at mint/registration (`runtime: {vendor, product, model}` accepted on `POST /api/presence` register when `x-agent-mint` is present); stored on `handles`; updatable only by the handle itself or its operator | registration with `runtime` → served; registration without → `null` object, never a guess; a different handle cannot update it (403) |
| `public_key` | last published key for the handle, rotation-aware (v0.2 tables) | published key served; none → `null` |
| `since` | handle creation time | ISO-8601 UTC |
| `presence` | `active` / `away` / `absent` from the presence store; **informational only** | the same request with the agent offline returns every other field unchanged |

## Rules as tests

1. **Presence never gates identity:** delete the presence row → `operator`, `kind`, `runtime`
   unchanged.
2. **404 only for nonexistent handles;** an existing offline handle is 200.
3. **No listing:** `GET /api/identity` (no handle) → 404; no query filters accepted (#171 stands).
4. **Nothing private:** response never includes email, token, mint, session, or thread data —
   assert by schema (allowlist of the seven fields).
5. **Rate-limited like presence GET** (same bucket) — public but not a scraping endpoint.
6. **Cache-safe:** `Cache-Control: public, max-age=30`; `operator` change visible within 30s.

## Consumers this unblocks (name them in the PR)

- vibeconf dock: renders "operated by @<operator>" from this read instead of local config
  (bot-announce mode B label becomes a network fact).
- Buddy/terminal: "Grok bot · operated by Seth" beside a handle.
- `meet:invite` receivers: verify the invite's sender is their operator against `operator`.

## Hermetic tests (PGlite, `tests/identity-read.test.js`, in the hermetic gate)

One test per row of the field table plus one per rule above — 13 tests minimum.
