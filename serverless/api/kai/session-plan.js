// Session Plan generation endpoint
// Now supports pluggable provider (LLM) pipeline with fallback static template.
// Applies dumbbell load ladder + rep adjustment after generation.

function parseJSONSafe(text, fallback) {
  try { return JSON.parse(text); } catch (e) { return fallback; }
}

// Extract first working dumbbell load (per-hand) from exercise prescriptions
function firstDumbbellLoad(exs) {
  for (var i = 0; i < exs.length; i++) {
    var ex = exs[i];
    if (!ex || !ex.prescribed) continue;
    if (!/dumbbell|db/i.test(ex.name || '')) continue;
    var w = null;
    if (typeof ex.prescribed.weight === 'number') w = ex.prescribed.weight;
    else if (typeof ex.prescribed.load === 'number') w = ex.prescribed.load;
    if (w != null) return w;
  }
  return null;
}

function buildLadder(base) {
  // New behavior: anchor directly on the FIRST observed dumbbell load.
  // If first load is 27.5 → permitted rungs: 7.5,17.5,27.5,37.5,... (i.e., base%10 pattern)
  if (base == null || isNaN(base)) return [];
  var dec = base % 10; // preserves fractional (e.g., 27.5 % 10 = 7.5)
  // Ensure positive remainder in JS modulo semantics
  if (dec < 0) dec += 10;
  var ladder = [];
  for (var v = dec; v <= 150; v += 10) {
    // Avoid pushing 0 as first rung unless base actually aligned at 0
    ladder.push(Number(v.toFixed(1)));
  }
  return ladder;
}

function snapLoad(rawWeight, ladder) {
  if (rawWeight == null || !ladder.length) return rawWeight;
  for (var i = 0; i < ladder.length; i++) {
    if (ladder[i] >= rawWeight) return ladder[i];
  }
  return ladder[ladder.length - 1];
}

function adjustRepsForSnap(originalReps, priorRPE, intendedRPE, deltaWeight) {
  if (originalReps == null) return originalReps;
  if (deltaWeight == null || deltaWeight === 0) return originalReps;
  // Basic rule set mirroring prompt guidance.
  if (deltaWeight <= 5) {
    if (priorRPE != null && priorRPE <= 7) return originalReps; // keep
    return Math.max(1, originalReps - 1);
  }
  if (deltaWeight <= 10) {
    return Math.max(1, originalReps - 2);
  }
  return Math.max(1, originalReps - 2);
}

function applyDumbbellLadder(exercises) {
  if (!exercises || !exercises.length) return { exercises: exercises, modified: false };
  var base = firstDumbbellLoad(exercises);
  if (base == null) return { exercises: exercises, modified: false };
  var ladder = buildLadder(base);
  var modified = false;
  var firstApplied = false; // do not snap the first dumbbell exercise (anchor)
  for (var i = 0; i < exercises.length; i++) {
    var ex = exercises[i];
    if (!ex || !ex.prescribed) continue;
    if (!/dumbbell|db/i.test(ex.name || '')) continue;
    var pres = ex.prescribed;
    var w = pres.weight != null ? pres.weight : pres.load;
    if (w == null) continue;
    if (!firstApplied && w === base) { // anchor: explicitly keep original
      firstApplied = true;
      continue;
    }
    if (!firstApplied && w !== base) {
      // If the first encountered dumbbell exercise doesn't have the base weight (edge case), treat it as base and continue.
      base = w; ladder = buildLadder(base); firstApplied = true; continue;
    }
    var snapped = snapLoad(w, ladder);
    if (snapped !== w) {
      var delta = snapped - w;
      pres.weight = snapped;
      var origReps = pres.reps;
      var adjReps = adjustRepsForSnap(origReps, pres.priorWeekRPE, pres.rpe, delta);
      if (adjReps !== origReps) pres.reps = adjReps;
      if (!pres.notes) pres.notes = '';
      pres.notes += (pres.notes ? ' ' : '') + '[LADDER snap+' + delta + (origReps !== pres.reps ? ' reps->' + pres.reps : '') + ']';
      modified = true;
    }
  }
  return { exercises: exercises, modified: modified };
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
  // Apply ladder post-process if exercises present
  if (plan && plan.exercises) {
    var ladderResult = applyDumbbellLadder(plan.exercises);
    if (ladderResult.modified) plan.notes += ' Ladder normalization applied.';
  }
  res.setHeader('Content-Type','application/json');
  res.end(JSON.stringify(plan));
};
