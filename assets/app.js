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
  return renderMarkdownBasic(md);
  }

  function renderMarkdownBasic(md) {
    // Very basic and safe-ish markdown to HTML; no external libs (old iPad friendly).
    // We only handle headings (#, ##, ###), bold/italic, lists, code fences as pre, and links.
    var html = md
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

    // links [text](url) — external links open in new tab, internal links replace page
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, function(_, text, url) {
      var isExternal = /^https?:/i.test(url);
      var attrs = isExternal ? ' target="_blank" rel="noopener"' : '';
      return '<a href="' + url + '"' + attrs + '>' + text + '</a>';
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

  function extractExercisesFromMarkdown(md) {
    // Heuristic: find markdown links where the URL starts with ../exercises or exercises/
    var re = /\[(.*?)\]\(((?:\.\.\/)?exercises\/[\w\-]+\.md)\)/g;
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
    // Return map exKey -> array of rows {set, reps, weight, rpe}
    var rowsByEx = {};
    var lines = md.split(/\r?\n/);
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var linkMatch = line.match(/\[(.*?)\]\(((?:\.\.\/)?exercises\/[\w\-]+\.md)\)/);
      if (!linkMatch) continue;
      var title = linkMatch[1];
      var exKey = slugify(title);
      // Context: current line + next 2 lines
      var ctx = line + ' ' + (lines[i+1] || '') + ' ' + (lines[i+2] || '');
      var sets = null, reps = null, weight = null, rpe = null;
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
      // RPE
      m = ctx.match(/RPE\s*(\d{1,2}(?:\.\d+)?)/i);
      if (m) { rpe = Number(m[1]); }

      var rows = [];
      var count = sets || (reps != null ? 1 : 0);
      for (var s = 1; s <= count; s++) {
        var row = { set: s };
        if (reps != null) row.reps = reps;
        if (weight != null) row.weight = weight;
        if (rpe != null) row.rpe = rpe;
        rows.push(row);
      }
      if (rows.length) rowsByEx[exKey] = rows;
    }
    return rowsByEx;
  }

  function parseJSONPrescriptions(jsonText) {
    var byEx = {};
    function addFor(name, cfg) {
      if (!name) return;
      var exKey = slugify(String(name));
      var sets = null, reps = null, weight = null, rpe = null;
      if (cfg) {
        if (typeof cfg.sets === 'number') sets = cfg.sets;
        if (typeof cfg.reps === 'number') reps = cfg.reps;
        else if (typeof cfg.reps === 'string') {
          var m = cfg.reps.match(/(\d{1,3})/);
          if (m) reps = parseInt(m[1], 10);
        } else if (Object.prototype.toString.call(cfg.reps) === '[object Array]') {
          // If array, create per-entry rows
          var rows = [];
          for (var i = 0; i < cfg.reps.length; i++) {
            var r = parseInt(cfg.reps[i], 10);
            if (!isNaN(r)) rows.push({ set: i+1, reps: r });
          }
          if (rows.length) { byEx[exKey] = rows; return; }
        }
        if (cfg.weight != null) weight = Number(cfg.weight);
        if (cfg.load != null) weight = Number(cfg.load);
        if (cfg.rpe != null) rpe = Number(cfg.rpe);
      }
      var rows2 = [];
      var count = sets || (reps != null ? 1 : 0);
      for (var s = 1; s <= count; s++) {
        var row = { set: s };
        if (reps != null) row.reps = reps;
        if (weight != null) row.weight = weight;
        if (rpe != null) row.rpe = rpe;
        rows2.push(row);
      }
      if (rows2.length) byEx[exKey] = rows2;
    }
    try {
      var data = JSON.parse(jsonText);
      (function walk(node) {
        if (!node) return;
        if (Object.prototype.toString.call(node) === '[object Array]') { for (var i = 0; i < node.length; i++) walk(node[i]); return; }
        if (typeof node === 'object') {
          if (node.name && typeof node.name === 'string') addFor(node.name, node);
          if (node.exercise && typeof node.exercise === 'string') addFor(node.exercise, node);
          for (var k in node) if (node.hasOwnProperty(k)) walk(node[k]);
        }
      })(data);
    } catch (e) {}
    return byEx;
  }

  function extractExercisesFromJSON(jsonText) {
    var ex = [];
    var seen = {};
    function add(name) {
      if (!name) return;
      var key = slugify(String(name));
      if (seen[key]) return;
      seen[key] = true;
      ex.push({ title: String(name) });
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

  function createExerciseCard(title, presetRows, savedRows) {
      var exKey = slugify(title);
  var card = document.createElement('div');
  card.className = 'exercise-card compact';
      card.setAttribute('data-exkey', exKey);

      var header = document.createElement('header');
      var toggleBtn = document.createElement('button');
      toggleBtn.className = 'secondary';
      toggleBtn.type = 'button';
      toggleBtn.appendChild(document.createTextNode('Edit'));
      header.appendChild(toggleBtn);
      var addBtn = document.createElement('button');
      addBtn.className = 'secondary';
      addBtn.type = 'button';
      addBtn.appendChild(document.createTextNode('Add set'));
      header.appendChild(addBtn);
      card.appendChild(header);

      var setsWrap = document.createElement('div');
      setsWrap.className = 'exercise-sets';
      card.appendChild(setsWrap);

      function updateSetLabelsLocal() {
        var rows = setsWrap.getElementsByClassName('set-row');
        for (var i = 0; i < rows.length; i++) {
          var lbl = rows[i].getElementsByClassName('set-label')[0];
          if (lbl) lbl.textContent = 'Set ' + (i + 1);
        }
      }

      function addSetRow(row) {
        var r = document.createElement('div');
        r.className = 'set-row';
        // Non-editable label for set number (inferred by order)
        var label = document.createElement('span');
        label.className = 'set-label';
        label.appendChild(document.createTextNode('Set'));
        r.appendChild(label);

        var inputs = [
          { name: 'weight', placeholder: 'Weight', type: 'number', step: 'any' },
          { name: 'reps', placeholder: 'Reps', type: 'number', min: 0 },
          { name: 'rpe', placeholder: 'RPE', type: 'number', step: 'any' }
        ];
        for (var i = 0; i < inputs.length; i++) {
          var spec = inputs[i];
          var input = document.createElement('input');
          input.type = spec.type;
          input.placeholder = spec.placeholder;
          if (spec.min != null) input.min = spec.min;
          if (spec.step) input.step = spec.step;
          if (row && row[spec.name] != null) input.value = row[spec.name];
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

      addBtn.onclick = function () { addSetRow({}); };
      toggleBtn.onclick = function () {
        if (card.className.indexOf('collapsed') !== -1) {
          card.className = card.className.replace('collapsed', '').replace(/\s+$/,'');
        } else {
          if (card.className.indexOf('collapsed') === -1) card.className += ' collapsed';
        }
      };

  var rows = (savedRows && savedRows.length) ? savedRows : (presetRows || []);
      for (var i = 0; i < rows.length; i++) addSetRow(rows[i]);
      return card;
    }

    // Find exercise anchors within the rendered workout content
    var anchors = workoutContent ? workoutContent.getElementsByTagName('a') : [];

    function nearestBlockContainer(node) {
      var n = node;
      while (n && n !== workoutContent) {
        if (n.tagName && (n.tagName === 'LI' || n.tagName === 'P' || n.tagName === 'DIV')) return n;
        n = n.parentNode;
      }
      return node.parentNode || workoutContent;
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

    function isWarmOrCool(sectionTitle) {
      var t = String(sectionTitle || '').toLowerCase();
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
    for (var ai = 0; ai < anchors.length; ai++) {
      var a = anchors[ai];
      var href = a.getAttribute('href') || '';
      if (!/^(?:\.\.\/)?exercises\/[\w\-]+\.md$/.test(href)) continue;
      var title = a.textContent || a.innerText || '';
      if (!title) continue;
      var exKey = slugify(title);
      // Determine section by nearest previous heading; skip warm-up/cool-down
      var container = nearestBlockContainer(a);
      var sectionTitle = findPreviousHeading(container);
      if (isWarmOrCool(sectionTitle)) continue;
      var savedRows = saved.exercises[exKey] || [];
      var preset = prescriptions[exKey] || [];
      var card = createExerciseCard(title, preset, savedRows);
      // Insert after the whole block container (list item/paragraph/div)
      var parent = container.parentNode || workoutContent;
      if (parent && parent.insertBefore) {
        if (container.nextSibling) parent.insertBefore(card, container.nextSibling);
        else parent.appendChild(card);
      } else {
        workoutContent.appendChild(card);
      }
      foundCount++;
    }

    function collectData() {
      var data = { file: filePath, updatedAt: new Date().toISOString(), exercises: {} };
    var scope = workoutContent || document;
    var cards = scope.getElementsByClassName('exercise-card');
      for (var c = 0; c < cards.length; c++) {
        var card = cards[c];
        var exKey = card.getAttribute('data-exkey');
        if (!exKey) continue;
        var rows = card.getElementsByClassName('set-row');
        data.exercises[exKey] = [];
        for (var r = 0; r < rows.length; r++) {
          var row = rows[r];
          var inputs = row.getElementsByTagName('input');
          var obj = {};
          for (var k = 0; k < inputs.length; k++) {
            var name = inputs[k].getAttribute('data-name');
            var val = inputs[k].value;
            if (val !== '') obj[name] = Number(val);
          }
      // Infer set number by order
      obj.set = r + 1;
      if (obj.reps != null || obj.weight != null || obj.rpe != null) data.exercises[exKey].push(obj);
        }
      }
      return data;
    }

    saveBtn.onclick = function () {
      var data = collectData();
      saveLocal(filePath, data);
      status('Saved locally at ' + new Date().toLocaleTimeString());
    };

  copyBtn.onclick = function () {
      var data = collectData();
      var json = JSON.stringify(data, null, 2);
      // try clipboard (newer iPads); fallback to show textarea
      var didCopy = false;
      if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(json).then(function () { didCopy = true; status('Copied JSON to clipboard.'); }).catch(function () {});
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
      // Construct issue URL: https://github.com/<owner>/<repo>/issues/new?title=...&body=...
      // Keep URL under practical mobile limits; if too large, show copy fallback.
      var owner = 'jrodhead';
      var repo = 'exercAIse';
      var title = 'Workout log ' + (data.file || '') + ' @ ' + new Date().toISOString();
      var header = 'Paste will be committed by Actions.\n\n';
      var body = header + '```json\n' + json + '\n```\n';
      var url = 'https://github.com/' + owner + '/' + repo + '/issues/new' +
        '?title=' + encodeURIComponent(title) +
        '&body=' + encodeURIComponent(body);

      // Heuristic limit: many mobile browsers have issues >2000 chars for URLs. If exceeded, fallback.
      if (url.length > 1800) {
        copyWrapper.style.display = 'block';
        copyTarget.value = json;
        copyTarget.focus();
        copyTarget.select();
        if (openIssueLink) openIssueLink.style.display = 'inline-block';
        status('Payload too large for URL. JSON shown below — tap Open Issue and paste it.');
        return;
      }
      if (openIssueLink) openIssueLink.style.display = 'none';
      try { window.open(url, '_blank'); } catch (e) { window.location.href = url; }
    };

    clearBtn.onclick = function () {
      if (!confirm('Clear all entries for this workout?')) return;
      // Remove all inline cards
      var scope = workoutContent || document;
      var cards = scope.getElementsByClassName('exercise-card');
      // Convert HTMLCollection to array snapshot
      var arr = [];
      for (var i = 0; i < cards.length; i++) arr.push(cards[i]);
      for (var j = 0; j < arr.length; j++) arr[j].parentNode && arr[j].parentNode.removeChild(arr[j]);
      // Re-inject from prescriptions (not saved) for each exercise anchor
      var anchors2 = workoutContent ? workoutContent.getElementsByTagName('a') : [];
      for (var k = 0; k < anchors2.length; k++) {
        var a2 = anchors2[k];
        var href2 = a2.getAttribute('href') || '';
        if (!/^(?:\.\.\/)?exercises\/[\w\-]+\.md$/.test(href2)) continue;
        var title2 = a2.textContent || a2.innerText || '';
        var exKey2 = slugify(title2);
        var preset2 = prescriptions[exKey2] || [];
        var card2 = createExerciseCard(title2, preset2, []);
        var p2 = a2.parentNode || workoutContent;
        if (p2 && p2.insertBefore) {
          if (a2.nextSibling) p2.insertBefore(card2, a2.nextSibling);
          else p2.appendChild(card2);
        } else {
          workoutContent.appendChild(card2);
        }
      }
      status('Cleared form.');
    };
  }

  function status(msg) {
    statusEl.innerHTML = msg;
    statusEl.style.display = 'block';
  }

  function loadReadmeAndMaybeOpenSession() {
    status('Reading README…');
    xhrGet('README.md', function (err, text) {
      if (err) return status('Error reading README: ' + err.message);
      // Render README mirror with inline Log links
      lastReadmeText = text || '';
      readmeContent.innerHTML = decorateReadmeWithLogLinks(lastReadmeText);
      if (readmeSection) readmeSection.style.display = 'block';

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
    status('Loading ' + path + ' …');
    xhrGet(path, function (err, text) {
      if (err) return status('Error loading workout: ' + err.message);
      // Save current scroll and hide index
      try { sessionStorage.setItem('indexScrollY', String(window.scrollY || 0)); } catch (e) {}
      setVisibility(readmeSection, false);
      setVisibility(logsSection, false);
      setVisibility(workoutSection, true);
      var isJSON = /\.json$/i.test(path);
      if (isJSON) {
        // Render a simple view of the JSON workout
        var pretty = '';
        try { pretty = JSON.stringify(JSON.parse(text || '{}'), null, 2); } catch (e) { pretty = text || ''; }
        workoutContent.innerHTML = '<pre>' + (pretty || '') + '</pre>';
      } else {
        // render markdown (basic)
        workoutContent.innerHTML = renderMarkdownBasic(text || '');
      }
      setVisibility(formSection, true);
      buildForm(path, text || '', isJSON);
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
      status('Loaded.');
    });
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
