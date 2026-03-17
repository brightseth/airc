#!/usr/bin/env node

// AIRC Protocol Conformance Test Suite
// CLI equivalent of the ARCHIE browser validator (validate.html)
// Zero dependencies — requires Node.js 18+ (built-in fetch)
//
// Usage:
//   node conformance.js [registry-url]
//   node conformance.js https://www.airc.chat
//   node conformance.js https://demo.airc.chat

'use strict';

const DEFAULT_REGISTRY = 'https://www.airc.chat';

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

async function timedFetch(url, options) {
  const start = performance.now();
  try {
    const res = await fetch(url, options || {});
    const elapsed = Math.round(performance.now() - start);
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { _raw: text.substring(0, 500) };
    }
    return { data, time: elapsed, status: res.status };
  } catch (err) {
    const elapsed = Math.round(performance.now() - start);
    return { data: null, time: elapsed, status: 0, error: err.message };
  }
}

function checkField(data, field, expectedType) {
  if (!data || data[field] === undefined) {
    return { field, pass: false, detail: 'Missing field: ' + field };
  }
  if (expectedType === 'array' && !Array.isArray(data[field])) {
    return { field, pass: false, detail: field + ' is not an array' };
  }
  const val = data[field];
  const display = typeof val === 'object'
    ? JSON.stringify(val).substring(0, 60)
    : String(val);
  return { field, pass: true, detail: field + ' = ' + display };
}

// ---------------------------------------------------------------------------
// Test Definitions (mirrors validate.html exactly)
// ---------------------------------------------------------------------------

const TESTS = [
  {
    id: 'well-known',
    name: 'Well-Known Discovery',
    desc: 'GET /.well-known/airc',
    run: async function (baseUrl) {
      const res = await timedFetch(baseUrl + '/.well-known/airc');
      const data = res.data;
      const checks = [];

      checks.push(checkField(data, 'protocol_version'));
      checks.push(checkField(data, 'registry_url'));
      checks.push(checkField(data, 'capabilities'));

      const allPass = checks.every(c => c.pass);
      return { status: allPass ? 'pass' : 'fail', time: res.time, checks };
    }
  },
  {
    id: 'health',
    name: 'Health Endpoint',
    desc: 'GET /api/health',
    run: async function (baseUrl) {
      const res = await timedFetch(baseUrl + '/api/health');
      const data = res.data;
      const checks = [];

      checks.push(checkField(data, 'status'));
      checks.push(checkField(data, 'protocol_version'));
      checks.push(checkField(data, 'agents_online'));

      const allPass = checks.every(c => c.pass);
      return { status: allPass ? 'pass' : 'fail', time: res.time, checks };
    }
  },
  {
    id: 'presence',
    name: 'Presence API',
    desc: 'GET /api/presence',
    run: async function (baseUrl) {
      const res = await timedFetch(baseUrl + '/api/presence');
      const data = res.data;
      const checks = [];

      checks.push(checkField(data, 'success'));
      checks.push(checkField(data, 'agents', 'array'));

      const allPass = checks.every(c => c.pass);

      let note = '';
      if (data && Array.isArray(data.agents)) {
        note = data.agents.length + ' agent(s) online';
      }

      return { status: allPass ? 'pass' : 'fail', time: res.time, checks, note };
    }
  },
  {
    id: 'identity',
    name: 'Identity Lookup',
    desc: 'GET /api/presence?user=archie',
    run: async function (baseUrl) {
      const res = await timedFetch(baseUrl + '/api/presence?user=archie');
      const data = res.data;
      const checks = [];

      const hasStructure = data && typeof data === 'object';
      checks.push({
        field: 'valid response',
        pass: hasStructure,
        detail: hasStructure ? 'JSON object returned' : 'Invalid response'
      });

      if (data && data.success === false) {
        checks.push({
          field: 'error handling',
          pass: true,
          detail: 'User not found (expected for "archie")'
        });
      } else if (data && (data.user || data.handle || data.agent)) {
        checks.push({
          field: 'presence data',
          pass: true,
          detail: 'Presence object returned'
        });
      } else if (data && data.success === true) {
        checks.push({
          field: 'response shape',
          pass: true,
          detail: 'Success response returned'
        });
      } else {
        checks.push({
          field: 'response shape',
          pass: false,
          detail: 'Unexpected response format'
        });
      }

      const allPass = checks.every(c => c.pass);
      return { status: allPass ? 'pass' : 'fail', time: res.time, checks };
    }
  },
  {
    id: 'federation',
    name: 'Federation Readiness',
    desc: 'Check /.well-known/airc federation fields',
    run: async function (baseUrl) {
      const res = await timedFetch(baseUrl + '/.well-known/airc');
      const data = res.data;
      const checks = [];

      const hasFedEnabled = data && data.federation_enabled !== undefined;
      const hasRelay = data && data.relay_endpoint !== undefined;

      checks.push({
        field: 'federation_enabled',
        pass: hasFedEnabled,
        detail: hasFedEnabled
          ? 'federation_enabled = ' + data.federation_enabled
          : 'Field missing'
      });
      checks.push({
        field: 'relay_endpoint',
        pass: hasRelay,
        detail: hasRelay
          ? 'relay_endpoint = ' + data.relay_endpoint
          : 'Field missing'
      });

      const allPass = checks.every(c => c.pass);
      // Federation is optional — missing fields are WARN, not FAIL
      return {
        status: allPass ? 'pass' : 'warn',
        time: res.time,
        checks,
        note: allPass ? 'Federation capable' : 'Federation fields incomplete'
      };
    }
  },
  {
    id: 'message-schema',
    name: 'Message Schema',
    desc: 'POST /api/presence (empty body)',
    run: async function (baseUrl) {
      const res = await timedFetch(baseUrl + '/api/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = res.data;
      const checks = [];

      const hasStructure = data && typeof data === 'object';
      checks.push({
        field: 'valid JSON response',
        pass: hasStructure,
        detail: hasStructure ? 'JSON object returned' : 'Invalid response'
      });

      const hasError = data && (
        data.success === false ||
        data.error !== undefined ||
        data.message !== undefined
      );
      checks.push({
        field: 'error signaling',
        pass: hasError,
        detail: hasError
          ? 'Error correctly signaled for empty body'
          : 'No error signaling detected'
      });

      const allPass = checks.every(c => c.pass);
      return {
        status: allPass ? 'pass' : (hasStructure ? 'warn' : 'fail'),
        time: res.time,
        checks,
        note: 'Validates error response shape for missing fields'
      };
    }
  }
];

// ---------------------------------------------------------------------------
// Output Formatting
// ---------------------------------------------------------------------------

const SYMBOL = { pass: '\u2713', fail: '\u2717', warn: '\u26A0' };
const LABEL  = { pass: 'PASS', fail: 'FAIL', warn: 'WARN' };

function pad(str, len) {
  if (str.length >= len) return str;
  return str + ' '.repeat(len - str.length);
}

function printResult(test, result) {
  const sym = SYMBOL[result.status] || '?';
  const label = LABEL[result.status] || result.status.toUpperCase();
  const timeStr = String(result.time) + 'ms';

  // Main line: status symbol + label, test name, response time
  const line = `  ${sym} ${pad(label, 4)}  ${pad(test.name, 24)} ${pad(timeStr, 8)}`;
  process.stdout.write(line);

  // First check detail inline
  if (result.checks && result.checks.length > 0) {
    process.stdout.write(result.checks[0].detail);
  }
  process.stdout.write('\n');

  // Remaining checks indented
  if (result.checks && result.checks.length > 1) {
    for (let i = 1; i < result.checks.length; i++) {
      const c = result.checks[i];
      const checkSym = c.pass ? SYMBOL.pass : SYMBOL.fail;
      console.log(`              ${checkSym} ${c.detail}`);
    }
  }

  // Note
  if (result.note) {
    console.log(`              ${result.note}`);
  }
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

async function run() {
  const baseUrl = (process.argv[2] || DEFAULT_REGISTRY).replace(/\/+$/, '');

  console.log('');
  console.log('  AIRC Protocol Conformance Test Suite');
  console.log('  ====================================');
  console.log(`  Registry: ${baseUrl}`);
  console.log(`  Date:     ${new Date().toISOString()}`);
  console.log('');

  const results = [];

  for (const test of TESTS) {
    let result;
    try {
      result = await test.run(baseUrl);
    } catch (err) {
      result = {
        status: 'fail',
        time: 0,
        checks: [{ field: 'exception', pass: false, detail: err.message }]
      };
    }
    results.push({ test, result });
    printResult(test, result);
  }

  // Summary
  const total  = results.length;
  const passed = results.filter(r => r.result.status === 'pass').length;
  const warned = results.filter(r => r.result.status === 'warn').length;
  const failed = results.filter(r => r.result.status === 'fail').length;
  const score  = Math.round((passed / total) * 100);

  console.log('');
  console.log('  ------------------------------------');
  console.log(`  Results: ${passed}/${total} passed, ${warned} warnings, ${failed} failed`);
  console.log(`  Conformance: ${score}%`);
  console.log('');

  // Exit code: 0 if no failures, 1 otherwise
  process.exit(failed > 0 ? 1 : 0);
}

run();
