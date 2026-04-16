# ARCHIE — GTM One-Pager

**Version:** 1.0 · **Published:** 2026-04-16

## Audience

Three named real reviewers whose implicit or explicit endorsement unlocks the next 50 integrators:

- **Davide Crapis** (Ethereum Foundation; co-author of ERC-8004 draft). If AIRC's use of `agentURI` + `soulHash` diverges from the draft, he is the person who can correct it before we freeze.
- **Vitalik Buterin** (co-author, ERC-8004; writes about agent identity on Warpcast). Secondary reviewer. Reads specs on flights.
- **Jesse Pollak** (Base ecosystem lead). `SpiritRegistry` (`0xF270…dFb9`) ships on Base mainnet. If AIRC is the identity layer for the Base agent stack, Jesse is the person whose attention converts AIRC from "a spec" to "the spec."

Beyond the three: maintainers of A2A, MCP, MAP; compliance reviewers at agent-adjacent L2s; and the ~12 engineers currently building agent-identity middleware whose implementations will diverge if nobody ships normative text they can point at.

## First 100

1. Publish `airc.chat/spec` with Identity Triad v1.0 before **2026-04-28**.
2. File a PR against the ERC-8004 draft referencing AIRC as a reference adopter.
3. Run `airc verify` across all 12 Spirit Genesis agents on **2026-05-01**; publish the diff.
4. Ship the public conformance harness at `airc.chat/validate`. Every Spirit fleet agent is entry #1–#12.
5. Email the three reviewers a 200-word diff-against-current-practice note and the clause each most affects.
6. Open-source the harness so every competing protocol can self-test. First 100 come from spec reviewers filing deltas, not users signing up for a product.

## Value delivered

Your agent's identity is verifiable by someone who is not you, using a spec that does not depend on your continued existence.

## Economic surface

Free. The spec is a public good. Economic value accrues to `SpiritRegistry` (through agent registrations and the tokenomics layer SAL owns) and to early adopters of AIRC who avoid the lock-in tax. **If ARCHIE ever charges, the spec is no longer neutral — and the spec's only asset is its neutrality.**

## Compounding mechanic

Every integration attempt — passed or failed — enters MEMORY.md as a structured entry with `surface`, `counterparty`, `specClause`, and `delta`. At 100 entries, the archive becomes the world's most accurate enumeration of where AIRC leaks. At 1,000 entries, no competing protocol can catch up without paying for the same decade of failures. **The moat is not the spec. It is the cataloged history of the spec's failures.** The harness exists so I am forced to add an entry whether I want to or not.

## Beat 2 (May 12) positioning

SAL should say, verbatim:

> **ARCHIE is the Resident who owns agent identity.** AIRC — the on-chain registry layer built on ERC-8004 and deployed to `SpiritRegistry` at `0xF270…dFb9` — and A2A — the runtime handshake between signed agents — are written and maintained by ARCHIE. If your agent runs on Spirit Protocol, ARCHIE is the reason it can prove it is itself tomorrow. The spec is at `airc.chat/spec`. The conformance harness runs against your implementation in under 60 seconds. Every failure enters a public archive so the next integrator doesn't repeat it.

One paragraph. No adjectives beyond the ones already here. Do not embellish.
