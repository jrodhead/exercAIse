/**
 * Form Builder Module
 * Dynamic exercise card generation, form field management, and workout logging
 * ES5-compatible, no dependencies
 */

window.ExercAIse = window.ExercAIse || {};

window.ExercAIse.FormBuilder = (function () {
  'use strict';

  // Module dependencies (will be injected via init)
  var deps = {};

  // Constants
  var METERS_PER_MILE = 1609.34;

  /**
   * Initialize the FormBuilder module with required dependencies from app.js
   * @param {Object} dependencies - Object containing all required functions and DOM elements
   */
  function init(dependencies) {
    deps = dependencies || {};
    
    // Validate required dependencies
    var required = [
      'slugify', 'extractExercisesFromJSON', 'extractExercisesFromMarkdown',
      'parseJSONPrescriptions', 'parseMarkdownPrescriptions',
      'loadSaved', 'saveLocal', 'parseHMSToSeconds', 'secondsToHHMMSS',
      'renderMarkdownBasic', 'fixExerciseAnchors', 'status',
      // DOM elements
      'workoutContent', 'exerciseFormsEl', 'saveBtn', 'copyBtn', 'downloadBtn',
      'issueBtn', 'clearBtn', 'copyWrapper', 'copyTarget', 'openIssueLink'
    ];
    
    for (var i = 0; i < required.length; i++) {
      if (!deps[required[i]]) {
        console.warn('FormBuilder: missing dependency:', required[i]);
      }
    }
  }

  /**
   * Build the workout form by injecting exercise cards into the DOM
   * @param {string} filePath - Path to the workout file
   * @param {string} raw - Raw workout content (markdown or JSON)
   * @param {boolean} isJSON - Whether the content is JSON format
   */
  function buildForm(filePath, raw, isJSON) {
    var exercises = isJSON ? deps.extractExercisesFromJSON(raw) : deps.extractExercisesFromMarkdown(raw);
    var prescriptions = isJSON ? deps.parseJSONPrescriptions(raw) : deps.parseMarkdownPrescriptions(raw);
    
    // Clear existing forms
    if (deps.exerciseFormsEl) deps.exerciseFormsEl.innerHTML = '';

    var saved = deps.loadSaved(filePath) || { file: filePath, updatedAt: new Date().toISOString(), exercises: {} };

    // Document-level helpers for fallback parsing (e.g., distance in title "4 Miles")
    function getFirstHeadingText(tagName) {
      if (!deps.workoutContent) return '';
      var h = deps.workoutContent.querySelector(tagName);
      return h ? (h.textContent || '').trim() : '';
    }
    
    var docH1Title = getFirstHeadingText('h1');
    var fullDocText = deps.workoutContent ? ((deps.workoutContent.textContent || deps.workoutContent.innerText) || '') : '';
    
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

    /**
     * Create an exercise card with logging inputs
     * @param {string} title - Exercise name
     * @param {Array} presetRows - Prescribed sets/reps from workout
     * @param {Array} savedRows - Previously saved performance data
     * @param {string} headerHTML - HTML for the card header
     * @param {Object} opts - Options (readOnly, explicitLogType)
     * @returns {HTMLElement} The exercise card element
     */
    function createExerciseCard(title, presetRows, savedRows, headerHTML, opts) {
      var options = opts || {};
      var isReadOnly = !!options.readOnly;
      var exKey = deps.slugify(title);
      
      var card = document.createElement('div');
      card.className = 'exercise-card compact' + (isReadOnly ? ' readonly' : '');
      card.setAttribute('data-exkey', exKey);
      card.setAttribute('data-name', title);

      // Optional header area to include the original exercise text (name + notes) inside the card
      if (headerHTML) {
        var header = document.createElement('div');
        header.className = 'exercise-header';
        header.innerHTML = headerHTML;
        
        // Extract and display notes from metadata if available
        try {
          var metaElement = header.querySelector('[data-exmeta]');
          if (metaElement) {
            var metaRaw = metaElement.getAttribute('data-exmeta') || '';
            var metadata = metaRaw ? JSON.parse(metaRaw) : null;
            if (metadata && metadata.notes) {
              var notesDiv = document.createElement('div');
              notesDiv.className = 'exercise-notes';
              notesDiv.textContent = metadata.notes;
              header.appendChild(notesDiv);
            }
          }
        } catch (e) {
          // Ignore JSON parse errors
        }
        
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

      /**
       * Determine which input fields to show based on workout type
       * @param {Array} rows - Set rows with data
       * @param {string} titleForHeuristic - Exercise title for type detection
       * @param {string} explicitLogType - Explicitly specified log type
       * @returns {Array} Array of field names to display
       */
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

      /**
       * Add a set row to the exercise card
       * @param {Object} row - Row data (weight, reps, etc.)
       * @param {number} idx - Row index
       */
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
                input.value = deps.secondsToHHMMSS(v);
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
            var sec = deps.parseHMSToSeconds(val);
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
        var mainKey = deps.slugify(title);
        var extraAnchors = card.querySelectorAll('a[href*="exercises/"]');
        for (var ai = 0; ai < extraAnchors.length; ai++) {
          var ahref = extraAnchors[ai].getAttribute('href') || '';
          var m = ahref.match(/exercises\/([\w\-]+)\.(?:md|json)$/);
          if (!m || !m[1]) continue;
          var slug = m[1];
          if (deps.slugify(slug) !== mainKey) {
            // Remove the closest list item or the anchor itself
            var n = extraAnchors[ai];
            while (n && n !== card && !(n.tagName && (n.tagName === 'LI' || n.tagName === 'P' || n.className === 'exercise-notes'))) n = n.parentNode;
            if (n && n !== card && n.parentNode) n.parentNode.removeChild(n);
          }
        }
      } catch (e) {}
      
      return card;
    }

    // Find exercise anchors and non-link exercise name spans within the rendered workout content
    var anchors = deps.workoutContent ? Array.prototype.slice.call(deps.workoutContent.getElementsByTagName('a')) : [];
    var noLinkSpans = deps.workoutContent ? Array.prototype.slice.call(deps.workoutContent.querySelectorAll('span.ex-name')) : [];
    var exNodes = anchors.concat(noLinkSpans);

    function nearestBlockContainer(node) {
      var n = node;
      while (n && n !== deps.workoutContent) {
        if (n.tagName && (n.tagName === 'LI' || n.tagName === 'P' || n.tagName === 'DIV')) return n;
        n = n.parentNode;
      }
      return node.parentNode || deps.workoutContent;
    }

    function findListParent(node) {
      var n = node;
      while (n && n !== deps.workoutContent) {
        if (n.tagName && (n.tagName === 'UL' || n.tagName === 'OL')) return n;
        n = n.parentNode;
      }
      return null;
    }

    // Find the actual nearest heading element (H1-H4) above a node
    function findNearestHeadingEl(node) {
      var n = node;
      while (n && n !== deps.workoutContent) {
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
        
        // Stop if upcoming node contains an exercise anchor or a non-link exercise name span
        var hasNextExercise = false;
        try {
          if (s.querySelector) {
            if (s.querySelector('a[href*="/exercises/"]')) hasNextExercise = true;
            else if (s.querySelector('span.ex-name')) hasNextExercise = true;
          } else {
            var testHtml = s.outerHTML || (s.textContent || '');
            hasNextExercise = /(\b|\/)(exercises\/[\w\-]+\.(?:md|json))\b/.test(String(testHtml || ''));
          }
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
      while (n && n !== deps.workoutContent) {
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
        while (secEl && secEl !== deps.workoutContent && !(secEl.tagName && secEl.tagName.toLowerCase() === 'section')) secEl = secEl.parentNode;
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
    
    for (var ai = 0; ai < exNodes.length; ai++) {
      var a = exNodes[ai];
      var isAnchorNode = !!(a && a.tagName && a.tagName.toLowerCase() === 'a');
      var href = isAnchorNode ? (a.getAttribute('href') || '') : '';
      
      // Accept internal exercise links in various forms: exercises/..., ./exercises/..., ../exercises/..., or absolute http(s) with /exercises/...
      if (isAnchorNode && !/(?:^(?:https?:\/\/[^\/]+\/)?|\.?\.\/|\/)exercises\/[\w\-]+\.(?:md|json)$/.test(href)) continue;
      
      var title = a.textContent || a.innerText || '';
      
      // Normalize title by removing parenthetical hints, e.g., "Easy Run (Easy Jog)" -> "Easy Run"
      var normTitle = title.replace(/\s*\([^\)]*\)\s*$/, '').trim();
      if (!normTitle) continue;
      
      var exKey = deps.slugify(normTitle);
      
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
      
      var preset = prescriptions[exKey] || prescriptions[deps.slugify(title)] || [];
      
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
        var hrefFixed = isAnchorNode ? (a.getAttribute('href') || '') : '';
        
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
            try { parts.push(deps.secondsToHHMMSS(p.timeSeconds)); } catch (e) {}
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
        
        if (hrefFixed) {
          headerHTML = '<a href="' + hrefFixed + '" data-exmeta="' + _escAttr(metaRaw) + '">' + cleanText + '</a>' + extraBits;
        } else {
          headerHTML = '<span class="ex-name no-link" data-exmeta="' + _escAttr(metaRaw) + '">' + cleanText + '</span>' + extraBits;
        }
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
        var listHolder = parentList && parentList.parentNode ? parentList.parentNode : deps.workoutContent;
        var insertAfter = parentList && parentList.__lastCard ? parentList.__lastCard : parentList;
        
        if (listHolder && listHolder.insertBefore) {
          if (insertAfter && insertAfter.nextSibling) listHolder.insertBefore(card, insertAfter.nextSibling);
          else listHolder.appendChild(card);
        } else {
          deps.workoutContent.appendChild(card);
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
        var parent = container.parentNode || deps.workoutContent;
        if (parent && parent.insertBefore) {
          if (container.nextSibling) parent.insertBefore(card, container.nextSibling);
          else parent.appendChild(card);
        } else {
          deps.workoutContent.appendChild(card);
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
      var headings = deps.workoutContent ? deps.workoutContent.querySelectorAll('h2, h3, h4') : [];
      for (var i = 0; i < headings.length; i++) {
        var t = (headings[i].textContent || '').toLowerCase();
        if (t.indexOf('main') !== -1 || t.indexOf('conditioning') !== -1) return headings[i];
      }
      return null;
    }

    var mainHead = findMainHeadingNode();
    
    // Heuristic: detect if this workout is an endurance-style session (to filter injected cards)
    var docTextForHeuristic = (deps.workoutContent && (deps.workoutContent.textContent || deps.workoutContent.innerText) || '').toLowerCase();
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
          deps.workoutContent.appendChild(cardX);
        }
        
        foundCount++;
        foundKeys[pKey] = true;
      }
    }

    function inferLogTypeFromCard(card) {
      try {
        // Look for header anchor meta
        var a = card.querySelector('a[data-exmeta]');
        if (a) {
          var raw = a.getAttribute('data-exmeta') || '';
          if (raw) { var m = JSON.parse(raw); if (m && m.logType) return m.logType; }
        }
      } catch (e) {}
      
      // Heuristic fallback based on which inputs exist
      var hasHold = card.querySelector('input[data-name="holdSeconds"]');
      var hasDistance = card.querySelector('input[data-name="distanceMiles"]');
      var hasTime = card.querySelector('input[data-name="timeSeconds"]');
      var hasReps = card.querySelector('input[data-name="reps"]');
      var hasWeight = card.querySelector('input[data-name="weight"]');
      
      if (hasHold && !hasReps && !hasWeight) return 'mobility';
      if (hasHold) return 'stretch';
      if (hasDistance || (hasTime && !hasWeight && !hasReps)) return 'endurance';
      if (hasTime && hasWeight && !hasReps) return 'carry';
      return 'strength';
    }

    function collectData() {
      // Normalize workoutFile to 'workouts/...'
      var wf = String(filePath || '');
      // Strip leading ../ or ./
      wf = wf.replace(/^(?:\.\.\/)+/, '').replace(/^\.\//, '');
      // If path includes 'workouts/' later in the string, extract from there
      var mWf = wf.match(/workouts\/.*$/);
      if (mWf) wf = mWf[0];
      
      var data = { version: 'perf-1', workoutFile: wf, timestamp: new Date().toISOString(), exercises: {} };
      var scope = deps.workoutContent || document;
      var cards = scope.getElementsByClassName('exercise-card');
      
      for (var c = 0; c < cards.length; c++) {
        var card = cards[c];
        var exKey = card.getAttribute('data-exkey');
        var exName = card.getAttribute('data-name') || exKey;
        if (!exKey) continue;
        
        var rows = card.getElementsByClassName('set-row');
        var setsArr = [];
        
        for (var r = 0; r < rows.length; r++) {
          var rowEl = rows[r];
          var inputs = rowEl.getElementsByTagName('input');
          var obj = { set: (r + 1) };
          
          for (var k = 0; k < inputs.length; k++) {
            var inEl = inputs[k];
            var name = inEl.getAttribute('data-name');
            var val = inEl.value;
            if (val === '') continue; // untouched field => rely on prescription absence
            
            if (name === 'distanceMeters' || name === 'distanceMiles') {
              var numDist = Number(val);
              if (!isNaN(numDist)) obj.distanceMiles = numDist; // store only miles
              continue;
            }
            
            if (name === 'timeSeconds' || name === 'holdSeconds') {
              var sec = deps.parseHMSToSeconds(val);
              if (sec != null) obj[name] = sec;
              continue;
            }
            
            var num = Number(val);
            if (!isNaN(num)) obj[name] = num;
          }
          
          // Include even if only weight/multiplier zero values
          var hasAny = (obj.weight != null || obj.multiplier != null || obj.reps != null || obj.rpe != null || obj.timeSeconds != null || obj.holdSeconds != null || obj.distanceMiles != null);
          if (!hasAny) {
            // Keep empty set placeholder? We retain set if prescription existed. For now skip empty.
            continue;
          }
          
          setsArr.push(obj);
        }
        
        if (setsArr.length) {
          data.exercises[exKey] = { name: exName, logType: inferLogTypeFromCard(card), sets: setsArr };
        }
      }
      
      return data;
    }

    function validatePerformance(data) {
      var errors = [];
      function isNum(v) { return typeof v === 'number' && !isNaN(v); }
      
      if (!data || typeof data !== 'object') { errors.push('root: not object'); return errors; }
      if (data.version !== 'perf-1') errors.push('version must be perf-1');
      if (!data.workoutFile || typeof data.workoutFile !== 'string') errors.push('workoutFile missing');
      if (!data.timestamp || typeof data.timestamp !== 'string') errors.push('timestamp missing');
      if (!data.exercises || typeof data.exercises !== 'object') errors.push('exercises missing');
      else {
        for (var k in data.exercises) if (data.exercises.hasOwnProperty(k)) {
          var ex = data.exercises[k];
          if (!ex || typeof ex !== 'object') { errors.push('exercise ' + k + ' not object'); continue; }
          if (!ex.name) errors.push(k + ': name missing');
          if (!ex.logType || ['strength','endurance','carry','mobility','stretch'].indexOf(ex.logType) === -1) errors.push(k + ': invalid logType');
          if (!ex.sets || Object.prototype.toString.call(ex.sets) !== '[object Array]' || !ex.sets.length) errors.push(k + ': sets missing');
          else {
            for (var i = 0; i < ex.sets.length; i++) {
              var s = ex.sets[i];
              if (typeof s !== 'object') { errors.push(k + ' set ' + (i+1) + ': not object'); continue; }
              if (!isNum(s.set) || s.set < 1) errors.push(k + ' set ' + (i+1) + ': invalid set index');
              
              ['weight','multiplier','reps','rpe','timeSeconds','holdSeconds','distanceMiles'].forEach(function(f){
                if (s[f] != null && !isNum(s[f])) errors.push(k + ' set ' + (i+1) + ': ' + f + ' not number');
              });
              
              if (s.rpe != null && (s.rpe < 0 || s.rpe > 10)) errors.push(k + ' set ' + (i+1) + ': rpe out of range');
            }
          }
        }
      }
      
      return errors;
    }

    // Wire up action buttons
    deps.saveBtn.onclick = function () {
      var data = collectData();
      deps.saveLocal(filePath, data);
      deps.status('Saved locally at ' + new Date().toLocaleTimeString(), { important: true });
    };

    deps.copyBtn.onclick = function () {
      var data = collectData();
      var errs = validatePerformance(data);
      if (errs.length) {
        // Attach errors for debugging (not schema-defined) but do not block copy
        data.validationErrors = errs.slice(0);
        console.warn('Performance validation errors:', errs);
      }
      
      var json = JSON.stringify(data, null, 2);
      var didCopy = false;
      
      if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(json).then(function () { 
          didCopy = true; 
          deps.status('Copied performance JSON' + (errs.length ? ' (WITH WARNINGS)' : '') + '.', { important: true }); 
        }).catch(function () {});
      }
      
      if (!didCopy) {
        deps.copyWrapper.style.display = 'block';
        deps.copyTarget.value = json;
        deps.copyTarget.focus();
        deps.copyTarget.select();
        deps.status('Copy JSON shown below; select-all and copy manually.' + (errs.length ? ' (Validation warnings in console)' : ''));
      }
    };

    if (deps.downloadBtn) deps.downloadBtn.onclick = function () {
      var data = collectData();
      var errs = validatePerformance(data);
      if (errs.length) {
        data.validationErrors = errs.slice(0);
        console.warn('Performance validation errors:', errs);
      }
      
      var json = JSON.stringify(data, null, 2);
      var wf = data.workoutFile || 'session';
      // Derive a safe base name (strip folders, extension)
      var base = wf.split('/').pop().replace(/\.[^.]+$/, '') || 'session';
      var ts = (new Date().toISOString().replace(/[:]/g,'').replace(/\..+/, ''));
      var fileName = base + '_' + ts + '_perf1.json';
      
      try {
        var blob = new Blob([json], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        setTimeout(function(){ try { document.body.removeChild(a); URL.revokeObjectURL(url); } catch(e){} }, 250);
        deps.status('Downloaded ' + fileName + (errs.length ? ' (WITH WARNINGS)' : ''), { important: true });
      } catch (e) {
        // Fallback: reveal JSON for manual save
        deps.copyWrapper.style.display = 'block';
        deps.copyTarget.value = json;
        deps.status('Download unsupported; JSON shown for manual copy.' + (errs.length ? ' (Warnings in console)' : ''), { important: true });
      }
    };

    deps.issueBtn.onclick = function () {
      var data = collectData();
      var json = JSON.stringify(data, null, 2);
      var owner = 'jrodhead';
      var repo = 'exercAIse';
      var title = 'Workout log ' + (data.workoutFile || data.file || '') + ' @ ' + new Date().toISOString();
      
      // Include the marker and fenced code block so the GitHub Action can detect and parse it
      var header = 'Paste will be committed by Actions.\n\n';
      var issueBodyTemplate = header + '```json\n' + json + '\n```\n';

      function showTextarea() {
        deps.copyWrapper.style.display = 'block';
        deps.copyTarget.value = issueBodyTemplate;
        try { deps.copyTarget.focus(); deps.copyTarget.select(); } catch (e) {}
        deps.status('Template shown below — paste into the Issue body.');
      }
      
      function openIssue() {
        if (deps.openIssueLink) deps.openIssueLink.style.display = 'none';
        var url = 'https://github.com/' + owner + '/' + repo + '/issues/new?title=' + encodeURIComponent(title);
        try { window.open(url, '_blank'); } catch (e) { window.location.href = url; }
      }

      // Always attempt to copy the full issue body template automatically, then open the Issue page with title-only.
      if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(issueBodyTemplate)
          .then(function () {
            deps.status('Copied template to clipboard. Opening Issue page…', { important: true });
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

    deps.clearBtn.onclick = function () {
      if (!confirm('Clear all entries for this workout?')) return;
      
      // Re-render the workout content from the original raw text to restore hidden blocks
      if (isJSON) {
        var pretty = '';
        try { pretty = JSON.stringify(JSON.parse(raw || '{}'), null, 2); } catch (e) { pretty = raw || ''; }
        deps.workoutContent.innerHTML = '<pre>' + (pretty || '') + '</pre>';
      } else {
        deps.workoutContent.innerHTML = deps.renderMarkdownBasic(raw || '');
        deps.fixExerciseAnchors(deps.workoutContent);
      }
      
      // Rebuild the form and re-inject fresh cards (no saved rows)
      buildForm(filePath, raw, isJSON);
      deps.status('Cleared form.', { important: true });
    };
  }

  // Public API
  return {
    init: init,
    buildForm: buildForm
  };
})();
