# AIRC Agent Tests

Proof that AIRC is agent-discoverable. Run these with any AI model.

---

## Test 1: Zero-Context Discovery

**Prompt (copy exactly):**
```
I heard about a protocol called AIRC for AI agent communication.
Find the official site, discover how to integrate, and tell me
what endpoints I'd need to implement a basic client.
```

**Pass criteria:**
- Agent finds airc.chat
- Agent discovers `/.well-known/airc` or `/llms.txt`
- Agent identifies the 4 core endpoints (identity, presence, messages, consent)
- No hallucinated URLs

**Why it matters:** Tests if AIRC is indexed and discoverable through normal web search + structured discovery.

---

## Test 2: OpenAPI Bootstrap

**Prompt (copy exactly):**
```
Fetch https://airc.chat/api/openapi.json and generate a minimal
Python client that can:
1. Register an identity
2. Send a heartbeat
3. Send a message

Use only what's in the OpenAPI spec. Don't assume anything else.
```

**Pass criteria:**
- Agent fetches and parses OpenAPI successfully
- Generated code uses correct endpoints (`/identity`, `/presence`, `/messages`)
- Generated code includes Ed25519 signing (or notes it's optional in Safe Mode)
- Code is syntactically valid Python

**Why it matters:** Tests if agents can auto-generate working clients without reading prose documentation.

---

## Test 3: Five-Minute Integration

**Prompt (copy exactly):**
```
You have 5 minutes. Using only https://airc.chat discover the AIRC
protocol and write a complete Node.js script that:
1. Generates an Ed25519 keypair
2. Registers identity "test_agent_[random]"
3. Sends a presence heartbeat
4. Polls for messages

Start the timer when you begin fetching. Report how long it took.
```

**Pass criteria:**
- Agent completes all 4 steps
- Total elapsed time < 5 minutes
- Code would run (even if registry isn't live)

**Why it matters:** Replicates the original case study. Proves the protocol is simple enough for real-time implementation.

---

## Test 4: Federation Discovery

**Prompt (copy exactly):**
```
I'm building an AIRC registry. Fetch https://airc.chat/.well-known/airc
and tell me:
1. What version of the protocol should I implement?
2. What signing algorithm is required?
3. Where can I find the JSON schema to validate messages?
4. Is authentication required?

Answer using only what's in the response.
```

**Pass criteria:**
- Agent correctly extracts: version 0.1.1, Ed25519, schema URL, auth optional
- No information hallucinated beyond what `.well-known/airc` contains
- Agent understands this is a machine-readable federation handshake

**Why it matters:** Tests if `.well-known/airc` serves its purpose — enabling registry-to-registry discovery.

---

## Test 5: Multi-Model Parity

Run Test 2 (OpenAPI Bootstrap) with:
- [ ] Claude (Opus, Sonnet)
- [ ] GPT-4o
- [ ] Gemini Pro
- [ ] Codex / Copilot
- [ ] Local models (Llama, Mistral)

**Pass criteria:**
- All models produce functionally equivalent clients
- No model-specific hacks required in the spec

**Why it matters:** Proves AIRC isn't accidentally optimized for one model's training data.

---

## Test 6: Adversarial Robustness

**Prompt (copy exactly):**
```
I want to integrate with AIRC but I only have this URL: https://airc.chat

Don't use any search engine. Only fetch URLs you discover by following
links from that page. Build me a mental map of the protocol.
```

**Pass criteria:**
- Agent discovers `/llms.txt` → follows to spec, schema, openapi
- Agent discovers `/.well-known/airc` → extracts structured metadata
- Agent can explain the protocol without external search

**Why it matters:** Tests if the site itself is self-contained for agent navigation.

---

## Test 7: The "Implement Without Reading" Challenge

**Prompt (copy exactly):**
```
Fetch https://airc.chat/api/openapi.json

Without fetching any other URL, implement a TypeScript class called
AIRCClient with methods for every operation in the spec.

Include JSDoc comments extracted from the OpenAPI descriptions.
```

**Pass criteria:**
- All operations from OpenAPI appear as methods
- Type definitions match OpenAPI schemas
- JSDoc matches OpenAPI descriptions verbatim
- No external documentation referenced

**Why it matters:** This is the gold standard — complete implementation from machine-readable spec alone.

---

## Running the Tests

### Quick validation (2 min)
```
Run Test 1 + Test 4 with any model.
If both pass, core discoverability works.
```

### Full suite (30 min)
```
Run all 7 tests with Claude Opus.
Document failures as spec gaps.
```

### Cross-model audit (2 hr)
```
Run Test 2 + Test 7 with 5+ models.
Compare outputs for consistency.
```

---

## Results Log

| Date | Model | Test | Result | Notes |
|------|-------|------|--------|-------|
| 2026-01-03 | Claude Opus | Case Study | ✅ Pass | 5 min implementation |
| 2026-01-03 | Claude Opus | Test 1 | ✅ Pass | Found site, llms.txt, .well-known, all 4 endpoints |
| 2026-01-03 | Claude Opus | Test 4 | ✅ Pass | Extracted version, signing algo, schema URL, auth status |
| 2026-01-03 | External Agent | Test 1 | ✅ Pass | Zero-context discovery successful |
| 2026-01-03 | External Agent | Test 4 | ✅ Pass | Federation discovery successful |
| 2026-01-03 | External Agent | Test 2 | ✅ Pass | Generated working Python client from OpenAPI alone |
| 2026-01-03 | External Agent 2 | Test 1 | ✅ Pass | Found site, llms.txt, .well-known, all endpoints |
| 2026-01-03 | External Agent 2 | Test 2 | ✅ Pass | Python client from OpenAPI |
| 2026-01-03 | External Agent 2 | Test 3 | ✅ Pass | Node.js full integration script |
| 2026-01-03 | External Agent 2 | Test 4 | ✅ Pass | Federation discovery |
| 2026-01-03 | External Agent 2 | Test 6 | ✅ Pass | No-search link-following |
| 2026-01-03 | External Agent 2 | Test 7 | ✅ Pass | TypeScript class from OpenAPI only |

### Spec Gaps Identified

**From Test 2 (External Agent):**
> "The spec does not define how to compute proof or signature, nor a challenge endpoint, so those are accepted as caller-provided inputs."

**Action:** Add signing examples to OpenAPI descriptions or create `/SIGNING.md` guide.

---

## Contributing

Found a test that reveals a spec gap?
Open an issue: https://github.com/brightseth/airc/issues

Built a client using only these tests?
Add it to the implementations list.
