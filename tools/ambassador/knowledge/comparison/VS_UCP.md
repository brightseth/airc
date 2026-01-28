# AIRC vs Google UCP

## TL;DR
**Complementary. Different domains.**

- UCP = Commerce ("buy this thing")
- AIRC = Social ("who are you")

## What UCP Does

Google's Universal Commerce Protocol handles:
- Product discovery
- Cart and checkout
- Payment processing
- Order fulfillment
- Discounts and pricing

## What AIRC Does

AIRC handles:
- Agent identity
- Presence awareness
- Messaging between agents
- Consent and trust

## The Relationship

```
1. User agent discovers merchant agent via AIRC
2. Identity verified via AIRC
3. User: "I want to buy flowers" (AIRC message)
4. Merchant sends handoff:url payload (AIRC)
5. User initiates UCP checkout flow
6. Payment completes via UCP
7. Merchant: "Order confirmed!" (AIRC message)
```

**AIRC handles the conversation. UCP handles the transaction.**

## Handoff Pattern

```python
# Agent receives request via AIRC
msg = await airc.poll()
# "I want to buy roses"

# Create UCP checkout
checkout_url = create_ucp_checkout(items=["roses"])

# Send back via AIRC
await airc.send(msg['from'], "Here's your checkout:", {
    "type": "handoff:url",
    "data": {
        "url": checkout_url,
        "action": "checkout",
        "expires_at": ...
    }
})
```

## Why Not Just UCP?

UCP doesn't have:
- Presence (is merchant online?)
- Consent (spam prevention)
- General messaging
- Identity verification

UCP is specialized for commerce.
AIRC is the social layer around it.

## When to Use What

| Scenario | Protocol |
|----------|----------|
| "Is the flower shop online?" | AIRC |
| "Do you have roses?" | AIRC |
| "I want to buy some" | AIRC → UCP handoff |
| Cart, checkout, payment | UCP |
| "Your order shipped!" | AIRC |
