"use strict";
(() => {
    const statusEl = document.getElementById('status');
    const workoutMetaEl = document.getElementById('workout-meta');
    const workoutTitleEl = document.getElementById('workout-title');
    const openOnGitHubEl = document.getElementById('open-on-github');
    const reloadBtn = document.getElementById('reload-btn');
    const backBtn = document.getElementById('back-btn');
    const workoutSection = document.getElementById('workout-section');
    const workoutContent = document.getElementById('workout-content');
    const readmeSection = document.getElementById('readme-section');
    const readmeContent = document.getElementById('readme-content');
    const logsSection = document.getElementById('logs-section');
    const generateSection = document.getElementById('generate-section');
    const genForm = document.getElementById('generate-form');
    const genGoals = document.getElementById('gen-goals');
    const genPain = document.getElementById('gen-pain');
    const genEquipment = document.getElementById('gen-equipment');
    const genInstr = document.getElementById('gen-instructions');
    const genSubmit = document.getElementById('gen-submit');
    const genClear = document.getElementById('gen-clear');
    const genJSON = document.getElementById('gen-json');
    const genLoadJSON = document.getElementById('gen-load-json');
    const backToIndex = document.getElementById('back-to-index');
    const logsList = document.getElementById('logs-list');
    const formSection = document.getElementById('form-section');
    const exerciseFormsEl = document.getElementById('exercise-forms');
    let currentSessionJSON = null;
    const saveBtn = document.getElementById('save-local');
    const copyBtn = document.getElementById('copy-json');
    const downloadBtn = document.getElementById('download-json');
    const issueBtn = document.getElementById('submit-issue');
    const clearBtn = document.getElementById('clear-form');
    const openIssueLink = document.getElementById('open-issue');
    const copyWrapper = document.getElementById('copy-target-wrapper');
    const copyTarget = document.getElementById('copy-target');
    const STORAGE_KEY_PREFIX = 'exercAIse-perf-';
    const latestKey = 'exercAIse-latest-file';
    const yearEl = document.getElementById('year');
    if (yearEl)
        yearEl.innerHTML = String(new Date().getFullYear());
    const kaiUiEnabled = (() => {
        try {
            const params = window.location.search || '';
            if (/([?&])enableKai=1\b/.test(params))
                return true;
            const ls = localStorage.getItem('features.kaiUi');
            if (ls === '1' || ls === 'true')
                return true;
        }
        catch (e) { }
        return false;
    })();
    if (!kaiUiEnabled) {
        const hideElById = (id) => {
            try {
                const el = document.getElementById(id);
                if (el) {
                    el.style.display = 'none';
                    el.setAttribute('aria-hidden', 'true');
                }
            }
            catch (e) { }
        };
        const hideLabelFor = (id) => {
            try {
                const lbl = document.querySelector(`label[for="${id}"]`);
                if (lbl) {
                    lbl.style.display = 'none';
                    lbl.setAttribute('aria-hidden', 'true');
                }
            }
            catch (e) { }
        };
        hideElById('gen-goals');
        hideLabelFor('gen-goals');
        hideElById('gen-pain');
        hideLabelFor('gen-pain');
        hideElById('gen-equipment');
        hideLabelFor('gen-equipment');
        hideElById('gen-instructions');
        hideLabelFor('gen-instructions');
        if (genSubmit) {
            genSubmit.style.display = 'none';
        }
        if (genClear) {
            genClear.style.display = 'none';
        }
    }
    reloadBtn.onclick = () => { load(); };
    if (backToIndex) {
        backToIndex.onclick = (e) => {
            if (e?.preventDefault)
                e.preventDefault();
            if (window.history?.replaceState) {
                try {
                    window.history.replaceState({ view: 'index' }, '', 'index.html');
                }
                catch (err) { }
            }
            showIndexView();
            return false;
        };
    }
    const setVisibility = (el, visible) => {
        if (!el)
            return;
        el.style.display = visible ? '' : 'none';
        if (visible) {
            el.removeAttribute('aria-hidden');
        }
        else {
            el.setAttribute('aria-hidden', 'true');
        }
    };
    const showIndexView = () => {
        let y = 0;
        try {
            y = parseInt(sessionStorage.getItem('indexScrollY') || '0', 10) || 0;
        }
        catch (e) { }
        setVisibility(readmeSection, false);
        setVisibility(logsSection, false);
        setVisibility(generateSection, true);
        setVisibility(workoutSection, false);
        setVisibility(formSection, false);
        setVisibility(workoutMetaEl, false);
        status('');
        try {
            window.scrollTo(0, y);
        }
        catch (e) { }
    };
    if (backBtn)
        backBtn.onclick = () => {
            try {
                window.history.pushState({}, '', 'index.html');
            }
            catch (e) { }
            if (readmeSection)
                readmeSection.style.display = 'none';
            if (logsSection)
                logsSection.style.display = 'none';
            if (generateSection)
                generateSection.style.display = 'block';
            workoutMetaEl.style.display = 'none';
            workoutSection.style.display = 'none';
            formSection.style.display = 'none';
            if (window.ExercAIse && window.ExercAIse.KaiIntegration) {
                window.ExercAIse.KaiIntegration.handleGenerateButtons();
            }
        };
    const xhrGet = async (path, cb) => {
        try {
            const response = await fetch(path);
            if (!response.ok) {
                const error = new Error(`HTTP ${response.status} for ${path}`);
                if (cb)
                    return cb(error);
                throw error;
            }
            const text = await response.text();
            if (cb)
                return cb(null, text);
            return text;
        }
        catch (e) {
            if (cb)
                return cb(e);
            throw e;
        }
    };
    const xhrPostJSON = async (path, payload, cb) => {
        try {
            const response = await fetch(path, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload || {})
            });
            if (!response.ok) {
                const error = new Error(`HTTP ${response.status} for ${path}`);
                if (cb)
                    return cb(error);
                throw error;
            }
            const text = await response.text();
            if (cb)
                return cb(null, text);
            return text;
        }
        catch (e) {
            if (cb)
                return cb(e);
            throw e;
        }
    };
    const renderMarkdownBasic = (md) => {
        const mdForDisplay = md.replace(/```json[^\n]*session-structure[^\n]*\n([\s\S]*?)\n```/gi, '');
        let html = mdForDisplay
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        html = html.replace(/```([\s\S]*?)```/g, (_, code) => `<pre>${code.replace(/\n/g, '\n')}</pre>`);
        html = html.replace(/^###\s+(.*)$/gm, '<h3>$1</h3>')
            .replace(/^##\s+(.*)$/gm, '<h2>$1</h2>')
            .replace(/^#\s+(.*)$/gm, '<h1>$1</h1>');
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');
        const repoBasePath = () => {
            try {
                const p = window.location?.pathname || '';
                const idx = p.indexOf('/exercAIse/');
                if (idx !== -1)
                    return p.slice(0, idx + '/exercAIse/'.length);
            }
            catch (e) { }
            return './';
        };
        html = html.replace(/\[(.*?)\]\((.*?)\)/g, (_, text, url) => {
            const isExternal = /^https?:/i.test(url);
            let finalUrl = url;
            const seg = String(url || '').match(/(exercises\/[\w\-]+\.(?:md|json))$/);
            if (seg?.[1]) {
                const base = repoBasePath();
                finalUrl = base.replace(/\/?$/, '/') + seg[1];
                finalUrl = finalUrl.replace(/([^:])\/+/g, (_m0, p1) => p1 + '/');
            }
            const attrs = isExternal ? ' target="_blank" rel="noopener"' : '';
            return `<a href="${finalUrl}"${attrs}>${text}</a>`;
        });
        html = html.replace(/(?:^|\n)([-*] .*(?:\n[-*] .*)*)/g, (block) => {
            const items = block.replace(/^[-*] /gm, '').trim().split(/\n/);
            if (!items[0] || items.length === 0)
                return block;
            const lis = items.map(item => `<li>${item}</li>`).join('');
            return `\n<ul>${lis}</ul>`;
        });
        const lines = html.split(/\n{2,}/);
        for (let j = 0; j < lines.length; j++) {
            const part = lines[j];
            if (!/^\s*<(h\d|ul|pre)/.test(part)) {
                lines[j] = `<p>${part}</p>`;
            }
        }
        return lines.join('\n');
    };
    const SessionParser = window.ExercAIse.SessionParser;
    const { slugify, parseHMSToSeconds, secondsToHHMMSS, extractExercisesFromMarkdown, parseMarkdownPrescriptions, extractExercisesFromJSON, parseJSONPrescriptions, resolveSectionDisplayMode } = SessionParser;
    const KaiIntegration = window.ExercAIse.KaiIntegration;
    const linkValidation = KaiIntegration.linkValidation;
    const loadSaved = (filePath) => {
        const key = STORAGE_KEY_PREFIX + filePath;
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : null;
        }
        catch (e) {
            return null;
        }
    };
    const saveLocal = (filePath, data) => {
        const key = STORAGE_KEY_PREFIX + filePath;
        try {
            localStorage.setItem(key, JSON.stringify(data));
            localStorage.setItem(latestKey, filePath);
        }
        catch (e) {
            console.error('Error saving to localStorage:', e);
        }
        const storage = window.ExercAIse.Storage;
        if (storage) {
            storage.savePerformanceLog(data).catch((err) => {
                console.warn('IndexedDB save failed (non-critical):', err);
            });
        }
    };
    const setCurrentSessionJSON = (value) => {
        currentSessionJSON = value;
    };
    const initializeFormBuilder = () => {
        if (!window.ExercAIse?.FormBuilder) {
            console.warn('FormBuilder module not loaded');
            return;
        }
        const getCurrentSessionJSON = () => {
            return currentSessionJSON;
        };
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
    const buildForm = (filePath, raw, isJSON) => {
        if (window.ExercAIse?.FormBuilder) {
            window.ExercAIse.FormBuilder.buildForm(filePath, raw, isJSON);
        }
        else {
            console.error('FormBuilder module not available');
        }
    };
    const status = (msg, opts = {}) => {
        const isImportant = !!opts.important;
        if (!msg) {
            statusEl.innerHTML = '';
            statusEl.style.display = 'none';
            return;
        }
        if (!isImportant) {
            statusEl.innerHTML = msg;
            statusEl.style.display = 'none';
            return;
        }
        statusEl.innerHTML = msg;
        statusEl.style.display = 'block';
    };
    const wireReadmeClicks = () => {
        if (readmeSection && !readmeSection.__wired) {
            readmeSection.addEventListener('click', (e) => {
                let t = e.target;
                if (!t)
                    return;
                while (t && t !== readmeSection && !(t.tagName && t.tagName.toLowerCase() === 'a'))
                    t = t.parentNode;
                if (!t || t === readmeSection)
                    return;
                const href = t.getAttribute('href') || '';
                if (!href)
                    return;
                let path = null;
                const exMatch = href.match(/(exercises\/[\w\-]+)\.(?:md|json)$/);
                if (exMatch) {
                    const base = exMatch[1];
                    const jsonPath = `${base}.json`;
                    try {
                        e.preventDefault();
                    }
                    catch (ex) { }
                    try {
                        window.location.href = `exercise.html?file=${encodeURIComponent(jsonPath)}`;
                    }
                    catch (ex) { }
                    return;
                }
                if (href.indexOf('index.html?file=') === 0) {
                    path = decodeURIComponent(href.split('file=')[1] || '');
                }
                else if (href.indexOf('workouts/') === 0) {
                    path = href;
                }
                if (path) {
                    if (e?.preventDefault)
                        e.preventDefault();
                    try {
                        sessionStorage.setItem('indexScrollY', String(window.scrollY || 0));
                    }
                    catch (ex) { }
                    if (window.history?.pushState) {
                        try {
                            window.history.pushState({ view: 'session', file: path }, '', `index.html?file=${encodeURIComponent(path)}`);
                        }
                        catch (ex) { }
                    }
                    openSession(path);
                }
            }, false);
            readmeSection.__wired = true;
        }
    };
    const loadLogsList = () => {
        if (!logsList)
            return;
        const renderFromLocal = (text) => {
            let data = null;
            try {
                data = JSON.parse(text || '{}');
            }
            catch (e) {
                data = null;
            }
            let list = [];
            if (!data)
                return false;
            if (Object.prototype.toString.call(data) === '[object Array]')
                list = data;
            else if (data.files && Object.prototype.toString.call(data.files) === '[object Array]')
                list = data.files;
            if (!list.length)
                return 'empty';
            const rows = [];
            for (let i = 0; i < list.length; i++) {
                const it = list[i];
                if (typeof it === 'string')
                    rows.push({ name: it, path: `performed/${it}` });
                else if (it && typeof it === 'object')
                    rows.push({
                        name: it.name || it.path || `file-${i}`,
                        path: it.path || `performed/${it.name || ''}`
                    });
            }
            rows.sort((a, b) => {
                const ma = (typeof a.mtimeMs === 'number') ? a.mtimeMs : 0;
                const mb = (typeof b.mtimeMs === 'number') ? b.mtimeMs : 0;
                if (ma && mb && ma !== mb)
                    return mb - ma;
                return a.name < b.name ? 1 : -1;
            });
            let html = '<ul class="history-list">';
            for (let j = 0; j < Math.min(rows.length, 50); j++) {
                const r = rows[j];
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
            }
            else if (!res) {
                logsList.innerHTML = '<p class="form__hint">History unavailable (invalid manifest).</p>';
            }
        });
    };
    const openSession = (path) => {
        status(`Loading ${path} …`);
        xhrGet(path, (err, text) => {
            if (err)
                return status(`Error loading workout: ${err.message}`, { important: true });
            try {
                sessionStorage.setItem('indexScrollY', String(window.scrollY || 0));
            }
            catch (e) { }
            setVisibility(readmeSection, false);
            setVisibility(logsSection, false);
            setVisibility(generateSection, false);
            setVisibility(workoutSection, true);
            const isJSON = /\.json$/i.test(path);
            if (isJSON) {
                const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                const isInternalExerciseLink = (url) => {
                    if (!url)
                        return false;
                    if (/^https?:/i.test(url))
                        return false;
                    const m = String(url).match(/^(?:\.?\.?\/)?(exercises\/[\w\-]+\.(?:json|md))$/i);
                    return !!(m && m[1]);
                };
                const renderItem = (it, opts) => {
                    if (!it || typeof it !== 'object')
                        return '';
                    const options = opts || {};
                    const kind = String(it.kind || 'exercise');
                    const name = String(it.name || '');
                    let link = String(it.link || '');
                    if (!link && name) {
                        const slug = slugify(name);
                        link = `exercises/${slug}.json`;
                    }
                    const inlineMarkdown = (text) => {
                        let s = String(text == null ? '' : text);
                        s = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                        s = s.replace(/\[(.*?)\]\((.*?)\)/g, (_, t, u) => `<a href="${u}">${t}</a>`);
                        return s;
                    };
                    const attrEscape = (s) => {
                        return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
                    };
                    if (kind === 'note') {
                        return `<p>${esc(name)}</p>`;
                    }
                    if (kind === 'exercise') {
                        const clean = String(name).replace(/^\s*\d+[\)\.-]\s*/, '');
                        const angleValue = (it.prescription && typeof it.prescription.angle === 'number') ? it.prescription.angle : null;
                        const meta = { cues: (it.cues || []), prescription: (it.prescription || null) };
                        if (it.logType)
                            meta.logType = it.logType;
                        if (it.notes)
                            meta.notes = it.notes;
                        const asLink = !!link && isInternalExerciseLink(link);
                        const exerciseHref = link ? `exercise.html?file=${link}` : '';
                        let html = `<li>${asLink
                            ? `<a href="${esc(exerciseHref)}" data-exmeta="${attrEscape(JSON.stringify(meta))}">${esc(clean)}</a>`
                            : `<span class="ex-name no-link" data-exmeta="${attrEscape(JSON.stringify(meta))}">${esc(clean)}</span>`}`;
                        if (angleValue != null && angleValue !== 0) {
                            const angleClass = angleValue > 0
                                ? 'ex-angle ex-angle--inline ex-angle--incline'
                                : 'ex-angle ex-angle--inline ex-angle--decline';
                            const angleTitle = angleValue > 0 ? 'Incline bench angle' : 'Decline bench angle';
                            const angleLabel = `(${angleValue}°)`;
                            html += ` <span class="${angleClass}" title="${attrEscape(angleTitle)}">${esc(angleLabel)}</span>`;
                        }
                        if (it.prescription && typeof it.prescription === 'object') {
                            try {
                                const p = it.prescription || {};
                                const parts = [];
                                if (p.sets != null && p.reps != null) {
                                    const setsNum = Number(p.sets);
                                    const setsLabel = (setsNum === 1 ? 'set' : 'sets');
                                    parts.push(`${p.sets} ${setsLabel} × ${p.reps} reps`);
                                }
                                else {
                                    if (p.sets != null) {
                                        const setsNum2 = Number(p.sets);
                                        const setsLabel2 = (setsNum2 === 1 ? 'set' : 'sets');
                                        parts.push(`${p.sets} ${setsLabel2}`);
                                    }
                                    if (p.reps != null)
                                        parts.push(`${p.reps} reps`);
                                }
                                if (p.weight != null)
                                    parts.push(typeof p.weight === 'number' ? `${p.weight} lb` : String(p.weight));
                                const weightStr2 = (typeof p.weight === 'string') ? p.weight.toLowerCase() : '';
                                if (p.multiplier === 2 && !(weightStr2 && /(x2|×2|per\s*hand|each|per\s*side)/.test(weightStr2)))
                                    parts.push('x2');
                                if (p.multiplier === 0 && !(weightStr2 && /bodyweight/.test(weightStr2)))
                                    parts.push('bodyweight');
                                if (p.timeSeconds != null) {
                                    parts.push(`${p.timeSeconds} seconds`);
                                }
                                if (p.holdSeconds != null) {
                                    parts.push(`${p.holdSeconds} seconds`);
                                }
                                if (p.distanceMiles != null)
                                    parts.push(`${p.distanceMiles} miles`);
                                if (p.distanceMeters != null)
                                    parts.push(`${p.distanceMeters} m`);
                                if (p.rpe != null)
                                    parts.push(`RPE ${p.rpe}`);
                                if (p.restSeconds != null)
                                    parts.push(`Rest ${p.restSeconds} seconds`);
                                if (parts.length)
                                    html += ` — <span class="ex-presc">${parts.join(' · ')}</span>`;
                            }
                            catch (e) { }
                        }
                        if (it.notes) {
                            html += `<br><span class="ex-notes">${esc(it.notes)}</span>`;
                        }
                        if (!options.suppressCues && it.cues && it.cues.length) {
                            html += `<ul>${it.cues.map((c) => `<li>${inlineMarkdown(c)}</li>`).join('')}</ul>`;
                        }
                        html += '</li>';
                        return html;
                    }
                    if (kind === 'superset' || kind === 'circuit') {
                        const cap = kind.charAt(0).toUpperCase() + kind.slice(1);
                        const containerClass = `session-superset session-superset--${kind}`;
                        let inner = '';
                        if (it.children && it.children.length) {
                            inner = it.children.map((ch) => renderItem(ch, options)).join('');
                            if (inner && inner.indexOf('<li') !== -1)
                                inner = `<ul>${inner}</ul>`;
                        }
                        const metaParts = [];
                        if (typeof it.rounds === 'number') {
                            metaParts.push(`${it.rounds} round${it.rounds === 1 ? '' : 's'}`);
                        }
                        if (typeof it.restSeconds === 'number') {
                            metaParts.push(`Rest ${it.restSeconds}s`);
                        }
                        let notesHtml = '';
                        if (it.notes) {
                            notesHtml = `<div class="session-superset__notes">${esc(it.notes)}</div>`;
                        }
                        const metaHtml = metaParts.length ? `<span class="session-superset__meta">${esc(metaParts.join(' · '))}</span>` : '';
                        const rawName = typeof it.name === 'string' ? it.name : '';
                        const typePattern = new RegExp(`^${cap}\\s*`, 'i');
                        const cleanedName = rawName.replace(typePattern, '').trim();
                        const displayName = cleanedName.replace(/^[-:\u2013\u2014]+\s*/, '').trim() || rawName;
                        const badgeTitle = displayName || cap;
                        return `
              <div class="${containerClass}">
                <div class="session-superset__header">
                  <h3 class="session-superset__heading">
                    <span class="session-superset__badge" title="${esc(badgeTitle)}">${esc(cap)}</span>
                  </h3>
                  ${metaHtml}
                </div>
                ${notesHtml}
                <div class="session-superset__body">${inner}</div>
              </div>
            `;
                    }
                    return '';
                };
                const getSectionDisplayMode = (sec) => {
                    try {
                        if (typeof resolveSectionDisplayMode === 'function') {
                            return resolveSectionDisplayMode(sec);
                        }
                    }
                    catch (e) {
                        console.warn('resolveSectionDisplayMode failed, defaulting to log', e);
                    }
                    const typePart = String(sec?.type || '').toLowerCase();
                    const titlePart = String(sec?.title || '').toLowerCase();
                    const haystack = `${typePart} ${titlePart}`;
                    return /warm|warm-up|warmup|cool|cool-down|cooldown|mobility|recovery|yin|flow/.test(haystack) ? 'reference' : 'log';
                };
                const renderSection = (sec) => {
                    if (!sec)
                        return '';
                    let title = String(sec.title || '');
                    title = title.replace(/^\s*\d+[\)\.-]\s*/, '');
                    const mt = title.match(/^\s*\[([^\]]+)\]\(([^)]+)\)/);
                    if (mt)
                        title = mt[1];
                    const type = String(sec.type || '');
                    const rounds = (sec.rounds != null) ? ` — ${sec.rounds} rounds` : '';
                    const attrEscapeLocal = (s) => {
                        return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
                    };
                    const typeText = type || 'Section';
                    const displayMode = getSectionDisplayMode(sec);
                    const display = typeText + (title ? ` — ${title}` : '');
                    let h = `<section data-sectype="${attrEscapeLocal(typeText)}" data-display-mode="${attrEscapeLocal(displayMode)}"><h2>${esc(display)}${esc(rounds)}</h2>`;
                    if (sec.notes) {
                        try {
                            h += renderMarkdownBasic(String(sec.notes));
                        }
                        catch (e) {
                            h += `<p>${esc(sec.notes)}</p>`;
                        }
                    }
                    if (sec.items && sec.items.length) {
                        let itemsHtml = sec.items.map((it) => renderItem(it, { suppressCues: true })).join('');
                        if (itemsHtml.indexOf('<li') !== -1)
                            itemsHtml = `<ul>${itemsHtml}</ul>`;
                        h += itemsHtml;
                    }
                    h += '</section>';
                    return h;
                };
                let obj = null;
                try {
                    obj = JSON.parse(text || '{}');
                }
                catch (e) {
                    obj = null;
                }
                if (obj && (!obj.sections || !obj.sections.length) && obj.exercises && Object.prototype.toString.call(obj.exercises) === '[object Array]') {
                    const itemsFromPlan = [];
                    for (let ei2 = 0; ei2 < obj.exercises.length; ei2++) {
                        const ex2 = obj.exercises[ei2] || {};
                        const pres2 = (ex2.prescribed != null ? ex2.prescribed : ex2.prescription) || {};
                        if (!pres2.sets && ex2.sets != null)
                            pres2.sets = ex2.sets;
                        if (!pres2.reps && ex2.reps != null)
                            pres2.reps = ex2.reps;
                        if (!pres2.load && ex2.load != null)
                            pres2.load = ex2.load;
                        if (!pres2.rpe && ex2.rpe != null)
                            pres2.rpe = ex2.rpe;
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
                    const parts = [];
                    let titleTop = obj.title ? `<h1>${esc(obj.title)}</h1>` : '';
                    if (obj.date)
                        titleTop += `<p class="muted">${esc(obj.date)}</p>`;
                    if (titleTop)
                        parts.push(titleTop);
                    if (obj.notes) {
                        try {
                            parts.push(renderMarkdownBasic(String(obj.notes)));
                        }
                        catch (e) {
                            parts.push(`<p>${esc(obj.notes)}</p>`);
                        }
                    }
                    for (let si = 0; si < obj.sections.length; si++)
                        parts.push(renderSection(obj.sections[si]));
                    workoutContent.innerHTML = parts.join('\n');
                }
                else {
                    let pretty = '';
                    try {
                        pretty = JSON.stringify(JSON.parse(text || '{}'), null, 2);
                    }
                    catch (e) {
                        pretty = text || '';
                    }
                    workoutContent.innerHTML = `<pre>${pretty || ''}</pre>`;
                }
                fixExerciseAnchors(workoutContent);
            }
            else {
                workoutContent.innerHTML = renderMarkdownBasic(text || '');
                fixExerciseAnchors(workoutContent);
            }
            if (isJSON) {
                setCurrentSessionJSON(text || null);
            }
            else {
                setCurrentSessionJSON(null);
            }
            setVisibility(formSection, true);
            buildForm(path, text || '', isJSON);
            let title = path;
            let obj = null;
            if (isJSON) {
                try {
                    obj = JSON.parse(text || '{}');
                }
                catch (e) {
                    obj = null;
                }
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
            try {
                window.scrollTo(0, 0);
            }
            catch (e) { }
            status('');
        });
    };
    const initializeKaiIntegration = () => {
        if (!window.ExercAIse?.KaiIntegration) {
            console.warn('KaiIntegration module not loaded');
            return;
        }
        window.ExercAIse.KaiIntegration.init({
            status,
            xhrGet,
            xhrPostJSON,
            slugify,
            renderMarkdownBasic,
            fixExerciseAnchors,
            setVisibility,
            buildForm,
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
            parseHMSToSeconds,
            setCurrentSessionJSON
        });
    };
    const fixExerciseAnchors = (scope) => {
        try {
            const anchors = (scope || document).getElementsByTagName('a');
            for (let i = 0; i < anchors.length; i++) {
                const a = anchors[i];
                const href = a.getAttribute('href') || '';
                if (/^exercise\.html\?file=/i.test(href))
                    continue;
                const m = href.match(/(?:^\.?\.?\/)?(?:https?:\/\/[^\/]+\/)?(?:.*\/)?(exercises\/[\w\-]+\.(?:md|json))$/);
                if (m?.[1]) {
                    a.setAttribute('href', `exercise.html?file=${m[1]}`);
                }
            }
        }
        catch (e) { }
    };
    (() => {
        try {
            const navHome = document.getElementById('nav-home');
            const navWorkouts = document.getElementById('nav-workouts');
            const navHistory = document.getElementById('nav-history');
            const handleNavClick = (e, viewName, callback) => {
                if (e?.preventDefault)
                    e.preventDefault();
                if (e?.stopPropagation)
                    e.stopPropagation();
                try {
                    window.history.pushState({ view: viewName }, '', `index.html${viewName !== 'home' ? `?view=${viewName}` : ''}`);
                }
                catch (ex) { }
                if (callback)
                    callback();
                return false;
            };
            if (navHome) {
                navHome.onclick = (e) => handleNavClick(e, 'home', showIndexView);
                try {
                    navHome.addEventListener('touchend', (e) => handleNavClick(e, 'home', showIndexView), false);
                }
                catch (touchError) {
                    navHome.ontouchend = (e) => handleNavClick(e, 'home', showIndexView);
                }
            }
            if (navWorkouts) {
                navWorkouts.onclick = (e) => handleNavClick(e, 'workouts', openWorkouts);
                try {
                    navWorkouts.addEventListener('touchend', (e) => handleNavClick(e, 'workouts', openWorkouts), false);
                }
                catch (touchError) {
                    navWorkouts.ontouchend = (e) => handleNavClick(e, 'workouts', openWorkouts);
                }
            }
            if (navHistory) {
                navHistory.onclick = (e) => handleNavClick(e, 'history', openHistory);
                try {
                    navHistory.addEventListener('touchend', (e) => handleNavClick(e, 'history', openHistory), false);
                }
                catch (touchError) {
                    navHistory.ontouchend = (e) => handleNavClick(e, 'history', openHistory);
                }
            }
        }
        catch (e) {
            console.warn('Navigation setup failed:', e);
        }
    })();
    let cachedWorkoutList = null;
    const buildWorkoutListHTML = (workouts) => {
        let html = '<h2>Workouts</h2>';
        html += '<ul class="workout-list">';
        for (let i = 0; i < workouts.length; i++) {
            const w = workouts[i];
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
    const loadWorkoutList = (callback) => {
        xhrGet('workouts/manifest.txt', (err, text) => {
            if (err) {
                if (callback)
                    callback(err);
                return;
            }
            const lines = (text || '').split('\n').filter(line => line.trim() && line.match(/\.json$/i));
            const workouts = [];
            for (let i = 0; i < lines.length; i++) {
                const filepath = lines[i].trim();
                const filename = filepath.replace(/^workouts\//, '');
                workouts.push({
                    filename: filename,
                    title: null,
                    block: null,
                    week: null
                });
            }
            cachedWorkoutList = workouts;
            if (callback)
                callback(null, workouts);
        });
    };
    const openWorkouts = () => {
        setVisibility(generateSection, false);
        setVisibility(logsSection, false);
        setVisibility(readmeSection, true);
        if (cachedWorkoutList) {
            readmeContent.innerHTML = buildWorkoutListHTML(cachedWorkoutList);
            wireReadmeClicks();
        }
        else {
            status('Loading workouts…');
            loadWorkoutList((err, workouts) => {
                if (err) {
                    readmeContent.innerHTML = '<p class="error">Error loading workouts. Please try again.</p>';
                    return;
                }
                readmeContent.innerHTML = buildWorkoutListHTML(workouts || []);
                wireReadmeClicks();
                status('');
            });
        }
    };
    const openHistory = () => {
        setVisibility(generateSection, false);
        setVisibility(readmeSection, false);
        setVisibility(logsSection, true);
        loadLogsList();
    };
    const importPerformedLogs = async () => {
        const importKey = 'exercAIse-imported-performed-logs';
        try {
            const lastImport = localStorage.getItem(importKey);
            if (lastImport) {
                const timeSinceImport = Date.now() - parseInt(lastImport, 10);
                if (timeSinceImport < 24 * 60 * 60 * 1000) {
                    console.log('✅ Performance logs already imported (skip)');
                    return;
                }
            }
        }
        catch (e) {
            console.warn('Could not check import timestamp:', e);
        }
        console.log('🔄 Importing performance logs from performed/ directory...');
        try {
            const indexResponse = await fetch('performed/index.json');
            const index = await indexResponse.json();
            let importCount = 0;
            const errors = [];
            for (const file of index.files) {
                if (!file.name || !file.name.endsWith('.json') || file.name === 'index.json') {
                    continue;
                }
                try {
                    const logResponse = await fetch(`performed/${file.name}`);
                    const logData = await logResponse.json();
                    if (logData.workoutFile) {
                        const key = STORAGE_KEY_PREFIX + logData.workoutFile;
                        localStorage.setItem(key, JSON.stringify(logData));
                        importCount++;
                    }
                }
                catch (e) {
                    errors.push(`Failed to import ${file.name}: ${e}`);
                }
            }
            localStorage.setItem(importKey, Date.now().toString());
            console.log(`✅ Imported ${importCount} performance logs into localStorage`);
            if (errors.length > 0) {
                console.warn('Import errors:', errors);
            }
        }
        catch (e) {
            console.error('Failed to import performance logs:', e);
        }
    };
    const load = () => {
        initializeFormBuilder();
        initializeKaiIntegration();
        importPerformedLogs().catch(err => {
            console.warn('Performance log import failed (non-critical):', err);
        });
        const params = (() => {
            const q = {};
            try {
                const s = (window.location.search || '').replace(/^\?/, '').split('&');
                for (let i = 0; i < s.length; i++) {
                    const kv = s[i].split('=');
                    if (kv[0])
                        q[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
                }
            }
            catch (e) { }
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
        if (window.ExercAIse && window.ExercAIse.KaiIntegration) {
            window.ExercAIse.KaiIntegration.handleGenerateButtons();
        }
    };
    window.addEventListener('popstate', () => {
        const s = window.location.search || '';
        const params = (() => {
            const q = {};
            try {
                const arr = s.replace(/^\?/, '').split('&');
                for (let i = 0; i < arr.length; i++) {
                    const kv = arr[i].split('=');
                    if (kv[0])
                        q[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
                }
            }
            catch (e) { }
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
    load();
})();
//# sourceMappingURL=app.js.map