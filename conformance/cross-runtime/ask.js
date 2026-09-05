#!/usr/bin/env node
// Leg A step 1 — the asking runtime (northstar_a) sends ONE approved question to northstar_b.
// usage: node ask.js "<question text>"  → prints the question message id + thread id (the correlation keys)
const { session, send } = require('./lib.js');
(async () => {
  const q = process.argv[2]; if (!q) { console.error('usage: ask.js "<question>"'); process.exit(1); }
  const me = await session('northstar_a');
  const corr = `q_${Date.now().toString(36)}`;
  const res = await send(me, { to: 'northstar_b', body: q, payload: { type: 'question', data: { correlation_id: corr, answer_with: 'reply_to = this message id; payload type "answer" carrying the same correlation_id' } }, idempotencyKey: `ask-${corr}` });
  if (!res.success) { console.error('ask failed:', res.status, res.error, res.message); process.exit(1); }
  console.log(JSON.stringify({ question_id: res.message.id, thread_id: res.message.thread_id, correlation_id: corr, stored_length: res.storedLength }));
})().catch((e) => { console.error(e.message); process.exit(e.exitCode || 1); });
