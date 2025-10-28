"use strict";
(() => {
    const statusEl = document.getElementById('status');
    const historyContent = document.getElementById('history-content');
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
    const fetchText = async (path) => {
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} for ${path}`);
        }
        return response.text();
    };
    const loadHistory = async () => {
        try {
            status('Loading history...');
            const text = await fetchText('performed/index.json');
            let data = null;
            try {
                data = JSON.parse(text || '{}');
            }
            catch (e) {
                data = null;
            }
            let list = [];
            if (!data) {
                historyContent.innerHTML = '<p class="form-hint">History unavailable (invalid manifest).</p>';
                return;
            }
            if (Object.prototype.toString.call(data) === '[object Array]') {
                list = data;
            }
            else if (data.files && Object.prototype.toString.call(data.files) === '[object Array]') {
                list = data.files;
            }
            if (!list.length) {
                historyContent.innerHTML = '<p class="form-hint">No logs yet.</p>';
                return;
            }
            const rows = [];
            for (let i = 0; i < list.length; i++) {
                const it = list[i];
                if (typeof it === 'string') {
                    rows.push({ name: it, path: `performed/${it}` });
                }
                else if (it && typeof it === 'object') {
                    rows.push({
                        name: it.name || it.path || `file-${i}`,
                        path: it.path || `performed/${it.name || ''}`
                    });
                }
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
            historyContent.innerHTML = html;
            status('');
        }
        catch (err) {
            historyContent.innerHTML = '<p class="form-hint">History unavailable (no local manifest). Run scripts/build_performed_index.js to generate, or add logs.</p>';
            status('');
        }
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadHistory);
    }
    else {
        loadHistory();
    }
})();
//# sourceMappingURL=history.js.map