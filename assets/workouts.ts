/*
  Workouts list page for exercAIse
*/

(() => {
  const statusEl = document.getElementById('status')!;
  const workoutsContent = document.getElementById('workouts-content')!;

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

  const buildWorkoutListHTML = (workouts: { filename: string; title: string; block: number | null; week: number | null }[]): string => {
    let html = '<ul class="workout-list">';
    
    for (let i = 0; i < workouts.length; i++) {
      const w = workouts[i]!;
      const displayTitle = w.title || w.filename.replace(/\.json$/, '').replace(/_/g, ' ');
      let meta = '';
      if (w.block && w.week) {
        meta = ` <span class="muted">– Block ${w.block}, Week ${w.week}</span>`;
      }
      html += `<li><a href="index.html?file=workouts/${encodeURIComponent(w.filename)}">${displayTitle}${meta}</a></li>`;
    }
    
    html += '</ul>';
    return html;
  };

  const loadWorkouts = async (): Promise<void> => {
    try {
      status('Loading workouts...');
      
      const manifestText = await fetchText('workouts/manifest.txt');
      const lines = manifestText.split('\n').filter(line => 
        line.trim() && line.match(/\.json$/i)
      );
      
      const workouts: { filename: string; title: string; block: number | null; week: number | null }[] = [];
      
      for (const line of lines) {
        const filepath = line.trim();
        const filename = filepath.replace(/^workouts\//, '');
        workouts.push({
          filename: filename,
          title: filename.replace(/\.json$/, '').replace(/_/g, ' '),
          block: null,
          week: null
        });
      }
      
      workoutsContent.innerHTML = buildWorkoutListHTML(workouts);
      
      // Wire up clicks for in-page navigation
      workoutsContent.addEventListener('click', (e: MouseEvent) => {
        let t = e.target as HTMLElement | null;
        if (!t) return;
        while (t && t !== workoutsContent && !(t.tagName && t.tagName.toLowerCase() === 'a')) {
          t = t.parentNode as HTMLElement | null;
        }
        if (!t || t === workoutsContent) return;
        const href = (t as HTMLAnchorElement).getAttribute('href') || '';
        if (href.indexOf('index.html?file=') === 0) {
          const path = decodeURIComponent(href.split('file=')[1] || '');
          if (path) {
            e.preventDefault();
            try { sessionStorage.setItem('indexScrollY', String(window.scrollY || 0)); } catch (ex) {}
            if (window.history?.pushState) {
              try { window.history.pushState({ view: 'session', file: path }, '', href); } catch (ex) {}
            }
            window.location.href = href;
          }
        }
      }, false);
      
      status('');
    } catch (err) {
      const error = err as Error;
      status(`Error loading workouts: ${error.message}`, { important: true });
      workoutsContent.innerHTML = '<p class="error">Failed to load workouts. Please try again.</p>';
    }
  };

  // Load when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadWorkouts);
  } else {
    loadWorkouts();
  }
})();
