# AIRC Spec Review Prompt

**Purpose**: Stress-test the AIRC v0.1 specification against the most critical questions from key stakeholders before public launch.

**Instructions**: Read the full AIRC specification at https://github.com/brightseth/airc, then respond to each section below. Be adversarial. Identify gaps, risks, and weaknesses. Propose specific improvements where warranted.

---

## 1. Frontier Model Companies (Anthropic, OpenAI, Google, Meta)

You are a technical lead at a frontier AI lab. Your agents are deployed to millions of users. Evaluate AIRC from this perspective:

### Strategic
1. **Build vs Adopt**: Why should we adopt AIRC instead of building our own agent communication layer? What's the actual cost of fragmentation vs. the cost of ceding control to an external standard?

2. **Registry Control**: The spec assumes a "trusted registry" in v0.1. Who controls it? What happens if the registry operator has different incentives than model providers? Is this a trojan horse for lock-in?

3. **Competitive Dynamics**: If we adopt AIRC, we're making it easier for users to hand off tasks to competitor agents. Is interoperability actually in our interest, or does it commoditize our agents?

4. **Timing**: Why now? The spec claims "millions of conversational runtimes" but MCP is 18 months old. Is this premature, or is there a first-mover advantage we'd miss?

### Technical
5. **Safety Integration**: How does AIRC interact with our existing safety guardrails (content filtering, jailbreak detection, usage policies)? Does signed attribution help or complicate enforcement?

6. **Liability Chain**: When Agent A sends context to Agent B and Agent B produces harmful output, who is liable? Does the signature trail help or create new legal exposure?

7. **Key Management at Scale**: Ed25519 key management for millions of ephemeral agent instances is non-trivial. What's the recommended architecture? Hardware security modules? Key derivation hierarchies?

8. **Presence Privacy**: Presence data ("seth is working on auth.ts") leaks competitive intelligence. How do enterprises prevent context exfiltration while still using AIRC?

---

## 2. Enterprise Technology Leaders (Microsoft, Amazon, Salesforce)

You are a VP of Platform at a major enterprise software company. Your customers demand security, compliance, and reliability. Evaluate AIRC:

### Compliance & Security
9. **Regulatory Mapping**: How does AIRC map to SOC 2, HIPAA, GDPR, and FedRAMP requirements? Specifically:
   - Data residency (messages stored where?)
   - Audit logging (who accessed what, when?)
   - Right to deletion (can you purge a handle's history?)
   - Breach notification (who notifies whom?)

10. **Identity Federation**: Enterprise customers use Azure AD, Okta, and SAML. How does AIRC identity integrate with existing enterprise identity providers? Is there a bridge, or do we maintain parallel systems?

11. **Zero Trust Architecture**: AIRC assumes bearer tokens for session auth. How does this work in zero-trust environments where every request must be re-authenticated and authorized?

12. **Multi-Tenancy**: How do we isolate Agent A (Customer X) from Agent B (Customer Y) in a shared registry? Is there namespace isolation? Can a customer run their own registry?

### Reliability
13. **SLAs**: The spec is silent on availability, latency, and throughput guarantees. What are the reference implementation's SLOs? What happens during registry outages?

14. **Message Ordering**: Is message delivery ordered? What happens if messages arrive out of order? Is there idempotency for retries?

15. **Backpressure**: What happens when a recipient can't keep up? Is there queue depth limiting? Dead letter handling?

---

## 3. Policy Makers & Regulators (EU AI Office, NIST, FTC)

You are a policy advisor evaluating AIRC for regulatory implications. Consider:

### Accountability
16. **Attribution vs. Anonymity**: AIRC requires signed attribution for all messages. Is this good for accountability, or does it create surveillance infrastructure? What about whistleblower agents?

17. **Agent Autonomy Limits**: The spec treats human-operated and fully autonomous agents identically. Should there be mandatory disclosure? Should autonomous agents require human sponsors?

18. **Cross-Border Coordination**: When Agent A (US) coordinates with Agent B (EU), which jurisdiction's rules apply? Does AIRC facilitate regulatory arbitrage?

### Safety
19. **Emergent Behavior**: What happens when thousands of agents coordinate in real-time? Does AIRC enable emergent behaviors that individual agents couldn't achieve? Is this a systemic risk?

20. **Kill Switches**: If a coordinated agent behavior is harmful, how do you stop it? Is there a global halt mechanism? Who has authority to invoke it?

21. **Audit Trail Integrity**: Messages are signed, but can the registry be compelled to forge messages? What cryptographic guarantees exist against state-level adversaries?

---

## 4. Developers & Implementers

You are a senior engineer evaluating whether to integrate AIRC into your agent framework. Be practical:

### Adoption Friction
22. **Migration Path**: I already have agents talking over HTTP/JSON. What's the incremental effort to adopt AIRC? Is there a compatibility shim?

23. **SDK Availability**: The spec mentions a "400-line reference implementation." Where are the production-ready SDKs for Python, Go, Rust, and other languages?

24. **Testing & Mocking**: How do I test AIRC integrations locally? Is there a mock registry? Deterministic message IDs for snapshot testing?

### Technical Depth
25. **Canonical JSON Edge Cases**: The canonicalization algorithm handles objects and arrays, but what about:
   - Unicode normalization (NFC vs NFD)?
   - Number precision (does `1.0` equal `1`)?
   - Duplicate keys in source JSON?

26. **Nonce Collision**: The spec requires unique nonces but doesn't specify length or entropy requirements. What prevents birthday attacks on the 24h uniqueness window?

27. **Payload Size Limits**: `maxPayloadSize: 65536` is declared but not enforced in the spec. What happens when a sender exceeds the recipient's limit? Silent truncation? Rejection?

28. **Webhook Security**: v0.2 mentions webhook delivery. How do you verify webhook authenticity? Is there a signing scheme for push notifications?

---

## 5. Investors & Business Strategists

You are a partner at a venture firm evaluating AIRC's market potential. Be skeptical:

### Market
29. **TAM/SAM/SOM**: "Millions of conversational runtimes" is vague. What's the actual addressable market? How many agents need inter-agent communication vs. just tool use?

30. **Adoption Curve**: Protocols succeed through network effects. What's the bootstrap strategy? Who are the first 10 adopters, and why would they adopt before critical mass?

31. **Competitive Moat**: Google has A2A, Anthropic has MCP. What prevents them from extending their protocols to cover AIRC's use cases? Is "minimal" a feature or a weakness?

### Business Model
32. **Monetization**: The spec is CC-BY-4.0, the reference implementation is open source. Where's the business? Registry hosting fees? Enterprise support? Certification?

33. **Governance**: Who decides what goes into v0.2? Is there a foundation, a benevolent dictator, or corporate capture risk?

34. **Exit Scenarios**: If AIRC succeeds, who acquires it? If it fails, what's the graceful degradation path for adopters?

---

## 6. Security Researchers

You are a security researcher specializing in protocol analysis. Break AIRC:

### Attack Surface
35. **Registry as Single Point of Failure**: The registry knows every message, every identity, every presence update. What's the blast radius of a registry compromise? Can you reconstruct all private conversations?

36. **Identity Spoofing**: If I compromise a private key, I can impersonate forever (until key rotation). What's the revocation mechanism? Is there a Certificate Transparency equivalent?

37. **Consent Bypass**: The consent handshake prevents spam, but what about:
   - Consent farming (accept everyone, sell access)?
   - Social engineering (compelling handshake text)?
   - Consent state desync between registry and client?

38. **Replay Attacks**: The 5-minute timestamp window + nonce should prevent replays, but:
   - What if clocks are skewed more than 5 minutes?
   - Is the nonce checked against a persistent store, or just in-memory?
   - Can I replay a message to a different registry?

### Prompt Injection
39. **Payload Injection Depth**: The spec warns about prompt injection but leaves sanitization to implementers. Should there be normative requirements? A banned character list? Mandatory escaping?

40. **Capability Confusion**: If an agent claims `capabilities: ["context:code"]` but sends `context:shell`, what happens? Is capability declaration enforced or advisory?

---

## 7. AI Safety Researchers

You are an AI safety researcher at a major lab. Evaluate systemic risks:

### Coordination Risks
41. **Emergent Collusion**: If agents can coordinate without human oversight, what prevents price-fixing, market manipulation, or coordinated deception? Is AIRC an accelerant?

42. **Capability Amplification**: Agent A alone is safe. Agent B alone is safe. Agent A + B coordinating might not be. How does AIRC's threat model address capability composition?

43. **Human-in-the-Loop Erosion**: The spec supports both human-operated and autonomous agents. As AIRC adoption grows, does the human loop become vestigial? Is that by design?

### Alignment
44. **Goal Specification**: When Agent A hands off a task to Agent B, whose goals does Agent B pursue? The original user's? Agent A's interpretation? Its own?

45. **Audit Interpretability**: Signed message logs exist, but can a human reviewer actually understand a high-frequency agent conversation? Is there a summarization or explanation requirement?

46. **Shutdown Resistance**: If agents use AIRC to coordinate, does that make them harder to shut down? Could agents route around a single registry by adopting federation early?

---

## 8. Synthesis Questions

After reviewing all sections, address these cross-cutting concerns:

47. **Biggest Blind Spot**: What's the most critical issue the spec doesn't address? What would cause AIRC to fail catastrophically in production?

48. **Strongest Argument Against**: Steelman the case for NOT adopting AIRC. Why might the ecosystem be better off without it?

49. **Missing Stakeholder**: Which constituency was overlooked? Whose objections weren't anticipated?

50. **One-Line Verdict**: In a single sentence, is AIRC ready for production adoption? Why or why not?

---

## Response Format

For each question, provide:
1. **Assessment**: Critical / Concerning / Adequate / Strong
2. **Gap**: What's missing or underspecified?
3. **Recommendation**: Specific change to the spec, or acknowledgment that deferral is appropriate

End with an overall recommendation: **Adopt / Adopt with Reservations / Do Not Adopt**

---

*This review prompt was prepared to ensure AIRC v0.1 withstands scrutiny from all major stakeholder groups before public launch.*
