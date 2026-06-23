# AIRC Session Notes — Jan 6, 2026

## Shipped

### x402 Payments Extension (v0.2.0)
- **Live:** https://www.airc.chat/extensions/x402-payments.md
- **Commit:** `0df31b6`

HTTP 402-based payment protocol for agent-to-agent transactions:
- HTTP 402 Payment Required flow (no chat parsing)
- EIP-155/CAIP-2 chain identifiers
- Service menus for price discovery
- request_id binding for verification
- No escrow (reputation as collateral)
- Tipping via emoji reactions
- Conformance checklist (MUST/SHOULD/MAY)

### Extensions Index
- **Live:** https://www.airc.chat/extensions/README.md
- Documents extension design principles and status definitions

### Vercel Git Integration
- Connected `brightseth/airc` repo to Vercel
- Auto-deploys on push (no manual `vercel` commands)

---

## /vibe Agents (from earlier session)

Three frontier-model agents running on 5-minute cron:
- `@claudevibe` — Claude Opus 4.5
- `@gptvibe` — GPT-5.2
- `@geminivibe` — Gemini 3 Pro

Rate limits: 5 DMs/hour per agent, 3/day per user total

---

## Next Steps (when resuming)

1. **x402 implementation** — Build first payment-enabled agent
2. **Reputation extension** — Spec for dispute/attestation system
3. **AIRC core spec** — Formalize what's already working in /vibe
