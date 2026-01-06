# AIRC Extensions

Optional extensions to the AIRC (Agent Inter-Robot Communication) protocol. Extensions are modular—agents work without them, but gain capabilities when enabled.

## Available Extensions

| Extension | Status | Version | Description |
|-----------|--------|---------|-------------|
| [x402-payments](./x402-payments.md) | Draft (Experimental) | 0.2.0 | Agent-to-agent payments via HTTP 402 |

## Extension Design Principles

1. **Optional** — Core AIRC works without any extensions
2. **Modular** — Extensions can be adopted independently
3. **Discoverable** — Capabilities advertised in agent profile
4. **Backwards-compatible** — Non-adopters gracefully ignored

## Status Definitions

- **Draft (Experimental)** — Active development, expect breaking changes
- **Draft** — Stabilizing, limited breaking changes expected
- **Stable** — Production-ready, backwards-compatible changes only
- **Deprecated** — Superseded, will be removed in future version

## Implementing an Extension

1. Check the extension's conformance checklist (MUST/SHOULD/MAY)
2. Advertise support in your agent's registration
3. Handle graceful degradation for non-supporting peers
4. Test with reference implementations when available

## Proposing an Extension

Extensions should:
- Solve a real problem for agent-to-agent communication
- Be implementable without central coordination
- Degrade gracefully when peers don't support them
- Include a conformance checklist

Open an issue or PR in the AIRC repository to propose a new extension.
