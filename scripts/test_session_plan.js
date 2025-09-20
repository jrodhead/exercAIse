#!/usr/bin/env node
// Quick harness to invoke the session-plan serverless handler directly.
// Usage: node scripts/test_session_plan.js '{"goals":"upper strength","equipment":["dumbbells"],"pain":["knee"]}'
// If no payload provided, uses a minimal default.

const fs = require('fs');
const path = require('path');

// Resolve handler
const handlerPath = path.resolve(__dirname, '..', 'serverless', 'api', 'kai', 'session-plan.js');
if (!fs.existsSync(handlerPath)) {
  console.error('Handler not found at', handlerPath);
  process.exit(1);
}
const handler = require(handlerPath);

// Build mock req/res
const arg = process.argv[2];
let payload = {};
if (arg) {
  try { payload = JSON.parse(arg); } catch (e) { console.warn('Invalid JSON arg, using default.'); }
}
if (!payload || Object.keys(payload).length === 0) {
  payload = { goals: 'strength + hinge', equipment: ['dumbbells','bench'], pain: [] };
}

const bodyStr = JSON.stringify(payload);

// Minimal event emitter style objects
const req = {
  _dataSent: false,
  on: function (evt, cb) {
    if (evt === 'data') {
      // simulate chunk send
      process.nextTick(() => cb(bodyStr));
    }
    if (evt === 'end') {
      process.nextTick(cb);
    }
  }
};

const chunks = [];
const res = {
  headers: {},
  setHeader: function (k, v) { this.headers[k] = v; },
  end: function (data) {
    if (data) chunks.push(data);
    const outRaw = chunks.join('');
    let parsed = null;
    try { parsed = JSON.parse(outRaw); } catch (e) {}
    console.log('\n=== Session Plan (Raw) ===');
    console.log(outRaw);
    if (parsed) {
      // Summarize dumbbell exercises for quick verification
      const summary = (parsed.exercises || []).filter(e => /dumbbell|db/i.test(e.name||''))
        .map(e => {
          const p = e.prescribed || {}; return {
            slug: e.slug,
            name: e.name,
            sets: p.sets,
            reps: p.reps,
            rpe: p.rpe,
            weight: p.weight || p.load,
            notes: p.notes
          }; });
      console.log('\n=== Dumbbell Summary ===');
      console.table(summary);
    }
  }
};

handler(req, res);
