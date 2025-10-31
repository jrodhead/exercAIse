/*
  History page for exercAIse
*/

(() => {
  const statusEl = document.getElementById('status')!;
  const historyContent = document.getElementById('history-content')!;

  const status = (msg: string, opts: { important?: boolean } = {}): void => {
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

  const fetchText = async (path: string): Promise<string> => {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${path}`);
    }
    return response.text();
  };

  const loadHistory = async (): Promise<void> => {
    try {
      status('Loading history...');
      
      const text = await fetchText('performed/index.json');
      let data: any = null;
      try { data = JSON.parse(text || '{}'); } catch (e) { data = null; }
      
      let list: any[] = [];
      if (!data) {
        historyContent.innerHTML = '<p class="form__hint">History unavailable (invalid manifest).</p>';
        return;
      }
      
      // Accept either { files: [...] } or a bare array
      if (Object.prototype.toString.call(data) === '[object Array]') {
        list = data;
      } else if (data.files && Object.prototype.toString.call(data.files) === '[object Array]') {
        list = data.files;
      }
      
      if (!list.length) {
        historyContent.innerHTML = '<p class="form__hint">No logs yet.</p>';
        return;
      }
      
      // Normalize to objects with { name, path }
      const rows: any[] = [];
      for (let i = 0; i < list.length; i++) {
        const it = list[i]!;
        if (typeof it === 'string') {
          rows.push({ name: it, path: `performed/${it}` });
        } else if (it && typeof it === 'object') {
          rows.push({ 
            name: it.name || it.path || `file-${i}`, 
            path: it.path || `performed/${it.name || ''}` 
          });
        }
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
        const href = r.path || `performed/${r.name}`;
        html += `<li class="history-list__item"><a class="history-list__link" target="_blank" rel="noopener" href="${href}">${r.name}</a></li>`;
      }
      html += '</ul>';
      
      historyContent.innerHTML = html;
      status('');
    } catch (err) {
      historyContent.innerHTML = '<p class="form__hint">History unavailable (no local manifest). Run scripts/build_performed_index.js to generate, or add logs.</p>';
      status('');
    }
  };

  // Load when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadHistory);
  } else {
    loadHistory();
  }
})();
