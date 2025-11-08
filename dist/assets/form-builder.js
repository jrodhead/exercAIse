window.ExercAIse = window.ExercAIse || {};
window.ExercAIse.FormBuilder = (() => {
    'use strict';
    let deps = {};
    const METERS_PER_MILE = 1609.34;
    const init = (dependencies) => {
        deps = dependencies || {};
        const required = [
            'slugify', 'extractExercisesFromJSON', 'extractExercisesFromMarkdown',
            'parseJSONPrescriptions', 'parseMarkdownPrescriptions',
            'loadSaved', 'saveLocal', 'parseHMSToSeconds', 'secondsToHHMMSS',
            'renderMarkdownBasic', 'fixExerciseAnchors', 'status',
            'workoutContent', 'exerciseFormsEl', 'saveBtn', 'copyBtn', 'downloadBtn',
            'issueBtn', 'clearBtn', 'copyWrapper', 'copyTarget', 'openIssueLink'
        ];
        for (let i = 0; i < required.length; i++) {
            if (!deps[required[i]]) {
                console.warn('FormBuilder: missing dependency:', required[i]);
            }
        }
    };
    const buildForm = (filePath, raw, isJSON) => {
        const prescriptions = isJSON ? deps.parseJSONPrescriptions(raw) : deps.parseMarkdownPrescriptions(raw);
        if (deps.exerciseFormsEl)
            deps.exerciseFormsEl.innerHTML = '';
        const saved = deps.loadSaved(filePath) || { file: filePath, updatedAt: new Date().toISOString(), exercises: {} };
        const getFirstHeadingText = (tagName) => {
            if (!deps.workoutContent)
                return '';
            const h = deps.workoutContent.querySelector(tagName);
            return h ? (h.textContent || '').trim() : '';
        };
        const docH1Title = getFirstHeadingText('h1');
        const fullDocText = deps.workoutContent ? ((deps.workoutContent.textContent || deps.workoutContent.innerText) || '') : '';
        const detectRoundsHint = (scopeText) => {
            const t = String(scopeText || '');
            let m = t.match(/(\d+)\s*(?:x|×)?\s*rounds?/i);
            if (m)
                return parseInt(m[1], 10) || null;
            m = t.match(/(\d+)\s*sets?/i);
            if (m)
                return parseInt(m[1], 10) || null;
            return null;
        };
        const docRoundsHint = detectRoundsHint(fullDocText);
        const createExerciseCard = (title, presetRows, savedRows, headerHTML, opts) => {
            const options = opts || {};
            const isReadOnly = !!options.readOnly;
            const exKey = deps.slugify(title);
            const card = document.createElement('div');
            card.className = 'exercise-card exercise-card--compact' + (isReadOnly ? ' exercise-card--readonly' : '');
            card.setAttribute('data-exkey', exKey);
            card.setAttribute('data-name', title);
            if (headerHTML) {
                const header = document.createElement('div');
                header.className = 'exercise-card__header';
                header.innerHTML = headerHTML;
                try {
                    const metaElement = header.querySelector('[data-exmeta]');
                    if (metaElement) {
                        const metaRaw = metaElement.getAttribute('data-exmeta') || '';
                        const metadata = metaRaw ? JSON.parse(metaRaw) : null;
                        if (metadata && metadata.notes) {
                            const notesDiv = document.createElement('div');
                            notesDiv.className = 'exercise-card__notes';
                            notesDiv.textContent = metadata.notes;
                            header.appendChild(notesDiv);
                        }
                    }
                }
                catch (e) {
                }
                card.appendChild(header);
            }
            let setsWrap = null;
            let addBtn = null;
            if (!isReadOnly) {
                setsWrap = document.createElement('div');
                setsWrap.className = 'exercise-sets';
                card.appendChild(setsWrap);
                addBtn = document.createElement('button');
                addBtn.className = 'button--secondary';
                addBtn.type = 'button';
                addBtn.appendChild(document.createTextNode('Add set'));
                card.appendChild(addBtn);
            }
            const updateSetLabelsLocal = () => {
                if (isReadOnly || !setsWrap)
                    return;
                const rows = setsWrap.getElementsByClassName('set-row');
                for (let i = 0; i < rows.length; i++) {
                    const lbl = rows[i].getElementsByClassName('set-label')[0];
                    if (lbl)
                        lbl.textContent = 'Set ' + (i + 1);
                }
            };
            const pickFieldsFromRows = (rows, titleForHeuristic, explicitLogType) => {
                let hasHold = false, hasTime = false, hasDist = false, hasWeight = false, hasReps = false;
                for (let i = 0; i < rows.length; i++) {
                    const rr = rows[i] || {};
                    if (rr.holdSeconds != null)
                        hasHold = true;
                    if (rr.timeSeconds != null)
                        hasTime = true;
                    if (rr.distanceMeters != null || rr.distanceMiles != null)
                        hasDist = true;
                    if (rr.weight != null)
                        hasWeight = true;
                    if (rr.reps != null)
                        hasReps = true;
                }
                if (explicitLogType === 'mobility' || explicitLogType === 'stretch')
                    return ['holdSeconds', 'rpe'];
                if (explicitLogType === 'endurance')
                    return ['distanceMiles', 'timeSeconds', 'rpe'];
                if (explicitLogType === 'carry')
                    return ['weight', 'multiplier', 'timeSeconds', 'rpe'];
                if (explicitLogType === 'strength')
                    return ['weight', 'multiplier', 'reps', 'rpe'];
                if (hasReps && hasWeight && hasTime)
                    return ['weight', 'multiplier', 'reps', 'timeSeconds', 'rpe'];
                if (hasReps && hasWeight)
                    return ['weight', 'multiplier', 'reps', 'rpe'];
                if (hasHold)
                    return ['holdSeconds', 'rpe'];
                const t = String(titleForHeuristic || '').toLowerCase();
                const isEndurance = /\b(run|jog|walk|tempo|quality run|easy run|bike|cycle|ride|rower|rowing|erg|swim)\b/.test(t);
                if (isEndurance)
                    return ['distanceMiles', 'timeSeconds', 'rpe'];
                if (hasTime && hasWeight)
                    return ['weight', 'multiplier', 'timeSeconds', 'rpe'];
                if (hasDist && hasTime)
                    return ['distanceMiles', 'timeSeconds', 'rpe'];
                if (hasDist)
                    return ['distanceMiles', 'rpe'];
                if (hasTime)
                    return ['timeSeconds', 'rpe'];
                return ['weight', 'multiplier', 'reps', 'rpe'];
            };
            const initialRows = (savedRows && savedRows.length) ? savedRows : (presetRows || []);
            let explicitType = null;
            if (opts && opts.explicitLogType) {
                explicitType = opts.explicitLogType;
            }
            else {
                try {
                    const headerProbe = document.createElement('div');
                    headerProbe.innerHTML = headerHTML || '';
                    const aProbe = headerProbe.querySelector('a[data-exmeta]');
                    if (aProbe) {
                        const raw = aProbe.getAttribute('data-exmeta') || '';
                        const m = raw ? JSON.parse(raw) : null;
                        if (m && m.logType)
                            explicitType = m.logType;
                    }
                }
                catch (e) {
                }
            }
            const fieldOrder = isReadOnly ? [] : pickFieldsFromRows(initialRows, title, explicitType);
            const addSetRow = (row, idx) => {
                if (isReadOnly || !setsWrap)
                    return;
                const r = document.createElement('div');
                r.className = 'set-row';
                const label = document.createElement('span');
                label.className = 'set-label';
                label.appendChild(document.createTextNode('Set'));
                r.appendChild(label);
                const placeholders = {
                    weight: 'Weight',
                    multiplier: 'Multiplier',
                    reps: 'Reps',
                    rpe: 'RPE',
                    timeSeconds: 'Time (hh:mm:ss)',
                    holdSeconds: 'Hold (hh:mm:ss)',
                    distanceMeters: 'Distance (mi)',
                    distanceMiles: 'Distance (mi)'
                };
                const types = {
                    weight: { type: 'number', step: 'any' },
                    multiplier: { type: 'number', min: 0, step: '1' },
                    reps: { type: 'number', min: 0 },
                    rpe: { type: 'number', step: 'any' },
                    timeSeconds: { type: 'text' },
                    holdSeconds: { type: 'text' },
                    distanceMeters: { type: 'number', min: 0, step: 'any' },
                    distanceMiles: { type: 'number', min: 0, step: 'any' }
                };
                const inputs = [];
                for (let fi = 0; fi < fieldOrder.length; fi++) {
                    const name = fieldOrder[fi];
                    const spec = types[name] || { type: 'text' };
                    inputs.push({ name, placeholder: placeholders[name] || name, type: spec.type, min: spec.min, step: spec.step });
                }
                for (let i = 0; i < inputs.length; i++) {
                    const spec = inputs[i];
                    if (spec.name === 'multiplier') {
                        const times = document.createElement('span');
                        times.appendChild(document.createTextNode('×'));
                        times.setAttribute('aria-hidden', 'true');
                        times.style.margin = '0 4px 0 8px';
                        r.appendChild(times);
                    }
                    const input = document.createElement('input');
                    input.type = spec.type;
                    input.placeholder = spec.placeholder;
                    if (spec.min != null)
                        input.min = spec.min;
                    if (spec.step)
                        input.step = spec.step;
                    if (spec.name === 'multiplier') {
                        input.setAttribute('title', 'Multiplier (e.g., 2 for pair, 1 for single, 0 for bodyweight)');
                        input.setAttribute('aria-label', 'Multiplier (e.g., 2 for pair, 1 for single, 0 for bodyweight)');
                        input.style.maxWidth = '5em';
                    }
                    if (spec.name === 'rpe') {
                        input.setAttribute('title', 'RPE (Rate of Perceived Exertion), 1–10 scale — 4–5 = easy conversational, 7–8 = tempo/comfortably hard');
                        input.setAttribute('aria-label', 'RPE (Rate of Perceived Exertion), 1–10 scale; 4–5 easy conversational, 7–8 tempo/comfortably hard');
                        try {
                            input.min = 0;
                            input.max = 10;
                        }
                        catch (e) {
                        }
                    }
                    if (spec.name === 'distanceMeters' || spec.name === 'distanceMiles') {
                        input.setAttribute('title', 'Distance (miles)');
                        input.setAttribute('aria-label', 'Distance in miles');
                    }
                    if (row) {
                        let v = null;
                        if (row[spec.name] != null)
                            v = row[spec.name];
                        if (v == null && spec.name === 'distanceMiles' && row.distanceMeters != null)
                            v = (row.distanceMeters / METERS_PER_MILE);
                        if (v == null && spec.name === 'distanceMeters' && row.distanceMiles != null)
                            v = (row.distanceMiles * METERS_PER_MILE);
                        if (v == null && spec.name === 'distanceMiles' && presetRows) {
                            const pRow = (typeof idx === 'number' && presetRows[idx]) ? presetRows[idx] : (presetRows[0] || null);
                            if (pRow) {
                                if (pRow.distanceMiles != null)
                                    v = Number(pRow.distanceMiles);
                                else if (pRow.distanceMeters != null)
                                    v = Number(pRow.distanceMeters) / METERS_PER_MILE;
                            }
                        }
                        if (v == null && spec.name === 'distanceMiles') {
                            const tstr = String(title || '');
                            let mt = tstr.match(/(\d+(?:\.\d+)?)\s*(?:mi|miles?|mile)\b/i);
                            if (mt)
                                v = Number(mt[1]);
                            if (v == null && docH1Title) {
                                const mh1 = docH1Title.match(/(\d+(?:\.\d+)?)\s*(?:mi|miles?|mile)\b/i);
                                if (mh1)
                                    v = Number(mh1[1]);
                            }
                            if (v == null && fullDocText) {
                                const mdoc = fullDocText.match(/(\d+(?:\.\d+)?)\s*(?:mi|miles?|mile)\b/i);
                                if (mdoc)
                                    v = Number(mdoc[1]);
                            }
                        }
                        if (v != null) {
                            if (spec.name === 'distanceMeters') {
                                const miles = v / METERS_PER_MILE;
                                const milesRounded = Math.round(miles * 100) / 100;
                                input.value = String(milesRounded);
                            }
                            else if (spec.name === 'distanceMiles') {
                                const milesRounded2 = Math.round(Number(v) * 100) / 100;
                                input.value = String(milesRounded2);
                            }
                            else if (spec.name === 'timeSeconds' || spec.name === 'holdSeconds') {
                                input.value = deps.secondsToHHMMSS(v);
                            }
                            else {
                                input.value = v;
                            }
                        }
                    }
                    input.setAttribute('data-name', spec.name);
                    r.appendChild(input);
                }
                const del = document.createElement('button');
                del.type = 'button';
                del.className = 'button--remove';
                del.setAttribute('aria-label', 'Remove set');
                del.title = 'Remove set';
                const iconText = document.createElement('span');
                iconText.className = 'icon-text';
                iconText.textContent = '🗑';
                del.appendChild(iconText);
                del.onclick = () => { setsWrap.removeChild(r); updateSetLabelsLocal(); };
                r.appendChild(del);
                setsWrap.appendChild(r);
                updateSetLabelsLocal();
            };
            const snapshotLastRow = () => {
                if (!setsWrap)
                    return null;
                const rows = setsWrap.getElementsByClassName('set-row');
                if (!rows || !rows.length)
                    return null;
                const last = rows[rows.length - 1];
                const inputs = last.getElementsByTagName('input');
                const obj = {};
                for (let i = 0; i < inputs.length; i++) {
                    const inEl = inputs[i];
                    const name = inEl.getAttribute('data-name');
                    const val = inEl.value;
                    if (val === '' || !name)
                        continue;
                    if (name === 'timeSeconds' || name === 'holdSeconds') {
                        const sec = deps.parseHMSToSeconds(val);
                        if (sec != null)
                            obj[name] = sec;
                    }
                    else if (name === 'distanceMeters') {
                        obj.distanceMiles = Number(val);
                    }
                    else if (name === 'distanceMiles') {
                        obj.distanceMiles = Number(val);
                    }
                    else {
                        obj[name] = Number(val);
                    }
                }
                return obj;
            };
            if (!isReadOnly && addBtn) {
                addBtn.onclick = () => {
                    const snap = snapshotLastRow();
                    if (snap) {
                        const rowsNow = setsWrap.getElementsByClassName('set-row');
                        addSetRow(snap, rowsNow ? rowsNow.length : undefined);
                        return;
                    }
                    if (presetRows && presetRows.length) {
                        addSetRow(presetRows[0], 0);
                        return;
                    }
                    addSetRow({}, undefined);
                };
            }
            const rows = initialRows;
            for (let i = 0; i < rows.length; i++)
                addSetRow(rows[i], i);
            try {
                const mainKey = deps.slugify(title);
                const extraAnchors = card.querySelectorAll('a[href*="exercises/"]');
                for (let ai = 0; ai < extraAnchors.length; ai++) {
                    const ahref = extraAnchors[ai].getAttribute('href') || '';
                    const m = ahref.match(/exercises\/([\w\-]+)\.(?:md|json)$/);
                    if (!m || !m[1])
                        continue;
                    const slug = m[1];
                    if (deps.slugify(slug) !== mainKey) {
                        let n = extraAnchors[ai];
                        while (n && n !== card && !(n.tagName && (n.tagName === 'LI' || n.tagName === 'P' || n.className === 'exercise-card__notes')))
                            n = n.parentNode;
                        if (n && n !== card && n.parentNode)
                            n.parentNode.removeChild(n);
                    }
                }
            }
            catch (e) {
            }
            return card;
        };
        const anchors = deps.workoutContent ? Array.prototype.slice.call(deps.workoutContent.getElementsByTagName('a')) : [];
        const noLinkSpans = deps.workoutContent ? Array.prototype.slice.call(deps.workoutContent.querySelectorAll('span.ex-name')) : [];
        const exNodes = anchors.concat(noLinkSpans);
        const nearestBlockContainer = (node) => {
            let n = node;
            while (n && n !== deps.workoutContent) {
                if (n.tagName && (n.tagName === 'LI' || n.tagName === 'P' || n.tagName === 'DIV'))
                    return n;
                n = n.parentNode;
            }
            return node.parentNode || deps.workoutContent;
        };
        const findListParent = (node) => {
            let n = node;
            while (n && n !== deps.workoutContent) {
                if (n.tagName && (n.tagName === 'UL' || n.tagName === 'OL'))
                    return n;
                n = n.parentNode;
            }
            return null;
        };
        const findNearestHeadingEl = (node) => {
            let n = node;
            while (n && n !== deps.workoutContent) {
                let s = n.previousSibling;
                while (s) {
                    if (s.nodeType === 1 && s.tagName && /^H[1-4]$/.test(s.tagName))
                        return s;
                    s = s.previousSibling;
                }
                n = n.parentNode;
            }
            return null;
        };
        const collectFollowingBlocks = (startEl) => {
            const htmlParts = [];
            const toHide = [];
            if (!startEl)
                return { html: '', nodes: [] };
            let s = startEl.nextSibling;
            while (s) {
                if (s.nodeType === 1 && s.tagName && /^H[1-4]$/.test(s.tagName))
                    break;
                let hasNextExercise = false;
                try {
                    if (s.querySelector) {
                        if (s.querySelector('a[href*="exercises/"]'))
                            hasNextExercise = true;
                        else if (s.querySelector('span.ex-name'))
                            hasNextExercise = true;
                    }
                    else {
                        const testHtml = s.outerHTML || (s.textContent || '');
                        hasNextExercise = /(\b|\/)(exercises\/[\w\-]+\.(?:md|json))\b/.test(String(testHtml || ''));
                    }
                }
                catch (e) {
                }
                if (hasNextExercise)
                    break;
                if (s.nodeType === 1) {
                    htmlParts.push(s.outerHTML);
                }
                else if (s.nodeType === 3) {
                    const txt = String(s.textContent || '');
                    const safe = txt.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
                    if (safe.trim())
                        htmlParts.push('<div class="md-text">' + safe + '</div>');
                }
                toHide.push(s);
                s = s.nextSibling;
            }
            return { html: htmlParts.join(''), nodes: toHide };
        };
        const findPreviousHeading = (node) => {
            let n = node;
            while (n && n !== deps.workoutContent) {
                let s = n.previousSibling;
                while (s) {
                    if (s.nodeType === 1 && s.tagName && /^H[1-4]$/.test(s.tagName)) {
                        return (s.textContent || '').trim();
                    }
                    s = s.previousSibling;
                }
                n = n.parentNode;
            }
            return '';
        };
        const isWarmOrCool = (sectionTitle, anchorEl) => {
            let secType = '';
            try {
                let secEl = anchorEl;
                while (secEl && secEl !== deps.workoutContent && !(secEl.tagName && secEl.tagName.toLowerCase() === 'section'))
                    secEl = secEl.parentNode;
                if (secEl && secEl.getAttribute)
                    secType = (secEl.getAttribute('data-sectype') || '');
            }
            catch (e) {
            }
            const t = String((secType || sectionTitle) || '').toLowerCase();
            return (t.indexOf('warm') !== -1 ||
                t.indexOf('warm-up') !== -1 ||
                t.indexOf('warm up') !== -1 ||
                t.indexOf('warmup') !== -1 ||
                t.indexOf('cool') !== -1 ||
                t.indexOf('cool-down') !== -1 ||
                t.indexOf('cool down') !== -1 ||
                t.indexOf('cooldown') !== -1 ||
                t.indexOf('mobility') !== -1 ||
                t.indexOf('recovery') !== -1);
        };
        let foundCount = 0;
        const foundKeys = {};
        for (let ai = 0; ai < exNodes.length; ai++) {
            const a = exNodes[ai];
            const isAnchorNode = !!(a && a.tagName && a.tagName.toLowerCase() === 'a');
            const href = isAnchorNode ? (a.getAttribute('href') || '') : '';
            if (isAnchorNode && !/(?:^(?:https?:\/\/[^\/]+\/)?|\.?\.\/|\/)?(?:exercise\.html\?file=)?exercises\/[\w\-]+\.(?:md|json)$/.test(href))
                continue;
            let title = a.textContent || a.innerText || '';
            const normTitle = title.replace(/\s*\([^\)]*\)\s*$/, '').trim();
            if (!normTitle)
                continue;
            const exKey = deps.slugify(normTitle);
            const metaRaw0 = a.getAttribute('data-exmeta') || '';
            let meta0 = null;
            try {
                meta0 = metaRaw0 ? JSON.parse(metaRaw0) : null;
            }
            catch (e) {
                meta0 = null;
            }
            const container = nearestBlockContainer(a);
            const sectionTitle = findPreviousHeading(container);
            const inWarmCool = isWarmOrCool(sectionTitle, a);
            const savedEntry = saved.exercises[exKey];
            let savedRows = [];
            if (savedEntry) {
                if (Object.prototype.toString.call(savedEntry) === '[object Array]')
                    savedRows = savedEntry;
                else if (savedEntry.sets && Object.prototype.toString.call(savedEntry.sets) === '[object Array]')
                    savedRows = savedEntry.sets;
            }
            let preset = prescriptions[exKey] || prescriptions[deps.slugify(title)] || [];
            if (!isJSON && !inWarmCool && (!preset || !preset.length)) {
                const secRounds = detectRoundsHint(sectionTitle) || docRoundsHint || 3;
                const defaults = [];
                for (let di = 1; di <= Math.max(1, secRounds); di++)
                    defaults.push({ set: di });
                preset = defaults;
            }
            const headEl = findNearestHeadingEl(a) || null;
            let headerHTML = '';
            if (a) {
                const cleanText = (a.textContent || a.innerText || '').replace(/^\s*\d+[\)\.-]\s*/, '').trim();
                const hrefFixed = isAnchorNode ? (a.getAttribute('href') || '') : '';
                const metaRaw = a.getAttribute('data-exmeta') || '';
                let meta = null;
                try {
                    meta = metaRaw ? JSON.parse(metaRaw) : null;
                }
                catch (e) {
                    meta = null;
                }
                let extraBits = '';
                if (meta && meta.prescription) {
                    const p = meta.prescription;
                    const parts = [];
                    if (p.sets != null && p.reps != null)
                        parts.push(String(p.sets) + ' x ' + String(p.reps));
                    if (p.weight != null) {
                        if (typeof p.weight === 'number')
                            parts.push(String(p.weight) + ' lb');
                        else
                            parts.push(String(p.weight));
                    }
                    const weightStr = (typeof p.weight === 'string') ? p.weight.toLowerCase() : '';
                    if (p.multiplier === 2 && !(weightStr && /(x2|×2|per\s*hand|each|per\s*side)/.test(weightStr)))
                        parts.push('x2');
                    if (p.multiplier === 0 && !(weightStr && /bodyweight/.test(weightStr)))
                        parts.push('bodyweight');
                    if (p.timeSeconds != null) {
                        try {
                            parts.push(deps.secondsToHHMMSS(p.timeSeconds));
                        }
                        catch (e) {
                        }
                    }
                    if (p.distanceMiles != null)
                        parts.push(String(p.distanceMiles) + ' mi');
                    if (p.rpe != null)
                        parts.push('RPE ' + String(p.rpe));
                    if (p.restSeconds != null)
                        parts.push('Rest ' + String(p.restSeconds) + 's');
                    if (parts.length)
                        extraBits += ' — <span class="ex-presc">' + parts.join(' · ') + '</span>';
                }
                if (meta && meta.cues && meta.cues.length) {
                    extraBits += '<ul class="ex-cues">' + meta.cues.map((c) => '<li>' + c + '</li>').join('') + '</ul>';
                }
                const _escAttr = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
                if (hrefFixed) {
                    headerHTML = '<a href="' + hrefFixed + '" data-exmeta="' + _escAttr(metaRaw) + '">' + cleanText + '</a>' + extraBits;
                }
                else {
                    headerHTML = '<span class="ex-name no-link" data-exmeta="' + _escAttr(metaRaw) + '">' + cleanText + '</span>' + extraBits;
                }
            }
            else if (container) {
                headerHTML = container.innerHTML || '';
            }
            else if (headEl) {
                headerHTML = headEl.outerHTML || '';
            }
            const isExplicitNonLoggable = !!(meta0 && meta0.loggable === false);
            if (inWarmCool || isExplicitNonLoggable) {
                foundKeys[exKey] = true;
                continue;
            }
            const card = createExerciseCard(normTitle, preset, savedRows, headerHTML, { explicitLogType: (meta0 && meta0.logType) ? meta0.logType : undefined });
            const extra = collectFollowingBlocks(container);
            if (extra && extra.html) {
                const notes = document.createElement('div');
                notes.className = 'exercise-card__notes';
                notes.innerHTML = extra.html;
                card.appendChild(notes);
            }
            if (container && container.tagName === 'LI') {
                const parentList = findListParent(container);
                const listHolder = parentList && parentList.parentNode ? parentList.parentNode : deps.workoutContent;
                const insertAfter = parentList && parentList.__lastCard ? parentList.__lastCard : parentList;
                if (listHolder && listHolder.insertBefore) {
                    if (insertAfter && insertAfter.nextSibling)
                        listHolder.insertBefore(card, insertAfter.nextSibling);
                    else
                        listHolder.appendChild(card);
                }
                else {
                    deps.workoutContent.appendChild(card);
                }
                if (parentList)
                    parentList.__lastCard = card;
                try {
                    container.parentNode && container.parentNode.removeChild(container);
                }
                catch (e) {
                }
                try {
                    if (parentList && !parentList.querySelector('li')) {
                        parentList.parentNode && parentList.parentNode.removeChild(parentList);
                    }
                }
                catch (e) {
                }
            }
            else {
                const parent = container.parentNode || deps.workoutContent;
                if (parent && parent.insertBefore) {
                    if (container.nextSibling)
                        parent.insertBefore(card, container.nextSibling);
                    else
                        parent.appendChild(card);
                }
                else {
                    deps.workoutContent.appendChild(card);
                }
                try {
                    container.parentNode && container.parentNode.removeChild(container);
                }
                catch (e) {
                }
            }
            if (extra && extra.nodes) {
                for (let hideIdx = 0; hideIdx < extra.nodes.length; hideIdx++) {
                    const nodeToHide = extra.nodes[hideIdx];
                    try {
                        if (nodeToHide && nodeToHide.parentNode)
                            nodeToHide.parentNode.removeChild(nodeToHide);
                    }
                    catch (e) {
                    }
                }
            }
            foundCount++;
            foundKeys[exKey] = true;
        }
        const titleCaseFromKey = (k) => {
            const parts = String(k || '').split('-');
            for (let i = 0; i < parts.length; i++) {
                if (parts[i].length)
                    parts[i] = parts[i].charAt(0).toUpperCase() + parts[i].slice(1);
            }
            return parts.join(' ');
        };
        const findMainHeadingNode = () => {
            const headings = deps.workoutContent ? deps.workoutContent.querySelectorAll('h2, h3, h4') : [];
            for (let i = 0; i < headings.length; i++) {
                const t = (headings[i].textContent || '').toLowerCase();
                if (t.indexOf('main') !== -1 || t.indexOf('conditioning') !== -1)
                    return headings[i];
            }
            return null;
        };
        const mainHead = findMainHeadingNode();
        const docTextForHeuristic = (deps.workoutContent && (deps.workoutContent.textContent || deps.workoutContent.innerText) || '').toLowerCase();
        const isEnduranceDoc = /\b(run|jog|walk|tempo|quality run|easy run|bike|cycle|ride|rower|rowing|erg|swim)\b/.test(docTextForHeuristic);
        if (isJSON) {
        }
        else {
            for (const pKey in prescriptions) {
                if (!prescriptions.hasOwnProperty(pKey))
                    continue;
                if (foundKeys[pKey])
                    continue;
                const presetRows = prescriptions[pKey] || [];
                if (!presetRows || !presetRows.length)
                    continue;
                let skip = true;
                for (let rr = 0; rr < presetRows.length; rr++) {
                    const row = presetRows[rr] || {};
                    const hasDist = (row.distanceMiles != null || row.distanceMeters != null);
                    const hasTime = (row.timeSeconds != null);
                    const hasRpe = (row.rpe != null);
                    const hasWeight = (row.weight != null || row.load != null);
                    const hasReps = (row.reps != null);
                    if (isEnduranceDoc) {
                        if ((hasDist || hasTime || hasRpe) && !(hasWeight || hasReps)) {
                            skip = false;
                            break;
                        }
                    }
                    else {
                        if (hasDist || hasReps || hasWeight) {
                            skip = false;
                            break;
                        }
                        if (hasTime && row.timeSeconds && row.timeSeconds > 90) {
                            skip = false;
                            break;
                        }
                    }
                }
                if (skip)
                    continue;
                const display = titleCaseFromKey(pKey);
                const savedEnt2 = saved.exercises[pKey];
                let savedRows2 = [];
                if (savedEnt2) {
                    if (Object.prototype.toString.call(savedEnt2) === '[object Array]')
                        savedRows2 = savedEnt2;
                    else if (savedEnt2.sets && Object.prototype.toString.call(savedEnt2.sets) === '[object Array]')
                        savedRows2 = savedEnt2.sets;
                }
                const cardX = createExerciseCard(display, presetRows, savedRows2);
                if (mainHead && mainHead.parentNode) {
                    if (mainHead.nextSibling)
                        mainHead.parentNode.insertBefore(cardX, mainHead.nextSibling);
                    else
                        mainHead.parentNode.appendChild(cardX);
                }
                else {
                    deps.workoutContent.appendChild(cardX);
                }
                foundCount++;
                foundKeys[pKey] = true;
            }
        }
        const inferLogTypeFromCard = (card) => {
            try {
                const a = card.querySelector('a[data-exmeta]');
                if (a) {
                    const raw = a.getAttribute('data-exmeta') || '';
                    if (raw) {
                        const m = JSON.parse(raw);
                        if (m && m.logType)
                            return m.logType;
                    }
                }
            }
            catch (e) {
            }
            const hasHold = card.querySelector('input[data-name="holdSeconds"]');
            const hasDistance = card.querySelector('input[data-name="distanceMiles"]');
            const hasTime = card.querySelector('input[data-name="timeSeconds"]');
            const hasReps = card.querySelector('input[data-name="reps"]');
            const hasWeight = card.querySelector('input[data-name="weight"]');
            if (hasHold && !hasReps && !hasWeight)
                return 'mobility';
            if (hasHold)
                return 'stretch';
            if (hasDistance || (hasTime && !hasWeight && !hasReps))
                return 'endurance';
            if (hasTime && hasWeight && !hasReps)
                return 'carry';
            return 'strength';
        };
        const collectData = () => {
            let wf = String(filePath || '');
            wf = wf.replace(/^(?:\.\.\/)+/, '').replace(/^\.\//, '');
            const mWf = wf.match(/workouts\/.*$/);
            if (mWf)
                wf = mWf[0];
            const data = { version: 'perf-1', workoutFile: wf, timestamp: new Date().toISOString(), exercises: {} };
            const scope = deps.workoutContent || document;
            const cards = scope.getElementsByClassName('exercise-card');
            for (let c = 0; c < cards.length; c++) {
                const card = cards[c];
                const exKey = card.getAttribute('data-exkey');
                const exName = card.getAttribute('data-name') || exKey;
                if (!exKey)
                    continue;
                const rows = card.getElementsByClassName('set-row');
                const setsArr = [];
                for (let r = 0; r < rows.length; r++) {
                    const rowEl = rows[r];
                    const inputs = rowEl.getElementsByTagName('input');
                    const obj = { set: (r + 1) };
                    for (let k = 0; k < inputs.length; k++) {
                        const inEl = inputs[k];
                        const name = inEl.getAttribute('data-name');
                        const val = inEl.value;
                        if (val === '' || !name)
                            continue;
                        if (name === 'distanceMeters' || name === 'distanceMiles') {
                            const numDist = Number(val);
                            if (!isNaN(numDist))
                                obj.distanceMiles = numDist;
                            continue;
                        }
                        if (name === 'timeSeconds' || name === 'holdSeconds') {
                            const sec = deps.parseHMSToSeconds(val);
                            if (sec != null)
                                obj[name] = sec;
                            continue;
                        }
                        const num = Number(val);
                        if (!isNaN(num))
                            obj[name] = num;
                    }
                    const hasAny = (obj.weight != null || obj.multiplier != null || obj.reps != null || obj.rpe != null || obj.timeSeconds != null || obj.holdSeconds != null || obj.distanceMiles != null);
                    if (!hasAny) {
                        continue;
                    }
                    setsArr.push(obj);
                }
                if (setsArr.length) {
                    data.exercises[exKey] = { name: exName, logType: inferLogTypeFromCard(card), sets: setsArr };
                }
            }
            return data;
        };
        const validatePerformance = (data) => {
            const errors = [];
            const isNum = (v) => typeof v === 'number' && !isNaN(v);
            if (!data || typeof data !== 'object') {
                errors.push('root: not object');
                return errors;
            }
            if (data.version !== 'perf-1')
                errors.push('version must be perf-1');
            if (!data.workoutFile || typeof data.workoutFile !== 'string')
                errors.push('workoutFile missing');
            if (!data.timestamp || typeof data.timestamp !== 'string')
                errors.push('timestamp missing');
            if (!data.exercises || typeof data.exercises !== 'object')
                errors.push('exercises missing');
            else {
                for (const k in data.exercises)
                    if (data.exercises.hasOwnProperty(k)) {
                        const ex = data.exercises[k];
                        if (!ex || typeof ex !== 'object') {
                            errors.push('exercise ' + k + ' not object');
                            continue;
                        }
                        if (!ex.name)
                            errors.push(k + ': name missing');
                        if (!ex.logType || ['strength', 'endurance', 'carry', 'mobility', 'stretch'].indexOf(ex.logType) === -1)
                            errors.push(k + ': invalid logType');
                        if (!ex.sets || Object.prototype.toString.call(ex.sets) !== '[object Array]' || !ex.sets.length)
                            errors.push(k + ': sets missing');
                        else {
                            for (let i = 0; i < ex.sets.length; i++) {
                                const s = ex.sets[i];
                                if (typeof s !== 'object') {
                                    errors.push(k + ' set ' + (i + 1) + ': not object');
                                    continue;
                                }
                                if (!isNum(s.set) || s.set < 1)
                                    errors.push(k + ' set ' + (i + 1) + ': invalid set index');
                                ['weight', 'multiplier', 'reps', 'rpe', 'timeSeconds', 'holdSeconds', 'distanceMiles'].forEach((f) => {
                                    if (s[f] != null && !isNum(s[f]))
                                        errors.push(k + ' set ' + (i + 1) + ': ' + f + ' not number');
                                });
                                if (s.rpe != null && (s.rpe < 0 || s.rpe > 10))
                                    errors.push(k + ' set ' + (i + 1) + ': rpe out of range');
                            }
                        }
                    }
            }
            return errors;
        };
        const exerciseKeyFromName = (name) => {
            return deps.slugify(name);
        };
        const getNumSetsForExercise = (exKey) => {
            const scope = deps.workoutContent || document;
            const card = scope.querySelector(`[data-exkey="${exKey}"]`);
            if (!card)
                return 0;
            const rows = card.getElementsByClassName('set-row');
            return rows.length;
        };
        const getSetDataForExercise = (exKey, setNumber) => {
            const scope = deps.workoutContent || document;
            const card = scope.querySelector(`[data-exkey="${exKey}"]`);
            if (!card)
                return null;
            const rows = card.getElementsByClassName('set-row');
            if (setNumber < 1 || setNumber > rows.length)
                return null;
            const rowEl = rows[setNumber - 1];
            const inputs = rowEl.getElementsByTagName('input');
            const obj = {};
            for (let k = 0; k < inputs.length; k++) {
                const inEl = inputs[k];
                const name = inEl.getAttribute('data-name');
                const val = inEl.value;
                if (val === '' || !name)
                    continue;
                if (name === 'distanceMeters' || name === 'distanceMiles') {
                    const numDist = Number(val);
                    if (!isNaN(numDist))
                        obj.distanceMiles = numDist;
                    continue;
                }
                if (name === 'timeSeconds' || name === 'holdSeconds') {
                    const sec = deps.parseHMSToSeconds(val);
                    if (sec != null)
                        obj[name] = sec;
                    continue;
                }
                const num = Number(val);
                if (!isNaN(num))
                    obj[name] = num;
            }
            const hasAny = (obj.weight != null || obj.multiplier != null || obj.reps != null ||
                obj.rpe != null || obj.timeSeconds != null || obj.holdSeconds != null ||
                obj.distanceMiles != null);
            if (!hasAny)
                return null;
            return obj;
        };
        const collectSetsForExercise = (exKey) => {
            const scope = deps.workoutContent || document;
            const card = scope.querySelector(`[data-exkey="${exKey}"]`);
            if (!card)
                return [];
            const rows = card.getElementsByClassName('set-row');
            const setsArr = [];
            for (let r = 0; r < rows.length; r++) {
                const rowEl = rows[r];
                const inputs = rowEl.getElementsByTagName('input');
                const obj = { set: (r + 1) };
                for (let k = 0; k < inputs.length; k++) {
                    const inEl = inputs[k];
                    const name = inEl.getAttribute('data-name');
                    const val = inEl.value;
                    if (val === '' || !name)
                        continue;
                    if (name === 'distanceMeters' || name === 'distanceMiles') {
                        const numDist = Number(val);
                        if (!isNaN(numDist))
                            obj.distanceMiles = numDist;
                        continue;
                    }
                    if (name === 'timeSeconds' || name === 'holdSeconds') {
                        const sec = deps.parseHMSToSeconds(val);
                        if (sec != null)
                            obj[name] = sec;
                        continue;
                    }
                    const num = Number(val);
                    if (!isNaN(num))
                        obj[name] = num;
                }
                const hasAny = (obj.weight != null || obj.multiplier != null || obj.reps != null ||
                    obj.rpe != null || obj.timeSeconds != null || obj.holdSeconds != null ||
                    obj.distanceMiles != null);
                if (hasAny) {
                    setsArr.push(obj);
                }
            }
            return setsArr;
        };
        const collectRoundsForSuperset = (children, prescribedRest) => {
            const exerciseKeys = children.map((child) => exerciseKeyFromName(child.name));
            const numSets = Math.max(...exerciseKeys.map(key => getNumSetsForExercise(key)), 0);
            const rounds = [];
            for (let r = 1; r <= numSets; r++) {
                const exercises = [];
                for (const child of children) {
                    const key = exerciseKeyFromName(child.name);
                    const setData = getSetDataForExercise(key, r);
                    if (setData) {
                        exercises.push({
                            key: key,
                            name: child.name,
                            ...setData
                        });
                    }
                }
                if (exercises.length > 0) {
                    const round = {
                        round: r,
                        exercises: exercises
                    };
                    if (prescribedRest != null) {
                        round.prescribedRestSeconds = prescribedRest;
                    }
                    rounds.push(round);
                }
            }
            return rounds;
        };
        const buildExerciseIndex = (sections) => {
            const index = {};
            sections.forEach((section, sIdx) => {
                section.items.forEach((item, iIdx) => {
                    if (item.kind === 'exercise' && item.sets && item.sets.length > 0) {
                        const key = exerciseKeyFromName(item.name);
                        const totalVolume = item.sets.reduce((sum, set) => {
                            const weight = (set.weight || 0) * (set.multiplier || 1);
                            return sum + (weight * (set.reps || 0));
                        }, 0);
                        const avgRPE = item.sets.reduce((sum, set) => sum + (set.rpe || 0), 0) / item.sets.length;
                        index[key] = {
                            name: item.name,
                            sectionPath: `sections[${sIdx}].items[${iIdx}].sets[*]`,
                            totalSets: item.sets.length,
                            totalRounds: 0,
                            avgRPE: avgRPE,
                            totalVolume: totalVolume
                        };
                    }
                    else if ((item.kind === 'superset' || item.kind === 'circuit') && item.rounds && item.rounds.length > 0) {
                        item.rounds[0]?.exercises.forEach((ex, exIdx) => {
                            const totalVolume = item.rounds.reduce((sum, round) => {
                                const exercise = round.exercises[exIdx];
                                if (!exercise)
                                    return sum;
                                const weight = (exercise.weight || 0) * (exercise.multiplier || 1);
                                return sum + (weight * (exercise.reps || 0));
                            }, 0);
                            const avgRPE = item.rounds.reduce((sum, round) => {
                                return sum + (round.exercises[exIdx]?.rpe || 0);
                            }, 0) / item.rounds.length;
                            index[ex.key] = {
                                name: ex.name,
                                sectionPath: `sections[${sIdx}].items[${iIdx}].rounds[*].exercises[${exIdx}]`,
                                totalSets: item.rounds.length,
                                totalRounds: item.rounds.length,
                                avgRPE: avgRPE,
                                totalVolume: totalVolume
                            };
                        });
                    }
                });
            });
            return index;
        };
        const collectNestedData = (sessionJSON) => {
            let sessionData = null;
            try {
                sessionData = JSON.parse(sessionJSON);
            }
            catch (e) {
                console.error('Failed to parse session JSON:', e);
                return null;
            }
            let wf = String(filePath || '');
            wf = wf.replace(/^(?:\.\.\/)+/, '').replace(/^\.\//, '');
            const mWf = wf.match(/workouts\/.*$/);
            if (mWf)
                wf = mWf[0];
            const log = {
                version: 'perf-2',
                workoutFile: wf,
                timestamp: new Date().toISOString(),
                sections: []
            };
            if (sessionData.date)
                log.date = sessionData.date;
            if (sessionData.block != null)
                log.block = sessionData.block;
            if (sessionData.week != null)
                log.week = sessionData.week;
            if (sessionData.title)
                log.title = sessionData.title;
            if (sessionData.sections && Array.isArray(sessionData.sections)) {
                for (const sessionSection of sessionData.sections) {
                    const section = {
                        type: sessionSection.type,
                        title: sessionSection.title,
                        items: []
                    };
                    if (sessionSection.notes)
                        section.notes = sessionSection.notes;
                    if (sessionSection.items && Array.isArray(sessionSection.items)) {
                        for (const sessionItem of sessionSection.items) {
                            if (sessionItem.kind === 'exercise') {
                                const exKey = exerciseKeyFromName(sessionItem.name);
                                const sets = collectSetsForExercise(exKey);
                                if (sets.length > 0) {
                                    const item = {
                                        kind: 'exercise',
                                        name: sessionItem.name,
                                        sets: sets
                                    };
                                    if (sessionItem.notes)
                                        item.notes = sessionItem.notes;
                                    section.items.push(item);
                                }
                            }
                            else if (sessionItem.kind === 'superset' || sessionItem.kind === 'circuit') {
                                const prescribedRest = sessionItem.children?.[sessionItem.children.length - 1]?.prescription?.restSeconds;
                                const rounds = collectRoundsForSuperset(sessionItem.children || [], prescribedRest);
                                if (rounds.length > 0) {
                                    const item = {
                                        kind: sessionItem.kind,
                                        name: sessionItem.name,
                                        rounds: rounds
                                    };
                                    if (sessionItem.notes)
                                        item.notes = sessionItem.notes;
                                    section.items.push(item);
                                }
                            }
                        }
                    }
                    if (section.items.length > 0) {
                        log.sections.push(section);
                    }
                }
            }
            if (log.sections.length > 0) {
                log.exerciseIndex = buildExerciseIndex(log.sections);
            }
            return log;
        };
        const validatePerformanceV2 = (data) => {
            const errors = [];
            const isNum = (v) => typeof v === 'number' && !isNaN(v);
            if (!data || typeof data !== 'object') {
                errors.push('root: not object');
                return errors;
            }
            if (data.version !== 'perf-2')
                errors.push('version must be perf-2');
            if (!data.workoutFile || typeof data.workoutFile !== 'string')
                errors.push('workoutFile missing');
            if (!data.timestamp || typeof data.timestamp !== 'string')
                errors.push('timestamp missing');
            if (!data.sections || !Array.isArray(data.sections))
                errors.push('sections missing or not array');
            else {
                data.sections.forEach((section, sIdx) => {
                    if (!section.type)
                        errors.push(`section ${sIdx}: type missing`);
                    if (!section.title)
                        errors.push(`section ${sIdx}: title missing`);
                    if (!section.items || !Array.isArray(section.items))
                        errors.push(`section ${sIdx}: items missing or not array`);
                    else {
                        section.items.forEach((item, iIdx) => {
                            const itemPath = `section ${sIdx} item ${iIdx}`;
                            if (!item.kind || !['exercise', 'superset', 'circuit'].includes(item.kind)) {
                                errors.push(`${itemPath}: invalid kind`);
                            }
                            if (!item.name)
                                errors.push(`${itemPath}: name missing`);
                            if (item.kind === 'exercise') {
                                if (!item.sets || !Array.isArray(item.sets))
                                    errors.push(`${itemPath}: sets missing or not array`);
                                else {
                                    item.sets.forEach((set, setIdx) => {
                                        if (!isNum(set.set) || set.set < 1)
                                            errors.push(`${itemPath} set ${setIdx}: invalid set number`);
                                    });
                                }
                            }
                            else if (item.kind === 'superset' || item.kind === 'circuit') {
                                if (!item.rounds || !Array.isArray(item.rounds))
                                    errors.push(`${itemPath}: rounds missing or not array`);
                                else {
                                    item.rounds.forEach((round, rIdx) => {
                                        if (!isNum(round.round) || round.round < 1)
                                            errors.push(`${itemPath} round ${rIdx}: invalid round number`);
                                        if (!round.exercises || !Array.isArray(round.exercises) || round.exercises.length === 0) {
                                            errors.push(`${itemPath} round ${rIdx}: exercises missing or empty`);
                                        }
                                    });
                                }
                            }
                        });
                    }
                });
            }
            return errors;
        };
        deps.saveBtn.onclick = () => {
            const sessionJSON = deps.getCurrentSessionJSON ? deps.getCurrentSessionJSON() : null;
            let data;
            let format = 'perf-1';
            if (sessionJSON) {
                try {
                    data = collectNestedData(sessionJSON);
                    if (data) {
                        format = 'perf-2';
                        console.log('✅ Using perf-2 nested structure format for local save');
                    }
                    else {
                        console.warn('⚠️ perf-2 collection returned null, falling back to perf-1');
                        data = collectData();
                    }
                }
                catch (e) {
                    console.error('❌ Error collecting perf-2 data, falling back to perf-1:', e);
                    data = collectData();
                }
            }
            else {
                data = collectData();
            }
            deps.saveLocal(filePath, data);
            deps.status(`Saved locally (${format}) at ` + new Date().toLocaleTimeString(), { important: true });
        };
        deps.copyBtn.onclick = () => {
            const sessionJSON = deps.getCurrentSessionJSON ? deps.getCurrentSessionJSON() : null;
            let data;
            let errs = [];
            let format = 'perf-1';
            if (sessionJSON) {
                try {
                    data = collectNestedData(sessionJSON);
                    if (data) {
                        errs = validatePerformanceV2(data);
                        format = 'perf-2';
                        console.log('✅ Using perf-2 nested structure format');
                    }
                    else {
                        console.warn('⚠️ perf-2 collection returned null, falling back to perf-1');
                        data = collectData();
                        errs = validatePerformance(data);
                    }
                }
                catch (e) {
                    console.error('❌ Error collecting perf-2 data, falling back to perf-1:', e);
                    data = collectData();
                    errs = validatePerformance(data);
                }
            }
            else {
                data = collectData();
                errs = validatePerformance(data);
            }
            if (errs.length) {
                data.validationErrors = errs.slice(0);
                console.warn(`Performance validation errors (${format}):`, errs);
            }
            const json = JSON.stringify(data, null, 2);
            let didCopy = false;
            if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(json).then(() => {
                    didCopy = true;
                    deps.status(`Copied ${format} JSON` + (errs.length ? ' (WITH WARNINGS)' : '') + '.', { important: true });
                }).catch(() => {
                });
            }
            if (!didCopy) {
                deps.copyWrapper.style.display = 'block';
                deps.copyTarget.value = json;
                deps.copyTarget.focus();
                deps.copyTarget.select();
                deps.status(`Copy ${format} JSON shown below; select-all and copy manually.` + (errs.length ? ' (Validation warnings in console)' : ''));
            }
        };
        if (deps.downloadBtn)
            deps.downloadBtn.onclick = () => {
                const sessionJSON = deps.getCurrentSessionJSON ? deps.getCurrentSessionJSON() : null;
                let data;
                let errs = [];
                let format = 'perf-1';
                if (sessionJSON) {
                    try {
                        data = collectNestedData(sessionJSON);
                        if (data) {
                            errs = validatePerformanceV2(data);
                            format = 'perf-2';
                            console.log('✅ Using perf-2 nested structure format');
                        }
                        else {
                            console.warn('⚠️ perf-2 collection returned null, falling back to perf-1');
                            data = collectData();
                            errs = validatePerformance(data);
                        }
                    }
                    catch (e) {
                        console.error('❌ Error collecting perf-2 data, falling back to perf-1:', e);
                        data = collectData();
                        errs = validatePerformance(data);
                    }
                }
                else {
                    data = collectData();
                    errs = validatePerformance(data);
                }
                if (errs.length) {
                    data.validationErrors = errs.slice(0);
                    console.warn(`Performance validation errors (${format}):`, errs);
                }
                const json = JSON.stringify(data, null, 2);
                const wf = data.workoutFile || 'session';
                const base = wf.split('/').pop().replace(/\.[^.]+$/, '') || 'session';
                const ts = (new Date().toISOString().replace(/[:]/g, '').replace(/\..+/, ''));
                const fileName = base + '_' + ts + `_${format}.json`;
                try {
                    const blob = new Blob([json], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = fileName;
                    document.body.appendChild(a);
                    a.click();
                    setTimeout(() => {
                        try {
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                        }
                        catch (e) {
                        }
                    }, 250);
                    deps.status(`Downloaded ${fileName}` + (errs.length ? ' (WITH WARNINGS)' : ''), { important: true });
                }
                catch (e) {
                    deps.copyWrapper.style.display = 'block';
                    deps.copyTarget.value = json;
                    deps.status('Download unsupported; JSON shown for manual copy.' + (errs.length ? ' (Warnings in console)' : ''), { important: true });
                }
            };
        deps.issueBtn.onclick = () => {
            const sessionJSON = deps.getCurrentSessionJSON ? deps.getCurrentSessionJSON() : null;
            let data;
            let errs = [];
            let format = 'perf-1';
            if (sessionJSON) {
                try {
                    data = collectNestedData(sessionJSON);
                    if (data) {
                        errs = validatePerformanceV2(data);
                        format = 'perf-2';
                        console.log('✅ Using perf-2 nested structure format for GitHub issue');
                    }
                    else {
                        console.warn('⚠️ perf-2 collection returned null, falling back to perf-1');
                        data = collectData();
                        errs = validatePerformance(data);
                    }
                }
                catch (e) {
                    console.error('❌ Error collecting perf-2 data, falling back to perf-1:', e);
                    data = collectData();
                    errs = validatePerformance(data);
                }
            }
            else {
                data = collectData();
                errs = validatePerformance(data);
            }
            if (errs.length) {
                data.validationErrors = errs.slice(0);
                console.warn(`Performance validation errors (${format}):`, errs);
            }
            const json = JSON.stringify(data, null, 2);
            const owner = 'jrodhead';
            const repo = 'exercAIse';
            const title = 'Workout log ' + (data.workoutFile || data.file || '') + ' @ ' + new Date().toISOString();
            const header = 'Paste will be committed by Actions.\n\n';
            const issueBodyTemplate = header + '```json\n' + json + '\n```\n';
            const showTextarea = () => {
                deps.copyWrapper.style.display = 'block';
                deps.copyTarget.value = issueBodyTemplate;
                try {
                    deps.copyTarget.focus();
                    deps.copyTarget.select();
                }
                catch (e) {
                }
                deps.status('Template shown below — paste into the Issue body.');
            };
            const openIssue = () => {
                if (deps.openIssueLink)
                    deps.openIssueLink.style.display = 'none';
                const url = 'https://github.com/' + owner + '/' + repo + '/issues/new?title=' + encodeURIComponent(title);
                try {
                    window.open(url, '_blank');
                }
                catch (e) {
                    window.location.href = url;
                }
            };
            if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(issueBodyTemplate)
                    .then(() => {
                    deps.status('Copied template to clipboard. Opening Issue page…', { important: true });
                    openIssue();
                })
                    .catch(() => {
                    showTextarea();
                    openIssue();
                });
            }
            else {
                showTextarea();
                openIssue();
            }
        };
        deps.clearBtn.onclick = () => {
            if (!confirm('Clear all entries for this workout?'))
                return;
            if (isJSON) {
                let pretty = '';
                try {
                    pretty = JSON.stringify(JSON.parse(raw || '{}'), null, 2);
                }
                catch (e) {
                    pretty = raw || '';
                }
                deps.workoutContent.innerHTML = '<pre>' + (pretty || '') + '</pre>';
            }
            else {
                deps.workoutContent.innerHTML = deps.renderMarkdownBasic(raw || '');
                deps.fixExerciseAnchors(deps.workoutContent);
            }
            buildForm(filePath, raw, isJSON);
            deps.status('Cleared form.', { important: true });
        };
    };
    return {
        init,
        buildForm
    };
})();
//# sourceMappingURL=form-builder.js.map