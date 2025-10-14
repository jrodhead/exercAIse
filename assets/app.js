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
  var downloadBtn = document.getElementById('download-json');
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
  // Simple UI feature flag: hide Kai generation by default
  var kaiUiEnabled = (function(){
    try {
      var params = window.location.search || '';
      if (/([?&])enableKai=1\b/.test(params)) return true;
      var ls = localStorage.getItem('features.kaiUi');
      if (ls === '1' || ls === 'true') return true;
    } catch (e) {}
    return false;
  })();
  if (!kaiUiEnabled) {
    // Hide Kai generation fields for a cleaner MVP experience
    function hideElById(id) {
      try {
        var el = document.getElementById(id);
        if (el) { el.style.display = 'none'; el.setAttribute('aria-hidden','true'); }
      } catch (e) {}
    }
    function hideLabelFor(id) {
      try {
        var lbl = document.querySelector('label[for="' + id + '"]');
        if (lbl) { lbl.style.display = 'none'; lbl.setAttribute('aria-hidden','true'); }
      } catch (e) {}
    }
    hideElById('gen-goals'); hideLabelFor('gen-goals');
    hideElById('gen-pain'); hideLabelFor('gen-pain');
    hideElById('gen-equipment'); hideLabelFor('gen-equipment');
    hideElById('gen-instructions'); hideLabelFor('gen-instructions');
    if (genSubmit) { genSubmit.style.display = 'none'; }
    if (genClear) { genClear.style.display = 'none'; }
  }
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
    setVisibility(readmeSection, false);
    setVisibility(logsSection, false);
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
    if (readmeSection) readmeSection.style.display = 'none';
    if (logsSection) logsSection.style.display = 'none';
    if (generateSection) generateSection.style.display = 'block';
    workoutMetaEl.style.display = 'none';
    workoutSection.style.display = 'none';
    formSection.style.display = 'none';
    // Return to simple home view
    handleGenerateButtons();
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

  // Import session parser utilities from module
  var slugify = window.ExercAIse.SessionParser.slugify;
  var parseHMSToSeconds = window.ExercAIse.SessionParser.parseHMSToSeconds;
  var secondsToHHMMSS = window.ExercAIse.SessionParser.secondsToHHMMSS;
  var extractExercisesFromMarkdown = window.ExercAIse.SessionParser.extractExercisesFromMarkdown;
  var parseMarkdownPrescriptions = window.ExercAIse.SessionParser.parseMarkdownPrescriptions;
  var extractExercisesFromJSON = window.ExercAIse.SessionParser.extractExercisesFromJSON;
  var parseJSONPrescriptions = window.ExercAIse.SessionParser.parseJSONPrescriptions;

  // Import Kai integration utilities from module (will be initialized after DOM elements are ready)
  var KaiIntegration = window.ExercAIse.KaiIntegration;
  var linkValidation = KaiIntegration.linkValidation;

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

  // Form building functions now imported from form-builder.js module
  // Includes: buildForm, createExerciseCard, pickFieldsFromRows, addSetRow,
  // findNearestHeadingEl, findPreviousHeading, collectFollowingBlocks, and all form management logic

  // Initialize Form Builder module with required dependencies
  function initializeFormBuilder() {
    if (!window.ExercAIse || !window.ExercAIse.FormBuilder) {
      console.warn('FormBuilder module not loaded');
      return;
    }
    
    // Pass dependencies to FormBuilder module
    window.ExercAIse.FormBuilder.init({
      slugify: slugify,
      extractExercisesFromJSON: window.ExercAIse.SessionParser.extractExercisesFromJSON,
      extractExercisesFromMarkdown: window.ExercAIse.SessionParser.extractExercisesFromMarkdown,
      parseJSONPrescriptions: window.ExercAIse.SessionParser.parseJSONPrescriptions,
      parseMarkdownPrescriptions: window.ExercAIse.SessionParser.parseMarkdownPrescriptions,
      loadSaved: loadSaved,
      saveLocal: saveLocal,
      parseHMSToSeconds: window.ExercAIse.SessionParser.parseHMSToSeconds,
      secondsToHHMMSS: window.ExercAIse.SessionParser.secondsToHHMMSS,
      renderMarkdownBasic: renderMarkdownBasic,
      fixExerciseAnchors: fixExerciseAnchors,
      status: status,
      // DOM elements
      workoutContent: workoutContent,
      exerciseFormsEl: exerciseFormsEl,
      saveBtn: saveBtn,
      copyBtn: copyBtn,
      downloadBtn: downloadBtn,
      issueBtn: issueBtn,
      clearBtn: clearBtn,
      copyWrapper: copyWrapper,
      copyTarget: copyTarget,
      openIssueLink: openIssueLink
    });
  }

  // Wrapper function to call FormBuilder.buildForm
  function buildForm(filePath, raw, isJSON) {
    if (window.ExercAIse && window.ExercAIse.FormBuilder) {
      window.ExercAIse.FormBuilder.buildForm(filePath, raw, isJSON);
    } else {
      console.error('FormBuilder module not available');
    }
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

      wireReadmeClicks();

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

  function wireReadmeClicks() {
    // Intercept clicks on workout links for in-page navigation
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
  }

  function loadLogsList() {
    if (!logsList) return;
    // Load local manifest (performed/index.json). If missing, show unavailable message.
    function renderFromLocal(text) {
      var data = null;
      try { data = JSON.parse(text || '{}'); } catch (e) { data = null; }
      var list = [];
      if (!data) return false;
      // Accept either { files: [...] } or a bare array
      if (Object.prototype.toString.call(data) === '[object Array]') list = data;
      else if (data.files && Object.prototype.toString.call(data.files) === '[object Array]') list = data.files;
      if (!list.length) return 'empty';
      // Normalize to objects with { name, path }
      var rows = [];
      for (var i = 0; i < list.length; i++) {
        var it = list[i];
        if (typeof it === 'string') rows.push({ name: it, path: 'performed/' + it });
        else if (it && typeof it === 'object') rows.push({ name: it.name || it.path || ('file-' + i), path: it.path || ('performed/' + (it.name || '')) });
      }
      // Sort descending by name (timestamps in name) or by mtime if provided
      rows.sort(function(a, b){
        var ma = (typeof a.mtimeMs === 'number') ? a.mtimeMs : 0;
        var mb = (typeof b.mtimeMs === 'number') ? b.mtimeMs : 0;
        if (ma && mb && ma !== mb) return mb - ma;
        return a.name < b.name ? 1 : -1;
      });
      var html = '';
      for (var j = 0; j < Math.min(rows.length, 50); j++) {
        var r = rows[j];
        // Link to local file path; will be served as static content
        var href = r.path || ('performed/' + r.name);
        html += '<li><a target="_blank" rel="noopener" href="' + href + '">' + r.name + '</a></li>';
      }
      logsList.innerHTML = html || '<li>No logs yet.</li>';
      return true;
    }

    xhrGet('performed/index.json', function (err, text) {
      if (err || !text) {
        logsList.innerHTML = '<li>History unavailable (no local manifest). Run scripts/build_performed_index.js to generate, or add logs.</li>';
        return;
      }
      var res = renderFromLocal(text);
      if (res === 'empty') {
        logsList.innerHTML = '<li>No logs yet.</li>';
      } else if (!res) {
        logsList.innerHTML = '<li>History unavailable (invalid manifest).</li>';
      }
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
        function isInternalExerciseLink(url) {
          if (!url) return false;
          if (/^https?:/i.test(url)) return false;
          var m = String(url).match(/^(?:\.?\.?\/)?(exercises\/[\w\-]+\.(?:json|md))$/i);
          return !!(m && m[1]);
        }
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
            if (it.notes) meta.notes = it.notes;
            // If a JSON workout provides a link, render it as a link regardless of slug presence.
            var asLink = !!link && isInternalExerciseLink(link);
            var html = '<li>' + (asLink
              ? ('<a href="' + esc(link) + '" data-exmeta="' + attrEscape(JSON.stringify(meta)) + '">' + esc(clean) + '</a>')
              : ('<span class="ex-name no-link" data-exmeta="' + attrEscape(JSON.stringify(meta)) + '">' + esc(clean) + '</span>'));
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
        // Normalize SessionPlan shape (version + exercises) into a displayable sections/items structure
        if (obj && (!obj.sections || !obj.sections.length) && obj.exercises && Object.prototype.toString.call(obj.exercises) === '[object Array]') {
          var itemsFromPlan = [];
          for (var ei2 = 0; ei2 < obj.exercises.length; ei2++) {
            var ex2 = obj.exercises[ei2] || {};
            var pres2 = (ex2.prescribed != null ? ex2.prescribed : ex2.prescription) || {};
            if (!pres2.sets && ex2.sets != null) pres2.sets = ex2.sets;
            if (!pres2.reps && ex2.reps != null) pres2.reps = ex2.reps;
            if (!pres2.load && ex2.load != null) pres2.load = ex2.load;
            if (!pres2.rpe && ex2.rpe != null) pres2.rpe = ex2.rpe;
            // For SessionPlan inputs: carry through provided link; render logic will restrict to internal-only
            var linkPlan = String(ex2.link || '');
            itemsFromPlan.push({
              kind: 'exercise',
              name: ex2.name || ex2.slug || 'Exercise',
              cues: ex2.cues || [],
              prescription: pres2,
              link: linkPlan
            });
          }
          obj.sections = [{ type: 'Main', title: 'Main Sets', items: itemsFromPlan }];
        }
        if (obj && obj.sections) {
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
        } else {
          // Fallback to pretty JSON when structure is unknown
          var pretty = '';
          try { pretty = JSON.stringify(JSON.parse(text || '{}'), null, 2); } catch (e) { pretty = text || ''; }
          workoutContent.innerHTML = '<pre>' + (pretty || '') + '</pre>';
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
          // Only route internal exercise links
          if (/^https?:/i.test(href)) return;
          var exMatch = href.match(/(?:^|\/)?exercises\/[\w\-]+\.(?:md|json)$/i);
          if (exMatch) {
            try { e.preventDefault(); } catch (ex) {}
            // Normalize to exercises/<slug>.json
            var slug = (href.match(/exercises\/([\w\-]+)\.(?:md|json)$/i)||[])[1];
            var jsonPath = 'exercises/' + slug + '.json';
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

  // Kai integration functions now imported from kai-integration.js module
  // Includes: validateSessionPlan, normalizeSessionPlanInPlace, validateSessionPlanLinks,
  // validateWorkoutLinks, isWorkoutJSONShape, looksLikeSessionPlan, openGeneratedSession,
  // handleGenerateButtons, generateExerciseStub, generateExerciseStubsFromObj, generateExerciseStubsFromPlan

  // Initialize Kai Integration module with required dependencies
  function initializeKaiIntegration() {
    if (!window.ExercAIse || !window.ExercAIse.KaiIntegration) {
      console.warn('KaiIntegration module not loaded');
      return;
    }
    
    // Pass dependencies to KaiIntegration module
    window.ExercAIse.KaiIntegration.init({
      status: status,
      xhrGet: xhrGet,
      xhrPostJSON: xhrPostJSON,
      renderMarkdownBasic: renderMarkdownBasic,
      fixExerciseAnchors: fixExerciseAnchors,
      setVisibility: setVisibility,
      buildForm: buildForm,
      // DOM elements
      readmeSection: readmeSection,
      logsSection: logsSection,
      generateSection: generateSection,
      workoutSection: workoutSection,
      workoutContent: workoutContent,
      formSection: formSection,
      workoutTitleEl: workoutTitleEl,
      openOnGitHubEl: openOnGitHubEl,
      workoutMetaEl: workoutMetaEl,
      genForm: genForm,
      genClear: genClear,
      genGoals: genGoals,
      genPain: genPain,
      genEquipment: genEquipment,
      genInstr: genInstr,
      genJSON: genJSON,
      genLoadJSON: genLoadJSON,
      genSubmit: genSubmit,
      linkValidation: linkValidation,
      kaiUiEnabled: kaiUiEnabled,
      parseHMSToSeconds: window.ExercAIse.SessionParser.parseHMSToSeconds
    });
  }

  // OLD KAI FUNCTIONS REMOVED - NOW IN kai-integration.js MODULE
  // The following ~600 lines have been extracted to kai-integration.js:
  // - validateSessionPlan, normalizeSessionPlanInPlace
  // - validateSessionPlanLinks, validateWorkoutLinks
  // - isWorkoutJSONShape, looksLikeSessionPlan
  // - openGeneratedSession, handleGenerateButtons
  // - generateExerciseStub, generateExerciseStubsFromObj, generateExerciseStubsFromPlan

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

  // Navigation handlers
  (function setupNav(){
    try {
      var navHome = document.getElementById('nav-home');
      var navWorkouts = document.getElementById('nav-workouts');
      var navHistory = document.getElementById('nav-history');
      if (navHome) navHome.onclick = function(e){
        if (e && e.preventDefault) e.preventDefault();
        try { window.history.pushState({ view: 'home' }, '', 'index.html'); } catch (ex) {}
        showIndexView();
      };
      if (navWorkouts) navWorkouts.onclick = function(e){
        if (e && e.preventDefault) e.preventDefault();
        try { window.history.pushState({ view: 'workouts' }, '', 'index.html?view=workouts'); } catch (ex) {}
        openWorkouts();
      };
      if (navHistory) navHistory.onclick = function(e){
        if (e && e.preventDefault) e.preventDefault();
        try { window.history.pushState({ view: 'history' }, '', 'index.html?view=history'); } catch (ex) {}
        openHistory();
      };
    } catch (e) {}
  })();

  function openWorkouts(){
    setVisibility(generateSection, false);
    setVisibility(logsSection, false);
    setVisibility(readmeSection, true);
    // Lazy-load README when first opened
    if (!lastReadmeText) {
      xhrGet('README.md', function (err, text) {
        if (err) return status('Error reading README: ' + err.message, { important: true });
        lastReadmeText = text || '';
        readmeContent.innerHTML = decorateReadmeWithLogLinks(lastReadmeText);
        fixExerciseAnchors(readmeContent);
        wireReadmeClicks();
        handleGenerateButtons();
      });
    }
  }

  function openHistory(){
    setVisibility(generateSection, false);
    setVisibility(readmeSection, false);
    setVisibility(logsSection, true);
    loadLogsList();
  }

  function load() {
    // Respect deep link params on initial load
    var params = (function () {
      var q = {};
      try {
        var s = (window.location.search || '').replace(/^\?/, '').split('&');
        for (var i = 0; i < s.length; i++) {
          var kv = s[i].split('=');
          if (kv[0]) q[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
        }
      } catch (e) {}
      return q;
    })();
    if (params.file) {
      // Open a specific session
      openSession(params.file, lastReadmeText || '');
      return;
    }
    if (params.view === 'workouts') {
      openWorkouts();
      return;
    }
    if (params.view === 'history') {
      openHistory();
      return;
    }
    // Default home view
    showIndexView();
    initializeKaiIntegration();
    initializeFormBuilder();
    if (window.ExercAIse && window.ExercAIse.KaiIntegration) {
      window.ExercAIse.KaiIntegration.handleGenerateButtons();
    }
  }

  // Handle back/forward navigation
  window.addEventListener('popstate', function () {
    var s = window.location.search || '';
    var params = (function () {
      var q = {};
      try {
        var arr = s.replace(/^\?/, '').split('&');
        for (var i = 0; i < arr.length; i++) {
          var kv = arr[i].split('=');
          if (kv[0]) q[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
        }
      } catch (e) {}
      return q;
    })();
    if (params.file) {
      openSession(params.file, lastReadmeText || '');
      return;
    }
    if (params.view === 'workouts') {
      openWorkouts();
      return;
    }
    if (params.view === 'history') {
      openHistory();
      return;
    }
    showIndexView();
  }, false);

  // kickoff
  load();
})();
