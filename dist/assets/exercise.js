function findExerciseInPerf2(log, exerciseKey) {
    const sets = [];
    for (const section of log.sections) {
        for (const item of section.items) {
            if (item.kind === 'exercise' && item.sets) {
                if (log.exerciseIndex?.[exerciseKey]) {
                    return item.sets;
                }
                const itemKey = item.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
                if (itemKey === exerciseKey) {
                    return item.sets;
                }
            }
            if ((item.kind === 'superset' || item.kind === 'circuit') && item.rounds) {
                for (const round of item.rounds) {
                    for (const exercise of round.exercises) {
                        if (exercise.key === exerciseKey) {
                            sets.push({
                                set: round.round,
                                weight: exercise.weight,
                                multiplier: exercise.multiplier,
                                reps: exercise.reps,
                                rpe: exercise.rpe,
                                timeSeconds: exercise.timeSeconds,
                                holdSeconds: exercise.holdSeconds,
                                distanceMeters: exercise.distanceMeters,
                                distanceMiles: exercise.distanceMiles,
                                side: exercise.side,
                                tempo: exercise.tempo,
                                completed: exercise.completed,
                                notes: exercise.notes
                            });
                        }
                    }
                }
            }
        }
    }
    return sets;
}
(() => {
    const statusEl = document.getElementById('status');
    const status = (msg) => {
        if (!statusEl)
            return;
        statusEl.textContent = msg || '';
    };
    const qs = () => {
        const q = {};
        const s = String(window.location.search || '').replace(/^\?/, '').split('&');
        for (let i = 0; i < s.length; i++) {
            const kv = s[i].split('=');
            if (kv[0])
                q[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
        }
        return q;
    };
    const xhrGet = async (path, cb) => {
        try {
            const response = await fetch(path);
            if (!response.ok) {
                const error = new Error(`HTTP ${response.status} for ${path}`);
                return cb(error);
            }
            const text = await response.text();
            return cb(null, text);
        }
        catch (e) {
            return cb(e);
        }
    };
    const parseMarkdownLink = (text) => {
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        return text.replace(linkRegex, (_match, linkText, url) => {
            const cleanUrl = url.replace(/\.\.\//g, '');
            const fullUrl = cleanUrl.indexOf('exercises/') === 0 ? cleanUrl : `exercises/${cleanUrl}`;
            return `<a href="exercise.html?file=${fullUrl}">${linkText}</a>`;
        });
    };
    const renderExercise = (data) => {
        const nameEl = document.getElementById('ex-name');
        const metaEl = document.getElementById('meta');
        const cuesEl = document.getElementById('cues');
        const safetyEl = document.getElementById('safety');
        const varsEl = document.getElementById('variations');
        const setupEl = document.getElementById('setup');
        const stepsEl = document.getElementById('steps');
        const mistakesEl = document.getElementById('mistakes');
        const regEl = document.getElementById('regressions');
        const progEl = document.getElementById('progressions');
        const phEl = document.getElementById('phints');
        const jointsEl = document.getElementById('joints');
        const mediaEl = document.getElementById('media');
        if (nameEl)
            nameEl.textContent = data.name || 'Exercise';
        let html = '';
        if (data.equipment?.length) {
            html += `<div><span class="muted">Equipment:</span> ${data.equipment.map(e => `<span class="pill">${e}</span>`).join(' ')}</div>`;
        }
        if (data.tags?.length) {
            html += `<div><span class="muted">Tags:</span> ${data.tags.map(e => `<span class="badge">${e}</span>`).join(' ')}</div>`;
        }
        if (metaEl)
            metaEl.innerHTML = html;
        if (setupEl) {
            setupEl.innerHTML = '';
            if (data.setup?.length) {
                for (let i = 0; i < data.setup.length; i++) {
                    const li = document.createElement('li');
                    li.textContent = data.setup[i];
                    setupEl.appendChild(li);
                }
            }
            else {
                setupEl.innerHTML = '<li class="muted">—</li>';
            }
        }
        if (stepsEl) {
            stepsEl.innerHTML = '';
            if (data.steps?.length) {
                for (let i2 = 0; i2 < data.steps.length; i2++) {
                    const oli = document.createElement('li');
                    oli.textContent = data.steps[i2];
                    stepsEl.appendChild(oli);
                }
            }
            else {
                stepsEl.innerHTML = '<li class="muted">—</li>';
            }
        }
        if (cuesEl) {
            cuesEl.innerHTML = '';
            if (data.cues?.length) {
                for (let i = 0; i < data.cues.length; i++) {
                    const li = document.createElement('li');
                    li.textContent = data.cues[i];
                    cuesEl.appendChild(li);
                }
            }
            else {
                cuesEl.innerHTML = '<li class="muted">No cues provided.</li>';
            }
        }
        if (safetyEl)
            safetyEl.textContent = data.safety || '—';
        if (mistakesEl) {
            mistakesEl.innerHTML = '';
            if (data.mistakes?.length) {
                for (let mi = 0; mi < data.mistakes.length; mi++) {
                    const mli = document.createElement('li');
                    mli.textContent = data.mistakes[mi];
                    mistakesEl.appendChild(mli);
                }
            }
            else {
                mistakesEl.innerHTML = '<li class="muted">—</li>';
            }
        }
        if (varsEl) {
            varsEl.innerHTML = '';
            if (data.variations?.length) {
                for (let j = 0; j < data.variations.length; j++) {
                    const vli = document.createElement('li');
                    vli.innerHTML = parseMarkdownLink(data.variations[j]);
                    varsEl.appendChild(vli);
                }
            }
            else {
                varsEl.innerHTML = '<li class="muted">—</li>';
            }
        }
        if (regEl || progEl) {
            if (regEl) {
                regEl.innerHTML = '';
                const regs = (data.scaling?.regressions) || [];
                if (regs.length) {
                    for (let r = 0; r < regs.length; r++) {
                        const rli = document.createElement('li');
                        rli.textContent = regs[r];
                        regEl.appendChild(rli);
                    }
                }
                else {
                    regEl.innerHTML = '<li class="muted">—</li>';
                }
            }
            if (progEl) {
                progEl.innerHTML = '';
                const progs = (data.scaling?.progressions) || [];
                if (progs.length) {
                    for (let p = 0; p < progs.length; p++) {
                        const pli = document.createElement('li');
                        pli.textContent = progs[p];
                        progEl.appendChild(pli);
                    }
                }
                else {
                    progEl.innerHTML = '<li class="muted">—</li>';
                }
            }
        }
        if (phEl) {
            phEl.innerHTML = '';
            const ph = data.prescriptionHints || {};
            const pairs = [];
            const addHint = (k, label) => {
                if (ph?.[k])
                    pairs.push(`<li><span class="muted">${label}:</span> ${ph[k]}</li>`);
            };
            addHint('load', 'Load');
            addHint('reps', 'Reps');
            addHint('time', 'Time');
            addHint('distance', 'Distance');
            addHint('rpe', 'RPE');
            addHint('notes', 'Notes');
            phEl.innerHTML = pairs.length ? pairs.join('') : '<li class="muted">—</li>';
        }
        if (jointsEl) {
            let jhtml = '';
            if (data.joints) {
                if (data.joints.sensitiveJoints?.length) {
                    jhtml += `<div><span class="muted">Sensitive:</span> ${data.joints.sensitiveJoints.join(', ')}</div>`;
                }
                if (data.joints.notes) {
                    jhtml += `<div>${data.joints.notes}</div>`;
                }
            }
            jointsEl.innerHTML = jhtml || '<div class="muted">—</div>';
        }
        if (mediaEl) {
            let mhtml = '';
            if (data.media) {
                if (data.media.video) {
                    mhtml += `<div><a href="${data.media.video}" target="_blank">Video</a></div>`;
                }
                if (data.media.images?.length) {
                    for (let im = 0; im < data.media.images.length; im++) {
                        const src = data.media.images[im];
                        mhtml += `<img alt="exercise image" style="max-width:100%;height:auto;margin:4px 0;" src="${src}" />`;
                    }
                }
            }
            mediaEl.innerHTML = mhtml || '<div class="muted">—</div>';
        }
    };
    const getRepoApiBase = () => 'https://api.github.com/repos/jrodhead/exercAIse/contents/';
    const loadHistory = (exKey) => {
        const keyVariants = (k) => {
            const a = [];
            const k1 = String(k || '');
            const k2 = k1.replace(/_/g, '-');
            const k3 = k1.replace(/-/g, '_');
            a.push(k1);
            if (a.indexOf(k2) === -1)
                a.push(k2);
            if (a.indexOf(k3) === -1)
                a.push(k3);
            return a;
        };
        const variants = keyVariants(exKey);
        const target = document.getElementById('history');
        if (!target)
            return;
        target.textContent = 'Loading history…';
        const url = `${getRepoApiBase()}performed?ref=main`;
        xhrGet(url, (err, text) => {
            if (err) {
                target.textContent = 'Unable to load history.';
                return;
            }
            let items = [];
            try {
                items = JSON.parse(text || '[]');
            }
            catch (e) {
                items = [];
            }
            if (!items || Object.prototype.toString.call(items) !== '[object Array]') {
                target.textContent = 'No history.';
                return;
            }
            const logs = [];
            let remaining = 0;
            const done = () => {
                let html = '';
                logs.sort((a, b) => a.name < b.name ? 1 : -1);
                for (let i = 0; i < logs.length; i++) {
                    const data = logs[i].data;
                    if (!data)
                        continue;
                    let exerciseSets = [];
                    for (let v = 0; v < variants.length; v++) {
                        exerciseSets = findExerciseInPerf2(data, variants[v]);
                        if (exerciseSets.length > 0)
                            break;
                    }
                    if (exerciseSets.length === 0)
                        continue;
                    const when = data.timestamp || logs[i].name.slice(0, 24);
                    html += `<div class="history-item">` +
                        `<div class="muted mono">${when}</div>` +
                        `<div>${exerciseSets.map((s) => {
                            const parts = [];
                            if (s.weight != null) {
                                parts.push(`${s.weight}${s.multiplier != null ? (' ×' + s.multiplier) : ''}`);
                            }
                            if (s.reps != null) {
                                parts.push(`${s.reps} reps`);
                            }
                            if (s.timeSeconds != null) {
                                parts.push(`${s.timeSeconds}s`);
                            }
                            if (s.distanceMiles != null) {
                                parts.push(`${s.distanceMiles} mi`);
                            }
                            if (s.rpe != null) {
                                parts.push(`RPE ${s.rpe}`);
                            }
                            return parts.join(', ');
                        }).join(' | ')}</div>` +
                        `</div>`;
                }
                target.innerHTML = html || '<div class="muted">No history for this exercise yet.</div>';
            };
            for (let k = 0; k < items.length; k++) {
                const it = items[k];
                if (!it || it.type !== 'file' || !/\.json$/i.test(it.name))
                    continue;
                remaining++;
                ((it) => {
                    xhrGet(it.download_url, (err2, txt) => {
                        try {
                            const data = err2 ? null : JSON.parse(txt || '{}');
                            logs.push({ name: it.name, data: data });
                        }
                        catch (e) {
                        }
                        remaining--;
                        if (remaining === 0)
                            done();
                    });
                })(it);
            }
            if (remaining === 0)
                done();
        });
    };
    const showNotFound = (path) => {
        try {
            const main = document.getElementById('main');
            const nf = document.getElementById('not-found');
            const nfPath = document.getElementById('nf-path');
            if (nfPath)
                nfPath.textContent = path || '';
            if (main)
                main.style.display = 'none';
            if (nf)
                nf.style.display = 'block';
            status('');
        }
        catch (e) {
        }
    };
    const isInternalExercisePath = (p) => {
        if (!p)
            return false;
        if (/^https?:/i.test(p))
            return false;
        return /^(?:\.?\.?\/)?exercises\/[\w\-]+\.(?:json|md)$/i.test(p);
    };
    const start = () => {
        const params = qs();
        const path = params['file'] || '';
        if (!path) {
            status('Missing ?file=exercises/<name>.json');
            return;
        }
        if (!isInternalExercisePath(path)) {
            showNotFound(path);
            return;
        }
        const base = path.split('/').pop();
        let key = base.replace(/\.json$/i, '');
        key = key.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
        xhrGet(path, (err, text) => {
            if (!err) {
                try {
                    const data = JSON.parse(text || '{}');
                    renderExercise(data);
                    loadHistory(key);
                    return;
                }
                catch (e) {
                }
            }
            const mdPath = path.replace(/\.json$/i, '.md');
            xhrGet(mdPath, (err2, md) => {
                if (err2) {
                    showNotFound(path);
                    return;
                }
                const name = (md.match(/^#\s+(.+)$/m) || [])[1] || key.replace(/-/g, ' ');
                const cues = [];
                let li;
                const re = /^-\s+(.*)$/gm;
                while ((li = re.exec(md))) {
                    cues.push(li[1]);
                }
                const data = {
                    name: name,
                    equipment: [],
                    tags: [],
                    cues: cues.slice(0, 8),
                    safety: '',
                    variations: []
                };
                renderExercise(data);
                loadHistory(key);
            });
        });
    };
    start();
})();
//# sourceMappingURL=exercise.js.map