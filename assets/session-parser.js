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
window.ExercAIse.SessionParser = (function() {
  'use strict';

  // ============================================================================
  // Utility Functions
  // ============================================================================

  function slugify(s) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  // Time helpers: parse "hh:mm:ss" or "mm:ss" or "ss" into seconds; format seconds to "hh:mm:ss"
  function parseHMSToSeconds(text) {
    if (text == null) return null;
    var s = String(text).trim();
    if (!s) return null;
    if (/^\d+$/.test(s)) return parseInt(s, 10);
    var parts = s.split(':');
    if (!parts || parts.length === 0) return null;
    // Accept mm:ss or hh:mm:ss; treat single part already handled
    var sec = 0;
    if (parts.length === 2) {
      var m = parseInt(parts[0], 10);
      var ss = parseInt(parts[1], 10);
      if (isNaN(m) || isNaN(ss)) return null;
      sec = m * 60 + ss;
    } else if (parts.length >= 3) {
      // Use last three parts as h:m:s to be forgiving of extra colons
      var p3 = parts.slice(-3);
      var h = parseInt(p3[0], 10);
      var m2 = parseInt(p3[1], 10);
      var s2 = parseInt(p3[2], 10);
      if (isNaN(h) || isNaN(m2) || isNaN(s2)) return null;
      sec = h * 3600 + m2 * 60 + s2;
    } else {
      return null;
    }
    return sec;
  }

  function secondsToHHMMSS(totalSeconds) {
    if (totalSeconds == null || isNaN(totalSeconds)) return '';
    var sec = Math.max(0, Math.floor(Number(totalSeconds)));
    var h = Math.floor(sec / 3600);
    var rem = sec % 3600;
    var m = Math.floor(rem / 60);
    var s = rem % 60;
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    return pad(h) + ':' + pad(m) + ':' + pad(s);
  }

  // ============================================================================
  // Markdown Parsing
  // ============================================================================

  function extractExercisesFromMarkdown(md) {
    // Heuristic: find markdown links pointing at exercises/*.(md|json) (relative or absolute within repo)
    var re = /\[(.*?)\]\(((?:https?:\/\/[^\)]+\/exercAIse\/)?(?:\.\.\/)?(?:\.\/)??exercises\/[\w\-]+\.(?:md|json))\)/g;
    var ex = [];
    var m;
    while ((m = re.exec(md))) {
      var title = m[1];
      var url = m[2];
      ex.push({ title: title, url: url });
    }
    // fallback: common headings like "Main Sets" not needed; we only need names for the form
    return ex;
  }

  function parseMarkdownPrescriptions(md) {
    // First try to find a trailing JSON block and parse with parseJSONPrescriptions.
    var mblock = md.match(/```json(?:[^\n]*)\n([\s\S]*?)\n```/g);
    if (mblock && mblock.length) {
      var last = mblock[mblock.length - 1] || '';
      var inner = last.replace(/^```json[^\n]*\n/, '').replace(/\n```$/, '');
      var byExFromJson = parseJSONPrescriptions(inner);
      if (byExFromJson && Object.keys(byExFromJson).length) return byExFromJson;
    }
    // Fallback: heuristic parse of MD text
    // Return map exKey -> array of rows {set, reps, weight, rpe}
    var rowsByEx = {};
    var lines = md.split(/\r?\n/);
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var linkMatch = line.match(/\[(.*?)\]\(((?:https?:\/\/[^\)]+\/exercAIse\/)?(?:\.\.\/)?(?:\.\/)?exercises\/[\w\-]+\.(?:md|json))\)/);
      if (!linkMatch) continue;
      var title = linkMatch[1];
      var exKey = slugify(title);
      // Context: current line + next 2 lines
      var ctx = line + ' ' + (lines[i+1] || '') + ' ' + (lines[i+2] || '');
      var sets = null, reps = null, weight = null, rpe = null, multiplier = null;
      var m;
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

      var rows = [];
      var count = sets || (reps != null ? 1 : 0);
      for (var s = 1; s <= count; s++) {
        var row = { set: s };
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
      var titleMatch2 = md.match(/^#\s+(.+)$/m);
      var docTitle2 = titleMatch2 ? String(titleMatch2[1]).trim() : '';
      var docLower2 = md.toLowerCase();
      var isEnduranceDoc2 = /\b(run|jog|walk|tempo|quality run|easy run|bike|cycle|ride|rower|rowing|erg|swim)\b/.test(docLower2);
      if (isEnduranceDoc2) {
        var dist2 = null;
        var mDist2 = md.match(/(\d+(?:\.\d+)?)\s*(?:mi|miles?|mile)\b/i);
        if (mDist2) dist2 = Number(mDist2[1]);
        var rpeVal2 = null;
        var mRpe2 = md.match(/RPE\s*(\d{1,2}(?:\.\d+)?)/i);
        if (mRpe2) rpeVal2 = Number(mRpe2[1]);
        var timeSec2 = null;
        var mTimeColon2 = md.match(/\b(\d{1,2}):(\d{2})(?::(\d{2}))?\b/);
        if (mTimeColon2) {
          var h2 = mTimeColon2[3] != null ? parseInt(mTimeColon2[1], 10) : 0;
          var mmm2 = mTimeColon2[3] != null ? parseInt(mTimeColon2[2], 10) : parseInt(mTimeColon2[1], 10);
          var sss2 = mTimeColon2[3] != null ? parseInt(mTimeColon2[3], 10) : parseInt(mTimeColon2[2], 10);
          if (!isNaN(h2) && !isNaN(mmm2) && !isNaN(sss2)) timeSec2 = (h2 * 3600) + (mmm2 * 60) + sss2;
        } else {
          var mTimeMin2 = md.match(/\b(\d{1,3})\s*(?:min|minutes)\b/i);
          if (mTimeMin2) {
            var mins2 = parseInt(mTimeMin2[1], 10);
            if (!isNaN(mins2)) timeSec2 = mins2 * 60;
          }
        }
        var nameGuess2 = docTitle2 || 'Run';
        var key2 = slugify(nameGuess2);
        if (!rowsByEx[key2] && (dist2 != null || rpeVal2 != null || timeSec2 != null)) {
          rowsByEx[key2] = [{ set: 1 }];
          if (dist2 != null) rowsByEx[key2][0].distanceMiles = dist2;
          if (rpeVal2 != null) rowsByEx[key2][0].rpe = rpeVal2;
          if (timeSec2 != null) rowsByEx[key2][0].timeSeconds = timeSec2;
        }
      }
    } catch (e) {}

    return rowsByEx;
  }

  // ============================================================================
  // JSON Parsing
  // ============================================================================

  function parseJSONPrescriptions(jsonText) {
    var byEx = {};

    function plainName(name) {
      var s = String(name == null ? '' : name).trim();
      // Drop leading numbering like "1)", "1.", "1 -"
      s = s.replace(/^\s*\d+[\)\.-]\s*/, '');
      // If markdown-style link, extract the text inside []
      var m = s.match(/^\s*\[([^\]]+)\]\(([^)]+)\)/);
      if (m) return m[1];
      return s;
    }

    function firstNumberFrom(text) {
      if (typeof text === 'number') return text;
      if (typeof text !== 'string') return null;
      var m = text.match(/(\d+(?:\.\d+)?)/);
      return m ? Number(m[1]) : null;
    }

    function parseWeightSpec(val) {
      // Accept numbers directly, or strings like "27.5 lb per hand", "40 lb", "bodyweight", "50 total", "25 x2"
      var out = { weight: null, multiplier: null };
      if (typeof val === 'number') { out.weight = val; return out; }
      if (typeof val !== 'string') return out;
      var s = val.toLowerCase();
      var n = firstNumberFrom(s);
      if (n != null) out.weight = n;
      if (/per\s*hand|each|per\s*side|x2|×2/.test(s)) out.multiplier = 2;
      else if (/total/.test(s)) out.multiplier = 1;
      else if (/bodyweight/.test(s)) out.multiplier = 0;
      return out;
    }

    function parseRoundsHint(text) {
      if (!text) return null;
      var s = String(text);
      // Match "3-4 rounds" or "3–4 rounds" or "4 rounds"
      var m = s.match(/(\d+)\s*[–-]\s*(\d+)\s*rounds?/i);
      if (m) {
        var a = parseInt(m[1], 10), b = parseInt(m[2], 10);
        if (!isNaN(a) && !isNaN(b)) return Math.max(a, b);
      }
      m = s.match(/(\d+)\s*rounds?/i);
      if (m) {
        var n = parseInt(m[1], 10);
        if (!isNaN(n)) return n;
      }
      return null;
    }

    function addFor(name, cfg, roundsHint) {
      if (!name) return;
      var exKey = slugify(plainName(String(name)));
      var sets = null, reps = null, weight = null, rpe = null, multiplier = null;
      var timeSeconds = null, holdSeconds = null, distanceMeters = null, distanceMiles = null;
      if (cfg) {
        if (typeof cfg.sets === 'number') sets = cfg.sets;
        if (typeof cfg.reps === 'number') reps = cfg.reps;
        else if (typeof cfg.reps === 'string') reps = firstNumberFrom(cfg.reps);
        else if (Object.prototype.toString.call(cfg.reps) === '[object Array]') {
          var rows = [];
          for (var i = 0; i < cfg.reps.length; i++) {
            var r = parseInt(cfg.reps[i], 10);
            if (!isNaN(r)) rows.push({ set: i + 1, reps: r });
          }
          if (rows.length) { byEx[exKey] = rows; return; }
        }
        if (cfg.weight != null) {
          if (typeof cfg.weight === 'number') weight = cfg.weight;
          else {
            var ws = parseWeightSpec(cfg.weight);
            if (ws.weight != null) weight = ws.weight;
            if (ws.multiplier != null) multiplier = ws.multiplier;
          }
        }
        if (cfg.load != null) {
          if (typeof cfg.load === 'number') weight = cfg.load;
          else {
            var ws2 = parseWeightSpec(cfg.load);
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
      var count = sets || 0;
      if (roundsHint && roundsHint > count) count = roundsHint;
      if (!count) {
        // Create a single row if any meaningful prescription exists (reps/time/hold/distance/rpe/weight)
        if (reps != null || timeSeconds != null || holdSeconds != null || distanceMeters != null || distanceMiles != null || rpe != null || weight != null) {
          count = 1;
        }
      }

      var rows2 = [];
      for (var s = 1; s <= count; s++) {
        var row = { set: s };
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
    }

    try {
      var data = JSON.parse(jsonText);
      (function walk(node, roundsHint) {
        if (!node) return;
        if (Object.prototype.toString.call(node) === '[object Array]') {
          for (var i = 0; i < node.length; i++) walk(node[i], roundsHint);
          return;
        }
        if (typeof node === 'object') {
          // Update rounds hint from section titles or notes
          var newHint = roundsHint;
          if (node.rounds && typeof node.rounds === 'number') newHint = node.rounds;
          if (node.title) {
            var h = parseRoundsHint(node.title);
            if (h != null) newHint = h;
          }
          if (node.notes && newHint == null) {
            var h2 = parseRoundsHint(node.notes);
            if (h2 != null) newHint = h2;
          }

          // Prefer the 'prescription' object when present
          var cfgMaybe = (node && node.prescription) ? node.prescription : node;
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

          for (var k in node) if (node.hasOwnProperty(k)) walk(node[k], newHint);
        }
      })(data, null);
    } catch (e) {}
    return byEx;
  }

  function extractExercisesFromJSON(jsonText) {
    var ex = [];
    var seen = {};
    function add(name) {
      if (!name) return;
      var s = String(name);
      s = s.replace(/^\s*\d+[\)\.-]\s*/, '');
      var m = s.match(/^\s*\[([^\]]+)\]\(([^)]+)\)/);
      if (m) s = m[1];
      var key = slugify(s);
      if (seen[key]) return;
      seen[key] = true;
      ex.push({ title: s });
    }
    function walk(node) {
      if (!node) return;
      if (Object.prototype.toString.call(node) === '[object Array]') {
        for (var i = 0; i < node.length; i++) walk(node[i]);
        return;
      }
      if (typeof node === 'object') {
        // common patterns: { name: 'Exercise', sets: ..., reps: ... }
        if (node.name && typeof node.name === 'string') add(node.name);
        // also allow { exercise: '...', ... }
        if (node.exercise && typeof node.exercise === 'string') add(node.exercise);
        for (var k in node) if (node.hasOwnProperty(k)) walk(node[k]);
      }
    }
    try {
      var data = JSON.parse(jsonText);
      walk(data);
    } catch (e) {}
    return ex;
  }

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
