/*
  exercAIse Kai Integration Module (TypeScript)
  Handles AI-generated session validation, link checking, and workout generation.
*/

(window as any).ExercAIse = (window as any).ExercAIse || {};
(window as any).ExercAIse.KaiIntegration = (() => {
  'use strict';

  // Dependencies (injected via init())
  let deps: any = {};
  
  // Track link validation results for pasted/generated SessionPlans and workout JSON
  const linkValidation: { invalid: string[]; missing: string[] } = { invalid: [], missing: [] };

  // ============================================================================
  // Initialization
  // ============================================================================

  const init = (dependencies: any): boolean => {
    deps = dependencies || {};
    return true;
  };

  // ============================================================================
  // Session Plan Validation
  // ============================================================================

  const validateSessionPlan = (obj: any): string | null => {
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

  const looksLikeSessionPlan = (obj: any): boolean => {
    return !!(obj && obj.version === '1.0' && obj.exercises && Object.prototype.toString.call(obj.exercises) === '[object Array]');
  };

  const isWorkoutJSONShape = (obj: any): boolean => {
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

  const normalizeSessionPlanInPlace = (plan: any): any => {
    try {
      if (!plan || !plan.exercises || !plan.exercises.length) return plan;
      
      const firstNumberFrom = (text: any): number | null => {
        if (typeof text === 'number') return text;
        if (typeof text !== 'string') return null;
        const m = text.match(/(\d+(?:\.\d+)?)/);
        return m ? Number(m[1]!) : null;
      };
      
      const parseWeightSpec = (val: any): { weight: number | null; multiplier: number | null } => {
        const out: { weight: number | null; multiplier: number | null } = { weight: null, multiplier: null };
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
      
      const normalizeReps = (reps: any): any => {
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
            let low = parseInt(rangeMatch[1]!, 10);
            let high = parseInt(rangeMatch[2]!, 10);
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
            const intReps2 = Math.max(1, parseInt(singleMatch[1]!, 10));
            return { reps_low: intReps2, reps_high: intReps2, reps_display, isRange: false };
          }
          // Handle malformed string
          return { reps_low: null, reps_high: null, reps_display, isRange: false, error: 'Malformed reps string' };
        }
        // Unsupported type
        return { reps_low: null, reps_high: null, reps_display, isRange: false, error: 'Unsupported reps type' };
      };
      
      const parseTimeToSec = (text: any): number | null => {
        if (text == null) return null;
        if (typeof text === 'number') return text;
        const s = String(text).trim().toLowerCase();
        // mm:ss or h:mm:ss (use imported function)
        const colon = deps.parseHMSToSeconds ? deps.parseHMSToSeconds(s) : null;
        if (colon != null) return colon;
        let m: RegExpMatchArray | null;
        m = s.match(/(\d{1,3})\s*(?:min|minutes?)/);
        if (m) { const mins = parseInt(m[1]!, 10); if (!isNaN(mins)) return mins * 60; }
        m = s.match(/(\d{1,3})\s*(?:sec|seconds?)/);
        if (m) { const secs = parseInt(m[1]!, 10); if (!isNaN(secs)) return secs; }
        const n = firstNumberFrom(s);
        return n != null ? n : null;
      };
      
      const parseDistance = (text: any): { miles: number | null; meters: number | null } => {
        if (text == null) return { miles: null, meters: null };
        if (typeof text === 'number') return { miles: text, meters: null };
        const s = String(text).toLowerCase();
        let m: RegExpMatchArray | null;
        m = s.match(/(\d+(?:\.\d+)?)\s*(?:mi|miles?)/);
        if (m) return { miles: Number(m[1]!), meters: null };
        m = s.match(/(\d+(?:\.\d+)?)\s*(?:m|meters?)/);
        if (m) return { miles: null, meters: Number(m[1]!) };
        const n = firstNumberFrom(s);
        return { miles: n, meters: null };
      };
      
      for (let i = 0; i < plan.exercises.length; i++) {
        const ex = plan.exercises[i];
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
      }
    } catch (e) {
      // Ignore normalization errors
    }
    return plan;
  };

  // ============================================================================
  // Link Validation
  // ============================================================================

  const validateSessionPlanLinks = (obj: any, cb: (err: string | null) => void): void => {
    linkValidation.invalid = [];
    linkValidation.missing = [];
    if (!obj || !obj.exercises || !obj.exercises.length) {
      cb(null);
      return;
    }
    
    let pending = 0;
    const isInternal = (url: string): boolean => {
      if (!url) return false;
      if (/^https?:/i.test(url)) return false;
      return /^(?:\.?\.?\/)?exercises\/[\w\-]+\.(?:json|md)$/i.test(url);
    };
    
    const checkDone = () => {
      if (--pending === 0) {
        const hasErrors = linkValidation.invalid.length > 0 || linkValidation.missing.length > 0;
        if (hasErrors) {
          // Show detailed warning
          const parts: string[] = [];
          if (linkValidation.invalid.length) parts.push('Invalid links: ' + linkValidation.invalid.join(', '));
          if (linkValidation.missing.length) parts.push('Missing files: ' + linkValidation.missing.join(', '));
          deps.status(parts.join('; '), { important: true });
        }
        cb(hasErrors ? 'Link errors detected' : null);
      }
    };
    
    for (let i = 0; i < obj.exercises.length; i++) {
      const ex = obj.exercises[i];
      const link = String(ex.link || '').trim();
      if (!link) continue; // link is optional
      if (!isInternal(link)) {
        linkValidation.invalid.push(link);
        continue;
      }
      
      pending++;
      deps.xhrGet(link, (err: any) => {
        if (err) linkValidation.missing.push(link);
        checkDone();
      });
    }
    
    if (pending === 0) {
      // No async checks needed, but still check if we found invalid external links
      const hasErrors = linkValidation.invalid.length > 0;
      if (hasErrors) {
        deps.status('Invalid links: ' + linkValidation.invalid.join(', '), { important: true });
      }
      cb(hasErrors ? 'Link errors detected' : null);
    }
  };

  const validateWorkoutLinks = (obj: any, cb: (err: string | null) => void): void => {
    linkValidation.invalid = [];
    linkValidation.missing = [];
    if (!obj || !obj.sections) { cb(null); return; }
    
    let pending = 0;
    const checkDone = () => { if (--pending === 0) cb(linkValidation.invalid.length || linkValidation.missing.length ? 'Link errors detected' : null); };
    
    for (let i = 0; i < obj.sections.length; i++) {
      const sec = obj.sections[i];
      if (!sec.items) continue;
      for (let j = 0; j < sec.items.length; j++) {
        const item = sec.items[j];
        if (!item.link) continue;
        const link = item.link.trim();
        if (!link.startsWith('../exercises/') && !link.startsWith('exercises/')) continue;
        
        pending++;
        deps.xhrGet(link, (err: any) => {
          if (err) {
            if (err.message && err.message.includes('404')) linkValidation.missing.push(link);
            else linkValidation.invalid.push(link);
          }
          checkDone();
        });
      }
    }
    
    if (pending === 0) cb(null);
  };

  // ============================================================================
  // Exercise Stub Generation
  // ============================================================================

  const generateExerciseStub = (slug: string, name: string): { path: string; json: string } => {
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

  const generateExerciseStubsFromObj = (_obj: any, missingSlugs: string[]): string => {
    if (!missingSlugs || !missingSlugs.length) return '';
    const stubs: string[] = [];
    for (let i = 0; i < missingSlugs.length; i++) {
      const slug = missingSlugs[i]!;
      const stub = generateExerciseStub(slug, '');
      stubs.push(`\n// ${stub.path}\n${stub.json}`);
    }
    return stubs.join('\n');
  };

  const generateExerciseStubsFromPlan = (plan: any, missingSlugs: string[]): string => {
    if (!plan || !plan.exercises || !missingSlugs || !missingSlugs.length) return '';
    const slugToName: { [key: string]: string } = {};
    for (let i = 0; i < plan.exercises.length; i++) {
      const ex = plan.exercises[i];
      if (ex.slug) slugToName[ex.slug] = ex.name || '';
    }
    const stubs: string[] = [];
    for (let i = 0; i < missingSlugs.length; i++) {
      const slug = missingSlugs[i]!;
      const name = slugToName[slug] || '';
      const stub = generateExerciseStub(slug, name);
      stubs.push(`\n// ${stub.path}\n${stub.json}`);
    }
    return stubs.join('\n');
  };

  // ============================================================================
  // Session Opening & Display
  // ============================================================================

  const openGeneratedSession = (obj: any): void => {
    // Show workout section and hide others (same as openSession in app.ts)
    deps.setVisibility(deps.readmeSection, false);
    deps.setVisibility(deps.logsSection, false);
    deps.setVisibility(deps.generateSection, false);
    deps.setVisibility(deps.workoutSection, true);
    
    try {
      const esc = (s: any): string => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      const attrEscape = (s: any): string => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
      
      // Local helper to determine if a link targets an internal exercise file
      const isInternalExerciseLink = (url: string): boolean => {
        if (!url) return false;
        if (/^https?:/i.test(url)) return false;
        const m = String(url).match(/^(?:\.?\.?\/)?(exercises\/[\w\-]+\.(?:json|md))$/i);
        return !!(m && m[1]);
      };
      
      const inlineMarkdown = (text: string): string => {
        let s = String(text == null ? '' : text);
        s = s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        s = s.replace(/\[(.*?)\]\((.*?)\)/g, (_: string, t: string, u: string) => '<a href="' + u + '">' + t + '</a>');
        return s;
      };
      
      const renderItem = (it: any, opts?: any): string => {
        if (!it || typeof it !== 'object') return '';
        const options = opts || {};
        const kind = String(it.kind || 'exercise');
        const name = String(it.name || '');
        const link = String(it.link || '');
        
        if (kind === 'exercise') {
          // Accept both 'prescribed' (plan) and 'prescription' (workout) shapes
          const presObj = (it.prescribed != null ? it.prescribed : it.prescription);
          const meta: any = { cues: (it.cues || []), prescription: (presObj || null) };
          if (it.logType) meta.logType = it.logType;
          if (it.loggable === false) meta.loggable = false;
          if (it.notes) meta.notes = it.notes;
          
          // Decide whether to render as link or non-link
          // Only link when an explicit internal exercise link is provided
          const asLink = !!link && isInternalExerciseLink(link);
          let html = '<li>' + (asLink
            ? ('<a href="' + esc(link) + '" data-exmeta="' + attrEscape(JSON.stringify(meta)) + '">' + esc(name) + '</a>')
            : ('<span class="ex-name no-link" data-exmeta="' + attrEscape(JSON.stringify(meta)) + '">' + esc(name) + '</span>'));
          
          // Append compact prescription summary inline for list-only display
          if (presObj && typeof presObj === 'object') {
            try {
              const p = presObj || {};
              const parts: string[] = [];
              if (p.sets != null && p.reps != null) {
                const setsNum = Number(p.sets);
                const setsLabel = (setsNum === 1 ? 'set' : 'sets');
                parts.push(String(p.sets) + ' ' + setsLabel + ' × ' + String(p.reps) + ' reps');
              } else {
                if (p.sets != null) {
                  const setsNum = Number(p.sets);
                  const setsLabel = (setsNum === 1 ? 'set' : 'sets');
                  parts.push(String(p.sets) + ' ' + setsLabel);
                }
                if (p.reps != null) parts.push(String(p.reps) + ' reps');
              }
              if (p.weight != null) parts.push(typeof p.weight === 'number' ? (String(p.weight) + ' lb') : String(p.weight));
              const weightStr = (typeof p.weight === 'string') ? p.weight.toLowerCase() : '';
              if (p.multiplier === 2 && !(weightStr && /(x2|×2|per\s*hand|each|per\s*side)/.test(weightStr))) parts.push('x2');
              if (p.multiplier === 0 && !(weightStr && /bodyweight/.test(weightStr))) parts.push('bodyweight');
              if (p.timeSeconds != null) parts.push(String(p.timeSeconds) + ' seconds');
              if (p.holdSeconds != null) parts.push(String(p.holdSeconds) + ' seconds');
              if (p.distanceMiles != null) parts.push(String(p.distanceMiles) + ' miles');
              if (p.distanceMeters != null) parts.push(String(p.distanceMeters) + ' m');
              if (p.rpe != null) parts.push('RPE ' + String(p.rpe));
              if (p.restSeconds != null) parts.push('Rest ' + String(p.restSeconds) + ' seconds');
              if (parts.length) html += ' — <span class="ex-presc">' + parts.join(' · ') + '</span>';
            } catch (e) {}
          }
          if (!options.suppressCues && it.cues && it.cues.length) {
            html += '<ul>' + it.cues.map((c: string) => '<li>' + inlineMarkdown(c) + '</li>').join('') + '</ul>';
          }
          html += '</li>';
          return html;
        }
        return '';
      };
      
      const renderSection = (sec: any): string => {
        if (!sec) return '';
        const title = String(sec.title || '');
        const type = String(sec.type || '');
        const rounds = (sec.rounds != null) ? (' — ' + sec.rounds + ' rounds') : '';
        const typeText = type || 'Section';
        const display = typeText + (title ? (' — ' + title) : '');
        let h = '<section data-sectype="' + attrEscape(typeText) + '"><h2>' + esc(display) + esc(rounds) + '</h2>';
        if (sec.notes) {
          try { h += deps.renderMarkdownBasic(String(sec.notes)); }
          catch (e) { h += '<p>' + esc(sec.notes) + '</p>'; }
        }
        if (sec.items && sec.items.length) {
          let itemsHtml = sec.items.map((it: any) => renderItem(it, { suppressCues: true })).join('');
          if (itemsHtml.indexOf('<li') !== -1) itemsHtml = '<ul>' + itemsHtml + '</ul>';
          h += itemsHtml;
        }
        h += '</section>';
        return h;
      };
      
      // If no sections provided, map exercises into a default section for display
      if ((!obj.sections || !obj.sections.length) && obj.exercises && obj.exercises.length) {
        const items: any[] = [];
        for (let ei = 0; ei < obj.exercises.length; ei++) {
          const ex = obj.exercises[ei] || {};
          // Accept either 'prescribed' (plan) or 'prescription' (workout-style)
          let pres = (ex.prescribed != null ? ex.prescribed : ex.prescription) || {};
          // Accept top-level sets/reps as well
          if (!pres.sets && ex.sets != null) pres.sets = ex.sets;
          if (!pres.reps && ex.reps != null) pres.reps = ex.reps;
          if (!pres.load && ex.load != null) pres.load = ex.load;
          if (!pres.rpe && ex.rpe != null) pres.rpe = ex.rpe;
          // Preserve explicit link from SessionPlan when provided; otherwise, derive from slug if available
          const linkFromPlan = (typeof ex.link === 'string') ? ex.link : '';
          const linkValue = linkFromPlan || (ex.slug ? ('exercises/' + String(ex.slug).replace(/[^a-z0-9_\-]+/g,'') + '.json') : '');
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

      const parts: string[] = [];
      let titleTop = obj.title ? '<h1>' + esc(obj.title) + '</h1>' : '';
      if (obj.date) titleTop += '<p class="muted">' + esc(obj.date) + '</p>';
      if (titleTop) parts.push(titleTop);
      if (obj.notes) {
        try { parts.push(deps.renderMarkdownBasic(String(obj.notes))); }
        catch (e) { parts.push('<p>' + esc(obj.notes) + '</p>'); }
      }
      if (obj.sections && obj.sections.length) {
        for (let si = 0; si < obj.sections.length; si++) parts.push(renderSection(obj.sections[si]));
      }
      deps.workoutContent.innerHTML = parts.join('\n');
      deps.fixExerciseAnchors(deps.workoutContent);
      
      // Build interactive form cards in #exercise-forms
      deps.setVisibility(deps.formSection, true);
      deps.buildForm('(pasted-json)', JSON.stringify(obj), true);
      
      // Update meta/title
      if (deps.workoutTitleEl) deps.workoutTitleEl.textContent = obj.title || 'Generated Session';
      if (deps.workoutMetaEl) deps.setVisibility(deps.workoutMetaEl, true);
      if (deps.openOnGitHubEl) {
        deps.openOnGitHubEl.href = '#';
        deps.setVisibility(deps.openOnGitHubEl, false);
      }
      
      try { window.scrollTo(0, 0); } catch (e) {}
      
      // Preserve prior important warnings (e.g., invalid/missing links) by not clearing status in that case
      let hasLinkWarnings = false;
      try {
        hasLinkWarnings = !!((deps.linkValidation && deps.linkValidation.invalid && deps.linkValidation.invalid.length) || 
                            (deps.linkValidation && deps.linkValidation.missing && deps.linkValidation.missing.length));
      } catch (e) { hasLinkWarnings = false; }
      if (!hasLinkWarnings) deps.status('Opened generated session', { important: true });
      
    } catch (e: any) {
      deps.status('Failed to render generated session: ' + (e && e.message || e), { important: true });
    }
  };

  // ============================================================================
  // UI Event Handlers
  // ============================================================================

  const handleGenerateButtons = (): void => {
    if (!deps.genSubmit || !deps.genClear || !deps.genLoadJSON) return;
    
    // Submit handler
    deps.genSubmit.addEventListener('click', (e: Event) => {
      e.preventDefault();
      const goals = deps.genGoals ? deps.genGoals.value.trim() : '';
      const pain = deps.genPain ? deps.genPain.value.trim() : '';
      const equipment = deps.genEquipment ? deps.genEquipment.value.trim() : '';
      const instructions = deps.genInstr ? deps.genInstr.value.trim() : '';
      
      if (!goals && !pain && !equipment && !instructions) {
        deps.status('Please enter at least one field', { important: true });
        return;
      }
      
      deps.status('Generating workout...', { important: true });
      
      const payload = { goals, pain, equipment, instructions };
      deps.xhrPostJSON('/api/kai/session-plan', payload, (err: any, text?: string) => {
        if (err) {
          deps.status('Generation failed: ' + err.message, { important: true });
          // Fallback: local plan
          const fallback = {
            version: '1.0',
            title: 'Fallback Session (API unavailable)',
            date: new Date().toISOString().split('T')[0],
            exercises: [
              { name: 'Bodyweight Squat', prescribed: { sets: 3, reps: 10 } },
              { name: 'Push-ups', prescribed: { sets: 3, reps: 10 } }
            ]
          };
          if (deps.genJSON) deps.genJSON.value = JSON.stringify(fallback, null, 2);
          openGeneratedSession(fallback);
          return;
        }
        
        try {
          const obj = JSON.parse(text || '{}');
          if (deps.genJSON) deps.genJSON.value = JSON.stringify(obj, null, 2);
          
          // Validate
          const validationErr = validateSessionPlan(obj);
          if (validationErr) {
            deps.status('Invalid session plan: ' + validationErr, { important: true });
            return;
          }
          
          // Normalize
          normalizeSessionPlanInPlace(obj);
          
          // Validate links
          validateSessionPlanLinks(obj, (linkErr: string | null) => {
            // Status message already set by validateSessionPlanLinks if there are errors
            if (!linkErr) {
              deps.status('Session generated successfully', { important: true });
            }
            openGeneratedSession(obj);
          });
        } catch (parseErr) {
          deps.status('Failed to parse response', { important: true });
        }
      });
    });
    
    // Clear handler
    deps.genClear.addEventListener('click', () => {
      if (deps.genGoals) deps.genGoals.value = '';
      if (deps.genPain) deps.genPain.value = '';
      if (deps.genEquipment) deps.genEquipment.value = '';
      if (deps.genInstr) deps.genInstr.value = '';
      if (deps.genJSON) deps.genJSON.value = '';
      deps.status('Cleared form');
    });
    
    // Load JSON handler
    deps.genLoadJSON.addEventListener('click', () => {
      const jsonText = deps.genJSON ? deps.genJSON.value.trim() : '';
      if (!jsonText) {
        deps.status('No JSON to load', { important: true });
        return;
      }
      
      try {
        const obj = JSON.parse(jsonText);
        
        // Determine if SessionPlan or workout JSON
        if (looksLikeSessionPlan(obj)) {
          const err = validateSessionPlan(obj);
          if (err) {
            deps.status('Invalid SessionPlan: ' + err, { important: true });
            return;
          }
          normalizeSessionPlanInPlace(obj);
          validateSessionPlanLinks(obj, () => {
            // Status message already set by validateSessionPlanLinks if there are errors
            openGeneratedSession(obj);
          });
        } else if (isWorkoutJSONShape(obj)) {
          validateWorkoutLinks(obj, () => {
            // Status message already set by validateWorkoutLinks if there are errors
            openGeneratedSession(obj);
          });
        } else {
          deps.status('Unrecognized JSON format', { important: true });
        }
      } catch (e) {
        deps.status('Invalid JSON', { important: true });
      }
    });
  };

  // ============================================================================
  // Public API
  // ============================================================================

  return {
    init,
    linkValidation,
    openGeneratedSession,
    validateSessionPlan,
    normalizeSessionPlanInPlace,
    validateSessionPlanLinks,
    isWorkoutJSONShape,
    looksLikeSessionPlan,
    validateWorkoutLinks,
    handleGenerateButtons,
    generateExerciseStub,
    generateExerciseStubsFromObj,
    generateExerciseStubsFromPlan
  };
})();

// Export for ES module compatibility
