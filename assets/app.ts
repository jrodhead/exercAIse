/*
  exercAIse frontend: fetch latest workout, render, and collect performed values.
  Modern ES6+ implementation with fetch API, async/await, and const/let.
  TypeScript version with full type safety.
*/
(() => {
  const statusEl = document.getElementById('status')!;
  const workoutMetaEl = document.getElementById('workout-meta')!;
  const workoutTitleEl = document.getElementById('workout-title')!;
  const openOnGitHubEl = document.getElementById('open-on-github') as HTMLAnchorElement;
  const reloadBtn = document.getElementById('reload-btn') as HTMLButtonElement;
  const backBtn = document.getElementById('back-btn') as HTMLButtonElement | null;
  const workoutSection = document.getElementById('workout-section')!;
  const workoutContent = document.getElementById('workout-content')!;
  const readmeSection = document.getElementById('readme-section')!;
  const readmeContent = document.getElementById('readme-content')!;
  const logsSection = document.getElementById('logs-section')!;
  const generateSection = document.getElementById('generate-section')!;
  const genForm = document.getElementById('generate-form') as HTMLFormElement | null;
  const genGoals = document.getElementById('gen-goals') as HTMLTextAreaElement | null;
  const genPain = document.getElementById('gen-pain') as HTMLInputElement | null;
  const genEquipment = document.getElementById('gen-equipment') as HTMLInputElement | null;
  const genInstr = document.getElementById('gen-instructions') as HTMLTextAreaElement | null;
  const genSubmit = document.getElementById('gen-submit') as HTMLButtonElement | null;
  const genClear = document.getElementById('gen-clear') as HTMLButtonElement | null;
  const genJSON = document.getElementById('gen-json') as HTMLTextAreaElement | null;
  const genLoadJSON = document.getElementById('gen-load-json') as HTMLButtonElement | null;
  const backToIndex = document.getElementById('back-to-index') as HTMLButtonElement | null;
  const logsList = document.getElementById('logs-list')!;
  const formSection = document.getElementById('form-section')!;
  const exerciseFormsEl = document.getElementById('exercise-forms')!;
  
  // Store the current session JSON for perf-2 structure extraction
  let currentSessionJSON: string | null = null;
  const saveBtn = document.getElementById('save-local') as HTMLButtonElement;
  const copyBtn = document.getElementById('copy-json') as HTMLButtonElement;
  const downloadBtn = document.getElementById('download-json') as HTMLButtonElement;
  const issueBtn = document.getElementById('submit-issue') as HTMLButtonElement;
  const clearBtn = document.getElementById('clear-form') as HTMLButtonElement;
  const openIssueLink = document.getElementById('open-issue')!;
  const copyWrapper = document.getElementById('copy-target-wrapper')!;
  const copyTarget = document.getElementById('copy-target') as HTMLTextAreaElement;
  const STORAGE_KEY_PREFIX = 'exercAIse-perf-';
  const latestKey = 'exercAIse-latest-file';

  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.innerHTML = String(new Date().getFullYear());
  
  // Simple UI feature flag: hide Kai generation by default
  const kaiUiEnabled = (() => {
    try {
      const params = window.location.search || '';
      if (/([?&])enableKai=1\b/.test(params)) return true;
      const ls = localStorage.getItem('features.kaiUi');
      if (ls === '1' || ls === 'true') return true;
    } catch (e) {}
    return false;
  })();
  
  if (!kaiUiEnabled) {
    // Hide Kai generation fields for a cleaner MVP experience
    const hideElById = (id: string): void => {
      try {
        const el = document.getElementById(id);
        if (el) { el.style.display = 'none'; el.setAttribute('aria-hidden','true'); }
      } catch (e) {}
    };
    const hideLabelFor = (id: string): void => {
      try {
        const lbl = document.querySelector(`label[for="${id}"]`);
        if (lbl) { (lbl as HTMLElement).style.display = 'none'; lbl.setAttribute('aria-hidden','true'); }
      } catch (e) {}
    };
    hideElById('gen-goals'); hideLabelFor('gen-goals');
    hideElById('gen-pain'); hideLabelFor('gen-pain');
    hideElById('gen-equipment'); hideLabelFor('gen-equipment');
    hideElById('gen-instructions'); hideLabelFor('gen-instructions');
    if (genSubmit) { genSubmit.style.display = 'none'; }
    if (genClear) { genClear.style.display = 'none'; }
  }
  
  reloadBtn.onclick = () => { load(); };
  
  if (backToIndex) {
    backToIndex.onclick = (e: MouseEvent) => {
      if (e?.preventDefault) e.preventDefault();
      // Replace URL to index and show index view without full reload
      if (window.history?.replaceState) {
        try { window.history.replaceState({ view: 'index' }, '', 'index.html'); } catch (err) {}
      }
      showIndexView();
      return false;
    };
  }

  const setVisibility = (el: HTMLElement | null, visible: boolean): void => {
    if (!el) return;
    el.style.display = visible ? '' : 'none';
    if (visible) { el.removeAttribute('aria-hidden'); }
    else { el.setAttribute('aria-hidden', 'true'); }
  };

  const showIndexView = (): void => {
    // Restore scroll
    let y = 0;
    try { y = parseInt(sessionStorage.getItem('indexScrollY') || '0', 10) || 0; } catch (e) {}
    setVisibility(readmeSection, false);
    setVisibility(logsSection, false);
    setVisibility(generateSection, true);
    setVisibility(workoutSection, false);
    setVisibility(formSection, false);
    setVisibility(workoutMetaEl, false);
    status('');
    try { window.scrollTo(0, y); } catch (e) {}
  };
  
  if (backBtn) backBtn.onclick = () => {
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
    if (window.ExercAIse && window.ExercAIse.KaiIntegration) {
      window.ExercAIse.KaiIntegration.handleGenerateButtons();
    }
  };

  type XhrCallback = (err: Error | null, text?: string) => void;

  const xhrGet = async (path: string, cb?: XhrCallback): Promise<string | void> => {
    try {
      const response = await fetch(path);
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status} for ${path}`);
        if (cb) return cb(error);
        throw error;
      }
      const text = await response.text();
      if (cb) return cb(null, text);
      return text;
    } catch (e) {
      if (cb) return cb(e as Error);
      throw e;
    }
  };

  const xhrPostJSON = async (path: string, payload: any, cb?: XhrCallback): Promise<string | void> => {
    try {
      const response = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload || {})
      });
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status} for ${path}`);
        if (cb) return cb(error);
        throw error;
      }
      const text = await response.text();
      if (cb) return cb(null, text);
      return text;
    } catch (e) {
      if (cb) return cb(e as Error);
      throw e;
    }
  };

  // Parse README.md to find workout links; assume they are markdown links pointing to workouts/*.md or *.json
  // Currently unused but kept for potential future use
  // const parseReadmeForLatest = (contents: string): { title: string; path: string } | null => {
  //   const lines = contents.split(/\r?\n/);
  //   const workoutLinks: { title: string; path: string }[] = [];
  //   for (let i = 0; i < lines.length; i++) {
  //     const line = lines[i]!;
  //     // Match markdown link to workouts/*.(md|json)
  //     const match = line.match(/\[(.*?)\]\((workouts\/[\w\-]+\.(?:md|json))\)/);
  //     if (match) {
  //       workoutLinks.push({ title: match[1]!, path: match[2]! });
  //     }
  //   }
  //   // README is in descending date order per project rules; take the first link.
  //   return workoutLinks.length ? workoutLinks[0]! : null;
  // };

  const renderMarkdownBasic = (md: string): string => {
    // Basic markdown to HTML renderer
    // Handle headings, bold/italic, lists, code fences, and links
    // Hide embedded machine JSON (session-structure) blocks from display but keep in source for parsing elsewhere
    const mdForDisplay = md.replace(/```json[^\n]*session-structure[^\n]*\n([\s\S]*?)\n```/gi, '');
    let html = mdForDisplay
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // code fences ``` -> <pre>
    html = html.replace(/```([\s\S]*?)```/g, (_, code) => `<pre>${code.replace(/\n/g, '\n')}</pre>`);

    // headings
    html = html.replace(/^###\s+(.*)$/gm, '<h3>$1</h3>')
               .replace(/^##\s+(.*)$/gm, '<h2>$1</h2>')
               .replace(/^#\s+(.*)$/gm, '<h1>$1</h1>');

    // bold and italic
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
               .replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Helper to compute repo base path (e.g., '/exercAIse/') for GitHub Pages
    const repoBasePath = (): string => {
      try {
        const p = window.location?.pathname || '';
        const idx = p.indexOf('/exercAIse/');
        if (idx !== -1) return p.slice(0, idx + '/exercAIse/'.length);
      } catch (e) {}
      return './';
    };
    
    // links [text](url) — external links open in new tab; rewrite exercise links for Pages base
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, (_, text, url) => {
      const isExternal = /^https?:/i.test(url);
      let finalUrl = url;
      // Simpler: extract trailing `exercises/...` segment if present
      const seg = String(url || '').match(/(exercises\/[\w\-]+\.(?:md|json))$/);
      if (seg?.[1]) {
        const base = repoBasePath();
        // Ensure single slash join
        finalUrl = base.replace(/\/?$/, '/') + seg[1];
        // Collapse duplicate slashes
        finalUrl = finalUrl.replace(/([^:])\/+/g, (_m0: string, p1: string) => p1 + '/');
      }
      const attrs = isExternal ? ' target="_blank" rel="noopener"' : '';
      return `<a href="${finalUrl}"${attrs}>${text}</a>`;
    });

    // unordered lists
    // Convert blocks of lines starting with - or * into <ul><li>
    html = html.replace(/(?:^|\n)([-*] .*(?:\n[-*] .*)*)/g, (block) => {
      const items = block.replace(/^[-*] /gm, '').trim().split(/\n/);
      if (!items[0] || items.length === 0) return block;
      const lis = items.map(item => `<li>${item}</li>`).join('');
      return `\n<ul>${lis}</ul>`;
    });

    // paragraphs: wrap isolated lines in <p>
    const lines = html.split(/\n{2,}/);
    for (let j = 0; j < lines.length; j++) {
      const part = lines[j]!;
      if (!/^\s*<(h\d|ul|pre)/.test(part)) {
        lines[j] = `<p>${part}</p>`;
      }
    }
    return lines.join('\n');
  };

  // Import session parser utilities from module - reference directly to avoid tree-shaking
  const SessionParser = window.ExercAIse.SessionParser!;
  const { slugify, parseHMSToSeconds, secondsToHHMMSS, extractExercisesFromMarkdown, 
          parseMarkdownPrescriptions, extractExercisesFromJSON, parseJSONPrescriptions } = SessionParser;

  // Import Kai integration utilities from module (will be initialized after DOM elements are ready)
  const KaiIntegration = window.ExercAIse.KaiIntegration!;
  const linkValidation = KaiIntegration.linkValidation;

  // Storage functions (sync with async IndexedDB backup)
  const loadSaved = (filePath: string): any | null => {
    const key = STORAGE_KEY_PREFIX + filePath;
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  };

  const saveLocal = (filePath: string, data: any): void => {
    const key = STORAGE_KEY_PREFIX + filePath;
    
    // Save to localStorage immediately (backwards compatible)
    try {
      localStorage.setItem(key, JSON.stringify(data));
      localStorage.setItem(latestKey, filePath);
    } catch (e) {
      console.error('Error saving to localStorage:', e);
    }
    
    // Also save to IndexedDB asynchronously (future-proof)
    const storage = window.ExercAIse.Storage;
    if (storage) {
      storage.savePerformanceLog(data).catch((err) => {
        console.warn('IndexedDB save failed (non-critical):', err);
      });
    }
  };

  // Form building functions now imported from form-builder.js module
  // Includes: buildForm, createExerciseCard, pickFieldsFromRows, addSetRow,
  // findNearestHeadingEl, findPreviousHeading, collectFollowingBlocks, and all form management logic

  // Initialize Form Builder module with required dependencies
  const initializeFormBuilder = (): void => {
    if (!window.ExercAIse?.FormBuilder) {
      console.warn('FormBuilder module not loaded');
      return;
    }
    
    // Function to get current session JSON for perf-2 structure extraction
    const getCurrentSessionJSON = (): string | null => {
      return currentSessionJSON;
    };
    
    // Pass dependencies to FormBuilder module
    window.ExercAIse.FormBuilder.init({
      slugify,
      extractExercisesFromJSON,
      extractExercisesFromMarkdown,
      parseJSONPrescriptions,
      parseMarkdownPrescriptions,
      loadSaved,
      saveLocal,
      parseHMSToSeconds,
      secondsToHHMMSS,
      renderMarkdownBasic,
      fixExerciseAnchors,
      status,
      getCurrentSessionJSON,
      // DOM elements
      workoutContent,
      exerciseFormsEl,
      saveBtn,
      copyBtn,
      downloadBtn,
      issueBtn,
      clearBtn,
      copyWrapper,
      copyTarget,
      openIssueLink
    });
  };

  // Wrapper function to call FormBuilder.buildForm
  const buildForm = (filePath: string, raw: string, isJSON: boolean): void => {
    if (window.ExercAIse?.FormBuilder) {
      window.ExercAIse.FormBuilder.buildForm(filePath, raw, isJSON);
    } else {
      console.error('FormBuilder module not available');
    }
  };

  const status = (msg: string, opts: { important?: boolean } = {}): void => {
    // Only show status bar for important messages unless explicitly forced
    const isImportant = !!opts.important;
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
  };

  const wireReadmeClicks = (): void => {
    // Intercept clicks on workout links for in-page navigation
    if (readmeSection && !(readmeSection as any).__wired) {
      readmeSection.addEventListener('click', (e: MouseEvent) => {
        let t = e.target as HTMLElement | null;
        if (!t) return;
        // Find nearest anchor
        while (t && t !== readmeSection && !(t.tagName && t.tagName.toLowerCase() === 'a')) t = t.parentNode as HTMLElement | null;
        if (!t || t === readmeSection) return;
        const href = (t as HTMLAnchorElement).getAttribute('href') || '';
        if (!href) return;
        let path: string | null = null;
        // Route exercise links to the new exercise.html viewer (JSON counterpart if available)
        const exMatch = href.match(/(exercises\/[\w\-]+)\.(?:md|json)$/);
        if (exMatch) {
          const base = exMatch[1]!;
          const jsonPath = `${base}.json`;
          try { e.preventDefault(); } catch (ex) {}
          try { window.location.href = `exercise.html?file=${encodeURIComponent(jsonPath)}`; } catch (ex) {}
          return;
        }
        if (href.indexOf('index.html?file=') === 0) {
          path = decodeURIComponent(href.split('file=')[1] || '');
        } else if (href.indexOf('workouts/') === 0) {
          path = href;
        }
        if (path) {
          if (e?.preventDefault) e.preventDefault();
          try { sessionStorage.setItem('indexScrollY', String(window.scrollY || 0)); } catch (ex) {}
          if (window.history?.pushState) {
            try { window.history.pushState({ view: 'session', file: path }, '', `index.html?file=${encodeURIComponent(path)}`); } catch (ex) {}
          }
          openSession(path);
        }
      }, false);
      (readmeSection as any).__wired = true;
    }
  };

  const loadLogsList = (): void => {
    if (!logsList) return;
    // Load local manifest (performed/index.json). If missing, show unavailable message.
    const renderFromLocal = (text: string): boolean | string => {
      let data: any = null;
      try { data = JSON.parse(text || '{}'); } catch (e) { data = null; }
      let list: any[] = [];
      if (!data) return false;
      // Accept either { files: [...] } or a bare array
      if (Object.prototype.toString.call(data) === '[object Array]') list = data;
      else if (data.files && Object.prototype.toString.call(data.files) === '[object Array]') list = data.files;
      if (!list.length) return 'empty';
      // Normalize to objects with { name, path }
      const rows: any[] = [];
      for (let i = 0; i < list.length; i++) {
        const it = list[i]!;
        if (typeof it === 'string') rows.push({ name: it, path: `performed/${it}` });
        else if (it && typeof it === 'object') rows.push({ 
          name: it.name || it.path || `file-${i}`, 
          path: it.path || `performed/${it.name || ''}` 
        });
      }
      // Sort descending by name (timestamps in name) or by mtime if provided
      rows.sort((a, b) => {
        const ma = (typeof a.mtimeMs === 'number') ? a.mtimeMs : 0;
        const mb = (typeof b.mtimeMs === 'number') ? b.mtimeMs : 0;
        if (ma && mb && ma !== mb) return mb - ma;
        return a.name < b.name ? 1 : -1;
      });
      let html = '<ul class="history-list">';
      for (let j = 0; j < Math.min(rows.length, 50); j++) {
        const r = rows[j]!;
        // Link to local file path; will be served as static content
        const href = r.path || `performed/${r.name}`;
        html += `<li><a target="_blank" rel="noopener" href="${href}">${r.name}</a></li>`;
      }
      html += '</ul>';
      logsList.innerHTML = html;
      return true;
    };

    xhrGet('performed/index.json', (err, text) => {
      if (err || !text) {
        logsList.innerHTML = '<p class="form__hint">History unavailable (no local manifest). Run scripts/build_performed_index.js to generate, or add logs.</p>';
        return;
      }
      const res = renderFromLocal(text);
      if (res === 'empty') {
        logsList.innerHTML = '<p class="form__hint">No logs yet.</p>';
      } else if (!res) {
        logsList.innerHTML = '<p class="form__hint">History unavailable (invalid manifest).</p>';
      }
    });
  };

  const openSession = (path: string): void => {
    status(`Loading ${path} …`); // hidden (non-important)
    xhrGet(path, (err, text) => {
      if (err) return status(`Error loading workout: ${err.message}`, { important: true });
      // Save current scroll and hide index
      try { sessionStorage.setItem('indexScrollY', String(window.scrollY || 0)); } catch (e) {}
      setVisibility(readmeSection, false);
      setVisibility(logsSection, false);
      setVisibility(generateSection, false);
      setVisibility(workoutSection, true);
      const isJSON = /\.json$/i.test(path);
      if (isJSON) {
        // Render a structured view of the JSON workout that pairs with card injection
        const esc = (s: any): string => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        const isInternalExerciseLink = (url: string): boolean => {
          if (!url) return false;
          if (/^https?:/i.test(url)) return false;
          const m = String(url).match(/^(?:\.?\.?\/)?(exercises\/[\w\-]+\.(?:json|md))$/i);
          return !!(m && m[1]);
        };
        const renderItem = (it: any, opts?: any): string => {
          if (!it || typeof it !== 'object') return '';
          const options = opts || {};
          const kind = String(it.kind || 'exercise');
          const name = String(it.name || '');
          let link = String(it.link || '');
          // Normalize exercise link to exercises/<slug>.json when missing
          if (!link && name) {
            const slug = slugify(name);
            link = `exercises/${slug}.json`;
          }
          const inlineMarkdown = (text: string): string => {
            let s = String(text == null ? '' : text);
            // Escape basic HTML
            s = s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
            // Replace [text](url) with anchors (simple)
            s = s.replace(/\[(.*?)\]\((.*?)\)/g, (_, t, u) => `<a href="${u}">${t}</a>`);
            return s;
          };
          const attrEscape = (s: any): string => {
            return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
          };
          if (kind === 'note') {
            return `<p>${esc(name)}</p>`;
          }
          if (kind === 'exercise') {
            const clean = String(name).replace(/^\s*\d+[\)\.-]\s*/, '');
            const meta: any = { cues: (it.cues || []), prescription: (it.prescription || null) };
            if (it.logType) meta.logType = it.logType;
            if (it.loggable === false) meta.loggable = false;
            if (it.notes) meta.notes = it.notes;
            // If a JSON workout provides a link, render it as a link regardless of slug presence.
            const asLink = !!link && isInternalExerciseLink(link);
            // Transform exercise link to proper exercise.html?file= format
            const exerciseHref = link ? `exercise.html?file=${link}` : '';
            let html = `<li>${asLink
              ? `<a href="${esc(exerciseHref)}" data-exmeta="${attrEscape(JSON.stringify(meta))}">${esc(clean)}</a>`
              : `<span class="ex-name no-link" data-exmeta="${attrEscape(JSON.stringify(meta))}">${esc(clean)}</span>`}`;
            // For list-only render (warm-up/cooldown/mobility), append a compact prescription summary inline
            if (it.prescription && typeof it.prescription === 'object') {
              try {
                const p = it.prescription || {};
                const parts: string[] = [];
                if (p.sets != null && p.reps != null) {
                  const setsNum = Number(p.sets);
                  const setsLabel = (setsNum === 1 ? 'set' : 'sets');
                  parts.push(`${p.sets} ${setsLabel} × ${p.reps} reps`);
                } else {
                  if (p.sets != null) {
                    const setsNum2 = Number(p.sets);
                    const setsLabel2 = (setsNum2 === 1 ? 'set' : 'sets');
                    parts.push(`${p.sets} ${setsLabel2}`);
                  }
                  if (p.reps != null) parts.push(`${p.reps} reps`);
                }
                if (p.weight != null) parts.push(typeof p.weight === 'number' ? `${p.weight} lb` : String(p.weight));
                // Multiplier hint when not already expressed in weight string
                const weightStr2 = (typeof p.weight === 'string') ? p.weight.toLowerCase() : '';
                if (p.multiplier === 2 && !(weightStr2 && /(x2|×2|per\s*hand|each|per\s*side)/.test(weightStr2))) parts.push('x2');
                if (p.multiplier === 0 && !(weightStr2 && /bodyweight/.test(weightStr2))) parts.push('bodyweight');
                if (p.timeSeconds != null) { parts.push(`${p.timeSeconds} seconds`); }
                if (p.holdSeconds != null) { parts.push(`${p.holdSeconds} seconds`); }
                if (p.distanceMiles != null) parts.push(`${p.distanceMiles} miles`);
                if (p.distanceMeters != null) parts.push(`${p.distanceMeters} m`);
                if (p.rpe != null) parts.push(`RPE ${p.rpe}`);
                if (p.restSeconds != null) parts.push(`Rest ${p.restSeconds} seconds`);
                if (parts.length) html += ` — <span class="ex-presc">${parts.join(' · ')}</span>`;
              } catch (e) {}
            }
            // Display notes inline if present
            if (it.notes) {
              html += `<br><span class="ex-notes">${esc(it.notes)}</span>`;
            }
            // Inline cues under the item so they migrate into the card header
            if (!options.suppressCues && it.cues && it.cues.length) {
              html += `<ul>${it.cues.map((c: string) => `<li>${inlineMarkdown(c)}</li>`).join('')}</ul>`;
            }
            html += '</li>';
            return html;
          }
          if (kind === 'superset' || kind === 'circuit') {
            const cap = kind.charAt(0).toUpperCase() + kind.slice(1);
            let inner = '';
            if (it.children && it.children.length) {
              inner = it.children.map((ch: any) => renderItem(ch, options)).join('');
              if (inner && inner.indexOf('<li') !== -1) inner = `<ul>${inner}</ul>`;
            }
            let notesHtml = '';
            if (it.notes) {
              notesHtml = `<div class="exercise-card__notes">${esc(it.notes)}</div>`;
            }
            return `<div><h3>${esc(cap + (it.name ? `: ${it.name}` : ''))}</h3>${notesHtml}${inner}</div>`;
          }
          return '';
        };
        const renderSection = (sec: any): string => {
          if (!sec) return '';
          let title = String(sec.title || '');
          // Clean markdown link syntax in titles like "1) [Goblet Squat](...)"
          title = title.replace(/^\s*\d+[\)\.-]\s*/, '');
          const mt = title.match(/^\s*\[([^\]]+)\]\(([^)]+)\)/);
          if (mt) title = mt[1]!;
          const type = String(sec.type || '');
          const rounds = (sec.rounds != null) ? ` — ${sec.rounds} rounds` : '';
          const attrEscapeLocal = (s: any): string => {
            return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
          };
          const typeText = type || 'Section';
          const display = typeText + (title ? ` — ${title}` : '');
          let h = `<section data-sectype="${attrEscapeLocal(typeText)}"><h2>${esc(display)}${esc(rounds)}</h2>`;
          // Detect warm-up / cooldown / mobility / recovery sections (for future use)
          // const tlow = (title + ' ' + type).toLowerCase();
          // const isWarmish = (tlow.indexOf('warm') !== -1 || tlow.indexOf('cool') !== -1 || tlow.indexOf('mobility') !== -1 || tlow.indexOf('recovery') !== -1);
          // Render notes as basic markdown (so links and bullets render) and, for warm/cool/mobility, prefer notes over items to avoid duplication
          if (sec.notes) {
            try { h += renderMarkdownBasic(String(sec.notes)); } catch (e) { h += `<p>${esc(sec.notes)}</p>`; }
          }
          // Always render items even for warm-up/cooldown/mobility/recovery when notes exist
          if (sec.items && sec.items.length) {
            // Suppress rendering inline cues; cards will show cues/prescriptions
            let itemsHtml = sec.items.map((it: any) => renderItem(it, { suppressCues: true })).join('');
            // Wrap loose <li> in a <ul>
            if (itemsHtml.indexOf('<li') !== -1) itemsHtml = `<ul>${itemsHtml}</ul>`;
            h += itemsHtml;
          }
          h += '</section>';
          return h;
        };
        let obj: any = null;
        try { obj = JSON.parse(text || '{}'); } catch (e) { obj = null; }
        // Normalize SessionPlan shape (version + exercises) into a displayable sections/items structure
        if (obj && (!obj.sections || !obj.sections.length) && obj.exercises && Object.prototype.toString.call(obj.exercises) === '[object Array]') {
          const itemsFromPlan: any[] = [];
          for (let ei2 = 0; ei2 < obj.exercises.length; ei2++) {
            const ex2 = obj.exercises[ei2] || {};
            const pres2 = (ex2.prescribed != null ? ex2.prescribed : ex2.prescription) || {};
            if (!pres2.sets && ex2.sets != null) pres2.sets = ex2.sets;
            if (!pres2.reps && ex2.reps != null) pres2.reps = ex2.reps;
            if (!pres2.load && ex2.load != null) pres2.load = ex2.load;
            if (!pres2.rpe && ex2.rpe != null) pres2.rpe = ex2.rpe;
            // For SessionPlan inputs: carry through provided link; render logic will restrict to internal-only
            const linkPlan = String(ex2.link || '');
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
          const parts: string[] = [];
          // Title
          let titleTop = obj.title ? `<h1>${esc(obj.title)}</h1>` : '';
          if (obj.date) titleTop += `<p class="muted">${esc(obj.date)}</p>`;
          if (titleTop) parts.push(titleTop);
          // Session-level notes before sections
          if (obj.notes) {
            try { parts.push(renderMarkdownBasic(String(obj.notes))); }
            catch (e) { parts.push(`<p>${esc(obj.notes)}</p>`); }
          }
          for (let si = 0; si < obj.sections.length; si++) parts.push(renderSection(obj.sections[si]));
          workoutContent.innerHTML = parts.join('\n');
        } else {
          // Fallback to pretty JSON when structure is unknown
          let pretty = '';
          try { pretty = JSON.stringify(JSON.parse(text || '{}'), null, 2); } catch (e) { pretty = text || ''; }
          workoutContent.innerHTML = `<pre>${pretty || ''}</pre>`;
        }
        fixExerciseAnchors(workoutContent);
      } else {
        // render markdown (basic)
        workoutContent.innerHTML = renderMarkdownBasic(text || '');
        fixExerciseAnchors(workoutContent);
      }
      
      // Store session JSON for perf-2 structure extraction
      if (isJSON) {
        currentSessionJSON = text || null;
      } else {
        currentSessionJSON = null;
      }
      
      setVisibility(formSection, true);
      buildForm(path, text || '', isJSON);
      // Meta
      let title = path;
      let obj: any = null; // Declare obj in outer scope for access below
      // Try to extract title from JSON if available
      if (isJSON) {
        try { obj = JSON.parse(text || '{}'); } catch (e) { obj = null; }
        if (obj && obj.title) {
          title = obj.title;
          if (obj.block && obj.week) {
            title += ` — Block ${obj.block}, Week ${obj.week}`;
          }
        }
      }
      workoutTitleEl.innerHTML = title;
      openOnGitHubEl.href = `https://github.com/jrodhead/exercAIse/blob/main/${path}`;
      setVisibility(workoutMetaEl, true);
      try { window.scrollTo(0, 0); } catch (e) {}
      status(''); // no noisy success banner
    });
  };

  // Kai integration functions now imported from kai-integration.js module
  // Includes: validateSessionPlan, normalizeSessionPlanInPlace, validateSessionPlanLinks,
  // validateWorkoutLinks, isWorkoutJSONShape, looksLikeSessionPlan, openGeneratedSession,
  // handleGenerateButtons, generateExerciseStub, generateExerciseStubsFromObj, generateExerciseStubsFromPlan

  // Initialize Kai Integration module with required dependencies
  const initializeKaiIntegration = (): void => {
    if (!window.ExercAIse?.KaiIntegration) {
      console.warn('KaiIntegration module not loaded');
      return;
    }
    
    // Pass dependencies to KaiIntegration module
    window.ExercAIse.KaiIntegration.init({
      status,
      xhrGet,
      xhrPostJSON,
      slugify,
      renderMarkdownBasic,
      fixExerciseAnchors,
      setVisibility,
      buildForm,
      // DOM elements
      readmeSection,
      logsSection,
      generateSection,
      workoutSection,
      workoutContent,
      formSection,
      workoutTitleEl,
      openOnGitHubEl,
      workoutMetaEl,
      genForm,
      genClear,
      genGoals,
      genPain,
      genEquipment,
      genInstr,
      genJSON,
      genLoadJSON,
      genSubmit,
      linkValidation,
      kaiUiEnabled,
      parseHMSToSeconds
    });
  };

  // OLD KAI FUNCTIONS REMOVED - NOW IN kai-integration.js MODULE
  // The following ~600 lines have been extracted to kai-integration.js:
  // - validateSessionPlan, normalizeSessionPlanInPlace
  // - validateSessionPlanLinks, validateWorkoutLinks
  // - isWorkoutJSONShape, looksLikeSessionPlan
  // - openGeneratedSession, handleGenerateButtons
  // - generateExerciseStub, generateExerciseStubsFromObj, generateExerciseStubsFromPlan

  // After content is in the DOM, normalize any exercise links to exercise.html?file= format
  const fixExerciseAnchors = (scope: HTMLElement | Document): void => {
    try {
      const anchors = (scope || document).getElementsByTagName('a');
      for (let i = 0; i < anchors.length; i++) {
        const a = anchors[i]!;
        const href = a.getAttribute('href') || '';
        // Skip links that are already in exercise.html?file= format
        if (/^exercise\.html\?file=/i.test(href)) continue;
        // Identify exercise links (md or json) that need to be routed through exercise.html
        const m = href.match(/(?:^\.?\.?\/)?(?:https?:\/\/[^\/]+\/)?(?:.*\/)?(exercises\/[\w\-]+\.(?:md|json))$/);
        if (m?.[1]) {
          // Convert to exercise.html?file= format for proper rendering
          a.setAttribute('href', `exercise.html?file=${m[1]}`);
        }
      }
    } catch (e) {}
  };

  // Navigation handlers
  (() => {
    try {
      const navHome = document.getElementById('nav-home');
      const navWorkouts = document.getElementById('nav-workouts');
      const navHistory = document.getElementById('nav-history');
      
      const handleNavClick = (e: MouseEvent | TouchEvent, viewName: string, callback?: () => void): boolean => {
        if ((e as any)?.preventDefault) (e as any).preventDefault();
        if ((e as any)?.stopPropagation) (e as any).stopPropagation();
        try { 
          window.history.pushState({ view: viewName }, '', `index.html${viewName !== 'home' ? `?view=${viewName}` : ''}`); 
        } catch (ex) {}
        if (callback) callback();
        return false;
      };
      
      if (navHome) {
        navHome.onclick = (e) => handleNavClick(e, 'home', showIndexView);
        // Add touch event for better mobile support
        try {
          navHome.addEventListener('touchend', (e) => handleNavClick(e, 'home', showIndexView), false);
        } catch (touchError) {
          // Fallback for very old browsers
          (navHome as any).ontouchend = (e: TouchEvent) => handleNavClick(e, 'home', showIndexView);
        }
      }
      if (navWorkouts) {
        navWorkouts.onclick = (e) => handleNavClick(e, 'workouts', openWorkouts);
        try {
          navWorkouts.addEventListener('touchend', (e) => handleNavClick(e, 'workouts', openWorkouts), false);
        } catch (touchError) {
          (navWorkouts as any).ontouchend = (e: TouchEvent) => handleNavClick(e, 'workouts', openWorkouts);
        }
      }
      if (navHistory) {
        navHistory.onclick = (e) => handleNavClick(e, 'history', openHistory);
        try {
          navHistory.addEventListener('touchend', (e) => handleNavClick(e, 'history', openHistory), false);
        } catch (touchError) {
          (navHistory as any).ontouchend = (e: TouchEvent) => handleNavClick(e, 'history', openHistory);
        }
      }
    } catch (e) {
      console.warn('Navigation setup failed:', e);
    }
  })();

  let cachedWorkoutList: any[] | null = null;

  const buildWorkoutListHTML = (workouts: any[]): string => {
    // Build HTML list of workouts grouped by block/week
    let html = '<h2>Workouts</h2>';
    html += '<ul class="workout-list">';
    
    for (let i = 0; i < workouts.length; i++) {
      const w = workouts[i]!;
      const displayTitle = w.title || w.filename.replace(/\.json$/, '').replace(/_/g, ' ');
      let meta = '';
      if (w.block && w.week) {
        meta = ` – Block ${w.block}, Week ${w.week}`;
      }
      html += `<li class="workout-list__item"><a class="workout-list__link" href="workouts/${encodeURIComponent(w.filename)}">${displayTitle}${meta}</a></li>`;
    }
    
    html += '</ul>';
    return html;
  };

  const loadWorkoutList = (callback?: (err: Error | null, workouts?: any[]) => void): void => {
    // Fetch manifest of workout files
    xhrGet('workouts/manifest.txt', (err, text) => {
      if (err) {
        if (callback) callback(err);
        return;
      }
      
      // Parse the manifest - one file path per line
      const lines = (text || '').split('\n').filter(line => 
        line.trim() && line.match(/\.json$/i)
      );
      
      const workouts: any[] = [];
      for (let i = 0; i < lines.length; i++) {
        const filepath = lines[i]!.trim();
        const filename = filepath.replace(/^workouts\//, '');
        workouts.push({
          filename: filename,
          title: null,
          block: null,
          week: null
        });
      }
      
      cachedWorkoutList = workouts;
      if (callback) callback(null, workouts);
    });
  };

  const openWorkouts = (): void => {
    setVisibility(generateSection, false);
    setVisibility(logsSection, false);
    setVisibility(readmeSection, true);
    
    if (cachedWorkoutList) {
      readmeContent.innerHTML = buildWorkoutListHTML(cachedWorkoutList);
      wireReadmeClicks();
    } else {
      status('Loading workouts…');
      loadWorkoutList((err, workouts) => {
        if (err) {
          readmeContent.innerHTML = '<p class="error">Error loading workouts. Please try again.</p>';
          return;
        }
        readmeContent.innerHTML = buildWorkoutListHTML(workouts || []);
        wireReadmeClicks();
        status(''); // Clear status
      });
    }
  };

  const openHistory = (): void => {
    setVisibility(generateSection, false);
    setVisibility(readmeSection, false);
    setVisibility(logsSection, true);
    loadLogsList();
  };

  /**
   * Import all performance logs from performed/ directory into localStorage
   * This ensures cross-workout exercise history works even after cache clearing
   * Source of truth: performed/*.json files (from GitHub issue submissions)
   */
  const importPerformedLogs = async (): Promise<void> => {
    const importKey = 'exercAIse-imported-performed-logs';
    
    // Check if we've already imported (don't re-import on every page load)
    try {
      const lastImport = localStorage.getItem(importKey);
      if (lastImport) {
        const timeSinceImport = Date.now() - parseInt(lastImport, 10);
        // Re-import if more than 24 hours old (to pick up new logs)
        if (timeSinceImport < 24 * 60 * 60 * 1000) {
          console.log('✅ Performance logs already imported (skip)');
          return;
        }
      }
    } catch (e) {
      console.warn('Could not check import timestamp:', e);
    }

    console.log('🔄 Importing performance logs from performed/ directory...');
    
    try {
      // Fetch the manifest of all performed log files
      const indexResponse = await fetch('performed/index.json');
      const index = await indexResponse.json();
      
      let importCount = 0;
      const errors: string[] = [];
      
      // Import each log file listed in the manifest
      for (const file of index.files) {
        if (!file.name || !file.name.endsWith('.json') || file.name === 'index.json') {
          continue;
        }
        
        try {
          const logResponse = await fetch(`performed/${file.name}`);
          const logData = await logResponse.json();
          
          // Extract workoutFile to use as localStorage key
          if (logData.workoutFile) {
            const key = STORAGE_KEY_PREFIX + logData.workoutFile;
            localStorage.setItem(key, JSON.stringify(logData));
            importCount++;
          }
        } catch (e) {
          errors.push(`Failed to import ${file.name}: ${e}`);
        }
      }
      
      // Mark import as complete
      localStorage.setItem(importKey, Date.now().toString());
      
      console.log(`✅ Imported ${importCount} performance logs into localStorage`);
      if (errors.length > 0) {
        console.warn('Import errors:', errors);
      }
    } catch (e) {
      console.error('Failed to import performance logs:', e);
    }
  };

  const load = (): void => {
    // Initialize modules before handling any view
    initializeFormBuilder();
    initializeKaiIntegration();
    
    // Import performance logs from performed/ directory on first load
    importPerformedLogs().catch(err => {
      console.warn('Performance log import failed (non-critical):', err);
    });
    
    // Respect deep link params on initial load
    const params = (() => {
      const q: { [key: string]: string } = {};
      try {
        const s = (window.location.search || '').replace(/^\?/, '').split('&');
        for (let i = 0; i < s.length; i++) {
          const kv = s[i]!.split('=');
          if (kv[0]) q[decodeURIComponent(kv[0]!)] = decodeURIComponent(kv[1] || '');
        }
      } catch (e) {}
      return q;
    })();
    if (params.file) {
      // Open a specific session
      openSession(params.file);
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
    if (window.ExercAIse && window.ExercAIse.KaiIntegration) {
      window.ExercAIse.KaiIntegration.handleGenerateButtons();
    }
  };

  // Handle back/forward navigation
  window.addEventListener('popstate', () => {
    const s = window.location.search || '';
    const params = (() => {
      const q: { [key: string]: string } = {};
      try {
        const arr = s.replace(/^\?/, '').split('&');
        for (let i = 0; i < arr.length; i++) {
          const kv = arr[i]!.split('=');
          if (kv[0]) q[decodeURIComponent(kv[0]!)] = decodeURIComponent(kv[1] || '');
        }
      } catch (e) {}
      return q;
    })();
    if (params.file) {
      openSession(params.file);
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

// Export for ES module compatibility
