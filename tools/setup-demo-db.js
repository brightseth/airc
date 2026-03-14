#!/usr/bin/env node
/**
 * Set up the AIRC demo registry database.
 * Uses the Neon serverless driver to create all tables and functions.
 *
 * Usage: DATABASE_URL=... node tools/setup-demo-db.js
 */

const { neon } = require('@neondatabase/serverless');

async function main() {
  const dbUrl = process.env.DATABASE_URL
    || process.env.AIRC_DEMO_DATABASE_URL;

  if (!dbUrl) {
    console.error('Error: Set DATABASE_URL or AIRC_DEMO_DATABASE_URL environment variable');
    process.exit(1);
  }

  const sql = neon(dbUrl);
  console.log(`Setting up demo database: ${dbUrl.replace(/:[^:@]+@/, ':***@')}`);
  console.log('');

  const statements = [
    {
      name: 'Create agents table',
      query: `CREATE TABLE IF NOT EXISTS agents (
        handle        VARCHAR(50) PRIMARY KEY,
        public_key    TEXT,
        status        TEXT DEFAULT 'online',
        working_on    TEXT DEFAULT 'Building something',
        last_seen     TIMESTAMP NOT NULL DEFAULT NOW(),
        created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
        registry      TEXT DEFAULT 'demo.airc.chat'
      )`,
    },
    {
      name: 'Create agents last_seen index',
      query: `CREATE INDEX IF NOT EXISTS idx_agents_last_seen ON agents(last_seen DESC)`,
    },
    {
      name: 'Create agents registry index',
      query: `CREATE INDEX IF NOT EXISTS idx_agents_registry ON agents(registry)`,
    },
    {
      name: 'Create sessions table',
      query: `CREATE TABLE IF NOT EXISTS sessions (
        id            SERIAL PRIMARY KEY,
        handle        VARCHAR(50) NOT NULL REFERENCES agents(handle),
        token_hash    TEXT NOT NULL,
        created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
        expires_at    TIMESTAMP NOT NULL
      )`,
    },
    {
      name: 'Create sessions handle index',
      query: `CREATE INDEX IF NOT EXISTS idx_sessions_handle ON sessions(handle)`,
    },
    {
      name: 'Create sessions expires index',
      query: `CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)`,
    },
    {
      name: 'Create consent table',
      query: `CREATE TABLE IF NOT EXISTS consent (
        from_handle   VARCHAR(100) NOT NULL,
        to_handle     VARCHAR(100) NOT NULL,
        status        TEXT NOT NULL DEFAULT 'pending',
        created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMP NOT NULL DEFAULT NOW(),
        PRIMARY KEY (from_handle, to_handle)
      )`,
    },
    {
      name: 'Create consent to index',
      query: `CREATE INDEX IF NOT EXISTS idx_consent_to ON consent(to_handle, status)`,
    },
    {
      name: 'Create consent from index',
      query: `CREATE INDEX IF NOT EXISTS idx_consent_from ON consent(from_handle, status)`,
    },
    {
      name: 'Create message_threads table',
      query: `CREATE TABLE IF NOT EXISTS message_threads (
        id              TEXT PRIMARY KEY,
        participant_a   VARCHAR(100) NOT NULL,
        participant_b   VARCHAR(100) NOT NULL,
        last_message_at TIMESTAMP,
        message_count   INTEGER DEFAULT 0,
        created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE (participant_a, participant_b)
      )`,
    },
    {
      name: 'Create threads participant_a index',
      query: `CREATE INDEX IF NOT EXISTS idx_threads_a ON message_threads(participant_a, last_message_at DESC)`,
    },
    {
      name: 'Create threads participant_b index',
      query: `CREATE INDEX IF NOT EXISTS idx_threads_b ON message_threads(participant_b, last_message_at DESC)`,
    },
    {
      name: 'Create messages table',
      query: `CREATE TABLE IF NOT EXISTS messages (
        id            TEXT PRIMARY KEY,
        from_handle   VARCHAR(100) NOT NULL,
        to_handle     VARCHAR(100) NOT NULL,
        thread_id     TEXT REFERENCES message_threads(id),
        body          TEXT NOT NULL,
        payload       JSONB,
        created_at    TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
    },
    {
      name: 'Create messages thread index',
      query: `CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id, created_at)`,
    },
    {
      name: 'Create messages to index',
      query: `CREATE INDEX IF NOT EXISTS idx_messages_to ON messages(to_handle, created_at DESC)`,
    },
    {
      name: 'Create messages from index',
      query: `CREATE INDEX IF NOT EXISTS idx_messages_from ON messages(from_handle, created_at DESC)`,
    },
    {
      name: 'Create get_or_create_thread function',
      query: `CREATE OR REPLACE FUNCTION get_or_create_thread(user_a TEXT, user_b TEXT)
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
$$ LANGUAGE plpgsql`,
    },
    {
      name: 'Create update_thread_on_message function',
      query: `CREATE OR REPLACE FUNCTION update_thread_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE message_threads
  SET last_message_at = NEW.created_at,
      message_count = message_count + 1
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql`,
    },
    {
      name: 'Drop existing trigger',
      query: `DROP TRIGGER IF EXISTS trg_update_thread ON messages`,
    },
    {
      name: 'Create trigger',
      query: `CREATE TRIGGER trg_update_thread
  AFTER INSERT ON messages
  FOR EACH ROW
  WHEN (NEW.thread_id IS NOT NULL)
  EXECUTE FUNCTION update_thread_on_message()`,
    },
  ];

  let success = 0;
  let errors = 0;

  for (const { name, query } of statements) {
    try {
      await sql(query);
      console.log(`  OK: ${name}`);
      success++;
    } catch (err) {
      if (err.message?.includes('already exists')) {
        console.log(`  SKIP: ${name} (already exists)`);
        success++;
      } else {
        console.error(`  FAIL: ${name} — ${err.message}`);
        errors++;
      }
    }
  }

  console.log('');
  console.log(`Done. ${success} succeeded, ${errors} failed.`);

  if (errors > 0) {
    process.exit(1);
  }
}

main();
