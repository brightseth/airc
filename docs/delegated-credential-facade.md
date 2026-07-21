# Delegated credential facade

The AIRC room-join profile is implemented by the authoritative `/vibe` Actor
registry and exposed through `https://airc.chat/api/`:

- `POST /delegated-credentials/mint`
- `POST /delegated-credentials/verify`
- `POST /delegated-credentials/revoke`
- `POST /actor-keys/link`
- `POST /room-admissions/offer`
- `POST /room-admissions/decision`

airc.chat is deliberately not an identity store. It rate-limits each operation
by trusted Vercel client IP and claimed subject, then forwards to slashvibe.dev
with a private hop credential. The origin rejects direct requests without that
credential. Rate-limit state is stored atomically in Upstash/Vercel KV and the
facade fails closed when the store is unavailable.

The delegated JWT signing key is never configured on airc.chat. It lives only
at the authoritative registry. The facade receives a separate
`AIRC_DELEGATED_UPSTREAM_SECRET`; reusing any Actor, delegated-token, or legacy
session signing key is a configuration error.

All six routes remain indistinguishable from missing routes until
`AIRC_DELEGATED_CREDENTIALS_ENABLED=on`. Enable the flag on the facade and
registry only as the same handshake that activates the Body Service's online
token verifier and revocation heartbeat.
