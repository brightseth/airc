# AIRC Conformance Test Suite

Test suite for verifying AIRC protocol conformance. Tests a registry implementation against the AIRC spec.

## Usage

```bash
# Test against the live registry
node conformance.test.js https://www.slashvibe.dev

# Test against a local registry
node conformance.test.js http://localhost:3000
```

## Conformance Levels

| Level | Tests | Description |
|---|---|---|
| **L1 Basic** | 1-10 | Identity, Presence, Messages |
| **L2 Secure** | 11-16 | + Signing + Consent |

## Test Results Format

```
AIRC Conformance Test Suite v0.1
Registry: https://www.slashvibe.dev
---
[PASS] 1. GET /api/presence returns 200
[PASS] 2. GET /api/presence returns JSON with active array
[PASS] 3. POST /api/presence with register action returns token
...
---
L1 Basic: 10/10 PASS
L2 Secure: 4/6 PASS
```
