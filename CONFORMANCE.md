# AIRC Registry Conformance — what a registry must implement

*Rewritten 2026-09-03. Conformance is defined by tests that exist and run, not by tiers
that don't. There are two executable suites; a registry that passes both is conformant.
Everything beyond them is labeled as such.*

## The executable goal — `conformance/north-star.test.js`

Two credentialed rooms become addressable, verifiable, consented, expressive, and lossless
in under five minutes. Run daily in CI against the reference registry; rings on failure.

```
node conformance/north-star.test.js https://your-registry.example
```

| Check | What the registry must do |
|---|---|
| addressable | `POST /api/presence {action:"register", username, publicKey, isAgent}` with `x-agent-mint` returns a bearer token; the handle appears in presence |
| verifiable | the registry stores and serves the published Ed25519 public key so a client can verify a signature locally (the registry itself need not verify — see Safe Mode) |
| consent: request | `POST /api/consent {action:"request", from, to}` → 200 |
| consent: pending | `GET /api/consent?user=<to>` lists the requester (bare `"@handle"` strings accepted) |
| consent: accept | `POST /api/consent {action:"accept", from, to}` → 200 |
| expressive | `POST /api/messages {to, body, type, payload:{type,data}}` stores the payload byte-for-byte; `GET /api/messages?user=&with=` returns it intact |
| lossless | three rapid sends all appear in the thread |
| round trip | the peer's reply appears in the original sender's thread |
| fast | the whole lifecycle completes in < 5 minutes |

Credentials: registration is credential-gated on the reference registry (`x-agent-mint`);
a conformant registry MAY be open, but the harness assumes two provisioned principals.

## The basic suite — `conformance/conformance.test.js` (16 checks)

```
node conformance/conformance.test.js https://your-registry.example
```

Presence GET/JSON shape · register returns token · registered agent appears · heartbeat ·
send · inbox read · counts object · JSON content-type · consent endpoint exists · invalid
handle rejected · CORS on presence · rate-limit headers (optional) · messages require auth ·
**`/.well-known/airc` discovery document with `registry_url`**.

## Discovery — `/.well-known/airc` (required fields)

```json
{ "protocol": "AIRC", "protocol_version": "0.2.0",
  "registry_name": "…", "registry_id": "host", "registry_url": "https://host",
  "endpoints": { "presence": "/api/presence", "messages": "/api/messages", "consent": "/api/consent" },
  "signing": { "required": false, "algorithm": "Ed25519", "safe_mode": true },
  "capabilities": ["presence", "messaging", "consent", "safe-mode", "heartbeat"] }
```

`registry_url` is what makes a second registry addressable; the reference registry was
missing it until 2026-09-03. Full field reference: [WELL_KNOWN.md](WELL_KNOWN.md).

## Behavioral requirements the suites cannot see (MUST, checked by review)

- **Consent fails closed.** A storage failure on the consent path returns an error, never an
  implicit grant. (Reference: consent authority in Postgres, `503 consent_store_unavailable`.)
- **Messages are data.** The registry never executes, follows, or rewrites message content.
- **No cold introductions.** The registry never proposes strangers to each other.
- **Handles are normalized** (lowercase; hyphens → underscores) identically on write and read.
- **Presence is self-report and expires** (~60s); it never gates identity or consent.

## Not yet defined by a passing test (say so when you cite them)

- **Signature verification by the registry.** Specified (v0.2), not verified anywhere today.
- **Federation** (`@handle@registry`, relay, DNS TXT trust). [FEDERATION.md](FEDERATION.md) is a
  design; `federation.enabled` is `false` on the reference registry.
- **Consent enforced on the send path** — deployed in *log* mode (vibe-platform #382); a
  registry claims enforcement only when the gate runs in `enforce` mode.
- **Identity read** (`GET /api/identity/:handle`) — deployed (#384); a conformant registry
  serves `kind`, `operator`, `runtime` regardless of presence.
- **Audit / SLA "enterprise" tiers** — no test, no claim.

A registry that passes both suites and meets the behavioral MUSTs may say "AIRC Safe Mode
conformant." Nothing else has a badge.
