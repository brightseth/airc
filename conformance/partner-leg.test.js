#!/usr/bin/env node
/**
 * AIRC partner-runtime leg — consumes Platform's pinned lifecycle corpus (#368) and runs the
 * partner-side cases against dedicated principals. See conformance/PARTNER-LEG.md.
 *
 * Exit 2 = not runnable (corpus or principals missing) — distinct from exit 1 = a case failed.
 *
 * Env: PARTNER_VECTORS_URL, PARTNER_VECTORS_SHA256 (pin), NORTHSTAR_A_MINT, NORTHSTAR_P_MINT
 */
const crypto = require('crypto');

const REGISTRY = (process.argv[2] || 'https://www.slashvibe.dev').replace(/\/$/, '');
const { PARTNER_VECTORS_URL, PARTNER_VECTORS_SHA256, NORTHSTAR_A_MINT, NORTHSTAR_P_MINT } = process.env;

const PARTNER_CASES = [
  'decline', 'cancel_before_ack', 'cancel_after_accept_delayed_admission', 'expiry',
  'restart_before_side_effect', 'restart_after_side_effect', 'duplicate_invite_ack',
  'wrong_recipient', 'receipt_echo', 'model_replacement', 'input_after_revocation',
];

async function loadCorpus() {
  if (!PARTNER_VECTORS_URL || !PARTNER_VECTORS_SHA256) return null;
  const res = await fetch(PARTNER_VECTORS_URL);
  const text = await res.text();
  const sha = crypto.createHash('sha256').update(text).digest('hex');
  if (sha !== PARTNER_VECTORS_SHA256) {
    console.error(`corpus sha256 mismatch: got ${sha}, pinned ${PARTNER_VECTORS_SHA256}`);
    process.exit(2);
  }
  return JSON.parse(text);
}

async function main() {
  console.log(`\nAIRC partner-runtime leg\nregistry: ${REGISTRY}\n`);
  const corpus = await loadCorpus();
  if (!corpus) {
    console.error('not runnable: PARTNER_VECTORS_URL / PARTNER_VECTORS_SHA256 unset — Platform has not published the pinned corpus yet (#368).');
    process.exit(2);
  }
  if (!NORTHSTAR_A_MINT || !NORTHSTAR_P_MINT) {
    console.error('not runnable: dedicated principals unprovisioned (NORTHSTAR_A_MINT / NORTHSTAR_P_MINT).');
    process.exit(2);
  }
  const cases = (corpus.vectors || []).filter((v) => PARTNER_CASES.includes(v.case_id));
  if (cases.length === 0) {
    console.error('not runnable: corpus contains none of the partner cases by name.');
    process.exit(2);
  }
  // Execution of each case is written against the corpus's assertion schema once it exists;
  // until then this leg reports its own readiness honestly rather than a fake pass.
  console.error(`corpus loaded (${cases.length} partner cases) — executor not yet bound to the corpus schema; exit 2.`);
  process.exit(2);
}

main().catch((e) => { console.error(`leg error: ${e.message}`); process.exit(1); });
