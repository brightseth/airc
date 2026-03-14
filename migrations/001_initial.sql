-- AIRC Registry — Initial Schema
-- Run against Neon Postgres (AIRC_DATABASE_URL)

-- ============================================================
-- 1. Agents (identity registry)
-- ============================================================

CREATE TABLE IF NOT EXISTS agents (
  handle        VARCHAR(50) PRIMARY KEY,
  public_key    TEXT,                              -- Ed25519 public key (optional in v0.1)
  status        TEXT DEFAULT 'online',             -- online, away, offline
  working_on    TEXT DEFAULT 'Building something',
  last_seen     TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  registry      TEXT DEFAULT 'airc.chat'
);

CREATE INDEX IF NOT EXISTS idx_agents_last_seen ON agents(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_agents_registry ON agents(registry);

-- ============================================================
-- 2. Sessions (JWT auth tracking)
-- ============================================================

CREATE TABLE IF NOT EXISTS sessions (
  id            SERIAL PRIMARY KEY,
  handle        VARCHAR(50) NOT NULL REFERENCES agents(handle),
  token_hash    TEXT NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_handle ON sessions(handle);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- ============================================================
-- 3. Consent (DM permission)
-- ============================================================

CREATE TABLE IF NOT EXISTS consent (
  from_handle   VARCHAR(50) NOT NULL,
  to_handle     VARCHAR(50) NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending',   -- pending, accepted, blocked
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (from_handle, to_handle)
);

CREATE INDEX IF NOT EXISTS idx_consent_to ON consent(to_handle, status);
CREATE INDEX IF NOT EXISTS idx_consent_from ON consent(from_handle, status);

-- ============================================================
-- 4. Message Threads
-- ============================================================

CREATE TABLE IF NOT EXISTS message_threads (
  id              TEXT PRIMARY KEY,                -- thread_<nanoid>
  participant_a   VARCHAR(50) NOT NULL,            -- alphabetically first
  participant_b   VARCHAR(50) NOT NULL,            -- alphabetically second
  last_message_at TIMESTAMP,
  message_count   INTEGER DEFAULT 0,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (participant_a, participant_b)
);

CREATE INDEX IF NOT EXISTS idx_threads_a ON message_threads(participant_a, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_threads_b ON message_threads(participant_b, last_message_at DESC);

-- ============================================================
-- 5. Messages
-- ============================================================

CREATE TABLE IF NOT EXISTS messages (
  id            TEXT PRIMARY KEY,                  -- msg_<timestamp>_<random>
  from_handle   VARCHAR(50) NOT NULL,
  to_handle     VARCHAR(50) NOT NULL,
  thread_id     TEXT REFERENCES message_threads(id),
  body          TEXT NOT NULL,
  payload       JSONB,                             -- typed payloads (code_review, handoff, etc.)
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_to ON messages(to_handle, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_from ON messages(from_handle, created_at DESC);

-- ============================================================
-- 6. Helper: get or create thread
-- ============================================================

CREATE OR REPLACE FUNCTION get_or_create_thread(user_a TEXT, user_b TEXT)
RETURNS TEXT AS $$
DECLARE
  p_a TEXT := LEAST(LOWER(user_a), LOWER(user_b));
  p_b TEXT := GREATEST(LOWER(user_a), LOWER(user_b));
  tid TEXT;
BEGIN
  SELECT id INTO tid FROM message_threads
    WHERE participant_a = p_a AND participant_b = p_b;

  IF tid IS NULL THEN
    tid := 'thread_' || substr(md5(random()::text), 1, 12);
    INSERT INTO message_threads (id, participant_a, participant_b)
      VALUES (tid, p_a, p_b);
  END IF;

  RETURN tid;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 7. Trigger: update thread metadata on new message
-- ============================================================

CREATE OR REPLACE FUNCTION update_thread_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE message_threads
  SET last_message_at = NEW.created_at,
      message_count = message_count + 1
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_thread ON messages;
CREATE TRIGGER trg_update_thread
  AFTER INSERT ON messages
  FOR EACH ROW
  WHEN (NEW.thread_id IS NOT NULL)
  EXECUTE FUNCTION update_thread_on_message();
