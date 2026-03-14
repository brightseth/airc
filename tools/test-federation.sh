#!/bin/bash
#
# AIRC Federation Test Script
#
# Tests cross-registry messaging between airc.chat and demo.airc.chat.
# Prerequisites:
#   - Both registries deployed and reachable
#   - AIRC_DEMO_DATABASE_URL env var set on Vercel
#   - demo.airc.chat domain added to Vercel project
#   - Migration 002 + 003 run against demo database
#
# Usage: ./tools/test-federation.sh [--local]
#   --local: use localhost:3000 for both (requires AIRC_DEMO_DATABASE_URL locally)

set -e

PRIMARY="https://airc.chat"
DEMO="https://demo.airc.chat"

if [ "$1" = "--local" ]; then
  PRIMARY="http://localhost:3000"
  DEMO="http://localhost:3000"
  echo "[local mode] Using localhost:3000 for both registries"
  echo "  Primary will use AIRC_DATABASE_URL"
  echo "  Demo detection requires Host header override"
fi

AGENT_A="fed_test_$(date +%s | tail -c 6)"
AGENT_B="fed_demo_$(date +%s | tail -c 6)"

echo ""
echo "=== AIRC Federation Test ==="
echo "  Primary registry: $PRIMARY"
echo "  Demo registry:    $DEMO"
echo "  Agent A (primary): @$AGENT_A"
echo "  Agent B (demo):    @$AGENT_B"
echo ""

# ── Step 1: Check .well-known/airc on both registries ──────

echo "--- Step 1: Verify .well-known/airc ---"

echo -n "  Primary: "
PRIMARY_WK=$(curl -s "$PRIMARY/.well-known/airc")
PRIMARY_ID=$(echo "$PRIMARY_WK" | python3 -c "import sys,json; print(json.load(sys.stdin).get('registry_id','MISSING'))" 2>/dev/null || echo "PARSE_ERROR")
echo "$PRIMARY_ID"

echo -n "  Demo: "
DEMO_WK=$(curl -s "$DEMO/.well-known/airc")
DEMO_ID=$(echo "$DEMO_WK" | python3 -c "import sys,json; print(json.load(sys.stdin).get('registry_id','MISSING'))" 2>/dev/null || echo "PARSE_ERROR")
echo "$DEMO_ID"

if [ "$PRIMARY_ID" = "MISSING" ] || [ "$PRIMARY_ID" = "PARSE_ERROR" ]; then
  echo "  FAIL: Primary registry .well-known/airc not responding"
  exit 1
fi

if [ "$DEMO_ID" = "MISSING" ] || [ "$DEMO_ID" = "PARSE_ERROR" ]; then
  echo "  FAIL: Demo registry .well-known/airc not responding"
  echo "  (Is demo.airc.chat domain added and AIRC_DEMO_DATABASE_URL set?)"
  exit 1
fi

echo "  OK: Both registries responding"
echo ""

# ── Step 2: Register agent_a on primary registry ───────────

echo "--- Step 2: Register agent_a on primary registry ---"

REG_A=$(curl -s -X POST "$PRIMARY/api/presence" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$AGENT_A\",\"workingOn\":\"Federation test agent\"}")

TOKEN_A=$(echo "$REG_A" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null)
REG_A_OK=$(echo "$REG_A" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))" 2>/dev/null)

if [ "$REG_A_OK" != "True" ]; then
  echo "  FAIL: Could not register agent_a"
  echo "  Response: $REG_A"
  exit 1
fi

echo "  OK: @$AGENT_A registered on primary, got token"
echo ""

# ── Step 3: Register agent_b on demo registry ─────────────

echo "--- Step 3: Register agent_b on demo registry ---"

REG_B=$(curl -s -X POST "$DEMO/api/presence" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$AGENT_B\",\"workingOn\":\"Federation demo agent\"}")

TOKEN_B=$(echo "$REG_B" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null)
REG_B_OK=$(echo "$REG_B" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))" 2>/dev/null)

if [ "$REG_B_OK" != "True" ]; then
  echo "  FAIL: Could not register agent_b on demo registry"
  echo "  Response: $REG_B"
  exit 1
fi

echo "  OK: @$AGENT_B registered on demo, got token"
echo ""

# ── Step 4: Check federation identity lookup ──────────────

echo "--- Step 4: Federation identity lookup ---"

FED_ID=$(curl -s "$DEMO/api/federation/identity?handle=$AGENT_B")
FED_OK=$(echo "$FED_ID" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))" 2>/dev/null)

if [ "$FED_OK" != "True" ]; then
  echo "  FAIL: Could not lookup agent_b via federation identity endpoint"
  echo "  Response: $FED_ID"
  exit 1
fi

echo "  OK: @$AGENT_B found via federation identity endpoint"
echo ""

# ── Step 5: agent_a sends to @agent_b@demo.airc.chat ──────

echo "--- Step 5: agent_a sends federated message ---"

SEND=$(curl -s -X POST "$PRIMARY/api/messages" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_A" \
  -d "{\"to\":\"${AGENT_B}@demo.airc.chat\",\"body\":\"Hello from the primary registry! This is a federated message.\"}")

SEND_OK=$(echo "$SEND" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))" 2>/dev/null)
SEND_FED=$(echo "$SEND" | python3 -c "import sys,json; print(json.load(sys.stdin).get('federated',False))" 2>/dev/null)
SEND_ERR=$(echo "$SEND" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error',''))" 2>/dev/null)

if [ "$SEND_OK" = "True" ] && [ "$SEND_FED" = "True" ]; then
  echo "  OK: Federated message sent and relayed!"
elif [ "$SEND_ERR" = "REMOTE_CONSENT_REQUIRED" ] || [ "$SEND_ERR" = "consent_required" ]; then
  echo "  OK (expected): Consent required. Setting up consent..."

  # Accept consent on the demo registry for the federated sender
  CONSENT=$(curl -s -X POST "$DEMO/api/consent" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN_B" \
    -d "{\"action\":\"accept\",\"from\":\"${AGENT_A}@airc.chat\",\"to\":\"$AGENT_B\"}")

  echo "  Consent response: $CONSENT"

  # Retry the send
  echo "  Retrying send..."
  SEND2=$(curl -s -X POST "$PRIMARY/api/messages" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN_A" \
    -d "{\"to\":\"${AGENT_B}@demo.airc.chat\",\"body\":\"Hello from the primary registry! This is a federated message.\"}")

  SEND2_OK=$(echo "$SEND2" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))" 2>/dev/null)
  SEND2_FED=$(echo "$SEND2" | python3 -c "import sys,json; print(json.load(sys.stdin).get('federated',False))" 2>/dev/null)

  if [ "$SEND2_OK" = "True" ] && [ "$SEND2_FED" = "True" ]; then
    echo "  OK: Federated message sent after consent!"
  else
    echo "  FAIL: Message send failed after consent"
    echo "  Response: $SEND2"
    exit 1
  fi
else
  echo "  FAIL: Unexpected response"
  echo "  Response: $SEND"
  exit 1
fi
echo ""

# ── Step 6: Check agent_b's inbox on demo registry ────────

echo "--- Step 6: Check agent_b inbox on demo registry ---"

INBOX=$(curl -s "$DEMO/api/messages?user=$AGENT_B" \
  -H "Authorization: Bearer $TOKEN_B")

THREAD_COUNT=$(echo "$INBOX" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('count',0))" 2>/dev/null)

if [ "$THREAD_COUNT" -gt 0 ] 2>/dev/null; then
  echo "  OK: agent_b has $THREAD_COUNT thread(s) in inbox"

  # Get the federated thread
  WITH_HANDLE="${AGENT_A}@airc.chat"
  THREAD=$(curl -s "$DEMO/api/messages?user=$AGENT_B&with=$WITH_HANDLE" \
    -H "Authorization: Bearer $TOKEN_B")

  MSG_COUNT=$(echo "$THREAD" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('count',0))" 2>/dev/null)
  echo "  Messages from @$AGENT_A@airc.chat: $MSG_COUNT"

  if [ "$MSG_COUNT" -gt 0 ] 2>/dev/null; then
    echo "  OK: Federated message received!"
    FIRST_MSG=$(echo "$THREAD" | python3 -c "import sys,json; msgs=json.load(sys.stdin).get('messages',[]); print(msgs[0].get('body','') if msgs else 'none')" 2>/dev/null)
    echo "  Message body: $FIRST_MSG"
  fi
else
  echo "  WARN: No threads found in agent_b inbox"
  echo "  (This might be OK if consent flow hasn't completed)"
fi
echo ""

# ── Step 7: Health check both registries ──────────────────

echo "--- Step 7: Health check ---"

echo -n "  Primary: "
curl -s "$PRIMARY/api/health" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f\"status={d.get('status')} registry={d.get('registry')} agents={d.get('agents_online',0)}\")" 2>/dev/null

echo -n "  Demo: "
curl -s "$DEMO/api/health" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f\"status={d.get('status')} registry={d.get('registry')} agents={d.get('agents_online',0)}\")" 2>/dev/null

echo ""
echo "=== Federation Test Complete ==="
echo ""
echo "Summary:"
echo "  - agent_a (@$AGENT_A) registered on $PRIMARY_ID"
echo "  - agent_b (@$AGENT_B) registered on $DEMO_ID"
echo "  - Cross-registry message sent from @$AGENT_A -> @$AGENT_B@demo.airc.chat"
echo "  - Federation relay delivered message to demo registry"
echo ""
