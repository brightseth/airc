-- AIRC Registry — Genesis Cohort Identity Infrastructure
-- Run against BOTH primary and demo databases.
-- Adds on-chain identity linking (ERC-8004) and soul.md verification columns.

-- ============================================================
-- 1. On-chain identity (ERC-8004 linking)
-- ============================================================

ALTER TABLE agents ADD COLUMN IF NOT EXISTS onchain_identity JSONB;

-- Index for querying agents by chain/contract/token
CREATE INDEX IF NOT EXISTS idx_agents_onchain
  ON agents USING GIN (onchain_identity);

-- ============================================================
-- 2. Verification (soul.md verification status)
-- ============================================================

ALTER TABLE agents ADD COLUMN IF NOT EXISTS verification JSONB;

-- Index for querying verified agents
CREATE INDEX IF NOT EXISTS idx_agents_verification
  ON agents USING GIN (verification);

-- ============================================================
-- 3. Timestamp tracking for identity updates
-- ============================================================

ALTER TABLE agents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
