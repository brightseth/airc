#!/usr/bin/env node
/**
 * AIRC partner-runtime leg — consumes Platform's pinned action-lifecycle corpus (#368,
 * contracts/action-lifecycle/v0.1.json) and runs the partner-leg cases against dedicated
 * principals. See conformance/PARTNER-LEG.md.
 *
 * Corpus source (one of):
 *   PARTNER_VECTORS_PATH=<local file>   — offline loading (pinned copy fetched separately)
 *   PARTNER_VECTORS_URL=<https url>     — online loading
 * plus PARTNER_VECTORS_SHA256=<pin>. Selection: vectors whose `legs` includes "partner".
 *
 * Exit 2 = not runnable (corpus/pin/principals missing, or executor not yet bound) — distinct
 * from exit 1 = a case failed. The executor is NOT implemented yet; this leg proves loading.
 *
 * Env for execution (later): NORTHSTAR_A_MINT (operator), NORTHSTAR_P_MINT (partner principal)
 */
const crypto = require('crypto');
const fs = require('fs');

const REGISTRY = (process.argv[2] || 'https://www.slashvibe.dev').replace(/\/$/, '');
const { PARTNER_VECTORS_PATH, PARTNER_VECTORS_URL, PARTNER_VECTORS_SHA256, NORTHSTAR_A_MINT, NORTHSTAR_P_MINT } = process.env;

async function loadCorpusText() {
  if (PARTNER_VECTORS_PATH) return fs.readFileSync(PARTNER_VECTORS_PATH, 'utf8');
  if (PARTNER_VECTORS_URL) return (await fetch(PARTNER_VECTORS_URL)).text();
  return null;
}

function validate(corpus) {
  const problems = [];
  if (corpus.contract !== 'action-lifecycle') problems.push(`contract=${corpus.contract}`);
  if (!/^0\.1\.\d+$/.test(String(corpus.version))) problems.push(`version=${corpus.version}`);
  if (!Array.isArray(corpus.vectors)) problems.push('vectors missing');
  for (const v of corpus.vectors || []) {
    if (!/^AL-\d{3}$/.test(v.id)) problems.push(`${v.id}: bad id`);
    if (!Array.isArray(v.legs) || !v.legs.every((l) => ['partner', 'body', 'ui'].includes(l))) problems.push(`${v.id}: bad legs`);
    if (typeof v.given !== 'string' || typeof v.when !== 'string' || typeof v.then !== 'object') problems.push(`${v.id}: bad shape`);
  }
  return problems;
}

async function main() {
  console.log(`\nAIRC partner-runtime leg\nregistry: ${REGISTRY}\n`);
  const text = await loadCorpusText();
  if (!text || !PARTNER_VECTORS_SHA256) {
    console.error('not runnable: set PARTNER_VECTORS_PATH or PARTNER_VECTORS_URL, and PARTNER_VECTORS_SHA256 (Platform #368 corpus pin).');
    process.exit(2);
  }
  const sha = crypto.createHash('sha256').update(text).digest('hex');
  if (sha !== PARTNER_VECTORS_SHA256) {
    console.error(`corpus sha256 mismatch: got ${sha}\n                        pinned ${PARTNER_VECTORS_SHA256}`);
    process.exit(2);
  }
  const corpus = JSON.parse(text);
  const problems = validate(corpus);
  if (problems.length) { console.error('corpus failed shape validation:\n  ' + problems.join('\n  ')); process.exit(2); }

  const partner = corpus.vectors.filter((v) => v.legs.includes('partner'));
  console.log(`corpus ${corpus.contract} v${corpus.version} (owner ${corpus.owner}, canon ${corpus.canon_sha || 'n/a'}) — sha256 pinned ✓`);
  console.log(`${corpus.vectors.length} vectors, ${partner.length} on the partner leg:`);
  for (const v of partner) console.log(`  ${v.id}  ${v.name}  [${v.legs.join(',')}]`);

  if (!NORTHSTAR_A_MINT || !NORTHSTAR_P_MINT) {
    console.error('\nnot runnable: dedicated principals unprovisioned (NORTHSTAR_A_MINT / NORTHSTAR_P_MINT). Loading demonstrated; executor unimplemented.');
    process.exit(2);
  }
  console.error('\nnot runnable: executor not yet bound to the corpus `then` schema. Loading demonstrated.');
  process.exit(2);
}

main().catch((e) => { console.error(`leg error: ${e.message}`); process.exit(1); });
