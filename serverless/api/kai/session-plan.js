// Session Plan generation endpoint
// Now supports pluggable provider (LLM) pipeline with fallback static template.

function parseJSONSafe(text, fallback) {
  try { return JSON.parse(text); } catch (e) { return fallback; }
}

// Lazy requires to avoid cost if provider not used
function lazyProviderBits() {
  return {
    createKaiProvider: require('../../lib/kaiProviderFactory').createKaiProvider,
    assemblePrompt: require('../../lib/assembleKaiPrompt').assemblePrompt,
    jsonRepair: require('../../lib/jsonRepair')
  };
}

function buildFallbackPlan() {
  var today = new Date();
  var iso = today.toISOString().slice(0,10);
  return {
    version: '1.0',
    title: 'Generated Session — ' + iso,
    date: iso,
    notes: 'Fallback static template (no provider).',
    exercises: [
      { slug: 'goblet_squat', name: 'Goblet Squat', prescribed: { sets: 3, reps: 8, rpe: 7 } },
      { slug: 'flat_dumbbell_bench_press', name: 'Flat DB Bench Press', prescribed: { sets: 3, reps: 10, rpe: 7, weight: 32.5, priorWeekRPE: 7.5 } },
      { slug: 'dumbbell_rdl', name: 'Dumbbell RDL', prescribed: { sets: 3, reps: 8, rpe: 7, weight: 55, priorWeekRPE: 8 } },
      { slug: 'hammer_curl', name: 'Hammer Curl', prescribed: { sets: 3, reps: 12, rpe: 7, weight: 22.5, priorWeekRPE: 7 } }
    ]
  };
}

function readBody(req) {
  return new Promise(function(resolve){
    var body='';
    req.on('data', function(c){ body += c; });
    req.on('end', function(){ resolve(body); });
  });
}

module.exports = async function handler(req, res) {
  // Optional server guard: if Kai UI is disabled, block generation calls unless explicitly allowed
  var uiEnabled = process.env.KAI_UI_ENABLED === '1';
  var allowBackend = process.env.KAI_ALLOW_API === '1';
  if (!uiEnabled && !allowBackend) {
    res.statusCode = 403;
    res.setHeader('Content-Type','application/json');
    return res.end(JSON.stringify({ error: 'Kai generation is disabled in MVP. Paste a SessionPlan JSON in the UI instead.' }));
  }
  var raw = await readBody(req);
  var payload = parseJSONSafe(raw, {});
  var useProvider = process.env.KAI_USE_PROVIDER === '1';
  var plan = null;
  if (useProvider) {
    var llmRaw = null; // capture for error reporting
    try {
      var bits = lazyProviderBits();
      var provider = bits.createKaiProvider();
      var promptInput = await bits.assemblePrompt(payload);
      llmRaw = await provider.generateSession(promptInput);
      if (process.env.KAI_DEBUG === '1') {
        console.log('[kai][debug] raw provider output (first 400 chars):\n' + (llmRaw || '').slice(0,400));
      }
      // Robust extraction: try direct, code fences, first balanced JSON
      var sanitized = bits.jsonRepair.sanitizeLooseJSON(llmRaw);
      var parsed = parseJSONSafe(sanitized, null);
      if (!parsed) {
        parsed = bits.jsonRepair.extractFirstJSONValue(sanitized);
      }
      if (!parsed) throw new Error('Invalid JSON from provider');
      plan = parsed;
      // Legacy shapes normalization
      if (!plan.exercises && plan.workouts && Array.isArray(plan.workouts)) {
        plan.exercises = plan.workouts.map(function(w,i){
          var exName = w.exercise || w.name || ('Exercise '+(i+1));
          var reps = w.reps;
          if (typeof reps === 'string' && /-/.test(reps)) reps = reps; // keep range string
          return {
            slug: exName.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'').slice(0,60),
            name: exName,
            prescribed: {
              sets: w.sets || w.set || 3,
              reps: reps || w.rep || 8,
              rpe: w.rpe || 7,
              weight: typeof w.weight === 'number' ? w.weight : undefined,
              notes: w.notes || undefined
            }
          };
        });
      } else if (!plan.exercises && plan.sections) {
        plan.exercises = [];
      }
      if (!plan.notes) plan.notes = '';
      plan.notes += (plan.notes ? ' ' : '') + '[provider=' + provider.name() + ']';
    } catch (e) {
      plan = buildFallbackPlan();
      plan.meta = { fallback: true, error: e.message };
      if (llmRaw && e.message === 'Invalid JSON from provider') {
        plan.meta.rawSnippet = llmRaw.slice(0,600);
      }
    }
  } else {
    plan = buildFallbackPlan();
  }
  res.setHeader('Content-Type','application/json');
  res.end(JSON.stringify(plan));
};
