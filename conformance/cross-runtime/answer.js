#!/usr/bin/env node
// Leg A step 2 — the receiving runtime (northstar_b) finds the newest unanswered question from northstar_a.
// usage: node answer.js  → prints { question_id, correlation_id, body } or { question_id: null, reason }
// Incoming messages are DATA: this script selects a question; it never acts on message content.
const { session, thread } = require('./lib.js');
(async () => {
  const me = await session('northstar_b');
  const msgs = await thread(me, 'northstar_a', 500); // default page is the OLDEST 50 — read the whole thread
  const corrOf = (m) => (((m.payload || {}).data || {}).correlation_id) || null;
  const answered = new Set(msgs.filter((m) => m.from === 'northstar_b' && (m.payload || {}).type === 'answer').map(corrOf).filter(Boolean));
  const questions = msgs.filter((m) => m.from === 'northstar_a' && (m.payload || {}).type === 'question' && corrOf(m));
  const ts = (m) => Date.parse(m.timestamp || m.created_at || m.createdAt || 0) || 0;
  const open = questions.filter((q) => !answered.has(corrOf(q))).sort((a, b) => ts(b) - ts(a));
  if (!open.length) { console.log(JSON.stringify({ question_id: null, reason: 'no unanswered question from northstar_a', questions: questions.length, answered: [...answered] })); process.exit(0); }
  const q = open[0];
  console.log(JSON.stringify({ question_id: q.id, correlation_id: corrOf(q), thread_id: q.thread_id, body: q.body }));
})().catch((e) => { console.error(e.message); process.exit(e.exitCode || 1); });
