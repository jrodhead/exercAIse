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
  var workoutSection = document.getElementById('workout-section');
  var workoutContent = document.getElementById('workout-content');
  var formSection = document.getElementById('form-section');
  var exerciseFormsEl = document.getElementById('exercise-forms');
  var saveBtn = document.getElementById('save-local');
  var copyBtn = document.getElementById('copy-json');
  var clearBtn = document.getElementById('clear-form');
  var copyWrapper = document.getElementById('copy-target-wrapper');
  var copyTarget = document.getElementById('copy-target');
  var STORAGE_KEY_PREFIX = 'exercAIse-perf-';
  var latestKey = 'exercAIse-latest-file';

  document.getElementById('year').innerHTML = String(new Date().getFullYear());
  reloadBtn.onclick = function () { load(); };

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

    // links [text](url)
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

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
    exerciseFormsEl.innerHTML = '';

    var saved = loadSaved(filePath) || { file: filePath, updatedAt: new Date().toISOString(), exercises: {} };

    function addExerciseCard(ex) {
      var exKey = slugify(ex.title);
      var card = document.createElement('div');
      card.className = 'exercise-card';

      var header = document.createElement('header');
      var h3 = document.createElement('h3');
      h3.appendChild(document.createTextNode(ex.title));
      header.appendChild(h3);
      var addBtn = document.createElement('button');
      addBtn.className = 'secondary';
      addBtn.type = 'button';
      addBtn.appendChild(document.createTextNode('Add set'));
      header.appendChild(addBtn);
      card.appendChild(header);

      var setsWrap = document.createElement('div');
      setsWrap.className = 'exercise-sets';
      card.appendChild(setsWrap);

      function addSetRow(row) {
        var r = document.createElement('div');
        r.className = 'set-row';

        var inputs = [
          { name: 'set', placeholder: 'Set', type: 'number', min: 1 },
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
        del.onclick = function () { setsWrap.removeChild(r); };
        r.appendChild(del);
        setsWrap.appendChild(r);
      }

      addBtn.onclick = function () { addSetRow({}); };

      // load saved rows
      var savedRows = saved.exercises[exKey] || [];
      for (var i = 0; i < savedRows.length; i++) addSetRow(savedRows[i]);

      exerciseFormsEl.appendChild(card);
    }

    for (var i = 0; i < exercises.length; i++) addExerciseCard(exercises[i]);

    function collectData() {
      var data = { file: filePath, updatedAt: new Date().toISOString(), exercises: {} };
      var cards = exerciseFormsEl.getElementsByClassName('exercise-card');
      for (var c = 0; c < cards.length; c++) {
        var card = cards[c];
        var title = card.getElementsByTagName('h3')[0].textContent;
        var exKey = slugify(title);
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
          if (obj.set != null || obj.reps != null || obj.weight != null || obj.rpe != null) {
            data.exercises[exKey].push(obj);
          }
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

    clearBtn.onclick = function () {
      if (!confirm('Clear all entries for this workout?')) return;
      exerciseFormsEl.innerHTML = '';
      for (var i = 0; i < exercises.length; i++) {
        // rebuild empty cards
        var ex = exercises[i];
        var temp = { title: ex.title };
        addExerciseCard(temp);
      }
      status('Cleared form.');
    };
  }

  function status(msg) {
    statusEl.innerHTML = msg;
    statusEl.style.display = 'block';
  }

  function loadLatestFromReadme() {
    status('Reading README for latest workout…');
    xhrGet('README.md', function (err, text) {
      if (err) return status('Error reading README: ' + err.message);
      var latest = parseReadmeForLatest(text || '');
      if (!latest) return status('No workout links found in README.md');
      openOnGitHubEl.href = 'https://github.com/jrodhead/exercAIse/blob/main/' + latest.path;
      workoutTitleEl.innerHTML = latest.title;
      workoutMetaEl.style.display = 'flex';
      loadWorkout(latest.path);
    });
  }

  function loadWorkout(path) {
    status('Loading ' + path + ' …');
    xhrGet(path, function (err, text) {
      if (err) return status('Error loading workout: ' + err.message);
      workoutSection.style.display = 'block';
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
      formSection.style.display = 'block';
      buildForm(path, text || '', isJSON);
      status('Loaded.');
    });
  }

  function load() { loadLatestFromReadme(); }

  // kickoff
  load();
})();
