/*
  exercAIse frontend: fetch latest workout, render, and collect performed values.
  - Legacy-friendly (old iPad Safari): ES5 syntax, no fetch/Promise, use XHR.
  - Markdown rendering: minimal; display raw MD and basic heading/emphasis.
*/
(function () {
  var statusEl = document.getElementById('status');
  var workoutMetaEl = document.getElementById('workout-meta');
  var workoutTitleEl = document.getElementById('workout-title');
  var openOnGitHubEl = document.getElementById('open-on-github');
  var reloadBtn = document.getElementById('reload-btn');
  var backBtn = document.getElementById('back-btn');
  var workoutSection = document.getElementById('workout-section');
  var workoutContent = document.getElementById('workout-content');
  var readmeSection = document.getElementById('readme-section');
  var readmeContent = document.getElementById('readme-content');
  var logsSection = document.getElementById('logs-section');
  var generateSection = document.getElementById('generate-section');
  var genForm = document.getElementById('generate-form');
  var genGoals = document.getElementById('gen-goals');
  var genPain = document.getElementById('gen-pain');
  var genEquipment = document.getElementById('gen-equipment');
  var genInstr = document.getElementById('gen-instructions');
  var genSubmit = document.getElementById('gen-submit');
  var genClear = document.getElementById('gen-clear');
  var genJSON = document.getElementById('gen-json');
  var genLoadJSON = document.getElementById('gen-load-json');
  var backToIndex = document.getElementById('back-to-index');
  var logsList = document.getElementById('logs-list');
  var formSection = document.getElementById('form-section');
  var exerciseFormsEl = document.getElementById('exercise-forms');
  var saveBtn = document.getElementById('save-local');
  var copyBtn = document.getElementById('copy-json');
  var issueBtn = document.getElementById('submit-issue');
  var clearBtn = document.getElementById('clear-form');
  var openIssueLink = document.getElementById('open-issue');
  var copyWrapper = document.getElementById('copy-target-wrapper');
  var copyTarget = document.getElementById('copy-target');
  var STORAGE_KEY_PREFIX = 'exercAIse-perf-';
  var latestKey = 'exercAIse-latest-file';
  var lastReadmeText = '';
  // Unit constants
  var METERS_PER_MILE = 1609.34;

  document.getElementById('year').innerHTML = String(new Date().getFullYear());
  reloadBtn.onclick = function () { load(); };
  if (backToIndex) {
    backToIndex.onclick = function (e) {
      if (e && e.preventDefault) e.preventDefault();
      // Replace URL to index and show index view without full reload
      if (window.history && window.history.replaceState) {
        try { window.history.replaceState({ view: 'index' }, '', 'index.html'); } catch (err) {}
      }
      showIndexView();
      return false;
    };
  }

  function setVisibility(el, visible) {
    if (!el) return;
    el.style.display = visible ? '' : 'none';
    if (visible) { el.removeAttribute('aria-hidden'); }
    else { el.setAttribute('aria-hidden', 'true'); }
  }

  function showIndexView() {
    // Restore scroll
    var y = 0;
    try { y = parseInt(sessionStorage.getItem('indexScrollY') || '0', 10) || 0; } catch (e) {}
    setVisibility(readmeSection, true);
    setVisibility(logsSection, true);
  setVisibility(generateSection, true);
    setVisibility(workoutSection, false);
    setVisibility(formSection, false);
    setVisibility(workoutMetaEl, false);
    status('');
    try { window.scrollTo(0, y); } catch (e) {}
  }
  if (backBtn) backBtn.onclick = function () {
    // Return to index by navigating to the base page without query params
    try { window.history.pushState({}, '', 'index.html'); } catch (e) {}
    // Show index sections, hide session
    if (readmeSection) readmeSection.style.display = 'block';
    if (logsSection) logsSection.style.display = 'block';
  if (generateSection) generateSection.style.display = 'block';
    workoutMetaEl.style.display = 'none';
    workoutSection.style.display = 'none';
    formSection.style.display = 'none';
    // Reload README and logs content to ensure fresh state
    loadReadmeAndMaybeOpenSession();
  };

  function xhrGet(path, cb) {
    try {
      var req = new XMLHttpRequest();
      req.open('GET', path, true);
      req.onreadystatechange = function () {
        if (req.readyState === 4) {
          if (req.status >= 200 && req.status < 300) cb(null, req.responseText);
          else cb(new Error('HTTP ' + req.status + ' for ' + path));
        }
      };
      req.send();
    } catch (e) { cb(e); }
  }

  function xhrPostJSON(path, payload, cb) {
    try {
      var req = new XMLHttpRequest();
      req.open('POST', path, true);
      req.setRequestHeader('Content-Type', 'application/json');
      req.onreadystatechange = function () {
        if (req.readyState === 4) {
          if (req.status >= 200 && req.status < 300) cb(null, req.responseText);
          else cb(new Error('HTTP ' + req.status + ' for ' + path));
        }
      };
      req.send(JSON.stringify(payload || {}));
    } catch (e) { cb(e); }
  }

  // Parse README.md to find workout links; assume they are markdown links pointing to workouts/*.md or *.json
  function parseReadmeForLatest(contents) {
    var lines = contents.split(/\r?\n/);
    var workoutLinks = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      // Match markdown link to workouts/*.(md|json)
      var match = line.match(/\[(.*?)\]\((workouts\/[\w\-]+\.(?:md|json))\)/);
      if (match) {
        workoutLinks.push({ title: match[1], path: match[2] });
      }
    }
    // README is in descending date order per project rules; take the first link.
    return workoutLinks.length ? workoutLinks[0] : null;
  }

  function decorateReadmeWithLogLinks(md) {
  // Render README as-is; workout title links open the session view.
  // Prefer .json links if a corresponding JSON is referenced alongside.
  var updated = md.replace(/\((workouts\/[\w\-]+)\.md\)/g, '($1.json)');
  var html = renderMarkdownBasic(updated);
  return html;
  }

  function renderMarkdownBasic(md) {
  // Very basic and safe-ish markdown to HTML; no external libs (old iPad friendly).
  // We only handle headings (#, ##, ###), bold/italic, lists, code fences as pre, and links.
  // Hide embedded machine JSON (session-structure) blocks from display but keep in source for parsing elsewhere.
  var mdForDisplay = md.replace(/```json[^\n]*session-structure[^\n]*\n([\s\S]*?)\n```/gi, '');
  var html = mdForDisplay
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // code fences ``` -> <pre>
  html = html.replace(/```([\s\S]*?)```/g, function (_, code) {
      return '<pre>' + code.replace(/\n/g, '\n') + '</pre>';
    });

    // headings
    html = html.replace(/^###\s+(.*)$/gm, '<h3>$1</h3>')
               .replace(/^##\s+(.*)$/gm, '<h2>$1</h2>')
               .replace(/^#\s+(.*)$/gm, '<h1>$1</h1>');

    // bold and italic
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
               .replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Helper to compute repo base path (e.g., '/exercAIse/') for GitHub Pages
    function repoBasePath() {
      try {
        var p = window.location && window.location.pathname || '';
        var idx = p.indexOf('/exercAIse/');
        if (idx !== -1) return p.slice(0, idx + '/exercAIse/'.length);
      } catch (e) {}
      return './';
    }
    // links [text](url) — external links open in new tab; rewrite exercise links for Pages base
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, function(_, text, url) {
      var isExternal = /^https?:/i.test(url);
      var finalUrl = url;
      // Normalize exercise links to absolute within repo base
      var m = String(url || '').match(/(?:^|\/)\.\.\/(?:exercises\/.*)|(?:^|\/)\.\/(?:exercises\/.*)|(?:^|\/)exercises\/[\w\-]+\.(?:md|json)$/);
      // Simpler: extract trailing `exercises/...` segment if present
      var seg = String(url || '').match(/(exercises\/[\w\-]+\.(?:md|json))$/);
      if (seg && seg[1]) {
        var base = repoBasePath();
        // Ensure single slash join
        finalUrl = base.replace(/\/?$/, '/') + seg[1];
        // Collapse duplicate slashes
        finalUrl = finalUrl.replace(/([^:])\/+/g, function (m0, p1) { return p1 + '/'; });
      }
      var attrs = isExternal ? ' target="_blank" rel="noopener"' : '';
      return '<a href="' + finalUrl + '"' + attrs + '>' + text + '</a>';
    });

    // unordered lists
    // Convert blocks of lines starting with - or * into <ul><li>
    html = html.replace(/(?:^|\n)([-*] .*(?:\n[-*] .*)*)/g, function (block) {
      var items = block.replace(/^[-*] /gm, '').trim().split(/\n/);
      if (!items[0] || items.length === 0) return block;
      var lis = '';
      for (var i = 0; i < items.length; i++) {
        lis += '<li>' + items[i] + '</li>';
      }
      return '\n<ul>' + lis + '</ul>';
    });

    // paragraphs: wrap isolated lines in <p>
    var lines = html.split(/\n{2,}/);
    for (var j = 0; j < lines.length; j++) {
      var part = lines[j];
      if (!/^\s*<(h\d|ul|pre)/.test(part)) {
        lines[j] = '<p>' + part + '</p>';
      }
    }
    return lines.join('\n');
  }

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

  function loadSaved(filePath) {
    var key = STORAGE_KEY_PREFIX + filePath;
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function saveLocal(filePath, data) {
    var key = STORAGE_KEY_PREFIX + filePath;
    try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) {}
    try { localStorage.setItem(latestKey, filePath); } catch (e) {}
  }

  function buildForm(filePath, raw, isJSON) {
    var exercises = isJSON ? extractExercisesFromJSON(raw) : extractExercisesFromMarkdown(raw);
    var prescriptions = isJSON ? parseJSONPrescriptions(raw) : parseMarkdownPrescriptions(raw);
    // We now inject exercise forms inline under each exercise link within workoutContent.
    if (exerciseFormsEl) exerciseFormsEl.innerHTML = '';

  var saved = loadSaved(filePath) || { file: filePath, updatedAt: new Date().toISOString(), exercises: {} };

    // Document-level helpers for fallback parsing (e.g., distance in title "4 Miles")
    function getFirstHeadingText(tagName) {
      if (!workoutContent) return '';
      var h = workoutContent.querySelector(tagName);
      return h ? (h.textContent || '').trim() : '';
    }
    var docH1Title = getFirstHeadingText('h1');
    var fullDocText = workoutContent ? ((workoutContent.textContent || workoutContent.innerText) || '') : '';
    // Heuristic: detect suggested rounds/sets from headings like "3 Rounds" or "4 sets"
    function detectRoundsHint(scopeText) {
      var t = String(scopeText || '');
      var m = t.match(/(\d+)\s*(?:x|×)?\s*rounds?/i);
      if (m) return parseInt(m[1], 10) || null;
      m = t.match(/(\d+)\s*sets?/i);
      if (m) return parseInt(m[1], 10) || null;
      return null;
    }
    var docRoundsHint = detectRoundsHint(fullDocText);

  function createExerciseCard(title, presetRows, savedRows, headerHTML, opts) {
      var options = opts || {};
      var isReadOnly = !!options.readOnly;
      var exKey = slugify(title);
  var card = document.createElement('div');
  card.className = 'exercise-card compact' + (isReadOnly ? ' readonly' : '');
      card.setAttribute('data-exkey', exKey);
      card.setAttribute('data-name', title);

  // Optional header area to include the original exercise text (name + notes) inside the card
  if (headerHTML) {
        var header = document.createElement('div');
        header.className = 'exercise-header';
        header.innerHTML = headerHTML;
        card.appendChild(header);
      }

  // In read-only mode (warm-up/mobility/recovery), don't render logging inputs
      var setsWrap = null;
      var addBtn = null;
      if (!isReadOnly) {
        setsWrap = document.createElement('div');
        setsWrap.className = 'exercise-sets';
        card.appendChild(setsWrap);

        // Move the Add set button after the sets
        addBtn = document.createElement('button');
        addBtn.className = 'secondary';
        addBtn.type = 'button';
        addBtn.appendChild(document.createTextNode('Add set'));
        card.appendChild(addBtn);
      }

      function updateSetLabelsLocal() {
        if (isReadOnly) return;
        var rows = setsWrap.getElementsByClassName('set-row');
        for (var i = 0; i < rows.length; i++) {
          var lbl = rows[i].getElementsByClassName('set-label')[0];
          if (lbl) lbl.textContent = 'Set ' + (i + 1);
        }
      }

  function pickFieldsFromRows(rows, titleForHeuristic, explicitLogType) {
        // Determine which inputs to show based on preset/saved row keys
  var hasHold = false, hasTime = false, hasDist = false, hasWeight = false, hasReps = false;
        for (var i = 0; i < rows.length; i++) {
          var rr = rows[i] || {};
          if (rr.holdSeconds != null) hasHold = true;
          if (rr.timeSeconds != null) hasTime = true;
    if (rr.distanceMeters != null || rr.distanceMiles != null) hasDist = true;
    if (rr.weight != null) hasWeight = true;
    if (rr.reps != null) hasReps = true;
        }
  if (explicitLogType === 'mobility' || explicitLogType === 'stretch') return ['holdSeconds', 'rpe'];
  if (explicitLogType === 'endurance') return ['distanceMiles', 'timeSeconds', 'rpe'];
  if (explicitLogType === 'carry') return ['weight', 'multiplier', 'timeSeconds', 'rpe'];
  if (explicitLogType === 'strength') return ['weight', 'multiplier', 'reps', 'rpe'];
  // Ensure reps are not hidden when both weight & reps are prescribed, even if time is also present
  if (hasReps && hasWeight && hasTime) return ['weight', 'multiplier', 'reps', 'timeSeconds', 'rpe'];
  if (hasReps && hasWeight) return ['weight', 'multiplier', 'reps', 'rpe'];
  if (hasHold) return ['holdSeconds', 'rpe'];
  var t = String(titleForHeuristic || '').toLowerCase();
  var isEndurance = /\b(run|jog|walk|tempo|quality run|easy run|bike|cycle|ride|rower|rowing|erg|swim)\b/.test(t);
  // Force endurance-style fields when the title looks like endurance
  if (isEndurance) return ['distanceMiles', 'timeSeconds', 'rpe'];
  // Timed & weighted (e.g., Farmer Carry): show weight + time + RPE
  if (hasTime && hasWeight) return ['weight', 'multiplier', 'timeSeconds', 'rpe'];
  if (hasDist && hasTime) return ['distanceMiles', 'timeSeconds', 'rpe'];
  if (hasDist) return ['distanceMiles', 'rpe'];
  if (hasTime) return ['timeSeconds', 'rpe'];
        return ['weight', 'multiplier', 'reps', 'rpe'];
      }

  var initialRows = (savedRows && savedRows.length) ? savedRows : (presetRows || []);
  var explicitType = null;
  if (opts && opts.explicitLogType) {
    explicitType = opts.explicitLogType;
  } else {
    try {
      var headerProbe = document.createElement('div');
      headerProbe.innerHTML = headerHTML || '';
      var aProbe = headerProbe.querySelector('a[data-exmeta]');
      if (aProbe) {
        var raw = aProbe.getAttribute('data-exmeta') || '';
        var m = raw ? JSON.parse(raw) : null;
        if (m && m.logType) explicitType = m.logType;
      }
    } catch (e) {}
  }
  var fieldOrder = isReadOnly ? [] : pickFieldsFromRows(initialRows, title, explicitType);

  function addSetRow(row, idx) {
  if (isReadOnly || !setsWrap) return; // no set rows in read-only mode and ensure container exists
  var r = document.createElement('div');
        r.className = 'set-row';
        // Non-editable label for set number (inferred by order)
        var label = document.createElement('span');
        label.className = 'set-label';
        label.appendChild(document.createTextNode('Set'));
        r.appendChild(label);

        var placeholders = {
          weight: 'Weight',
          multiplier: 'Multiplier',
          reps: 'Reps',
          rpe: 'RPE',
          timeSeconds: 'Time (hh:mm:ss)',
          holdSeconds: 'Hold (hh:mm:ss)',
          distanceMeters: 'Distance (mi)',
          distanceMiles: 'Distance (mi)'
        };
        var types = {
          weight: { type: 'number', step: 'any' },
          multiplier: { type: 'number', min: 0, step: '1' },
          reps: { type: 'number', min: 0 },
          rpe: { type: 'number', step: 'any' },
          timeSeconds: { type: 'text' },
          holdSeconds: { type: 'text' },
          distanceMeters: { type: 'number', min: 0, step: 'any' },
          distanceMiles: { type: 'number', min: 0, step: 'any' }
        };
        var inputs = [];
        for (var fi = 0; fi < fieldOrder.length; fi++) {
          var name = fieldOrder[fi];
          var spec = types[name] || { type: 'text' };
          inputs.push({ name: name, placeholder: placeholders[name] || name, type: spec.type, min: spec.min, step: spec.step });
        }
        for (var i = 0; i < inputs.length; i++) {
          var spec = inputs[i];
          // Special inline label for multiplier: show × before the field
          if (spec.name === 'multiplier') {
            var times = document.createElement('span');
            times.appendChild(document.createTextNode('×'));
            times.setAttribute('aria-hidden', 'true');
            times.style.margin = '0 4px 0 8px';
            r.appendChild(times);
          }
          var input = document.createElement('input');
          input.type = spec.type;
          input.placeholder = spec.placeholder;
          if (spec.min != null) input.min = spec.min;
          if (spec.step) input.step = spec.step;
          if (spec.name === 'multiplier') {
            input.setAttribute('title', 'Multiplier (e.g., 2 for pair, 1 for single, 0 for bodyweight)');
            input.setAttribute('aria-label', 'Multiplier (e.g., 2 for pair, 1 for single, 0 for bodyweight)');
            input.style.maxWidth = '5em';
          }
          if (spec.name === 'rpe') {
            input.setAttribute('title', 'RPE (Rate of Perceived Exertion), 1–10 scale — 4–5 = easy conversational, 7–8 = tempo/comfortably hard');
            input.setAttribute('aria-label', 'RPE (Rate of Perceived Exertion), 1–10 scale; 4–5 easy conversational, 7–8 tempo/comfortably hard');
            try { input.min = 0; input.max = 10; } catch (e) {}
          }
          if (spec.name === 'distanceMeters' || spec.name === 'distanceMiles') {
            input.setAttribute('title', 'Distance (miles)');
            input.setAttribute('aria-label', 'Distance in miles');
          }
          if (row) {
            var v = null;
            if (row[spec.name] != null) v = row[spec.name];
            // If UI uses miles but source row provided meters, convert for display
            if (v == null && spec.name === 'distanceMiles' && row.distanceMeters != null) v = (row.distanceMeters / METERS_PER_MILE);
            if (v == null && spec.name === 'distanceMeters' && row.distanceMiles != null) v = (row.distanceMiles * METERS_PER_MILE);
            // If still missing distance, look up from prescription row (same index or first)
            if (v == null && spec.name === 'distanceMiles' && presetRows) {
              var pRow = (typeof idx === 'number' && presetRows[idx]) ? presetRows[idx] : (presetRows[0] || null);
              if (pRow) {
                if (pRow.distanceMiles != null) v = Number(pRow.distanceMiles);
                else if (pRow.distanceMeters != null) v = Number(pRow.distanceMeters) / METERS_PER_MILE;
              }
            }
            // Fallback: parse distance like "4 miles" from the card title
            if (v == null && spec.name === 'distanceMiles') {
              var tstr = String(title || '');
              var mt = tstr.match(/(\d+(?:\.\d+)?)\s*(?:mi|miles?|mile)\b/i);
              if (mt) v = Number(mt[1]);
              // Try the document H1 title
              if (v == null && docH1Title) {
                var mh1 = docH1Title.match(/(\d+(?:\.\d+)?)\s*(?:mi|miles?|mile)\b/i);
                if (mh1) v = Number(mh1[1]);
              }
              // Try scanning the full document text as a last resort (may pick first match)
              if (v == null && fullDocText) {
                var mdoc = fullDocText.match(/(\d+(?:\.\d+)?)\s*(?:mi|miles?|mile)\b/i);
                if (mdoc) v = Number(mdoc[1]);
              }
            }
            if (v != null) {
              if (spec.name === 'distanceMeters') {
                var miles = v / METERS_PER_MILE;
                var milesRounded = Math.round(miles * 100) / 100;
                input.value = String(milesRounded);
              } else if (spec.name === 'distanceMiles') {
                var milesRounded2 = Math.round(Number(v) * 100) / 100;
                input.value = String(milesRounded2);
              } else if (spec.name === 'timeSeconds' || spec.name === 'holdSeconds') {
                input.value = secondsToHHMMSS(v);
              } else {
                input.value = v;
              }
            }
          }
          input.setAttribute('data-name', spec.name);
          r.appendChild(input);
        }
        var del = document.createElement('button');
        del.type = 'button';
        del.className = 'danger';
        del.appendChild(document.createTextNode('Remove'));
  del.onclick = function () { setsWrap.removeChild(r); updateSetLabelsLocal(); };
        r.appendChild(del);
        setsWrap.appendChild(r);
  updateSetLabelsLocal();
      }

      function snapshotLastRow() {
        var rows = setsWrap.getElementsByClassName('set-row');
        if (!rows || !rows.length) return null;
        var last = rows[rows.length - 1];
        var inputs = last.getElementsByTagName('input');
        var obj = {};
        for (var i = 0; i < inputs.length; i++) {
          var name = inputs[i].getAttribute('data-name');
          var val = inputs[i].value;
          if (val === '') continue;
          if (name === 'timeSeconds' || name === 'holdSeconds') {
            var sec = parseHMSToSeconds(val);
            if (sec != null) obj[name] = sec;
          } else if (name === 'distanceMeters') {
            // interpret UI miles field
            obj.distanceMiles = Number(val);
          } else if (name === 'distanceMiles') {
            obj.distanceMiles = Number(val);
          } else {
            obj[name] = Number(val);
          }
        }
        return obj;
      }

      if (!isReadOnly && addBtn) {
        addBtn.onclick = function () {
          var snap = snapshotLastRow();
          if (snap) {
            var rowsNow = setsWrap.getElementsByClassName('set-row');
            addSetRow(snap, rowsNow ? rowsNow.length : undefined);
            return;
          }
          if (presetRows && presetRows.length) { addSetRow(presetRows[0], 0); return; }
          addSetRow({}, undefined);
        };
      }
  // Cards are always editable and expanded; no toggle button

  var rows = initialRows;
  for (var i = 0; i < rows.length; i++) addSetRow(rows[i], i);
      // Sanitize: remove any extra exercise-link bullets accidentally pulled into header/notes
      try {
        var mainKey = slugify(title);
        var extraAnchors = card.querySelectorAll('a[href*="exercises/"]');
        for (var ai = 0; ai < extraAnchors.length; ai++) {
          var ahref = extraAnchors[ai].getAttribute('href') || '';
          var m = ahref.match(/exercises\/([\w\-]+)\.(?:md|json)$/);
          if (!m || !m[1]) continue;
          var slug = m[1];
          if (slugify(slug) !== mainKey) {
            // Remove the closest list item or the anchor itself
            var n = extraAnchors[ai];
            while (n && n !== card && !(n.tagName && (n.tagName === 'LI' || n.tagName === 'P' || n.className === 'exercise-notes'))) n = n.parentNode;
            if (n && n !== card && n.parentNode) n.parentNode.removeChild(n);
          }
        }
      } catch (e) {}
      return card;
    }

    // Find exercise anchors within the rendered workout content
  var anchors = workoutContent ? Array.prototype.slice.call(workoutContent.getElementsByTagName('a')) : [];

    function nearestBlockContainer(node) {
      var n = node;
      while (n && n !== workoutContent) {
        if (n.tagName && (n.tagName === 'LI' || n.tagName === 'P' || n.tagName === 'DIV')) return n;
        n = n.parentNode;
      }
      return node.parentNode || workoutContent;
    }

    function findListParent(node) {
      var n = node;
      while (n && n !== workoutContent) {
        if (n.tagName && (n.tagName === 'UL' || n.tagName === 'OL')) return n;
        n = n.parentNode;
      }
      return null;
    }

  // Find the actual nearest heading element (H1-H4) above a node
  function findNearestHeadingEl(node) {
      var n = node;
      while (n && n !== workoutContent) {
        var s = n.previousSibling;
        while (s) {
          if (s.nodeType === 1 && s.tagName && /^H[1-4]$/.test(s.tagName)) return s;
          s = s.previousSibling;
        }
        n = n.parentNode;
      }
      return null;
    }

    // Collect following sibling nodes (prescriptions/cues) until next heading or next exercise anchor section
    function collectFollowingBlocks(startEl) {
      var htmlParts = [];
      var toHide = [];
      if (!startEl) return { html: '', nodes: [] };
      var s = startEl.nextSibling;
      while (s) {
        if (s.nodeType === 1 && s.tagName && /^H[1-4]$/.test(s.tagName)) break; // stop at next heading
        // If this block contains another exercise link, stop to avoid swallowing next exercise
        var hasNextExercise = false;
        try {
          var testHtml = s.outerHTML || (s.textContent || '');
          hasNextExercise = /(\b|\/)(exercises\/[\w\-]+\.(?:md|json))\b/.test(String(testHtml || ''));
        } catch (e) {}
        if (hasNextExercise) break;
        // Serialize this node
        if (s.nodeType === 1) {
          htmlParts.push(s.outerHTML);
        } else if (s.nodeType === 3) {
          var txt = String(s.textContent || '');
          // preserve line breaks visually
          var safe = txt.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
          if (safe.trim()) htmlParts.push('<div class="md-text">' + safe + '</div>');
        }
        toHide.push(s);
        s = s.nextSibling;
      }
      return { html: htmlParts.join(''), nodes: toHide };
    }

  function findPreviousHeading(node) {
      var n = node;
      while (n && n !== workoutContent) {
        // Walk previous siblings of n
        var s = n.previousSibling;
        while (s) {
          if (s.nodeType === 1 && s.tagName && /^H[1-4]$/.test(s.tagName)) {
            return (s.textContent || '').trim();
          }
          s = s.previousSibling;
        }
        n = n.parentNode;
      }
      return '';
    }

    function isWarmOrCool(sectionTitle, anchorEl) {
      // Prefer explicit section type if available
      var secType = '';
      try {
        var secEl = anchorEl;
        while (secEl && secEl !== workoutContent && !(secEl.tagName && secEl.tagName.toLowerCase() === 'section')) secEl = secEl.parentNode;
        if (secEl && secEl.getAttribute) secType = (secEl.getAttribute('data-sectype') || '');
      } catch (e) {}
      var t = String((secType || sectionTitle) || '').toLowerCase();
      return (
        t.indexOf('warm') !== -1 ||
        t.indexOf('warm-up') !== -1 ||
        t.indexOf('warm up') !== -1 ||
        t.indexOf('warmup') !== -1 ||
        t.indexOf('cool') !== -1 ||
        t.indexOf('cool-down') !== -1 ||
        t.indexOf('cool down') !== -1 ||
        t.indexOf('cooldown') !== -1 ||
        t.indexOf('mobility') !== -1 ||
        t.indexOf('recovery') !== -1
      );
    }
  var foundCount = 0;
  var foundKeys = {};
    for (var ai = 0; ai < anchors.length; ai++) {
      var a = anchors[ai];
      var href = a.getAttribute('href') || '';
  if (!/(?:^|\/)exercises\/[\w\-]+\.(?:md|json)$/.test(href)) continue;
  var title = a.textContent || a.innerText || '';
  // Normalize title by removing parenthetical hints, e.g., "Easy Run (Easy Jog)" -> "Easy Run"
  var normTitle = title.replace(/\s*\([^\)]*\)\s*$/, '').trim();
  if (!normTitle) continue;
  var exKey = slugify(normTitle);
      // Inspect anchor meta for explicit loggable flag
      var metaRaw0 = a.getAttribute('data-exmeta') || '';
      var meta0 = null; try { meta0 = metaRaw0 ? JSON.parse(metaRaw0) : null; } catch (e) { meta0 = null; }
      // Determine section by nearest previous heading; skip warm-up/cool-down
      var container = nearestBlockContainer(a);
      var sectionTitle = findPreviousHeading(container);
      var inWarmCool = isWarmOrCool(sectionTitle, a);
      var savedEntry = saved.exercises[exKey];
      var savedRows = [];
      if (savedEntry) {
        if (Object.prototype.toString.call(savedEntry) === '[object Array]') savedRows = savedEntry;
        else if (savedEntry.sets && Object.prototype.toString.call(savedEntry.sets) === '[object Array]') savedRows = savedEntry.sets;
      }
      var preset = prescriptions[exKey] || prescriptions[slugify(title)] || [];
      // Do not seed defaults for JSON-driven sessions; rely on explicit prescriptions
      if (!isJSON && !inWarmCool && (!preset || !preset.length)) {
        var secRounds = detectRoundsHint(sectionTitle) || docRoundsHint || 3;
        var defaults = [];
        for (var di = 1; di <= Math.max(1, secRounds); di++) defaults.push({ set: di });
        preset = defaults;
      }
      var headEl = findNearestHeadingEl(a) || null;
      // Prefer a simple header with the clean exercise name as a link
      var headerHTML = '';
      if (a) {
        var cleanText = (a.textContent || a.innerText || '').replace(/^\s*\d+[\)\.-]\s*/, '').trim();
        var hrefFixed = a.getAttribute('href') || '';
        // Meta (cues/prescription) passed via data-exmeta on anchor from JSON renderer
        var metaRaw = a.getAttribute('data-exmeta') || '';
        var meta = null;
        try { meta = metaRaw ? JSON.parse(metaRaw) : null; } catch (e) { meta = null; }
        var extraBits = '';
        if (meta && meta.prescription) {
          var p = meta.prescription;
          var parts = [];
          if (p.sets != null && p.reps != null) parts.push(String(p.sets) + ' x ' + String(p.reps));
          // Weight: append ' lb' only when numeric; if string, use as-is (may include x2/units)
          if (p.weight != null) {
            if (typeof p.weight === 'number') parts.push(String(p.weight) + ' lb');
            else parts.push(String(p.weight));
          }
          // Multiplier tag only if not already expressed in a weight string
          var weightStr = (typeof p.weight === 'string') ? p.weight.toLowerCase() : '';
          if (p.multiplier === 2 && !(weightStr && /(x2|×2|per\s*hand|each|per\s*side)/.test(weightStr))) parts.push('x2');
          if (p.multiplier === 0 && !(weightStr && /bodyweight/.test(weightStr))) parts.push('bodyweight');
          if (p.timeSeconds != null) {
            // reuse secondsToHHMMSS
            try { parts.push(secondsToHHMMSS(p.timeSeconds)); } catch (e) {}
          }
          if (p.distanceMiles != null) parts.push(String(p.distanceMiles) + ' mi');
          if (p.rpe != null) parts.push('RPE ' + String(p.rpe));
          if (p.restSeconds != null) parts.push('Rest ' + String(p.restSeconds) + 's');
          if (parts.length) extraBits += ' — <span class="ex-presc">' + parts.join(' · ') + '</span>';
        }
        if (meta && meta.cues && meta.cues.length) {
          extraBits += '<ul class="ex-cues">' + meta.cues.map(function(c){ return '<li>' + c + '</li>'; }).join('') + '</ul>';
        }
  // Preserve original meta so downstream field selection can read explicit logType without re-parsing the DOM
  // Inline escape for attribute context (avoid relying on later attrEscape definitions)
  var _escAttr = function(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); };
  headerHTML = '<a href="' + hrefFixed + '" data-exmeta="' + _escAttr(metaRaw) + '">' + cleanText + '</a>' + extraBits;
      } else if (container) {
        headerHTML = container.innerHTML || '';
      } else if (headEl) {
        headerHTML = headEl.outerHTML || '';
      }
  // Respect explicit loggable=false or warm-up/cooldown/mobility sections: do not inject logging card
  var isExplicitNonLoggable = !!(meta0 && meta0.loggable === false);
  if (inWarmCool || isExplicitNonLoggable) {
        // Do not inject cards for warm-up/cooldown/mobility; mark as handled so we don't auto-inject later
        foundKeys[exKey] = true;
        continue;
      }
  var card = createExerciseCard(normTitle, preset, savedRows, headerHTML, { explicitLogType: (meta0 && meta0.logType) ? meta0.logType : null });
      // Pull prescription/cues following this container into the card
      var extra = collectFollowingBlocks(container);
      if (extra && extra.html) {
        var notes = document.createElement('div');
        notes.className = 'exercise-notes';
        notes.innerHTML = extra.html;
        card.appendChild(notes);
      }
      // Place card and remove original blocks.
      if (container && container.tagName === 'LI') {
        // Insert the card OUTSIDE the list (after UL/OL) to avoid any bullet rendering
        var parentList = findListParent(container);
        var listHolder = parentList && parentList.parentNode ? parentList.parentNode : workoutContent;
        var insertAfter = parentList && parentList.__lastCard ? parentList.__lastCard : parentList;
        if (listHolder && listHolder.insertBefore) {
          if (insertAfter && insertAfter.nextSibling) listHolder.insertBefore(card, insertAfter.nextSibling);
          else listHolder.appendChild(card);
        } else {
          workoutContent.appendChild(card);
        }
        if (parentList) parentList.__lastCard = card;
        // Remove the original LI
        try { container.parentNode && container.parentNode.removeChild(container); } catch (e) {}
        // If the list is now empty of LI children, remove it
        try {
          if (parentList && !parentList.querySelector('li')) {
            parentList.parentNode && parentList.parentNode.removeChild(parentList);
          }
        } catch (e) {}
      } else {
        var parent = container.parentNode || workoutContent;
        if (parent && parent.insertBefore) {
          if (container.nextSibling) parent.insertBefore(card, container.nextSibling);
          else parent.appendChild(card);
        } else {
          workoutContent.appendChild(card);
        }
        // Remove the original container entirely
        try { container.parentNode && container.parentNode.removeChild(container); } catch (e) {}
      }
      // Remove any collected following blocks now that they're inside the card
      if (extra && extra.nodes) {
        for (var hideIdx = 0; hideIdx < extra.nodes.length; hideIdx++) {
          var nodeToHide = extra.nodes[hideIdx];
          try {
            if (nodeToHide && nodeToHide.parentNode) nodeToHide.parentNode.removeChild(nodeToHide);
          } catch (e) {}
        }
      }
      foundCount++;
        foundKeys[exKey] = true;
    }

      // Fallback: inject cards for any prescriptions without a visible exercise link (e.g., run main set)
      function titleCaseFromKey(k) {
        var parts = String(k || '').split('-');
        for (var i = 0; i < parts.length; i++) {
          if (parts[i].length) parts[i] = parts[i].charAt(0).toUpperCase() + parts[i].slice(1);
        }
        return parts.join(' ');
      }

      function findMainHeadingNode() {
        var headings = workoutContent ? workoutContent.querySelectorAll('h2, h3, h4') : [];
        for (var i = 0; i < headings.length; i++) {
          var t = (headings[i].textContent || '').toLowerCase();
          if (t.indexOf('main') !== -1 || t.indexOf('conditioning') !== -1) return headings[i];
        }
        return null;
      }

  var mainHead = findMainHeadingNode();
      // Heuristic: detect if this workout is an endurance-style session (to filter injected cards)
  var docTextForHeuristic = (workoutContent && (workoutContent.textContent || workoutContent.innerText) || '').toLowerCase();
  var isEnduranceDoc = /\b(run|jog|walk|tempo|quality run|easy run|bike|cycle|ride|rower|rowing|erg|swim)\b/.test(docTextForHeuristic);
      // If this is a JSON session (isJSON) and we already rendered items with anchors, do not inject fallback cards
      if (isJSON) {
        // Skip fallback injection
      } else {
      for (var pKey in prescriptions) {
        if (!prescriptions.hasOwnProperty(pKey)) continue;
        if (foundKeys[pKey]) continue;
        var presetRows = prescriptions[pKey] || [];
        if (!presetRows || !presetRows.length) continue;
        // Skip if these look like warm/cool prescriptions (heuristic below)
        var skip = true;
        for (var rr = 0; rr < presetRows.length; rr++) {
          var row = presetRows[rr] || {};
          var hasDist = (row.distanceMiles != null || row.distanceMeters != null);
          var hasTime = (row.timeSeconds != null);
          var hasRpe = (row.rpe != null);
          var hasWeight = (row.weight != null || row.load != null);
          var hasReps = (row.reps != null);
          if (isEnduranceDoc) {
            // In endurance docs, only inject rows that are endurance-like (distance/time/RPE), and avoid pure weight/reps
            if ((hasDist || hasTime || hasRpe) && !(hasWeight || hasReps)) { skip = false; break; }
          } else {
            // General heuristic: allow if meaningful work (distance/reps/weight) or long timed efforts (>90s)
            if (hasDist || hasReps || hasWeight) { skip = false; break; }
            if (hasTime && row.timeSeconds > 90) { skip = false; break; }
          }
        }
        if (skip) continue;
        var display = titleCaseFromKey(pKey);
        var savedEnt2 = saved.exercises[pKey];
        var savedRows2 = [];
        if (savedEnt2) {
          if (Object.prototype.toString.call(savedEnt2) === '[object Array]') savedRows2 = savedEnt2;
          else if (savedEnt2.sets && Object.prototype.toString.call(savedEnt2.sets) === '[object Array]') savedRows2 = savedEnt2.sets;
        }
        var cardX = createExerciseCard(display, presetRows, savedRows2);
        if (mainHead && mainHead.parentNode) {
          if (mainHead.nextSibling) mainHead.parentNode.insertBefore(cardX, mainHead.nextSibling);
          else mainHead.parentNode.appendChild(cardX);
        } else {
          workoutContent.appendChild(cardX);
        }
        foundCount++;
        foundKeys[pKey] = true;
      }
  }

    function collectData() {
      // Normalize workoutFile to 'workouts/...'
      var wf = String(filePath || '');
      // Strip leading ../ or ./
      wf = wf.replace(/^(?:\.\.\/)+/, '').replace(/^\.\//, '');
      // If path includes 'workouts/' later in the string, extract from there
      var mWf = wf.match(/workouts\/.*$/);
      if (mWf) wf = mWf[0];
      var data = { version: '1', workoutFile: wf, timestamp: new Date().toISOString(), exercises: {} };
    var scope = workoutContent || document;
    var cards = scope.getElementsByClassName('exercise-card');
      for (var c = 0; c < cards.length; c++) {
        var card = cards[c];
        var exKey = card.getAttribute('data-exkey');
        var exName = card.getAttribute('data-name') || exKey;
        if (!exKey) continue;
        var rows = card.getElementsByClassName('set-row');
        var setsArr = [];
        for (var r = 0; r < rows.length; r++) {
          var row = rows[r];
          var inputs = row.getElementsByTagName('input');
          var obj = {};
          for (var k = 0; k < inputs.length; k++) {
            var name = inputs[k].getAttribute('data-name');
            var val = inputs[k].value;
            if (val !== '') {
              var num = Number(val);
              if (name === 'distanceMeters') {
                // Store miles only going forward; interpret this field as miles
                obj.distanceMiles = num;
                continue;
              }
              if (name === 'distanceMiles') {
                obj.distanceMiles = num;
                continue;
              }
              if (name === 'timeSeconds' || name === 'holdSeconds') {
                var sec = parseHMSToSeconds(val);
                if (sec != null) obj[name] = sec;
                continue;
              }
              obj[name] = num;
            }
          }
      // Only push non-empty sets
      if (obj.reps != null || obj.weight != null || obj.rpe != null || obj.timeSeconds != null || obj.holdSeconds != null || obj.distanceMeters != null || obj.distanceMiles != null || obj.multiplier != null) {
        setsArr.push(obj);
      }
        }
        if (setsArr.length) {
          data.exercises[exKey] = { name: exName, sets: setsArr };
        }
      }
      return data;
    }

    saveBtn.onclick = function () {
      var data = collectData();
      saveLocal(filePath, data);
      status('Saved locally at ' + new Date().toLocaleTimeString(), { important: true });
    };

  copyBtn.onclick = function () {
      var data = collectData();
      var json = JSON.stringify(data, null, 2);
      // try clipboard (newer iPads); fallback to show textarea
      var didCopy = false;
      if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(json).then(function () { didCopy = true; status('Copied JSON to clipboard.', { important: true }); }).catch(function () {});
      }
      if (!didCopy) {
        copyWrapper.style.display = 'block';
        copyTarget.value = json;
        copyTarget.focus();
        copyTarget.select();
        status('Copy JSON shown below; select-all and copy manually.');
      }
    };

    issueBtn.onclick = function () {
      var data = collectData();
      var json = JSON.stringify(data, null, 2);
      var owner = 'jrodhead';
      var repo = 'exercAIse';
  var title = 'Workout log ' + (data.workoutFile || data.file || '') + ' @ ' + new Date().toISOString();
      // Include the marker and fenced code block so the GitHub Action can detect and parse it
      var header = 'Paste will be committed by Actions.\n\n';
      var issueBodyTemplate = header + '```json\n' + json + '\n```\n';

      function showTextarea() {
        copyWrapper.style.display = 'block';
        copyTarget.value = issueBodyTemplate;
        try { copyTarget.focus(); copyTarget.select(); } catch (e) {}
        status('Template shown below — paste into the Issue body.');
      }
      function openIssue() {
        if (openIssueLink) openIssueLink.style.display = 'none';
        var url = 'https://github.com/' + owner + '/' + repo + '/issues/new?title=' + encodeURIComponent(title);
        try { window.open(url, '_blank'); } catch (e) { window.location.href = url; }
      }

      // Always attempt to copy the full issue body template automatically, then open the Issue page with title-only.
      if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(issueBodyTemplate)
          .then(function () {
            status('Copied template to clipboard. Opening Issue page…', { important: true });
            openIssue();
          })
          .catch(function () {
            showTextarea();
            openIssue();
          });
      } else {
        showTextarea();
        openIssue();
      }
    };

    clearBtn.onclick = function () {
      if (!confirm('Clear all entries for this workout?')) return;
      // Re-render the workout content from the original raw text to restore hidden blocks
      if (isJSON) {
        var pretty = '';
        try { pretty = JSON.stringify(JSON.parse(raw || '{}'), null, 2); } catch (e) { pretty = raw || ''; }
        workoutContent.innerHTML = '<pre>' + (pretty || '') + '</pre>';
      } else {
        workoutContent.innerHTML = renderMarkdownBasic(raw || '');
        fixExerciseAnchors(workoutContent);
      }
      // Rebuild the form and re-inject fresh cards (no saved rows)
      buildForm(filePath, raw, isJSON);
      status('Cleared form.', { important: true });
    };
  }

  function status(msg, opts) {
    // Only show status bar for important messages unless explicitly forced
    opts = opts || {};
    var isImportant = !!opts.important;
    if (!msg) {
      statusEl.innerHTML = '';
      statusEl.style.display = 'none';
      return;
    }
    if (!isImportant) {
      // Quiet mode: update text but keep hidden to avoid visual noise
      statusEl.innerHTML = msg;
      statusEl.style.display = 'none';
      return;
    }
    statusEl.innerHTML = msg;
    statusEl.style.display = 'block';
  }

  function loadReadmeAndMaybeOpenSession() {
    status('Reading README…'); // hidden (non-important)
    xhrGet('README.md', function (err, text) {
      if (err) return status('Error reading README: ' + err.message, { important: true });
      // Render README mirror with inline Log links
      lastReadmeText = text || '';
  readmeContent.innerHTML = decorateReadmeWithLogLinks(lastReadmeText);
  fixExerciseAnchors(readmeContent);
  if (readmeSection) readmeSection.style.display = 'block';
  if (generateSection) generateSection.style.display = 'block';

  // Load logs list from GitHub API (unauthenticated)
  loadLogsList();

      // Intercept clicks on Log links for in-page navigation
      if (readmeSection && !readmeSection.__wired) {
        readmeSection.addEventListener('click', function (e) {
          var t = e.target || e.srcElement;
          if (!t) return;
          // Find nearest anchor
          while (t && t !== readmeSection && !(t.tagName && t.tagName.toLowerCase() === 'a')) t = t.parentNode;
          if (!t || t === readmeSection) return;
          var href = t.getAttribute('href') || '';
          if (!href) return;
          var path = null;
          // Route exercise links to the new exercise.html viewer (JSON counterpart if available)
          var exMatch = href.match(/(exercises\/[\w\-]+)\.(?:md|json)$/);
          if (exMatch) {
            var base = exMatch[1];
            var jsonPath = base + '.json';
            try { e.preventDefault(); } catch (ex) {}
            try { window.location.href = 'exercise.html?file=' + encodeURIComponent(jsonPath); } catch (ex) {}
            return;
          }
          if (href.indexOf('index.html?file=') === 0) {
            path = decodeURIComponent(href.split('file=')[1] || '');
          } else if (href.indexOf('workouts/') === 0) {
            path = href;
          }
          if (path) {
            if (e && e.preventDefault) e.preventDefault();
            try { sessionStorage.setItem('indexScrollY', String(window.scrollY || 0)); } catch (ex) {}
            if (window.history && window.history.pushState) {
              try { window.history.pushState({ view: 'session', file: path }, '', 'index.html?file=' + encodeURIComponent(path)); } catch (ex) {}
            }
            openSession(path, lastReadmeText);
          }
        }, false);
        readmeSection.__wired = true;
      }

      // If ?file= is present, open that session; else also preview the first/latest.
      var params = (function () {
        var q = {};
        var s = window.location.search.replace(/^\?/, '').split('&');
        for (var i = 0; i < s.length; i++) {
          var kv = s[i].split('=');
          if (kv[0]) q[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
        }
        return q;
      })();

      var targetPath = params.file;
      if (targetPath) {
        // Initialize state for deep link
        if (window.history && window.history.replaceState) {
          try { window.history.replaceState({ view: 'session', file: targetPath }, '', 'index.html?file=' + encodeURIComponent(targetPath)); } catch (ex) {}
        }
        openSession(targetPath, lastReadmeText);
  } else {
        // Ensure index view is visible
        showIndexView();
      }
  handleGenerateButtons();
    });
  }

  function loadLogsList() {
    if (!logsList) return;
    // Use GitHub contents API in raw mode via JSON: https://api.github.com/repos/:owner/:repo/contents/performed
    var api = 'https://api.github.com/repos/jrodhead/exercAIse/contents/performed?ref=main';
    xhrGet(api, function (err, text) {
      if (err) { logsList.innerHTML = '<li>Unable to load logs.</li>'; return; }
      var items = [];
      try { items = JSON.parse(text); } catch (e) {}
      if (!items || Object.prototype.toString.call(items) !== '[object Array]') { logsList.innerHTML = '<li>No logs yet.</li>'; return; }
      // Sort by name desc (timestamp prefixed)
      items.sort(function (a, b) { return a.name < b.name ? 1 : -1; });
      var html = '';
      for (var i = 0; i < Math.min(items.length, 20); i++) {
        var it = items[i];
        if (it.type !== 'file') continue;
        var url = it.html_url || ('https://github.com/jrodhead/exercAIse/blob/main/performed/' + encodeURIComponent(it.name));
        html += '<li><a target="_blank" rel="noopener" href="' + url + '">' + it.name + '</a></li>';
      }
      logsList.innerHTML = html || '<li>No logs yet.</li>';
    });
  }

  function openSession(path, readmeText) {
    status('Loading ' + path + ' …'); // hidden (non-important)
    xhrGet(path, function (err, text) {
  if (err) return status('Error loading workout: ' + err.message, { important: true });
      // Save current scroll and hide index
      try { sessionStorage.setItem('indexScrollY', String(window.scrollY || 0)); } catch (e) {}
      setVisibility(readmeSection, false);
      setVisibility(logsSection, false);
  setVisibility(generateSection, false);
      setVisibility(workoutSection, true);
      var isJSON = /\.json$/i.test(path);
      if (isJSON) {
        // Render a structured view of the JSON workout that pairs with card injection
        function esc(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
        function renderItem(it, opts) {
          if (!it || typeof it !== 'object') return '';
          var options = opts || {};
          var kind = String(it.kind || 'exercise');
          var name = String(it.name || '');
          var link = String(it.link || '');
          // Normalize exercise link to exercises/<slug>.json when missing
          if (!link && name) {
            var slug = slugify(name);
            link = 'exercises/' + slug + '.json';
          }
          function inlineMarkdown(text) {
            var s = String(text == null ? '' : text);
            // Escape basic HTML
            s = s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
            // Replace [text](url) with anchors (simple)
            s = s.replace(/\[(.*?)\]\((.*?)\)/g, function(_, t, u){ return '<a href="' + u + '">' + t + '</a>'; });
            return s;
          }
          function attrEscape(s) {
            return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
          }
          if (kind === 'note') {
            return '<p>' + esc(name) + '</p>';
          }
          if (kind === 'exercise') {
            var clean = String(name).replace(/^\s*\d+[\)\.-]\s*/, '');
            var meta = { cues: (it.cues || []), prescription: (it.prescription || null) };
            if (it.logType) meta.logType = it.logType;
            if (it.loggable === false) meta.loggable = false;
            var html = '<li><a href="' + esc(link) + '" data-exmeta="' + attrEscape(JSON.stringify(meta)) + '">' + esc(clean) + '</a>';
            // For list-only render (warm-up/cooldown/mobility), append a compact prescription summary inline
            if (it.prescription && typeof it.prescription === 'object') {
              try {
                var p = it.prescription || {};
                var parts = [];
                if (p.sets != null && p.reps != null) {
                  var setsNum = Number(p.sets);
                  var setsLabel = (setsNum === 1 ? 'set' : 'sets');
                  parts.push(String(p.sets) + ' ' + setsLabel + ' × ' + String(p.reps) + ' reps');
                } else {
                  if (p.sets != null) {
                    var setsNum2 = Number(p.sets);
                    var setsLabel2 = (setsNum2 === 1 ? 'set' : 'sets');
                    parts.push(String(p.sets) + ' ' + setsLabel2);
                  }
                  if (p.reps != null) parts.push(String(p.reps) + ' reps');
                }
                if (p.weight != null) parts.push(typeof p.weight === 'number' ? (String(p.weight) + ' lb') : String(p.weight));
                // Multiplier hint when not already expressed in weight string
                var weightStr2 = (typeof p.weight === 'string') ? p.weight.toLowerCase() : '';
                if (p.multiplier === 2 && !(weightStr2 && /(x2|×2|per\s*hand|each|per\s*side)/.test(weightStr2))) parts.push('x2');
                if (p.multiplier === 0 && !(weightStr2 && /bodyweight/.test(weightStr2))) parts.push('bodyweight');
                if (p.timeSeconds != null) { parts.push(String(p.timeSeconds) + ' seconds'); }
                if (p.holdSeconds != null) { parts.push(String(p.holdSeconds) + ' seconds'); }
                if (p.distanceMiles != null) parts.push(String(p.distanceMiles) + ' miles');
                if (p.distanceMeters != null) parts.push(String(p.distanceMeters) + ' m');
                if (p.rpe != null) parts.push('RPE ' + String(p.rpe));
                if (p.restSeconds != null) parts.push('Rest ' + String(p.restSeconds) + ' seconds');
                if (parts.length) html += ' — <span class="ex-presc">' + parts.join(' · ') + '</span>';
              } catch (e) {}
            }
            // Inline cues under the item so they migrate into the card header
            if (!options.suppressCues && it.cues && it.cues.length) {
              html += '<ul>' + it.cues.map(function(c){ return '<li>' + inlineMarkdown(c) + '</li>'; }).join('') + '</ul>';
            }
            html += '</li>';
            return html;
          }
          if (kind === 'superset' || kind === 'circuit') {
            var cap = kind.charAt(0).toUpperCase() + kind.slice(1);
            var inner = '';
            if (it.children && it.children.length) {
              inner = it.children.map(function(ch){ return renderItem(ch, options); }).join('');
              if (inner && inner.indexOf('<li') !== -1) inner = '<ul>' + inner + '</ul>';
            }
            return '<div><h3>' + esc(cap + (it.name ? (': ' + it.name) : '')) + '</h3>' + inner + '</div>';
          }
          return '';
        }
        function renderSection(sec) {
          if (!sec) return '';
          var title = String(sec.title || '');
          // Clean markdown link syntax in titles like "1) [Goblet Squat](...)"
          title = title.replace(/^\s*\d+[\)\.-]\s*/, '');
          var mt = title.match(/^\s*\[([^\]]+)\]\(([^)]+)\)/);
          if (mt) title = mt[1];
          var type = String(sec.type || '');
          var rounds = (sec.rounds != null) ? (' — ' + sec.rounds + ' rounds') : '';
          function attrEscapeLocal(s) {
            return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
          }
          var typeText = type || 'Section';
          var display = typeText + (title ? (' — ' + title) : '');
          var h = '<section data-sectype="' + attrEscapeLocal(typeText) + '"><h2>' + esc(display) + esc(rounds) + '</h2>';
          // Detect warm-up / cooldown / mobility / recovery sections
          var tlow = (title + ' ' + type).toLowerCase();
          var isWarmish = (tlow.indexOf('warm') !== -1 || tlow.indexOf('cool') !== -1 || tlow.indexOf('mobility') !== -1 || tlow.indexOf('recovery') !== -1);
          // Render notes as basic markdown (so links and bullets render) and, for warm/cool/mobility, prefer notes over items to avoid duplication
          if (sec.notes) {
            try { h += renderMarkdownBasic(String(sec.notes)); } catch (e) { h += '<p>' + esc(sec.notes) + '</p>'; }
          }
          // Always render items even for warm-up/cooldown/mobility/recovery when notes exist
          if (sec.items && sec.items.length) {
            // Suppress rendering inline cues; cards will show cues/prescriptions
            var itemsHtml = sec.items.map(function(it){ return renderItem(it, { suppressCues: true }); }).join('');
            // Wrap loose <li> in a <ul>
            if (itemsHtml.indexOf('<li') !== -1) itemsHtml = '<ul>' + itemsHtml + '</ul>';
            h += itemsHtml;
          }
          h += '</section>';
          return h;
        }
        var obj = null;
        try { obj = JSON.parse(text || '{}'); } catch (e) { obj = null; }
        if (!obj || !obj.sections) {
          // Fallback to pretty JSON
          var pretty = '';
          try { pretty = JSON.stringify(JSON.parse(text || '{}'), null, 2); } catch (e) { pretty = text || ''; }
          workoutContent.innerHTML = '<pre>' + (pretty || '') + '</pre>';
        } else {
          var parts = [];
          // Title
          var titleTop = obj.title ? '<h1>' + esc(obj.title) + '</h1>' : '';
          if (obj.date) titleTop += '<p class="muted">' + esc(obj.date) + '</p>';
          if (titleTop) parts.push(titleTop);
          // Session-level notes before sections
          if (obj.notes) {
            try { parts.push(renderMarkdownBasic(String(obj.notes))); }
            catch (e) { parts.push('<p>' + esc(obj.notes) + '</p>'); }
          }
          for (var si = 0; si < obj.sections.length; si++) parts.push(renderSection(obj.sections[si]));
          workoutContent.innerHTML = parts.join('\n');
        }
        fixExerciseAnchors(workoutContent);
      } else {
        // render markdown (basic)
        workoutContent.innerHTML = renderMarkdownBasic(text || '');
        fixExerciseAnchors(workoutContent);
      }
      setVisibility(formSection, true);
      buildForm(path, text || '', isJSON);
      // Intercept clicks on exercise links inside the session view and route to exercise.html
      if (workoutSection && !workoutSection.__wiredExLinks) {
        workoutSection.addEventListener('click', function (e) {
          var t = e.target || e.srcElement;
          if (!t) return;
          while (t && t !== workoutSection && !(t.tagName && t.tagName.toLowerCase() === 'a')) t = t.parentNode;
          if (!t || t === workoutSection) return;
          var href = t.getAttribute('href') || '';
          var exMatch = href.match(/(?:^|\/)exercises\/([\w\-]+)\.(?:md|json)$/);
          if (exMatch) {
            try { e.preventDefault(); } catch (ex) {}
            var jsonPath = 'exercises/' + exMatch[1] + '.json';
            try { window.location.href = 'exercise.html?file=' + encodeURIComponent(jsonPath); } catch (ex) {}
            return;
          }
        }, false);
        workoutSection.__wiredExLinks = true;
      }
      // Meta
      var title = path;
      if (readmeText) {
        // Try find a title from README link text
        var rx = new RegExp("\\[(.*?)\\]\\(" + path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "\\)");
        var m = readmeText.match(rx);
        if (m && m[1]) title = m[1];
      }
      workoutTitleEl.innerHTML = title;
      openOnGitHubEl.href = 'https://github.com/jrodhead/exercAIse/blob/main/' + path;
      setVisibility(workoutMetaEl, true);
      try { window.scrollTo(0, 0); } catch (e) {}
      status(''); // no noisy success banner
    });
  }

  function validateSessionPlan(obj) {
    if (!obj || typeof obj !== 'object') return 'Not an object';
    if (obj.version !== '1.0') return 'version must be "1.0"';
    if (!obj.title || !obj.exercises) return 'Missing title or exercises';
    if (Object.prototype.toString.call(obj.exercises) !== '[object Array]') return 'exercises must be an array';
    for (var i = 0; i < obj.exercises.length; i++) {
      var ex = obj.exercises[i];
      if (!ex || typeof ex !== 'object') return 'exercise[' + i + '] invalid';
      if (!ex.slug || !ex.name) return 'exercise[' + i + '] missing slug/name';
      if (ex.prescribed && typeof ex.prescribed !== 'object') return 'exercise[' + i + '].prescribed invalid';
    }
    return null;
  }

  function openGeneratedSession(obj) {
    // Render using same path rendering by writing to a blob URL
    var pretty = JSON.stringify(obj || {}, null, 2);
    var blob = null; try { blob = new Blob([pretty], { type: 'application/json' }); } catch (e) {}
    if (!blob) { return status('Your browser cannot render the generated session.', { important: true }); }
    var url = null; try { url = URL.createObjectURL(blob); } catch (e) {}
    if (!url) { return status('Unable to open generated session.', { important: true }); }
    // Reuse openSession by pretending this is a JSON path
    setVisibility(readmeSection, false);
    setVisibility(logsSection, false);
    setVisibility(generateSection, false);
    setVisibility(workoutSection, true);
    // Directly render JSON branch without XHR by injecting content
    try {
      var text = pretty;
      // render structured JSON like in openSession JSON branch
      var obj = JSON.parse(text || '{}');
      function esc(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
      function renderItem(it, opts) {
        if (!it || typeof it !== 'object') return '';
        var options = opts || {};
        var kind = String(it.kind || 'exercise');
        var name = String(it.name || '');
        var link = 'exercises/' + (String(it.slug || '').replace(/[^a-z0-9\-]+/g,'') || '') + '.json';
        function inlineMarkdown(text) {
          var s = String(text == null ? '' : text);
          s = s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
          s = s.replace(/\[(.*?)\]\((.*?)\)/g, function(_, t, u){ return '<a href="' + u + '">' + t + '</a>'; });
          return s;
        }
        function attrEscape(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }
        if (kind === 'exercise') {
          var meta = { cues: (it.cues || []), prescription: (it.prescribed || null) };
          if (it.logType) meta.logType = it.logType;
          if (it.loggable === false) meta.loggable = false;
          var html = '<li><a href="' + esc(link) + '" data-exmeta="' + attrEscape(JSON.stringify(meta)) + '">' + esc(name) + '</a>';
          // Append compact prescription summary inline for list-only display
          if (it.prescribed && typeof it.prescribed === 'object') {
            try {
              var p = it.prescribed || {};
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
        function attrEscapeLocal(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }
        var typeText = type || 'Section';
        var display = typeText + (title ? (' — ' + title) : '');
        var h = '<section data-sectype="' + attrEscapeLocal(typeText) + '"><h2>' + esc(display) + esc(rounds) + '</h2>';
        if (sec.notes) { try { h += renderMarkdownBasic(String(sec.notes)); } catch (e) { h += '<p>' + esc(sec.notes) + '</p>'; } }
        if (sec.items && sec.items.length) {
          var itemsHtml = sec.items.map(function(it){ return renderItem(it, { suppressCues: true }); }).join('');
          if (itemsHtml.indexOf('<li') !== -1) itemsHtml = '<ul>' + itemsHtml + '</ul>';
          h += itemsHtml;
        }
        h += '</section>';
        return h;
      }
      // If no sections provided, map exercises into a default section for display
      if ((!obj.sections || !obj.sections.length) && obj.exercises && obj.exercises.length) {
        var items = [];
        for (var ei = 0; ei < obj.exercises.length; ei++) {
          var ex = obj.exercises[ei] || {};
          var pres = ex.prescribed || {};
          // Accept top-level sets/reps as well
          if (!pres.sets && ex.sets != null) pres.sets = ex.sets;
          if (!pres.reps && ex.reps != null) pres.reps = ex.reps;
          if (!pres.load && ex.load != null) pres.load = ex.load;
          if (!pres.rpe && ex.rpe != null) pres.rpe = ex.rpe;
          items.push({
            kind: 'exercise',
            name: ex.name || ex.slug || 'Exercise',
            cues: ex.cues || [],
            prescription: pres,
            link: (ex.slug ? ('exercises/' + String(ex.slug).replace(/[^a-z0-9\-]+/g,'') + '.json') : '')
          });
        }
        obj.sections = [{ type: 'Main', title: 'Main Sets', items: items }];
      }

      var parts = [];
      var titleTop = obj.title ? '<h1>' + esc(obj.title) + '</h1>' : '';
      if (obj.date) titleTop += '<p class="muted">' + esc(obj.date) + '</p>';
      if (titleTop) parts.push(titleTop);
      if (obj.notes) { try { parts.push(renderMarkdownBasic(String(obj.notes))); } catch (e) { parts.push('<p>' + esc(obj.notes) + '</p>'); } }
      if (obj.sections && obj.sections.length) {
        for (var si = 0; si < obj.sections.length; si++) parts.push(renderSection(obj.sections[si]));
      }
      workoutContent.innerHTML = parts.join('\n');
      fixExerciseAnchors(workoutContent);
      setVisibility(formSection, true);
      buildForm('generated://session.json', JSON.stringify(obj), true);
      workoutTitleEl.innerHTML = obj.title || 'Generated Session';
      openOnGitHubEl.href = '#';
      setVisibility(workoutMetaEl, true);
      try { window.scrollTo(0, 0); } catch (e) {}
      status('');
    } catch (e) {
      status('Failed to render generated session: ' + (e && e.message || e), { important: true });
    }
  }

  function handleGenerateButtons() {
    if (!genForm || genForm.__wired) return;
    genForm.__wired = true;
    if (genClear) genClear.onclick = function () {
      if (genGoals) genGoals.value = '';
      if (genPain) genPain.value = '';
      if (genEquipment) genEquipment.value = '';
      if (genInstr) genInstr.value = '';
      if (genJSON) genJSON.value = '';
      status('Cleared.', { important: false });
    };
    if (genLoadJSON) genLoadJSON.onclick = function () {
      var text = (genJSON && genJSON.value) || '';
      if (!text) return status('Paste JSON first.', { important: true });
      var obj = null; try { obj = JSON.parse(text); } catch (e) { return status('Invalid JSON: ' + (e && e.message || e), { important: true }); }
      var err = validateSessionPlan(obj);
      if (err) return status('SessionPlan invalid: ' + err, { important: true });
      openGeneratedSession(obj);
    };
    if (genSubmit) genSubmit.onclick = function () {
      var payload = {
        goals: (genGoals && genGoals.value) || '',
        pain: ((genPain && genPain.value) || '').split(/,\s*/).filter(Boolean),
        equipment: ((genEquipment && genEquipment.value) || '').split(/,\s*/).filter(Boolean),
        personalInstructions: (genInstr && genInstr.value) || ''
      };
      status('Contacting Kai…');
      xhrPostJSON('/api/kai/session-plan', payload, function (err, text) {
        if (err) {
          // Fallback: generate a local deterministic plan using known exercises
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
              { slug: 'farmer_carry', name: 'Farmer Carry', prescribed: { sets: 3, timeSeconds: 45, rpe: 6 }, cues: ['Tall posture', 'Quiet steps'] }
            ]
          };
          var verr = validateSessionPlan(local);
          if (verr) return status('Fallback plan invalid: ' + verr, { important: true });
          return openGeneratedSession(local);
        }
        var obj = null; try { obj = JSON.parse(text); } catch (e) { return status('Kai returned invalid JSON', { important: true }); }
        var v = validateSessionPlan(obj);
        if (v) return status('SessionPlan invalid: ' + v, { important: true });
        openGeneratedSession(obj);
      });
    };
  }

  // Compute repo base for GitHub Pages; if on *.github.io, prefix with '/exercAIse/'
  function getRepoBase() {
    var base = './';
    try {
      var loc = window.location || {};
      var host = String(loc.hostname || '');
      if (/github\.io$/i.test(host)) {
        base = '/exercAIse/';
      } else if (String(loc.pathname || '').indexOf('/exercAIse/') !== -1) {
        base = '/exercAIse/';
      }
    } catch (e) {}
    return base;
  }

  // After content is in the DOM, normalize any exercise links to the correct base
  function fixExerciseAnchors(scope) {
    try {
      var base = getRepoBase();
      var anchors = (scope || document).getElementsByTagName('a');
      for (var i = 0; i < anchors.length; i++) {
        var a = anchors[i];
        var href = a.getAttribute('href') || '';
  // Identify exercise links (md or json) that might be relative or wrongly absolute
  var m = href.match(/(?:https?:\/\/[^\/]+)?\/?(exercises\/[\w\-]+\.(?:md|json))$/);
        if (m && m[1]) {
          var fixed = base.replace(/\/?$/, '/') + m[1];
          // collapse duplicate slashes except after protocol
          fixed = fixed.replace(/([^:])\/+/g, function (m0, p1) { return p1 + '/'; });
          a.setAttribute('href', fixed);
        }
      }
    } catch (e) {}
  }

  function load() { loadReadmeAndMaybeOpenSession(); }

  // Handle back/forward navigation
  window.addEventListener('popstate', function () {
    var s = window.location.search || '';
    if (s.indexOf('file=') === -1) {
      showIndexView();
    } else {
      var parts = s.replace(/^\?/, '').split('&');
      var file = null;
      for (var i = 0; i < parts.length; i++) {
        var kv = parts[i].split('=');
        if (kv[0] === 'file') { file = decodeURIComponent(kv[1] || ''); break; }
      }
      if (file) openSession(file, lastReadmeText);
    }
  }, false);

  // kickoff
  load();
})();
