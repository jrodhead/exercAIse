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
window.ExercAIse.KaiIntegration = (() => {
  'use strict';

  // Dependencies (injected via init())
  let deps = {};
  
  // Track link validation results for pasted/generated SessionPlans and workout JSON
  const linkValidation = { invalid: [], missing: [] };

  // ============================================================================
  // Initialization
  // ============================================================================

  const init = (dependencies) => {
    deps = dependencies || {};
    // Expected deps: status, xhrGet, xhrPostJSON, slugify, parseHMSToSeconds, 
    // renderMarkdownBasic, setVisibility, buildForm, fixExerciseAnchors
    // DOM elements: workoutSection, workoutContent, workoutMetaEl, workoutTitleEl,
    // openOnGitHubEl, readmeSection, logsSection, generateSection, formSection,
    // genForm, genGoals, genPain, genEquipment, genInstr, genJSON, genSubmit, genClear, genLoadJSON
    return true;
  };

  // ============================================================================
  // Session Plan Validation
  // ============================================================================

  const validateSessionPlan = (obj) => {
    if (!obj || typeof obj !== 'object') return 'Not an object';
    if (obj.version !== '1.0') return 'version must be "1.0"';
    if (!obj.title || !obj.exercises) return 'Missing title or exercises';
    if (Object.prototype.toString.call(obj.exercises) !== '[object Array]') return 'exercises must be an array';
    for (let i = 0; i < obj.exercises.length; i++) {
      const ex = obj.exercises[i];
      if (!ex || typeof ex !== 'object') return 'exercise[' + i + '] invalid';
      if (!ex.name) return 'exercise[' + i + '] missing name';
      if (ex.prescribed && typeof ex.prescribed !== 'object') return 'exercise[' + i + '].prescribed invalid';
    }
    return null;
  };

  const looksLikeSessionPlan = (obj) => {
    return !!(obj && obj.version === '1.0' && obj.exercises && Object.prototype.toString.call(obj.exercises) === '[object Array]');
  };

  const isWorkoutJSONShape = (obj) => {
    if (!obj || typeof obj !== 'object') return false;
    if (!obj.sections || Object.prototype.toString.call(obj.sections) !== '[object Array]') return false;
    // Consider it a workout if any section has items
    for (let i = 0; i < obj.sections.length; i++) {
      const sec = obj.sections[i];
      if (sec && sec.items && Object.prototype.toString.call(sec.items) === '[object Array]' && sec.items.length) return true;
    }
    // Or if empty sections array is present, still treat as workout
    return true;
  };

  // ============================================================================
  // Session Plan Normalization
  // ============================================================================

  const normalizeSessionPlanInPlace = (plan) => {
    try {
      if (!plan || !plan.exercises || !plan.exercises.length) return plan;
      
      const firstNumberFrom = (text) => {
        if (typeof text === 'number') return text;
        if (typeof text !== 'string') return null;
        const m = text.match(/(\d+(?:\.\d+)?)/);
        return m ? Number(m[1]) : null;
      };
      
      const parseWeightSpec = (val) => {
        const out = { weight: null, multiplier: null };
        if (val == null) return out;
        if (typeof val === 'number') { out.weight = val; return out; }
        const s = String(val).toLowerCase();
        const n = firstNumberFrom(s);
        if (n != null) out.weight = n;
        if (/per\s*hand|each|per\s*side|x2|×2/.test(s)) out.multiplier = 2;
        else if (/total/.test(s)) out.multiplier = 1;
        else if (/bodyweight/.test(s)) out.multiplier = 0;
        return out;
      };
      
      const normalizeReps = (reps) => {
        // Rep Range Normalization (REPRANGE-01)
        if (reps == null) {
          return { reps_low: null, reps_high: null, reps_display: null, isRange: false };
        }
        const reps_display = String(reps);
        // Handle numeric input
        if (typeof reps === 'number' && !isNaN(reps)) {
          const intReps = Math.max(1, Math.floor(reps));
          return { reps_low: intReps, reps_high: intReps, reps_display, isRange: false };
        }
        // Handle string input
        if (typeof reps === 'string') {
          const trimmed = reps.trim();
          // Check for range pattern (supports both - and – characters)
          const rangeMatch = trimmed.match(/^(\d+)\s*[–-]\s*(\d+)$/);
          if (rangeMatch) {
            let low = parseInt(rangeMatch[1], 10);
            let high = parseInt(rangeMatch[2], 10);
            if (isNaN(low) || isNaN(high)) {
              return { reps_low: null, reps_high: null, reps_display, isRange: false, error: 'Invalid range numbers' };
            }
            // Swap if bounds are reversed (e.g., "12-8")
            if (low > high) { const temp = low; low = high; high = temp; }
            // Ensure minimum of 1
            low = Math.max(1, low);
            high = Math.max(1, high);
            return { reps_low: low, reps_high: high, reps_display, isRange: low !== high };
          }
          // Try to parse as single number
          const singleMatch = trimmed.match(/^(\d+)$/);
          if (singleMatch) {
            const intReps2 = Math.max(1, parseInt(singleMatch[1], 10));
            return { reps_low: intReps2, reps_high: intReps2, reps_display, isRange: false };
          }
          // Handle malformed string
          return { reps_low: null, reps_high: null, reps_display, isRange: false, error: 'Malformed reps string' };
        }
        // Unsupported type
        return { reps_low: null, reps_high: null, reps_display, isRange: false, error: 'Unsupported reps type' };
      };
      
      const parseTimeToSec = (text) => {
        if (text == null) return null;
        if (typeof text === 'number') return text;
        const s = String(text).trim().toLowerCase();
        // mm:ss or h:mm:ss (use imported function)
        const colon = deps.parseHMSToSeconds ? deps.parseHMSToSeconds(s) : null;
        if (colon != null) return colon;
        let m;
        m = s.match(/(\d{1,3})\s*(?:min|minutes?)/);
        if (m) { const mins = parseInt(m[1], 10); if (!isNaN(mins)) return mins * 60; }
        m = s.match(/(\d{1,3})\s*(?:sec|seconds?)/);
        if (m) { const secs = parseInt(m[1], 10); if (!isNaN(secs)) return secs; }
        const n = firstNumberFrom(s);
        return n != null ? n : null;
      };
      
      const parseDistance = (text) => {
        if (text == null) return { miles: null, meters: null };
        if (typeof text === 'number') return { miles: text, meters: null };
        const s = String(text).toLowerCase();
        let m;
        m = s.match(/(\d+(?:\.\d+)?)\s*(?:mi|miles?)/);
        if (m) return { miles: Number(m[1]), meters: null };
        m = s.match(/(\d+(?:\.\d+)?)\s*(?:m|meters?)/);
        if (m) return { miles: null, meters: Number(m[1]) };
        const n = firstNumberFrom(s);
        return { miles: n, meters: null };
      };
      
      for (let i = 0; i < plan.exercises.length; i++) {
        const ex = plan.exercises[i] || {};
        const p = ex.prescribed || {};
        // sets
        if (p.sets != null && typeof p.sets === 'string') {
          const setsNum = firstNumberFrom(p.sets); if (setsNum != null) p.sets = setsNum;
        }
        // reps: normalize with REPRANGE-01 logic
        if (p.reps !== undefined) {
          const repsNorm = normalizeReps(p.reps);
          p.reps_low = repsNorm.reps_low;
          p.reps_high = repsNorm.reps_high;
          p.reps_display = repsNorm.reps_display;
          if (repsNorm.error) p.reps_error = repsNorm.error;
        }
        // rpe
        if (p.rpe != null && typeof p.rpe === 'string') {
          const rpeNum = firstNumberFrom(p.rpe); if (rpeNum != null) p.rpe = rpeNum;
        }
        // weight/load
        if (p.weight != null && typeof p.weight !== 'number') {
          const w1 = parseWeightSpec(p.weight);
          if (w1.weight != null) p.weight = w1.weight;
          if (w1.multiplier != null) p.multiplier = (p.multiplier == null ? w1.multiplier : p.multiplier);
        }
        if (p.load != null && typeof p.load !== 'number') {
          const w2 = parseWeightSpec(p.load);
          if (w2.weight != null) { p.weight = w2.weight; delete p.load; }
          if (w2.multiplier != null) p.multiplier = (p.multiplier == null ? w2.multiplier : p.multiplier);
        }
        // time/hold
        if (p.timeSeconds != null && typeof p.timeSeconds === 'string') {
          const ts = parseTimeToSec(p.timeSeconds); if (ts != null) p.timeSeconds = ts;
        }
        if (p.holdSeconds != null && typeof p.holdSeconds === 'string') {
          const hs = parseTimeToSec(p.holdSeconds); if (hs != null) p.holdSeconds = hs;
        }
        if (p.time != null && p.timeSeconds == null) {
          const ts2 = parseTimeToSec(p.time); if (ts2 != null) p.timeSeconds = ts2; delete p.time;
        }
        if (p.hold != null && p.holdSeconds == null) {
          const hs2 = parseTimeToSec(p.hold); if (hs2 != null) p.holdSeconds = hs2; delete p.hold;
        }
        // rest
        if (p.restSec != null && p.restSeconds == null) { p.restSeconds = Number(p.restSec) || p.restSec; delete p.restSec; }
        // distance
        if (p.distanceMiles != null && typeof p.distanceMiles === 'string') {
          const d1 = parseDistance(p.distanceMiles); if (d1.miles != null) p.distanceMiles = d1.miles;
        }
        if (p.distanceMeters != null && typeof p.distanceMeters === 'string') {
          const d2 = parseDistance(p.distanceMeters); if (d2.meters != null) p.distanceMeters = d2.meters;
        }
        if (p.distance != null) {
          const d3 = parseDistance(p.distance);
          if (d3.miles != null && p.distanceMiles == null) p.distanceMiles = d3.miles;
          if (d3.meters != null && p.distanceMeters == null) p.distanceMeters = d3.meters;
          delete p.distance;
        }
        ex.prescribed = p;
        plan.exercises[i] = ex;
      }
    } catch (e) {}
    return plan;
  };

  // ============================================================================
  // Link Validation
  // ============================================================================

  const validateSessionPlanLinks = (obj, cb) => {
    try {
      if (!obj || !obj.exercises || !obj.exercises.length) return cb(null);
      const invalid = [];
      const missing = [];
      let pending = 0;
      
      const isInternal = (url) => {
        if (!url) return false;
        if (/^https?:/i.test(url)) return false;
        return /^(?:\.?\.?\/)?exercises\/[\w\-]+\.(?:json|md)$/i.test(url);
      };
      
      const doneOnce = () => { try { cb(null); } catch (e) {} };
      
      for (let i = 0; i < obj.exercises.length; i++) {
        const ex = obj.exercises[i] || {};
        const link = String(ex.link || '').trim();
        if (!link) continue; // link is optional
        if (!isInternal(link)) { invalid.push(link); continue; }
        ((u) => {
          pending++;
          deps.xhrGet(u, (err, text) => {
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
    } catch (e) { return cb(`Validation error: ${e?.message || e}`); }
  };

  const validateWorkoutLinks = (obj, cb) => {
    try {
      const invalid = [];
      const missing = [];
      let pending = 0;
      
      const doneOnce = (err) => { try { cb(err); } catch (e) {} };
      
      const extractSlugFromLink = (link) => {
        if (!link) return '';
        const m = String(link).match(/(?:^|\/)exercises\/([a-z0-9_\-]+)\.(?:json|md)$/i);
        return m?.[1] || '';
      };
      
      const walkItem = (it) => {
        if (!it || typeof it !== 'object') return;
        const kind = String(it.kind || 'exercise');
        if (kind === 'exercise') {
          const link = String(it.link || '');
          let slug = extractSlugFromLink(link);
          if (!slug && it.slug) slug = String(it.slug).trim();
          if (!slug) { invalid.push(`${it.name || '(unnamed)'} (no link/slug)`); return; }
          if (!/^[a-z0-9_\-]+$/.test(slug)) { invalid.push(slug); return; }
          pending++;
          const path = `exercises/${slug}.json`;
          deps.xhrGet(path, (err, text) => {
            if (err || !text) missing.push(slug);
            pending--;
            if (pending === 0) {
              if (invalid.length || missing.length) {
                const msgs = [];
                if (invalid.length) msgs.push(`Invalid/missing link entries: ${invalid.join(', ')}`);
                if (missing.length) msgs.push(`Unknown slugs (no file in exercises/): ${missing.join(', ')}`);
                return doneOnce(msgs.join(' | '));
              }
              return doneOnce(null);
            }
          });
        } else if ((kind === 'superset' || kind === 'circuit') && it.children?.length) {
          for (let i = 0; i < it.children.length; i++) walkItem(it.children[i]);
        }
      };
      
      if (!obj?.sections?.length) return cb(null);
      for (let s = 0; s < obj.sections.length; s++) {
        const sec = obj.sections[s];
        if (!sec?.items?.length) continue;
        for (let j = 0; j < sec.items.length; j++) walkItem(sec.items[j]);
      }
      if (pending === 0) {
        if (invalid.length) return doneOnce(`Invalid/missing link entries: ${invalid.join(', ')}`);
        return doneOnce(null);
      }
    } catch (e) { return cb(`Validation error: ${e?.message || e}`); }
  };

  // ============================================================================
  // Exercise Stub Generation
  // ============================================================================

  const generateExerciseStub = (slug, name) => {
    const display = name || (slug || '').replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
    const stub = {
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
    return { path: `exercises/${slug}.json`, json: JSON.stringify(stub, null, 2) };
  };

  const generateExerciseStubsFromObj = (obj, missingSlugs) => {
    try {
      const nameBySlug = {};
      const slugFromLink = (link) => {
        const m = String(link || '').match(/(?:^|\/)exercises\/([a-z0-9_\-]+)\.(?:json|md)$/i);
        return m?.[1] || '';
      };
      const walkItem = (it) => {
        if (!it || typeof it !== 'object') return;
        const kind = String(it.kind || 'exercise');
        if (kind === 'exercise') {
          const s = it.slug || slugFromLink(it.link);
          if (s) nameBySlug[s] = it.name || nameBySlug[s] || s;
        } else if ((kind === 'superset' || kind === 'circuit') && it.children?.length) {
          for (let i = 0; i < it.children.length; i++) walkItem(it.children[i]);
        }
      };
      if (obj?.sections?.length) {
        for (let si = 0; si < obj.sections.length; si++) {
          const sec = obj.sections[si];
          if (!sec?.items) continue;
          for (let j = 0; j < sec.items.length; j++) walkItem(sec.items[j]);
        }
      }
      const parts = [];
      for (let k = 0; k < missingSlugs.length; k++) {
        const slug = missingSlugs[k];
        const name = nameBySlug[slug] || slug;
        const stub = generateExerciseStub(slug, name);
        parts.push(`// ${stub.path}\n${stub.json}`);
      }
      return parts.join('\n\n');
    } catch (e) { return ''; }
  };

  const generateExerciseStubsFromPlan = (plan, missingSlugs) => {
    try {
      const nameBySlug = {};
      if (plan?.exercises?.length) {
        for (let i = 0; i < plan.exercises.length; i++) {
          const ex = plan.exercises[i] || {};
          const s = String(ex.slug || '').trim();
          if (s) nameBySlug[s] = ex.name || nameBySlug[s] || s;
        }
      }
      const parts = [];
      for (let k = 0; k < missingSlugs.length; k++) {
        const slug = missingSlugs[k];
        const name = nameBySlug[slug] || slug;
        const stub = generateExerciseStub(slug, name);
        parts.push(`// ${stub.path}\n${stub.json}`);
      }
      return parts.join('\n\n');
    } catch (e) { return ''; }
  };

  // ============================================================================
  // Generated Session Handling
  // ============================================================================

  const openGeneratedSession = (obj) => {
    // Render using same path rendering by writing to a blob URL
    const pretty = JSON.stringify(obj || {}, null, 2);
    let blob = null; try { blob = new Blob([pretty], { type: 'application/json' }); } catch (e) {}
    if (!blob) { return deps.status('Your browser cannot render the generated session.', { important: true }); }
    let url = null; try { url = URL.createObjectURL(blob); } catch (e) {}
    if (!url) { return deps.status('Unable to open generated session.', { important: true }); }
    
    // Reuse openSession by pretending this is a JSON path
    deps.setVisibility(deps.readmeSection, false);
    deps.setVisibility(deps.logsSection, false);
    deps.setVisibility(deps.generateSection, false);
    deps.setVisibility(deps.workoutSection, true);
    
    // Directly render JSON branch without XHR by injecting content
    try {
      const text = pretty;
      const obj = JSON.parse(text || '{}');
      
      const esc = (s) => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      
      const isInternalExerciseLink = (url) => {
        if (!url) return false;
        if (/^https?:/i.test(url)) return false;
        const m = String(url).match(/^(?:\.?\.?\/)?(exercises\/[\w\-]+\.(?:json|md))$/i);
        return !!(m?.[1]);
      };
      
      const inlineMarkdown = (text) => {
        let s = String(text ?? '');
        s = s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        s = s.replace(/\[(.*?)\]\((.*?)\)/g, (_, t, u) => `<a href="${u}">${t}</a>`);
        return s;
      };
      
      const attrEscape = (s) => String(s ?? '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
      
      const renderItem = (it, opts) => {
        if (!it || typeof it !== 'object') return '';
        const options = opts || {};
        const kind = String(it.kind || 'exercise');
        const name = String(it.name || '');
        const link = String(it.link || '');
        
        if (kind === 'exercise') {
          // Accept both 'prescribed' (plan) and 'prescription' (workout) shapes
          const presObj = it.prescribed ?? it.prescription;
          const meta = { cues: it.cues || [], prescription: presObj || null };
          if (it.logType) meta.logType = it.logType;
          if (it.loggable === false) meta.loggable = false;
          if (it.notes) meta.notes = it.notes;
          
          // Decide whether to render as link or non-link
          const asLink = !!link && isInternalExerciseLink(link);
          let html = `<li>${asLink
            ? `<a href="${esc(link)}" data-exmeta="${attrEscape(JSON.stringify(meta))}">${esc(name)}</a>`
            : `<span class="ex-name no-link" data-exmeta="${attrEscape(JSON.stringify(meta))}">${esc(name)}</span>`}`;
          
          // Append compact prescription summary
          if (presObj && typeof presObj === 'object') {
            try {
              const p = presObj || {};
              const parts = [];
              if (p.sets != null && p.reps != null) {
                const setsNumG = Number(p.sets);
                const setsLabelG = setsNumG === 1 ? 'set' : 'sets';
                parts.push(`${p.sets} ${setsLabelG} × ${p.reps} reps`);
              } else {
                if (p.sets != null) {
                  const setsNumG2 = Number(p.sets);
                  const setsLabelG2 = setsNumG2 === 1 ? 'set' : 'sets';
                  parts.push(`${p.sets} ${setsLabelG2}`);
                }
                if (p.reps != null) parts.push(`${p.reps} reps`);
              }
              if (p.weight != null) parts.push(typeof p.weight === 'number' ? `${p.weight} lb` : String(p.weight));
              const weightStr3 = typeof p.weight === 'string' ? p.weight.toLowerCase() : '';
              if (p.multiplier === 2 && !(weightStr3 && /(x2|×2|per\s*hand|each|per\s*side)/.test(weightStr3))) parts.push('x2');
              if (p.multiplier === 0 && !(weightStr3 && /bodyweight/.test(weightStr3))) parts.push('bodyweight');
              if (p.timeSeconds != null) { parts.push(`${p.timeSeconds} seconds`); }
              if (p.holdSeconds != null) { parts.push(`${p.holdSeconds} seconds`); }
              if (p.distanceMiles != null) parts.push(`${p.distanceMiles} miles`);
              if (p.distanceMeters != null) parts.push(`${p.distanceMeters} m`);
              if (p.rpe != null) parts.push(`RPE ${p.rpe}`);
              if (p.restSeconds != null) parts.push(`Rest ${p.restSeconds} seconds`);
              if (parts.length) html += ` — <span class="ex-presc">${parts.join(' · ')}</span>`;
            } catch (e) {}
          }
          if (!options.suppressCues && it.cues?.length) {
            html += `<ul>${it.cues.map((c) => `<li>${inlineMarkdown(c)}</li>`).join('')}</ul>`;
          }
          html += '</li>';
          return html;
        }
        return '';
      };
      
      const renderSection = (sec) => {
        if (!sec) return '';
        const title = String(sec.title || '');
        const type = String(sec.type || '');
        const rounds = sec.rounds != null ? ` — ${sec.rounds} rounds` : '';
        const typeText = type || 'Section';
        const display = typeText + (title ? ` — ${title}` : '');
        let h = `<section data-sectype="${attrEscape(typeText)}"><h2>${esc(display)}${esc(rounds)}</h2>`;
        if (sec.notes) { try { h += deps.renderMarkdownBasic(String(sec.notes)); } catch (e) { h += `<p>${esc(sec.notes)}</p>`; } }
        if (sec.items?.length) {
          let itemsHtml = sec.items.map((it) => renderItem(it, { suppressCues: true })).join('');
          if (itemsHtml.indexOf('<li') !== -1) itemsHtml = `<ul>${itemsHtml}</ul>`;
          h += itemsHtml;
        }
        h += '</section>';
        return h;
      };
      
      // If no sections provided, map exercises into a default section
      if ((!obj.sections?.length) && obj.exercises?.length) {
        const items = [];
        for (let ei = 0; ei < obj.exercises.length; ei++) {
          const ex = obj.exercises[ei] || {};
          const pres = (ex.prescribed ?? ex.prescription) || {};
          if (!pres.sets && ex.sets != null) pres.sets = ex.sets;
          if (!pres.reps && ex.reps != null) pres.reps = ex.reps;
          if (!pres.load && ex.load != null) pres.load = ex.load;
          if (!pres.rpe && ex.rpe != null) pres.rpe = ex.rpe;
          const linkFromPlan = typeof ex.link === 'string' ? ex.link : '';
          const linkValue = linkFromPlan || (ex.slug ? `exercises/${String(ex.slug).replace(/[^a-z0-9_\-]+/g,'')}.json` : '');
          items.push({
            kind: 'exercise',
            name: ex.name || ex.slug || 'Exercise',
            cues: ex.cues || [],
            prescription: pres,
            link: linkValue,
            slug: ex.slug || ''
          });
        }
        obj.sections = [{ type: 'Main', title: 'Main Sets', items }];
      }

      const parts = [];
      let titleTop = obj.title ? `<h1>${esc(obj.title)}</h1>` : '';
      if (obj.date) titleTop += `<p class="muted">${esc(obj.date)}</p>`;
      if (titleTop) parts.push(titleTop);
      if (obj.notes) { try { parts.push(deps.renderMarkdownBasic(String(obj.notes))); } catch (e) { parts.push(`<p>${esc(obj.notes)}</p>`); } }
      if (obj.sections?.length) {
        for (let si = 0; si < obj.sections.length; si++) parts.push(renderSection(obj.sections[si]));
      }
      
      deps.workoutContent.innerHTML = parts.join('\n');
      deps.fixExerciseAnchors(deps.workoutContent);
      
      // Intercept clicks on exercise links
      if (deps.workoutSection && !deps.workoutSection.__wiredExLinks) {
        deps.workoutSection.addEventListener('click', (e) => {
          let t = e.target || e.srcElement;
          if (!t) return;
          while (t && t !== deps.workoutSection && !(t.tagName?.toLowerCase() === 'a')) t = t.parentNode;
          if (!t || t === deps.workoutSection) return;
          const href = t.getAttribute('href') || '';
          if (/^https?:/i.test(href)) return;
          const exMatch = href.match(/(?:^|\/)?exercises\/[\w\-]+\.(?:md|json)$/i);
          if (exMatch) {
            try { e.preventDefault(); } catch (ex) {}
            const slug = (href.match(/exercises\/([\w\-]+)\.(?:md|json)$/i) || [])[1];
            const jsonPath = `exercises/${slug}.json`;
            try { window.location.href = `exercise.html?file=${encodeURIComponent(jsonPath)}`; } catch (ex) {}
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
      let hasLinkWarnings = false;
      try {
        hasLinkWarnings = !!((linkValidation?.invalid?.length) || (linkValidation?.missing?.length));
      } catch (e) { hasLinkWarnings = false; }
      if (!hasLinkWarnings) deps.status('');
    } catch (e) {
      deps.status(`Failed to render generated session: ${e?.message || e}`, { important: true });
    }
  };

  // ============================================================================
  // Kai Generation UI
  // ============================================================================

  const handleGenerateButtons = () => {
    if (!deps.genForm || deps.genForm.__wired) return;
    deps.genForm.__wired = true;
    
    if (deps.genClear) deps.genClear.onclick = () => {
      if (deps.genGoals) deps.genGoals.value = '';
      if (deps.genPain) deps.genPain.value = '';
      if (deps.genEquipment) deps.genEquipment.value = '';
      if (deps.genInstr) deps.genInstr.value = '';
      if (deps.genJSON) deps.genJSON.value = '';
      deps.status('Cleared.', { important: false });
    };
    
    if (deps.genLoadJSON) deps.genLoadJSON.onclick = () => {
      const text = deps.genJSON?.value || '';
      if (!text) return deps.status('Paste JSON first.', { important: true });
      let obj = null; 
      try { obj = JSON.parse(text); } catch (e) { return deps.status(`Invalid JSON: ${e?.message || e}`, { important: true }); }
      
      if (isWorkoutJSONShape(obj)) {
        validateWorkoutLinks(obj, (linkErrW) => {
          if (linkErrW) {
            deps.status('Some exercises are unknown or invalid; details won\'t open until they exist. Rendering anyway.', { important: true });
          }
          openGeneratedSession(obj);
        });
      } else if (looksLikeSessionPlan(obj)) {
        obj = normalizeSessionPlanInPlace(obj);
        const err = validateSessionPlan(obj);
        if (err) return deps.status(`SessionPlan invalid: ${err}`, { important: true });
        validateSessionPlanLinks(obj, (linkErr) => {
          if ((linkValidation.invalid?.length) || (linkValidation.missing?.length)) {
            const msgs = [];
            if (linkValidation.invalid?.length) msgs.push(`Invalid links (external or malformed): ${linkValidation.invalid.join(', ')}`);
            if (linkValidation.missing?.length) msgs.push(`Missing files: ${linkValidation.missing.join(', ')}`);
            deps.status(`Some exercise links are invalid or missing; details won't open until they exist: ${msgs.join(' | ')} — rendering anyway.`, { important: true });
          }
          openGeneratedSession(obj);
        });
      } else {
        return deps.status('Unsupported JSON shape: expected workout {sections[]} or plan {version:"1.0", exercises[]}', { important: true });
      }
    };
    
    if (deps.kaiUiEnabled && deps.genSubmit) deps.genSubmit.onclick = () => {
      const payload = {
        goals: deps.genGoals?.value || '',
        pain: (deps.genPain?.value || '').split(/,\s*/).filter(Boolean),
        equipment: (deps.genEquipment?.value || '').split(/,\s*/).filter(Boolean),
        personalInstructions: deps.genInstr?.value || ''
      };
      deps.status('Contacting Kai…');
      deps.xhrPostJSON('/api/kai/session-plan', payload, (err, text) => {
        if (err) {
          // Fallback: generate a local deterministic plan
          const today = new Date();
          const iso = today.toISOString().slice(0,10);
          const local = {
            version: '1.0',
            title: `Home Strength (Auto) — ${iso}`,
            date: iso,
            notes: 'Local fallback plan. Adjust loads conservatively.',
            exercises: [
              { slug: 'goblet_squat', name: 'Goblet Squat', prescribed: { sets: 3, reps: 8, rpe: 7 }, cues: ['Elbows down; bell tight', 'Knees track over toes'] },
              { slug: 'flat_dumbbell_bench_press', name: 'Flat DB Bench Press', prescribed: { sets: 3, reps: 10, rpe: 7 }, cues: ['Wrists stacked', 'Soft lockout'] },
              { slug: 'dumbbell_rdl', name: 'Dumbbell RDL', prescribed: { sets: 3, reps: 8, rpe: 7 }, cues: ['Hips back', 'Shins vertical'] },
              { slug: 'hammer_curl', name: 'Hammer Curl', prescribed: { sets: 3, reps: 12, rpe: 7 }, cues: ['Neutral grip', 'Control the lower'] }
            ]
          };
          const verr = validateSessionPlan(local);
          if (verr) return deps.status(`Fallback plan invalid: ${verr}`, { important: true });
          return validateSessionPlanLinks(local, (linkErrA) => {
            if (linkErrA) return deps.status(`Fallback link validation failed: ${linkErrA}`, { important: true });
            openGeneratedSession(local);
          });
        }
        let obj = null; 
        try { obj = JSON.parse(text); } catch (e) { return deps.status('Kai returned invalid JSON', { important: true }); }
        
        if (isWorkoutJSONShape(obj)) {
          validateWorkoutLinks(obj, (linkErrW2) => {
            if (linkErrW2) { deps.status('Some exercises are unknown or invalid; rendering anyway.', { important: true }); }
            openGeneratedSession(obj);
          });
        } else if (looksLikeSessionPlan(obj)) {
          obj = normalizeSessionPlanInPlace(obj);
          const v = validateSessionPlan(obj);
          if (v) return deps.status(`SessionPlan invalid: ${v}`, { important: true });
          validateSessionPlanLinks(obj, (linkErrB) => {
            if ((linkValidation.invalid?.length) || (linkValidation.missing?.length)) {
              const msgs2 = [];
              if (linkValidation.invalid?.length) msgs2.push(`Invalid links (external or malformed): ${linkValidation.invalid.join(', ')}`);
              if (linkValidation.missing?.length) msgs2.push(`Missing files: ${linkValidation.missing.join(', ')}`);
              deps.status(`Some exercise links are invalid or missing; details won't open until they exist: ${msgs2.join(' | ')} — rendering anyway.`, { important: true });
            }
            openGeneratedSession(obj);
          });
        } else {
          return deps.status('Kai returned unsupported JSON shape (expected workout or plan).', { important: true });
        }
      });
    };
  };

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
