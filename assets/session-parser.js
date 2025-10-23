/*
  exercAIse Session Parser Module
  Extracts and parses workout prescriptions from Markdown and JSON formats.
  
  Public API:
  - ExercAIse.SessionParser.slugify(s)
  - ExercAIse.SessionParser.parseHMSToSeconds(text)
  - ExercAIse.SessionParser.secondsToHHMMSS(totalSeconds)
  - ExercAIse.SessionParser.extractExercisesFromMarkdown(md)
  - ExercAIse.SessionParser.parseMarkdownPrescriptions(md)
  - ExercAIse.SessionParser.extractExercisesFromJSON(jsonText)
  - ExercAIse.SessionParser.parseJSONPrescriptions(jsonText)
*/

window.ExercAIse = window.ExercAIse || {};
window.ExercAIse.SessionParser = (() => {
  'use strict';

  // ============================================================================
  // Utility Functions
  // ============================================================================

  const slugify = (s) => {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  };

  // Time helpers: parse "hh:mm:ss" or "mm:ss" or "ss" into seconds; format seconds to "hh:mm:ss"
  const parseHMSToSeconds = (text) => {
    if (text == null) return null;
    const s = String(text).trim();
    if (!s) return null;
    if (/^\d+$/.test(s)) return parseInt(s, 10);
    const parts = s.split(':');
    if (!parts || parts.length === 0) return null;
    // Accept mm:ss or hh:mm:ss; treat single part already handled
    let sec = 0;
    if (parts.length === 2) {
      const m = parseInt(parts[0], 10);
      const ss = parseInt(parts[1], 10);
      if (isNaN(m) || isNaN(ss)) return null;
      sec = m * 60 + ss;
    } else if (parts.length >= 3) {
      // Use last three parts as h:m:s to be forgiving of extra colons
      const p3 = parts.slice(-3);
      const h = parseInt(p3[0], 10);
      const m2 = parseInt(p3[1], 10);
      const s2 = parseInt(p3[2], 10);
      if (isNaN(h) || isNaN(m2) || isNaN(s2)) return null;
      sec = h * 3600 + m2 * 60 + s2;
    } else {
      return null;
    }
    return sec;
  };

  const secondsToHHMMSS = (totalSeconds) => {
    if (totalSeconds == null || isNaN(totalSeconds)) return '';
    const sec = Math.max(0, Math.floor(Number(totalSeconds)));
    const h = Math.floor(sec / 3600);
    const rem = sec % 3600;
    const m = Math.floor(rem / 60);
    const s = rem % 60;
    const pad = (n) => (n < 10 ? '0' : '') + n;
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  };

  // ============================================================================
  // Markdown Parsing
  // ============================================================================

  const extractExercisesFromMarkdown = (md) => {
    // Heuristic: find markdown links pointing at exercises/*.(md|json) (relative or absolute within repo)
    const re = /\[(.*?)\]\(((?:https?:\/\/[^\)]+\/exercAIse\/)?(?:\.\.\/)?(?:\.\/)??exercises\/[\w\-]+\.(?:md|json))\)/g;
    const ex = [];
    let m;
    while ((m = re.exec(md))) {
      const title = m[1];
      const url = m[2];
      ex.push({ title, url });
    }
    // fallback: common headings like "Main Sets" not needed; we only need names for the form
    return ex;
  };

  const parseMarkdownPrescriptions = (md) => {
    // First try to find a trailing JSON block and parse with parseJSONPrescriptions.
    const mblock = md.match(/```json(?:[^\n]*)\n([\s\S]*?)\n```/g);
    if (mblock?.length) {
      const last = mblock[mblock.length - 1] || '';
      const inner = last.replace(/^```json[^\n]*\n/, '').replace(/\n```$/, '');
      const byExFromJson = parseJSONPrescriptions(inner);
      if (byExFromJson && Object.keys(byExFromJson).length) return byExFromJson;
    }
    // Fallback: heuristic parse of MD text
    // Return map exKey -> array of rows {set, reps, weight, rpe}
    const rowsByEx = {};
    const lines = md.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const linkMatch = line.match(/\[(.*?)\]\(((?:https?:\/\/[^\)]+\/exercAIse\/)?(?:\.\.\/)?(?:\.\/)?exercises\/[\w\-]+\.(?:md|json))\)/);
      if (!linkMatch) continue;
      const title = linkMatch[1];
      const exKey = slugify(title);
      // Context: current line + next 2 lines
      const ctx = `${line} ${lines[i+1] || ''} ${lines[i+2] || ''}`;
      let sets = null, reps = null, weight = null, rpe = null, multiplier = null;
      let m;
      // 3x12 or 3 x 12
      m = ctx.match(/(\d{1,2})\s*[x×]\s*(\d{1,3})/i);
      if (m) { sets = parseInt(m[1], 10); reps = parseInt(m[2], 10); }
      // "3 sets of 12" style
      if (sets == null) {
        m = ctx.match(/(\d{1,2})\s*sets?\s*(?:of|x)?\s*(\d{1,3})/i);
        if (m) { sets = parseInt(m[1], 10); reps = parseInt(m[2], 10); }
      }
      // reps only
      if (reps == null) {
        m = ctx.match(/(\d{1,3})\s*reps?/i);
        if (m) { reps = parseInt(m[1], 10); }
      }
      // weight
      m = ctx.match(/(\d{1,3}(?:\.\d+)?)\s*(lb|lbs|kg)/i);
      if (m) { weight = Number(m[1]); }
      // multiplier hints
      if (/per\s*hand|each|per\s*side|x2|×2/i.test(ctx)) multiplier = 2;
      if (/bodyweight/i.test(ctx)) multiplier = 0;
      // RPE
      m = ctx.match(/RPE\s*(\d{1,2}(?:\.\d+)?)/i);
      if (m) { rpe = Number(m[1]); }

      const rows = [];
      const count = sets || (reps != null ? 1 : 0);
      for (let s = 1; s <= count; s++) {
        const row = { set: s };
        if (reps != null) row.reps = reps;
        if (weight != null) row.weight = weight;
        if (multiplier != null) row.multiplier = multiplier;
        if (rpe != null) row.rpe = rpe;
        rows.push(row);
      }
      if (rows.length) rowsByEx[exKey] = rows;
    }

    // Extra fallback for endurance-type markdown without JSON: parse distance/RPE/time from plain text
    try {
      const titleMatch2 = md.match(/^#\s+(.+)$/m);
      const docTitle2 = titleMatch2 ? String(titleMatch2[1]).trim() : '';
      const docLower2 = md.toLowerCase();
      const isEnduranceDoc2 = /\b(run|jog|walk|tempo|quality run|easy run|bike|cycle|ride|rower|rowing|erg|swim)\b/.test(docLower2);
      if (isEnduranceDoc2) {
        let dist2 = null;
        const mDist2 = md.match(/(\d+(?:\.\d+)?)\s*(?:mi|miles?|mile)\b/i);
        if (mDist2) dist2 = Number(mDist2[1]);
        let rpeVal2 = null;
        const mRpe2 = md.match(/RPE\s*(\d{1,2}(?:\.\d+)?)/i);
        if (mRpe2) rpeVal2 = Number(mRpe2[1]);
        let timeSec2 = null;
        const mTimeColon2 = md.match(/\b(\d{1,2}):(\d{2})(?::(\d{2}))?\b/);
        if (mTimeColon2) {
          const h2 = mTimeColon2[3] != null ? parseInt(mTimeColon2[1], 10) : 0;
          const mmm2 = mTimeColon2[3] != null ? parseInt(mTimeColon2[2], 10) : parseInt(mTimeColon2[1], 10);
          const sss2 = mTimeColon2[3] != null ? parseInt(mTimeColon2[3], 10) : parseInt(mTimeColon2[2], 10);
          if (!isNaN(h2) && !isNaN(mmm2) && !isNaN(sss2)) timeSec2 = (h2 * 3600) + (mmm2 * 60) + sss2;
        } else {
          const mTimeMin2 = md.match(/\b(\d{1,3})\s*(?:min|minutes)\b/i);
          if (mTimeMin2) {
            const mins2 = parseInt(mTimeMin2[1], 10);
            if (!isNaN(mins2)) timeSec2 = mins2 * 60;
          }
        }
        const nameGuess2 = docTitle2 || 'Run';
        const key2 = slugify(nameGuess2);
        if (!rowsByEx[key2] && (dist2 != null || rpeVal2 != null || timeSec2 != null)) {
          rowsByEx[key2] = [{ set: 1 }];
          if (dist2 != null) rowsByEx[key2][0].distanceMiles = dist2;
          if (rpeVal2 != null) rowsByEx[key2][0].rpe = rpeVal2;
          if (timeSec2 != null) rowsByEx[key2][0].timeSeconds = timeSec2;
        }
      }
    } catch (e) {}

    return rowsByEx;
  };

  // ============================================================================
  // JSON Parsing
  // ============================================================================

  const parseJSONPrescriptions = (jsonText) => {
    const byEx = {};

    const plainName = (name) => {
      let s = String(name == null ? '' : name).trim();
      // Drop leading numbering like "1)", "1.", "1 -"
      s = s.replace(/^\s*\d+[\)\.-]\s*/, '');
      // If markdown-style link, extract the text inside []
      const m = s.match(/^\s*\[([^\]]+)\]\(([^)]+)\)/);
      if (m) return m[1];
      return s;
    };

    const firstNumberFrom = (text) => {
      if (typeof text === 'number') return text;
      if (typeof text !== 'string') return null;
      const m = text.match(/(\d+(?:\.\d+)?)/);
      return m ? Number(m[1]) : null;
    };

    const parseWeightSpec = (val) => {
      // Accept numbers directly, or strings like "27.5 lb per hand", "40 lb", "bodyweight", "50 total", "25 x2"
      const out = { weight: null, multiplier: null };
      if (typeof val === 'number') { out.weight = val; return out; }
      if (typeof val !== 'string') return out;
      const s = val.toLowerCase();
      const n = firstNumberFrom(s);
      if (n != null) out.weight = n;
      if (/per\s*hand|each|per\s*side|x2|×2/.test(s)) out.multiplier = 2;
      else if (/total/.test(s)) out.multiplier = 1;
      else if (/bodyweight/.test(s)) out.multiplier = 0;
      return out;
    };

    const parseRoundsHint = (text) => {
      if (!text) return null;
      const s = String(text);
      // Match "3-4 rounds" or "3–4 rounds" or "4 rounds"
      let m = s.match(/(\d+)\s*[–-]\s*(\d+)\s*rounds?/i);
      if (m) {
        const a = parseInt(m[1], 10), b = parseInt(m[2], 10);
        if (!isNaN(a) && !isNaN(b)) return Math.max(a, b);
      }
      m = s.match(/(\d+)\s*rounds?/i);
      if (m) {
        const n = parseInt(m[1], 10);
        if (!isNaN(n)) return n;
      }
      return null;
    };

    const addFor = (name, cfg, roundsHint) => {
      if (!name) return;
      const exKey = slugify(plainName(String(name)));
      let sets = null, reps = null, weight = null, rpe = null, multiplier = null;
      let timeSeconds = null, holdSeconds = null, distanceMeters = null, distanceMiles = null;
      if (cfg) {
        if (typeof cfg.sets === 'number') sets = cfg.sets;
        if (typeof cfg.reps === 'number') reps = cfg.reps;
        else if (typeof cfg.reps === 'string') reps = firstNumberFrom(cfg.reps);
        else if (Object.prototype.toString.call(cfg.reps) === '[object Array]') {
          const rows = [];
          for (let i = 0; i < cfg.reps.length; i++) {
            const r = parseInt(cfg.reps[i], 10);
            if (!isNaN(r)) rows.push({ set: i + 1, reps: r });
          }
          if (rows.length) { byEx[exKey] = rows; return; }
        }
        if (cfg.weight != null) {
          if (typeof cfg.weight === 'number') weight = cfg.weight;
          else {
            const ws = parseWeightSpec(cfg.weight);
            if (ws.weight != null) weight = ws.weight;
            if (ws.multiplier != null) multiplier = ws.multiplier;
          }
        }
        if (cfg.load != null) {
          if (typeof cfg.load === 'number') weight = cfg.load;
          else {
            const ws2 = parseWeightSpec(cfg.load);
            if (ws2.weight != null) weight = ws2.weight;
            if (ws2.multiplier != null) multiplier = ws2.multiplier;
          }
        }
        if (cfg.rpe != null) rpe = Number(cfg.rpe);
        if (cfg.timeSeconds != null) timeSeconds = Number(cfg.timeSeconds);
        if (cfg.holdSeconds != null) holdSeconds = Number(cfg.holdSeconds);
        if (cfg.distanceMeters != null) distanceMeters = Number(cfg.distanceMeters);
        if (cfg.distanceMiles != null) distanceMiles = Number(cfg.distanceMiles);
      }
      // If inside a circuit with rounds, prefer the rounds count if larger than the declared sets.
      let count = sets || 0;
      if (roundsHint && roundsHint > count) count = roundsHint;
      if (!count) {
        // Create a single row if any meaningful prescription exists (reps/time/hold/distance/rpe/weight)
        if (reps != null || timeSeconds != null || holdSeconds != null || distanceMeters != null || distanceMiles != null || rpe != null || weight != null) {
          count = 1;
        }
      }

      const rows2 = [];
      for (let s = 1; s <= count; s++) {
        const row = { set: s };
        if (reps != null) row.reps = reps;
        if (weight != null) row.weight = weight;
        if (multiplier != null) row.multiplier = multiplier;
        if (rpe != null) row.rpe = rpe;
        if (timeSeconds != null) row.timeSeconds = timeSeconds;
        if (holdSeconds != null) row.holdSeconds = holdSeconds;
        if (distanceMeters != null) row.distanceMeters = distanceMeters;
        if (distanceMiles != null) row.distanceMiles = distanceMiles;
        rows2.push(row);
      }
      if (rows2.length) byEx[exKey] = rows2;
    };

    try {
      const data = JSON.parse(jsonText);
      (function walk(node, roundsHint) {
        if (!node) return;
        if (Object.prototype.toString.call(node) === '[object Array]') {
          for (let i = 0; i < node.length; i++) walk(node[i], roundsHint);
          return;
        }
        if (typeof node === 'object') {
          // Update rounds hint from section titles or notes
          let newHint = roundsHint;
          if (node.rounds && typeof node.rounds === 'number') newHint = node.rounds;
          if (node.title) {
            const h = parseRoundsHint(node.title);
            if (h != null) newHint = h;
          }
          if (node.notes && newHint == null) {
            const h2 = parseRoundsHint(node.notes);
            if (h2 != null) newHint = h2;
          }

          // Prefer the 'prescription' object when present
          const cfgMaybe = (node && node.prescription) ? node.prescription : node;
          if (node.kind === 'exercise' && node.name) addFor(node.name, cfgMaybe, newHint);
          // Some content may use { name, sets, reps } directly or as prescription
          else if (node.name) {
            if (cfgMaybe && (
              cfgMaybe.sets != null || cfgMaybe.reps != null || cfgMaybe.timeSeconds != null || cfgMaybe.holdSeconds != null ||
              cfgMaybe.distanceMiles != null || cfgMaybe.distanceMeters != null || cfgMaybe.rpe != null ||
              cfgMaybe.weight != null || cfgMaybe.load != null
            )) {
              addFor(node.name, cfgMaybe, newHint);
            }
          }
          else if (node.exercise && typeof node.exercise === 'string') addFor(node.exercise, cfgMaybe, newHint);

          for (const k in node) if (node.hasOwnProperty(k)) walk(node[k], newHint);
        }
      })(data, null);
    } catch (e) {}
    return byEx;
  };

  const extractExercisesFromJSON = (jsonText) => {
    const ex = [];
    const seen = {};
    const add = (name) => {
      if (!name) return;
      let s = String(name);
      s = s.replace(/^\s*\d+[\)\.-]\s*/, '');
      const m = s.match(/^\s*\[([^\]]+)\]\(([^)]+)\)/);
      if (m) s = m[1];
      const key = slugify(s);
      if (seen[key]) return;
      seen[key] = true;
      ex.push({ title: s });
    };
    const walk = (node) => {
      if (!node) return;
      if (Object.prototype.toString.call(node) === '[object Array]') {
        for (let i = 0; i < node.length; i++) walk(node[i]);
        return;
      }
      if (typeof node === 'object') {
        // common patterns: { name: 'Exercise', sets: ..., reps: ... }
        if (node.name && typeof node.name === 'string') add(node.name);
        // also allow { exercise: '...', ... }
        if (node.exercise && typeof node.exercise === 'string') add(node.exercise);
        for (const k in node) if (node.hasOwnProperty(k)) walk(node[k]);
      }
    };
    try {
      const data = JSON.parse(jsonText);
      walk(data);
    } catch (e) {}
    return ex;
  };

  // ============================================================================
  // Public API
  // ============================================================================

  return {
    slugify: slugify,
    parseHMSToSeconds: parseHMSToSeconds,
    secondsToHHMMSS: secondsToHHMMSS,
    extractExercisesFromMarkdown: extractExercisesFromMarkdown,
    parseMarkdownPrescriptions: parseMarkdownPrescriptions,
    extractExercisesFromJSON: extractExercisesFromJSON,
    parseJSONPrescriptions: parseJSONPrescriptions
  };
})();
