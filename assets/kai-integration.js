/*
  exercAIse Kai Integration Module
  Handles AI-generated session validation, link checking, and workout generation.
  
  Public API:
  - ExercAIse.KaiIntegration.init(deps)
  - ExercAIse.KaiIntegration.openGeneratedSession(obj)
  - ExercAIse.KaiIntegration.validateSessionPlan(obj)
  - ExercAIse.KaiIntegration.normalizeSessionPlanInPlace(plan)
  - ExercAIse.KaiIntegration.validateSessionPlanLinks(obj, cb)
  - ExercAIse.KaiIntegration.isWorkoutJSONShape(obj)
  - ExercAIse.KaiIntegration.looksLikeSessionPlan(obj)
  - ExercAIse.KaiIntegration.validateWorkoutLinks(obj, cb)
  - ExercAIse.KaiIntegration.handleGenerateButtons()
  - ExercAIse.KaiIntegration.generateExerciseStub(slug, name)
  - ExercAIse.KaiIntegration.generateExerciseStubsFromObj(obj, missingSlugs)
  - ExercAIse.KaiIntegration.generateExerciseStubsFromPlan(plan, missingSlugs)
  - ExercAIse.KaiIntegration.linkValidation (state object)
*/

window.ExercAIse = window.ExercAIse || {};
window.ExercAIse.KaiIntegration = (function() {
  'use strict';

  // Dependencies (injected via init())
  var deps = {};
  
  // Track link validation results for pasted/generated SessionPlans and workout JSON
  var linkValidation = { invalid: [], missing: [] };

  // ============================================================================
  // Initialization
  // ============================================================================

  function init(dependencies) {
    deps = dependencies || {};
    // Expected deps: status, xhrGet, xhrPostJSON, slugify, parseHMSToSeconds, 
    // renderMarkdownBasic, setVisibility, buildForm, fixExerciseAnchors
    // DOM elements: workoutSection, workoutContent, workoutMetaEl, workoutTitleEl,
    // openOnGitHubEl, readmeSection, logsSection, generateSection, formSection,
    // genForm, genGoals, genPain, genEquipment, genInstr, genJSON, genSubmit, genClear, genLoadJSON
    return true;
  }

  // ============================================================================
  // Session Plan Validation
  // ============================================================================

  function validateSessionPlan(obj) {
    if (!obj || typeof obj !== 'object') return 'Not an object';
    if (obj.version !== '1.0') return 'version must be "1.0"';
    if (!obj.title || !obj.exercises) return 'Missing title or exercises';
    if (Object.prototype.toString.call(obj.exercises) !== '[object Array]') return 'exercises must be an array';
    for (var i = 0; i < obj.exercises.length; i++) {
      var ex = obj.exercises[i];
      if (!ex || typeof ex !== 'object') return 'exercise[' + i + '] invalid';
      if (!ex.name) return 'exercise[' + i + '] missing name';
      if (ex.prescribed && typeof ex.prescribed !== 'object') return 'exercise[' + i + '].prescribed invalid';
    }
    return null;
  }

  function looksLikeSessionPlan(obj) {
    return !!(obj && obj.version === '1.0' && obj.exercises && Object.prototype.toString.call(obj.exercises) === '[object Array]');
  }

  function isWorkoutJSONShape(obj) {
    if (!obj || typeof obj !== 'object') return false;
    if (!obj.sections || Object.prototype.toString.call(obj.sections) !== '[object Array]') return false;
    // Consider it a workout if any section has items
    for (var i = 0; i < obj.sections.length; i++) {
      var sec = obj.sections[i];
      if (sec && sec.items && Object.prototype.toString.call(sec.items) === '[object Array]' && sec.items.length) return true;
    }
    // Or if empty sections array is present, still treat as workout
    return true;
  }

  // ============================================================================
  // Session Plan Normalization
  // ============================================================================

  function normalizeSessionPlanInPlace(plan) {
    try {
      if (!plan || !plan.exercises || !plan.exercises.length) return plan;
      
      function firstNumberFrom(text) {
        if (typeof text === 'number') return text;
        if (typeof text !== 'string') return null;
        var m = text.match(/(\d+(?:\.\d+)?)/);
        return m ? Number(m[1]) : null;
      }
      
      function parseWeightSpec(val) {
        var out = { weight: null, multiplier: null };
        if (val == null) return out;
        if (typeof val === 'number') { out.weight = val; return out; }
        var s = String(val).toLowerCase();
        var n = firstNumberFrom(s);
        if (n != null) out.weight = n;
        if (/per\s*hand|each|per\s*side|x2|×2/.test(s)) out.multiplier = 2;
        else if (/total/.test(s)) out.multiplier = 1;
        else if (/bodyweight/.test(s)) out.multiplier = 0;
        return out;
      }
      
      function normalizeReps(reps) {
        // Rep Range Normalization (REPRANGE-01)
        if (reps == null) {
          return { reps_low: null, reps_high: null, reps_display: null, isRange: false };
        }
        var reps_display = String(reps);
        // Handle numeric input
        if (typeof reps === 'number' && !isNaN(reps)) {
          var intReps = Math.max(1, Math.floor(reps));
          return { reps_low: intReps, reps_high: intReps, reps_display: reps_display, isRange: false };
        }
        // Handle string input
        if (typeof reps === 'string') {
          var trimmed = reps.trim();
          // Check for range pattern (supports both - and – characters)
          var rangeMatch = trimmed.match(/^(\d+)\s*[–-]\s*(\d+)$/);
          if (rangeMatch) {
            var low = parseInt(rangeMatch[1], 10);
            var high = parseInt(rangeMatch[2], 10);
            if (isNaN(low) || isNaN(high)) {
              return { reps_low: null, reps_high: null, reps_display: reps_display, isRange: false, error: 'Invalid range numbers' };
            }
            // Swap if bounds are reversed (e.g., "12-8")
            if (low > high) { var temp = low; low = high; high = temp; }
            // Ensure minimum of 1
            low = Math.max(1, low);
            high = Math.max(1, high);
            return { reps_low: low, reps_high: high, reps_display: reps_display, isRange: low !== high };
          }
          // Try to parse as single number
          var singleMatch = trimmed.match(/^(\d+)$/);
          if (singleMatch) {
            var intReps2 = Math.max(1, parseInt(singleMatch[1], 10));
            return { reps_low: intReps2, reps_high: intReps2, reps_display: reps_display, isRange: false };
          }
          // Handle malformed string
          return { reps_low: null, reps_high: null, reps_display: reps_display, isRange: false, error: 'Malformed reps string' };
        }
        // Unsupported type
        return { reps_low: null, reps_high: null, reps_display: reps_display, isRange: false, error: 'Unsupported reps type' };
      }
      
      function parseTimeToSec(text) {
        if (text == null) return null;
        if (typeof text === 'number') return text;
        var s = String(text).trim().toLowerCase();
        // mm:ss or h:mm:ss (use imported function)
        var colon = deps.parseHMSToSeconds ? deps.parseHMSToSeconds(s) : null;
        if (colon != null) return colon;
        var m;
        m = s.match(/(\d{1,3})\s*(?:min|minutes?)/);
        if (m) { var mins = parseInt(m[1], 10); if (!isNaN(mins)) return mins * 60; }
        m = s.match(/(\d{1,3})\s*(?:sec|seconds?)/);
        if (m) { var secs = parseInt(m[1], 10); if (!isNaN(secs)) return secs; }
        var n = firstNumberFrom(s);
        return n != null ? n : null;
      }
      
      function parseDistance(text) {
        if (text == null) return { miles: null, meters: null };
        if (typeof text === 'number') return { miles: text, meters: null };
        var s = String(text).toLowerCase();
        var m;
        m = s.match(/(\d+(?:\.\d+)?)\s*(?:mi|miles?)/);
        if (m) return { miles: Number(m[1]), meters: null };
        m = s.match(/(\d+(?:\.\d+)?)\s*(?:m|meters?)/);
        if (m) return { miles: null, meters: Number(m[1]) };
        var n = firstNumberFrom(s);
        return { miles: n, meters: null };
      }
      
      for (var i = 0; i < plan.exercises.length; i++) {
        var ex = plan.exercises[i] || {};
        var p = ex.prescribed || {};
        // sets
        if (p.sets != null && typeof p.sets === 'string') {
          var setsNum = firstNumberFrom(p.sets); if (setsNum != null) p.sets = setsNum;
        }
        // reps: normalize with REPRANGE-01 logic
        if (p.reps !== undefined) {
          var repsNorm = normalizeReps(p.reps);
          p.reps_low = repsNorm.reps_low;
          p.reps_high = repsNorm.reps_high;
          p.reps_display = repsNorm.reps_display;
          if (repsNorm.error) p.reps_error = repsNorm.error;
        }
        // rpe
        if (p.rpe != null && typeof p.rpe === 'string') {
          var rpeNum = firstNumberFrom(p.rpe); if (rpeNum != null) p.rpe = rpeNum;
        }
        // weight/load
        if (p.weight != null && typeof p.weight !== 'number') {
          var w1 = parseWeightSpec(p.weight);
          if (w1.weight != null) p.weight = w1.weight;
          if (w1.multiplier != null) p.multiplier = (p.multiplier == null ? w1.multiplier : p.multiplier);
        }
        if (p.load != null && typeof p.load !== 'number') {
          var w2 = parseWeightSpec(p.load);
          if (w2.weight != null) { p.weight = w2.weight; delete p.load; }
          if (w2.multiplier != null) p.multiplier = (p.multiplier == null ? w2.multiplier : p.multiplier);
        }
        // time/hold
        if (p.timeSeconds != null && typeof p.timeSeconds === 'string') {
          var ts = parseTimeToSec(p.timeSeconds); if (ts != null) p.timeSeconds = ts;
        }
        if (p.holdSeconds != null && typeof p.holdSeconds === 'string') {
          var hs = parseTimeToSec(p.holdSeconds); if (hs != null) p.holdSeconds = hs;
        }
        if (p.time != null && p.timeSeconds == null) {
          var ts2 = parseTimeToSec(p.time); if (ts2 != null) p.timeSeconds = ts2; delete p.time;
        }
        if (p.hold != null && p.holdSeconds == null) {
          var hs2 = parseTimeToSec(p.hold); if (hs2 != null) p.holdSeconds = hs2; delete p.hold;
        }
        // rest
        if (p.restSec != null && p.restSeconds == null) { p.restSeconds = Number(p.restSec) || p.restSec; delete p.restSec; }
        // distance
        if (p.distanceMiles != null && typeof p.distanceMiles === 'string') {
          var d1 = parseDistance(p.distanceMiles); if (d1.miles != null) p.distanceMiles = d1.miles;
        }
        if (p.distanceMeters != null && typeof p.distanceMeters === 'string') {
          var d2 = parseDistance(p.distanceMeters); if (d2.meters != null) p.distanceMeters = d2.meters;
        }
        if (p.distance != null) {
          var d3 = parseDistance(p.distance);
          if (d3.miles != null && p.distanceMiles == null) p.distanceMiles = d3.miles;
          if (d3.meters != null && p.distanceMeters == null) p.distanceMeters = d3.meters;
          delete p.distance;
        }
        ex.prescribed = p;
        plan.exercises[i] = ex;
      }
    } catch (e) {}
    return plan;
  }

  // ============================================================================
  // Link Validation
  // ============================================================================

  function validateSessionPlanLinks(obj, cb) {
    try {
      if (!obj || !obj.exercises || !obj.exercises.length) return cb(null);
      var invalid = [];
      var missing = [];
      var pending = 0;
      
      function isInternal(url) {
        if (!url) return false;
        if (/^https?:/i.test(url)) return false;
        return /^(?:\.?\.?\/)?exercises\/[\w\-]+\.(?:json|md)$/i.test(url);
      }
      
      function doneOnce() { try { cb(null); } catch (e) {} }
      
      for (var i = 0; i < obj.exercises.length; i++) {
        var ex = obj.exercises[i] || {};
        var link = String(ex.link || '').trim();
        if (!link) continue; // link is optional
        if (!isInternal(link)) { invalid.push(link); continue; }
        (function (u) {
          pending++;
          deps.xhrGet(u, function (err, text) {
            if (err || !text) missing.push(u);
            pending--;
            if (pending === 0) {
              linkValidation.invalid = invalid.slice(0);
              linkValidation.missing = missing.slice(0);
              return doneOnce();
            }
          });
        })(link);
      }
      if (pending === 0) {
        linkValidation.invalid = invalid.slice(0);
        linkValidation.missing = missing.slice(0);
        return doneOnce();
      }
    } catch (e) { return cb('Validation error: ' + (e && e.message || e)); }
  }

  function validateWorkoutLinks(obj, cb) {
    try {
      var invalid = [];
      var missing = [];
      var pending = 0;
      
      function doneOnce(err) { try { cb(err); } catch (e) {} }
      
      function extractSlugFromLink(link) {
        if (!link) return '';
        var m = String(link).match(/(?:^|\/)exercises\/([a-z0-9_\-]+)\.(?:json|md)$/i);
        return m && m[1] ? m[1] : '';
      }
      
      function walkItem(it) {
        if (!it || typeof it !== 'object') return;
        var kind = String(it.kind || 'exercise');
        if (kind === 'exercise') {
          var link = String(it.link || '');
          var slug = extractSlugFromLink(link);
          if (!slug && it.slug) slug = String(it.slug).trim();
          if (!slug) { invalid.push((it.name || '(unnamed)') + ' (no link/slug)'); return; }
          if (!/^[a-z0-9_\-]+$/.test(slug)) { invalid.push(slug); return; }
          pending++;
          var path = 'exercises/' + slug + '.json';
          deps.xhrGet(path, function (err, text) {
            if (err || !text) missing.push(slug);
            pending--;
            if (pending === 0) {
              if (invalid.length || missing.length) {
                var msgs = [];
                if (invalid.length) msgs.push('Invalid/missing link entries: ' + invalid.join(', '));
                if (missing.length) msgs.push('Unknown slugs (no file in exercises/): ' + missing.join(', '));
                return doneOnce(msgs.join(' | '));
              }
              return doneOnce(null);
            }
          });
        } else if ((kind === 'superset' || kind === 'circuit') && it.children && it.children.length) {
          for (var i = 0; i < it.children.length; i++) walkItem(it.children[i]);
        }
      }
      
      if (!obj || !obj.sections || !obj.sections.length) return cb(null);
      for (var s = 0; s < obj.sections.length; s++) {
        var sec = obj.sections[s];
        if (!sec || !sec.items || !sec.items.length) continue;
        for (var j = 0; j < sec.items.length; j++) walkItem(sec.items[j]);
      }
      if (pending === 0) {
        if (invalid.length) return doneOnce('Invalid/missing link entries: ' + invalid.join(', '));
        return doneOnce(null);
      }
    } catch (e) { return cb('Validation error: ' + (e && e.message || e)); }
  }

  // ============================================================================
  // Exercise Stub Generation
  // ============================================================================

  function generateExerciseStub(slug, name) {
    var display = name || (slug || '').replace(/_/g, ' ').replace(/\b\w/g, function(m){ return m.toUpperCase(); });
    var stub = {
      name: display,
      equipment: [],
      tags: [],
      setup: [""],
      steps: [""],
      cues: [],
      mistakes: [],
      safety: "",
      scaling: { regressions: [], progressions: [] },
      variations: [],
      prescriptionHints: { load: "", reps: "", time: "", distance: "", rpe: "", notes: "" },
      joints: { sensitiveJoints: [], notes: "" },
      media: { video: "", images: [] }
    };
    return { path: 'exercises/' + slug + '.json', json: JSON.stringify(stub, null, 2) };
  }

  function generateExerciseStubsFromObj(obj, missingSlugs) {
    try {
      var nameBySlug = {};
      function slugFromLink(link) {
        var m = String(link || '').match(/(?:^|\/)exercises\/([a-z0-9_\-]+)\.(?:json|md)$/i);
        return m && m[1] ? m[1] : '';
      }
      function walkItem(it) {
        if (!it || typeof it !== 'object') return;
        var kind = String(it.kind || 'exercise');
        if (kind === 'exercise') {
          var s = it.slug || slugFromLink(it.link);
          if (s) nameBySlug[s] = it.name || nameBySlug[s] || s;
        } else if ((kind === 'superset' || kind === 'circuit') && it.children && it.children.length) {
          for (var i = 0; i < it.children.length; i++) walkItem(it.children[i]);
        }
      }
      if (obj && obj.sections && obj.sections.length) {
        for (var si = 0; si < obj.sections.length; si++) {
          var sec = obj.sections[si];
          if (!sec || !sec.items) continue;
          for (var j = 0; j < sec.items.length; j++) walkItem(sec.items[j]);
        }
      }
      var parts = [];
      for (var k = 0; k < missingSlugs.length; k++) {
        var slug = missingSlugs[k];
        var name = nameBySlug[slug] || slug;
        var stub = generateExerciseStub(slug, name);
        parts.push('// ' + stub.path + '\n' + stub.json);
      }
      return parts.join('\n\n');
    } catch (e) { return ''; }
  }

  function generateExerciseStubsFromPlan(plan, missingSlugs) {
    try {
      var nameBySlug = {};
      if (plan && plan.exercises && plan.exercises.length) {
        for (var i = 0; i < plan.exercises.length; i++) {
          var ex = plan.exercises[i] || {};
          var s = String(ex.slug || '').trim();
          if (s) nameBySlug[s] = ex.name || nameBySlug[s] || s;
        }
      }
      var parts = [];
      for (var k = 0; k < missingSlugs.length; k++) {
        var slug = missingSlugs[k];
        var name = nameBySlug[slug] || slug;
        var stub = generateExerciseStub(slug, name);
        parts.push('// ' + stub.path + '\n' + stub.json);
      }
      return parts.join('\n\n');
    } catch (e) { return ''; }
  }

  // ============================================================================
  // Generated Session Handling
  // ============================================================================

  function openGeneratedSession(obj) {
    // Render using same path rendering by writing to a blob URL
    var pretty = JSON.stringify(obj || {}, null, 2);
    var blob = null; try { blob = new Blob([pretty], { type: 'application/json' }); } catch (e) {}
    if (!blob) { return deps.status('Your browser cannot render the generated session.', { important: true }); }
    var url = null; try { url = URL.createObjectURL(blob); } catch (e) {}
    if (!url) { return deps.status('Unable to open generated session.', { important: true }); }
    
    // Reuse openSession by pretending this is a JSON path
    deps.setVisibility(deps.readmeSection, false);
    deps.setVisibility(deps.logsSection, false);
    deps.setVisibility(deps.generateSection, false);
    deps.setVisibility(deps.workoutSection, true);
    
    // Directly render JSON branch without XHR by injecting content
    try {
      var text = pretty;
      var obj = JSON.parse(text || '{}');
      
      function esc(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
      
      function isInternalExerciseLink(url) {
        if (!url) return false;
        if (/^https?:/i.test(url)) return false;
        var m = String(url).match(/^(?:\.?\.?\/)?(exercises\/[\w\-]+\.(?:json|md))$/i);
        return !!(m && m[1]);
      }
      
      function inlineMarkdown(text) {
        var s = String(text == null ? '' : text);
        s = s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        s = s.replace(/\[(.*?)\]\((.*?)\)/g, function(_, t, u){ return '<a href="' + u + '">' + t + '</a>'; });
        return s;
      }
      
      function attrEscape(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }
      
      function renderItem(it, opts) {
        if (!it || typeof it !== 'object') return '';
        var options = opts || {};
        var kind = String(it.kind || 'exercise');
        var name = String(it.name || '');
        var link = String(it.link || '');
        
        if (kind === 'exercise') {
          // Accept both 'prescribed' (plan) and 'prescription' (workout) shapes
          var presObj = (it.prescribed != null ? it.prescribed : it.prescription);
          var meta = { cues: (it.cues || []), prescription: (presObj || null) };
          if (it.logType) meta.logType = it.logType;
          if (it.loggable === false) meta.loggable = false;
          if (it.notes) meta.notes = it.notes;
          
          // Decide whether to render as link or non-link
          var asLink = !!link && isInternalExerciseLink(link);
          var html = '<li>' + (asLink
            ? ('<a href="' + esc(link) + '" data-exmeta="' + attrEscape(JSON.stringify(meta)) + '">' + esc(name) + '</a>')
            : ('<span class="ex-name no-link" data-exmeta="' + attrEscape(JSON.stringify(meta)) + '">' + esc(name) + '</span>'));
          
          // Append compact prescription summary
          if (presObj && typeof presObj === 'object') {
            try {
              var p = presObj || {};
              var parts = [];
              if (p.sets != null && p.reps != null) {
                var setsNumG = Number(p.sets);
                var setsLabelG = (setsNumG === 1 ? 'set' : 'sets');
                parts.push(String(p.sets) + ' ' + setsLabelG + ' × ' + String(p.reps) + ' reps');
              } else {
                if (p.sets != null) {
                  var setsNumG2 = Number(p.sets);
                  var setsLabelG2 = (setsNumG2 === 1 ? 'set' : 'sets');
                  parts.push(String(p.sets) + ' ' + setsLabelG2);
                }
                if (p.reps != null) parts.push(String(p.reps) + ' reps');
              }
              if (p.weight != null) parts.push(typeof p.weight === 'number' ? (String(p.weight) + ' lb') : String(p.weight));
              var weightStr3 = (typeof p.weight === 'string') ? p.weight.toLowerCase() : '';
              if (p.multiplier === 2 && !(weightStr3 && /(x2|×2|per\s*hand|each|per\s*side)/.test(weightStr3))) parts.push('x2');
              if (p.multiplier === 0 && !(weightStr3 && /bodyweight/.test(weightStr3))) parts.push('bodyweight');
              if (p.timeSeconds != null) { parts.push(String(p.timeSeconds) + ' seconds'); }
              if (p.holdSeconds != null) { parts.push(String(p.holdSeconds) + ' seconds'); }
              if (p.distanceMiles != null) parts.push(String(p.distanceMiles) + ' miles');
              if (p.distanceMeters != null) parts.push(String(p.distanceMeters) + ' m');
              if (p.rpe != null) parts.push('RPE ' + String(p.rpe));
              if (p.restSeconds != null) parts.push('Rest ' + String(p.restSeconds) + ' seconds');
              if (parts.length) html += ' — <span class="ex-presc">' + parts.join(' · ') + '</span>';
            } catch (e) {}
          }
          if (!options.suppressCues && it.cues && it.cues.length) {
            html += '<ul>' + it.cues.map(function(c){ return '<li>' + inlineMarkdown(c) + '</li>'; }).join('') + '</ul>';
          }
          html += '</li>';
          return html;
        }
        return '';
      }
      
      function renderSection(sec) {
        if (!sec) return '';
        var title = String(sec.title || '');
        var type = String(sec.type || '');
        var rounds = (sec.rounds != null) ? (' — ' + sec.rounds + ' rounds') : '';
        var typeText = type || 'Section';
        var display = typeText + (title ? (' — ' + title) : '');
        var h = '<section data-sectype="' + attrEscape(typeText) + '"><h2>' + esc(display) + esc(rounds) + '</h2>';
        if (sec.notes) { try { h += deps.renderMarkdownBasic(String(sec.notes)); } catch (e) { h += '<p>' + esc(sec.notes) + '</p>'; } }
        if (sec.items && sec.items.length) {
          var itemsHtml = sec.items.map(function(it){ return renderItem(it, { suppressCues: true }); }).join('');
          if (itemsHtml.indexOf('<li') !== -1) itemsHtml = '<ul>' + itemsHtml + '</ul>';
          h += itemsHtml;
        }
        h += '</section>';
        return h;
      }
      
      // If no sections provided, map exercises into a default section
      if ((!obj.sections || !obj.sections.length) && obj.exercises && obj.exercises.length) {
        var items = [];
        for (var ei = 0; ei < obj.exercises.length; ei++) {
          var ex = obj.exercises[ei] || {};
          var pres = (ex.prescribed != null ? ex.prescribed : ex.prescription) || {};
          if (!pres.sets && ex.sets != null) pres.sets = ex.sets;
          if (!pres.reps && ex.reps != null) pres.reps = ex.reps;
          if (!pres.load && ex.load != null) pres.load = ex.load;
          if (!pres.rpe && ex.rpe != null) pres.rpe = ex.rpe;
          var linkFromPlan = (typeof ex.link === 'string') ? ex.link : '';
          var linkValue = linkFromPlan || (ex.slug ? ('exercises/' + String(ex.slug).replace(/[^a-z0-9_\-]+/g,'') + '.json') : '');
          items.push({
            kind: 'exercise',
            name: ex.name || ex.slug || 'Exercise',
            cues: ex.cues || [],
            prescription: pres,
            link: linkValue,
            slug: ex.slug || ''
          });
        }
        obj.sections = [{ type: 'Main', title: 'Main Sets', items: items }];
      }

      var parts = [];
      var titleTop = obj.title ? '<h1>' + esc(obj.title) + '</h1>' : '';
      if (obj.date) titleTop += '<p class="muted">' + esc(obj.date) + '</p>';
      if (titleTop) parts.push(titleTop);
      if (obj.notes) { try { parts.push(deps.renderMarkdownBasic(String(obj.notes))); } catch (e) { parts.push('<p>' + esc(obj.notes) + '</p>'); } }
      if (obj.sections && obj.sections.length) {
        for (var si = 0; si < obj.sections.length; si++) parts.push(renderSection(obj.sections[si]));
      }
      
      deps.workoutContent.innerHTML = parts.join('\n');
      deps.fixExerciseAnchors(deps.workoutContent);
      
      // Intercept clicks on exercise links
      if (deps.workoutSection && !deps.workoutSection.__wiredExLinks) {
        deps.workoutSection.addEventListener('click', function (e) {
          var t = e.target || e.srcElement;
          if (!t) return;
          while (t && t !== deps.workoutSection && !(t.tagName && t.tagName.toLowerCase() === 'a')) t = t.parentNode;
          if (!t || t === deps.workoutSection) return;
          var href = t.getAttribute('href') || '';
          if (/^https?:/i.test(href)) return;
          var exMatch = href.match(/(?:^|\/)?exercises\/[\w\-]+\.(?:md|json)$/i);
          if (exMatch) {
            try { e.preventDefault(); } catch (ex) {}
            var slug = (href.match(/exercises\/([\w\-]+)\.(?:md|json)$/i)||[])[1];
            var jsonPath = 'exercises/' + slug + '.json';
            try { window.location.href = 'exercise.html?file=' + encodeURIComponent(jsonPath); } catch (ex) {}
            return;
          }
        }, false);
        deps.workoutSection.__wiredExLinks = true;
      }
      
      deps.setVisibility(deps.formSection, true);
      deps.buildForm('generated://session.json', JSON.stringify(obj), true);
      deps.workoutTitleEl.innerHTML = obj.title || 'Generated Session';
      deps.openOnGitHubEl.href = '#';
      deps.setVisibility(deps.workoutMetaEl, true);
      try { window.scrollTo(0, 0); } catch (e) {}
      
      // Preserve link warnings
      var hasLinkWarnings = false;
      try {
        hasLinkWarnings = !!((linkValidation && linkValidation.invalid && linkValidation.invalid.length) || (linkValidation && linkValidation.missing && linkValidation.missing.length));
      } catch (e) { hasLinkWarnings = false; }
      if (!hasLinkWarnings) deps.status('');
    } catch (e) {
      deps.status('Failed to render generated session: ' + (e && e.message || e), { important: true });
    }
  }

  // ============================================================================
  // Kai Generation UI
  // ============================================================================

  function handleGenerateButtons() {
    if (!deps.genForm || deps.genForm.__wired) return;
    deps.genForm.__wired = true;
    
    if (deps.genClear) deps.genClear.onclick = function () {
      if (deps.genGoals) deps.genGoals.value = '';
      if (deps.genPain) deps.genPain.value = '';
      if (deps.genEquipment) deps.genEquipment.value = '';
      if (deps.genInstr) deps.genInstr.value = '';
      if (deps.genJSON) deps.genJSON.value = '';
      deps.status('Cleared.', { important: false });
    };
    
    if (deps.genLoadJSON) deps.genLoadJSON.onclick = function () {
      var text = (deps.genJSON && deps.genJSON.value) || '';
      if (!text) return deps.status('Paste JSON first.', { important: true });
      var obj = null; 
      try { obj = JSON.parse(text); } catch (e) { return deps.status('Invalid JSON: ' + (e && e.message || e), { important: true }); }
      
      if (isWorkoutJSONShape(obj)) {
        validateWorkoutLinks(obj, function (linkErrW) {
          if (linkErrW) {
            deps.status('Some exercises are unknown or invalid; details won\'t open until they exist. Rendering anyway.', { important: true });
          }
          openGeneratedSession(obj);
        });
      } else if (looksLikeSessionPlan(obj)) {
        obj = normalizeSessionPlanInPlace(obj);
        var err = validateSessionPlan(obj);
        if (err) return deps.status('SessionPlan invalid: ' + err, { important: true });
        validateSessionPlanLinks(obj, function (linkErr) {
          if ((linkValidation.invalid && linkValidation.invalid.length) || (linkValidation.missing && linkValidation.missing.length)) {
            var msgs = [];
            if (linkValidation.invalid && linkValidation.invalid.length) msgs.push('Invalid links (external or malformed): ' + linkValidation.invalid.join(', '));
            if (linkValidation.missing && linkValidation.missing.length) msgs.push('Missing files: ' + linkValidation.missing.join(', '));
            deps.status('Some exercise links are invalid or missing; details won\'t open until they exist: ' + msgs.join(' | ') + ' — rendering anyway.', { important: true });
          }
          openGeneratedSession(obj);
        });
      } else {
        return deps.status('Unsupported JSON shape: expected workout {sections[]} or plan {version:"1.0", exercises[]}', { important: true });
      }
    };
    
    if (deps.kaiUiEnabled && deps.genSubmit) deps.genSubmit.onclick = function () {
      var payload = {
        goals: (deps.genGoals && deps.genGoals.value) || '',
        pain: ((deps.genPain && deps.genPain.value) || '').split(/,\s*/).filter(Boolean),
        equipment: ((deps.genEquipment && deps.genEquipment.value) || '').split(/,\s*/).filter(Boolean),
        personalInstructions: (deps.genInstr && deps.genInstr.value) || ''
      };
      deps.status('Contacting Kai…');
      deps.xhrPostJSON('/api/kai/session-plan', payload, function (err, text) {
        if (err) {
          // Fallback: generate a local deterministic plan
          var today = new Date();
          var iso = today.toISOString().slice(0,10);
          var local = {
            version: '1.0',
            title: 'Home Strength (Auto) — ' + iso,
            date: iso,
            notes: 'Local fallback plan. Adjust loads conservatively.',
            exercises: [
              { slug: 'goblet_squat', name: 'Goblet Squat', prescribed: { sets: 3, reps: 8, rpe: 7 }, cues: ['Elbows down; bell tight', 'Knees track over toes'] },
              { slug: 'flat_dumbbell_bench_press', name: 'Flat DB Bench Press', prescribed: { sets: 3, reps: 10, rpe: 7 }, cues: ['Wrists stacked', 'Soft lockout'] },
              { slug: 'dumbbell_rdl', name: 'Dumbbell RDL', prescribed: { sets: 3, reps: 8, rpe: 7 }, cues: ['Hips back', 'Shins vertical'] },
              { slug: 'hammer_curl', name: 'Hammer Curl', prescribed: { sets: 3, reps: 12, rpe: 7 }, cues: ['Neutral grip', 'Control the lower'] }
            ]
          };
          var verr = validateSessionPlan(local);
          if (verr) return deps.status('Fallback plan invalid: ' + verr, { important: true });
          return validateSessionPlanLinks(local, function (linkErrA) {
            if (linkErrA) return deps.status('Fallback link validation failed: ' + linkErrA, { important: true });
            openGeneratedSession(local);
          });
        }
        var obj = null; 
        try { obj = JSON.parse(text); } catch (e) { return deps.status('Kai returned invalid JSON', { important: true }); }
        
        if (isWorkoutJSONShape(obj)) {
          validateWorkoutLinks(obj, function (linkErrW2) {
            if (linkErrW2) { deps.status('Some exercises are unknown or invalid; rendering anyway.', { important: true }); }
            openGeneratedSession(obj);
          });
        } else if (looksLikeSessionPlan(obj)) {
          obj = normalizeSessionPlanInPlace(obj);
          var v = validateSessionPlan(obj);
          if (v) return deps.status('SessionPlan invalid: ' + v, { important: true });
          validateSessionPlanLinks(obj, function (linkErrB) {
            if ((linkValidation.invalid && linkValidation.invalid.length) || (linkValidation.missing && linkValidation.missing.length)) {
              var msgs2 = [];
              if (linkValidation.invalid && linkValidation.invalid.length) msgs2.push('Invalid links (external or malformed): ' + linkValidation.invalid.join(', '));
              if (linkValidation.missing && linkValidation.missing.length) msgs2.push('Missing files: ' + linkValidation.missing.join(', '));
              deps.status('Some exercise links are invalid or missing; details won\'t open until they exist: ' + msgs2.join(' | ') + ' — rendering anyway.', { important: true });
            }
            openGeneratedSession(obj);
          });
        } else {
          return deps.status('Kai returned unsupported JSON shape (expected workout or plan).', { important: true });
        }
      });
    };
  }

  // ============================================================================
  // Public API
  // ============================================================================

  return {
    init: init,
    linkValidation: linkValidation,
    openGeneratedSession: openGeneratedSession,
    validateSessionPlan: validateSessionPlan,
    normalizeSessionPlanInPlace: normalizeSessionPlanInPlace,
    validateSessionPlanLinks: validateSessionPlanLinks,
    isWorkoutJSONShape: isWorkoutJSONShape,
    looksLikeSessionPlan: looksLikeSessionPlan,
    validateWorkoutLinks: validateWorkoutLinks,
    handleGenerateButtons: handleGenerateButtons,
    generateExerciseStub: generateExerciseStub,
    generateExerciseStubsFromObj: generateExerciseStubsFromObj,
    generateExerciseStubsFromPlan: generateExerciseStubsFromPlan
  };
})();
