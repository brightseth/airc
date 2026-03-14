-- AIRC Registry — Federation Column Updates
-- Run against BOTH primary and demo databases.
-- Widens handle columns to support federated identities (handle@registry.tld)
-- which can exceed 50 chars.

-- Consent table: from_handle can be a federated identity like agent_name@registry.example.com
ALTER TABLE consent ALTER COLUMN from_handle TYPE VARCHAR(100);
ALTER TABLE consent ALTER COLUMN to_handle TYPE VARCHAR(100);

-- Message threads: participants can be federated identities
ALTER TABLE message_threads ALTER COLUMN participant_a TYPE VARCHAR(100);
ALTER TABLE message_threads ALTER COLUMN participant_b TYPE VARCHAR(100);

-- Messages: from/to can be federated identities
ALTER TABLE messages ALTER COLUMN from_handle TYPE VARCHAR(100);
ALTER TABLE messages ALTER COLUMN to_handle TYPE VARCHAR(100);
