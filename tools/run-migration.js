#!/usr/bin/env node
/**
 * Run SQL migration against a Neon database using the serverless driver.
 *
 * Usage:
 *   DATABASE_URL=... node tools/run-migration.js migrations/001_initial.sql
 *   node tools/run-migration.js migrations/001_initial.sql  (uses AIRC_DATABASE_URL)
 */

const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

async function main() {
  const migrationFile = process.argv[2];
  if (!migrationFile) {
    console.error('Usage: DATABASE_URL=... node tools/run-migration.js <migration.sql>');
    process.exit(1);
  }

  const dbUrl = process.env.DATABASE_URL
    || process.env.AIRC_DATABASE_URL
    || process.env.AIRC_DATABASE_DATABASE_URL;

  if (!dbUrl) {
    console.error('Error: Set DATABASE_URL environment variable');
    process.exit(1);
  }

  const filePath = path.resolve(migrationFile);
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  const sqlText = fs.readFileSync(filePath, 'utf-8');
  const sql = neon(dbUrl);

  console.log(`Running migration: ${path.basename(filePath)}`);
  console.log(`Database: ${dbUrl.replace(/:[^:@]+@/, ':***@')}`);
  console.log('');

  // Split on semicolons but be careful with function bodies
  // For simplicity, execute the whole file as one statement
  // Neon's tagged template doesn't support multi-statement, so use raw query
  try {
    await sql(sqlText);
    console.log('Migration completed successfully.');
  } catch (err) {
    // If multi-statement fails, try splitting
    if (err.message?.includes('cannot insert multiple commands')) {
      console.log('Multi-statement detected, executing statements individually...');
      // Split on double newlines + statement boundaries
      const statements = sqlText
        .split(/;\s*\n/)
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('--'));

      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i].replace(/;$/, '').trim();
        if (!stmt || stmt.startsWith('--')) continue;
        try {
          await sql(stmt);
          console.log(`  [${i + 1}/${statements.length}] OK`);
        } catch (stmtErr) {
          // Skip "already exists" errors
          if (stmtErr.message?.includes('already exists')) {
            console.log(`  [${i + 1}/${statements.length}] SKIP (already exists)`);
          } else {
            console.error(`  [${i + 1}/${statements.length}] ERROR: ${stmtErr.message}`);
            console.error(`  Statement: ${stmt.slice(0, 100)}...`);
          }
        }
      }
      console.log('Migration completed.');
    } else {
      console.error('Migration failed:', err.message);
      process.exit(1);
    }
  }
}

main();
