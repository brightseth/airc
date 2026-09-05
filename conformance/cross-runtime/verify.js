#!/usr/bin/env node
// Leg A step 3 — the asking runtime verifies the loop from the thread alone.
// usage: node verify.js <question_id> <correlation_id>
const { session, thread } = require('./lib.js');
const replyId = (m) => (m.reply_to && typeof m.reply_to === 'object' ? m.reply_to.id : m.reply_to) || m.replyTo || null;
(async () => {
  const [qid, corr] = process.argv.slice(2);
  const me = await session('northstar_a');
  const msgs = await thread(me, 'northstar_b');
  const q = msgs.find((m) => m.id === qid);
  const answers = msgs.filter((m) => m.from === 'northstar_b' && (m.payload || {}).type === 'answer' && ((m.payload || {}).data || {}).correlation_id === corr);
  const out = {
    question_found: !!q,
    answers: answers.map((a) => ({ id: a.id, reply_to: replyId(a), body: (a.body || '').slice(0, 160) })),
    exactly_one_answer: answers.length === 1,
    correlated: answers.length >= 1 && answers.every((a) => replyId(a) === qid),   // GET returns reply_to as {id, from, text} and carries no thread_id
    dedup_held: answers.length === 1,
    self_conversation: msgs.some((m) => m.from === 'northstar_b' && (m.payload || {}).type === 'answer' && (((m.payload || {}).data || {}).correlation_id !== corr)),
  };
  console.log(JSON.stringify(out, null, 1));
  process.exit(out.question_found && out.correlated && !out.self_conversation ? (out.dedup_held ? 0 : 3) : 1);   // exit 3 = loop correct, dedup failed
})().catch((e) => { console.error(e.message); process.exit(e.exitCode || 1); });
