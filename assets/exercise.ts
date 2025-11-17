/*
  exercAIse Exercise Detail Page
  Loads and renders exercise details from JSON files.
  Also displays performance history for the exercise.
*/

import type { Exercise } from '../types/exercise.types';
import type { PerformanceLog, SetEntry } from '../types/performance.types';

// ============================================================================
// Type Definitions
// ============================================================================

interface QueryParams {
  [key: string]: string;
}

interface GitHubFileItem {
  name: string;
  type: string;
  download_url: string;
}

interface HistoryLogEntry {
  name: string;
  data: PerformanceLog | null;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Find exercise sets in perf-2 nested structure
 * Searches sections → items → exercises or rounds
 */
function findExerciseInPerf2(log: PerformanceLog, exerciseKey: string): SetEntry[] {
  const sets: SetEntry[] = [];
  
  // Validate perf-2 format
  if (!log || !log.sections || !Array.isArray(log.sections)) {
    return sets; // Return empty array if not perf-2 format
  }
  
  // First, check if this exercise is in the index (fast lookup)
  if (log.exerciseIndex && log.exerciseIndex[exerciseKey]) {
    console.log(`📇 Found "${exerciseKey}" in exerciseIndex`);
  }
  
  // Search through all sections and items
  for (const section of log.sections) {
    for (const item of section.items) {
      // Standalone exercise with sets
      if (item.kind === 'exercise' && item.sets) {
        // Convert item name to key format for comparison
        const itemKey = item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        
        if (itemKey === exerciseKey) {
          console.log(`✅ Matched standalone exercise: "${item.name}" -> "${itemKey}"`);
          return item.sets;
        }
      }
      
      // Superset or circuit with rounds
      if ((item.kind === 'superset' || item.kind === 'circuit') && item.rounds) {
        // Find exercise within rounds
        for (const round of item.rounds) {
          for (const exercise of round.exercises) {
            if (exercise.key === exerciseKey) {
              console.log(`✅ Matched exercise in ${item.kind}: "${exercise.key}"`);
              // Flatten round data into sets format
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
                notes: exercise.notes,
                angle: exercise.angle, // Added angle field
              });
            }
          }
        }
      }
    }
  }
  
  return sets;
}

// ============================================================================
// Implementation
// ============================================================================

(() => {
  const statusEl = document.getElementById('status');
  const status = (msg: string): void => { 
    if (!statusEl) return; 
    statusEl.textContent = msg || ''; 
  };

  const qs = (): QueryParams => {
    const q: QueryParams = {};
    const s = String(window.location.search || '').replace(/^\?/, '').split('&');
    for (let i = 0; i < s.length; i++) { 
      const kv = s[i]!.split('='); 
      if (kv[0]) q[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || ''); 
    }
    return q;
  };
  
  const xhrGet = async (path: string, cb: (err: Error | null, text?: string) => void): Promise<void> => {
    try {
      const response = await fetch(path);
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status} for ${path}`);
        return cb(error);
      }
      const text = await response.text();
      return cb(null, text);
    } catch (e) {
      return cb(e as Error);
    }
  };

  const parseMarkdownLink = (text: string): string => {
    // Parse simple markdown links: [text](url)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    return text.replace(linkRegex, (_match, linkText, url) => {
      // Clean up the URL - remove any ../ patterns and normalize
      const cleanUrl = url.replace(/\.\.\//g, '');
      // If the URL doesn't start with exercises/, add it
      const fullUrl = cleanUrl.indexOf('exercises/') === 0 ? cleanUrl : `exercises/${cleanUrl}`;
      return `<a href="exercise.html?file=${fullUrl}">${linkText}</a>`;
    });
  };

  const renderExercise = (data: Exercise): void => {
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
    
    if (nameEl) nameEl.textContent = data.name || 'Exercise';
    
    // Meta badges
    let html = '';
    if (data.equipment?.length) {
      html += `<div><span class="muted">Equipment:</span> ${data.equipment.map(e => `<span class="pill">${e}</span>`).join(' ')}</div>`;
    }
    if (data.tags?.length) {
      html += `<div><span class="muted">Tags:</span> ${data.tags.map(e => `<span class="badge">${e}</span>`).join(' ')}</div>`;
    }
    if (metaEl) metaEl.innerHTML = html;
    
    // Setup
    if (setupEl) { 
      setupEl.innerHTML = ''; 
      if (data.setup?.length) { 
        for (let i = 0; i < data.setup.length; i++) { 
          const li = document.createElement('li'); 
          li.textContent = data.setup[i]!; 
          setupEl.appendChild(li);
        } 
      } else { 
        setupEl.innerHTML = '<li class="muted">—</li>'; 
      } 
    }
    
    // Steps
    if (stepsEl) { 
      stepsEl.innerHTML = ''; 
      if (data.steps?.length) { 
        for (let i2 = 0; i2 < data.steps.length; i2++) { 
          const oli = document.createElement('li'); 
          oli.textContent = data.steps[i2]!; 
          stepsEl.appendChild(oli);
        } 
      } else { 
        stepsEl.innerHTML = '<li class="muted">—</li>'; 
      } 
    }
    
    // Cues
    if (cuesEl) {
      cuesEl.innerHTML = '';
      if (data.cues?.length) { 
        for (let i = 0; i < data.cues.length; i++) { 
          const li = document.createElement('li'); 
          li.textContent = data.cues[i]!; 
          cuesEl.appendChild(li);
        } 
      } else { 
        cuesEl.innerHTML = '<li class="muted">No cues provided.</li>'; 
      }
    }
    
    // Safety
    if (safetyEl) safetyEl.textContent = data.safety || '—';
    
    // Mistakes
    if (mistakesEl) { 
      mistakesEl.innerHTML = ''; 
      if (data.mistakes?.length) { 
        for (let mi = 0; mi < data.mistakes.length; mi++) { 
          const mli = document.createElement('li'); 
          mli.textContent = data.mistakes[mi]!; 
          mistakesEl.appendChild(mli);
        } 
      } else { 
        mistakesEl.innerHTML = '<li class="muted">—</li>'; 
      } 
    }
    
    // Variations
    if (varsEl) {
      varsEl.innerHTML = '';
      if (data.variations?.length) { 
        for (let j = 0; j < data.variations.length; j++) { 
          const vli = document.createElement('li'); 
          vli.innerHTML = parseMarkdownLink(data.variations[j]!); 
          varsEl.appendChild(vli);
        } 
      } else { 
        varsEl.innerHTML = '<li class="muted">—</li>'; 
      }
    }
    
    // Scaling
    if (regEl || progEl) {
      if (regEl) { 
        regEl.innerHTML = ''; 
        const regs = (data.scaling?.regressions) || []; 
        if (regs.length) { 
          for (let r = 0; r < regs.length; r++) { 
            const rli = document.createElement('li'); 
            rli.textContent = regs[r]!; 
            regEl.appendChild(rli);
          } 
        } else { 
          regEl.innerHTML = '<li class="muted">—</li>'; 
        } 
      }
      if (progEl) { 
        progEl.innerHTML = ''; 
        const progs = (data.scaling?.progressions) || []; 
        if (progs.length) { 
          for (let p = 0; p < progs.length; p++) { 
            const pli = document.createElement('li'); 
            pli.textContent = progs[p]!; 
            progEl.appendChild(pli);
          } 
        } else { 
          progEl.innerHTML = '<li class="muted">—</li>'; 
        } 
      }
    }
    
    // Prescription Hints
    if (phEl) {
      phEl.innerHTML = '';
      const ph = data.prescriptionHints || {};
      const pairs: string[] = [];
      const addHint = (k: keyof typeof ph, label: string): void => { 
        if (ph?.[k]) pairs.push(`<li><span class="muted">${label}:</span> ${ph[k]}</li>`); 
      };
      addHint('load', 'Load'); 
      addHint('reps', 'Reps'); 
      addHint('time', 'Time'); 
      addHint('distance', 'Distance'); 
      addHint('rpe', 'RPE'); 
      addHint('notes', 'Notes');
      phEl.innerHTML = pairs.length ? pairs.join('') : '<li class="muted">—</li>';
    }
    
    // Joints
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
    
    // Media
    if (mediaEl) {
      let mhtml = '';
      if (data.media) {
        if (data.media.video) { 
          mhtml += `<div><a href="${data.media.video}" target="_blank">Video</a></div>`; 
        }
        if (data.media.images?.length) { 
          for (let im = 0; im < data.media.images.length; im++) { 
            const src = data.media.images[im]!; 
            mhtml += `<img alt="exercise image" style="max-width:100%;height:auto;margin:4px 0;" src="${src}" />`; 
          } 
        }
      }
      mediaEl.innerHTML = mhtml || '<div class="muted">—</div>';
    }
  };

  const normalizeAngleValue = (value: unknown): number | null => {
    if (value == null) return null;
    const num = Number(value);
    return Number.isFinite(num) ? Math.round(num) : null;
  };

  const describeAngleBadge = (angle: number): { label: string; modifier: string; title: string } => {
    if (angle > 0) {
      return { label: `${angle}° Incline`, modifier: 'ex-angle--incline', title: 'Incline bench angle' };
    }
    if (angle < 0) {
      return { label: `${Math.abs(angle)}° Decline`, modifier: 'ex-angle--decline', title: 'Decline bench angle' };
    }
    return { label: 'Flat (0°)', modifier: 'ex-angle--flat', title: 'Flat bench angle' };
  };

  const buildAngleBadge = (angle: number | null): string => {
    if (angle == null) return '';
    const meta = describeAngleBadge(angle);
    return `<span class="ex-angle ex-angle--chip ${meta.modifier}" title="${meta.title}">${meta.label}</span>`;
  };

  const detectAngleFromSetEntries = (sets: SetEntry[]): number | null => {
    for (const set of sets) {
      const candidate = normalizeAngleValue(set?.angle);
      if (candidate != null) return candidate;
    }
    return null;
  };

  const findAngleFromExerciseIndex = (log: PerformanceLog, matchedVariant: string | null): number | null => {
    if (!matchedVariant || !log.exerciseIndex) return null;
    const base = matchedVariant.toLowerCase();
    const variants = Array.from(new Set([
      base,
      base.replace(/_/g, '-'),
      base.replace(/-/g, '_')
    ]));
    for (const slug of variants) {
      const prefix = `${slug}_`;
      for (const [key, summary] of Object.entries(log.exerciseIndex)) {
        if (!key.startsWith(prefix)) continue;
        if (summary && typeof summary.angle === 'number' && isFinite(summary.angle)) {
          return summary.angle;
        }
        const suffix = Number(key.slice(prefix.length));
        if (!Number.isNaN(suffix)) return suffix;
      }
    }
    return null;
  };

  const formatSetMetrics = (set: SetEntry): string => {
    const parts: string[] = [];
    if (set.weight != null) {
      const multiplier = set.multiplier != null ? ` ×${set.multiplier}` : '';
      parts.push(`${set.weight}${multiplier}`);
    }
    if (set.reps != null) parts.push(`${set.reps} reps`);
    if (set.timeSeconds != null) parts.push(`${set.timeSeconds}s`);
    if (set.distanceMiles != null) parts.push(`${set.distanceMiles} mi`);
    if (set.rpe != null) parts.push(`RPE ${set.rpe}`);
    return parts.join(', ');
  };

  const formatHistorySet = (set: SetEntry, index: number): string => {
    const label = set.set != null ? `Set ${set.set}` : `Set ${index + 1}`;
    const metrics = formatSetMetrics(set) || '—';
    return `<div class="exercise-history-set"><span class="exercise-history-set__label">${label}</span><span class="exercise-history-set__metrics">${metrics}</span></div>`;
  };

  const getRepoApiBase = (): string => 'https://api.github.com/repos/jrodhead/exercAIse/contents/';

  /**
   * Render history logs for a given exercise
   * Displays performance data from logs matching the exercise key variants
   */
  const renderHistoryLogs = (logs: HistoryLogEntry[], variants: string[], target: HTMLElement): void => {
    let html = '';
    logs.sort((a, b) => a.name < b.name ? 1 : -1);
    console.log(`🔍 Searching for exercise with key variants:`, variants);
    
    for (let i = 0; i < logs.length; i++) {
      const data = logs[i]!.data;
      if (!data) continue;

      let matchedVariant: string | null = null;
      let exerciseSets: SetEntry[] = [];
      for (let v = 0; v < variants.length; v++) {
        const variantKey = variants[v]!;
        const candidateSets = findExerciseInPerf2(data, variantKey);
        if (candidateSets.length > 0) {
          exerciseSets = candidateSets;
          matchedVariant = variantKey;
          console.log(`✅ Found ${candidateSets.length} sets for "${variantKey}" in ${logs[i]!.name}`);
          break;
        }
      }

      if (exerciseSets.length === 0) continue;

      const entryAngle = detectAngleFromSetEntries(exerciseSets) ?? findAngleFromExerciseIndex(data, matchedVariant);
      const angleBadge = buildAngleBadge(entryAngle);
      const when = data.timestamp || logs[i]!.name.slice(0, 24);
      const setsMarkup = exerciseSets.map((set, idx) => formatHistorySet(set, idx)).join('');

            html += `<div class="exercise-history-item">` +
              `<div class="exercise-history-item__meta">` +
              `<span class="exercise-history-item__timestamp mono muted">${when}</span>` +
              `${angleBadge ? `<span class="exercise-history-item__angle">${angleBadge}</span>` : ''}` +
              `</div>` +
              `<div class="exercise-history-item__sets">${setsMarkup}</div>` +
              `</div>`;
    }
    target.innerHTML = html || '<div class="muted">No history for this exercise yet.</div>';
  };

  const loadHistory = (exKey: string): void => {
    // Accept multiple key variants to match performed logs (which use hyphens via app slugify)
    const keyVariants = (k: string): string[] => {
      const a: string[] = [];
      const k1 = String(k || '');
      const k2 = k1.replace(/_/g, '-');
      const k3 = k1.replace(/-/g, '_');
      a.push(k1);
      if (a.indexOf(k2) === -1) a.push(k2);
      if (a.indexOf(k3) === -1) a.push(k3);
      return a;
    };
    const variants = keyVariants(exKey);
    const target = document.getElementById('history');
    if (!target) return;
    target.textContent = 'Loading history…';
    
    // Try localStorage first (imported from performed/ directory)
    const STORAGE_KEY_PREFIX = 'exercAIse-perf-';
    const logs: HistoryLogEntry[] = [];
    
    try {
      // Scan localStorage for all performance logs
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
          try {
            const logData = JSON.parse(localStorage.getItem(key) || '{}');
            // Use workoutFile or key as name
            const name = logData.workoutFile || key.replace(STORAGE_KEY_PREFIX, '');
            logs.push({ name, data: logData });
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
      
      // If we found logs in localStorage, use those
      if (logs.length > 0) {
        console.log(`📊 Found ${logs.length} performance logs in localStorage`);
        renderHistoryLogs(logs, variants, target);
        return;
      }
    } catch (e) {
      console.warn('Failed to load from localStorage, falling back to GitHub API:', e);
    }
    
    // Fallback: Fetch from GitHub API (original behavior)
    console.log('📡 No localStorage logs found, fetching from GitHub API...');
    const url = `${getRepoApiBase()}performed?ref=main`;
    xhrGet(url, (err, text) => {
      if (err) { target.textContent = 'Unable to load history.'; return; }
      let items: GitHubFileItem[] = [];
      try { items = JSON.parse(text || '[]'); } catch (e) { items = []; }
      if (!items || Object.prototype.toString.call(items) !== '[object Array]') {
        target.textContent = 'No history.';
        return;
      }
      // Load each JSON from GitHub
      const apiLogs: HistoryLogEntry[] = [];
      let remaining = 0;
      
      const done = (): void => {
        renderHistoryLogs(apiLogs, variants, target);
      };
      
      // Start loads
      for (let k = 0; k < items.length; k++) {
        const it = items[k]!;
        if (!it || it.type !== 'file' || !/\.json$/i.test(it.name)) continue;
        remaining++;
        ((it: GitHubFileItem) => {
          xhrGet(it.download_url, (err2, txt) => {
            try {
              const data: PerformanceLog | null = err2 ? null : JSON.parse(txt || '{}');
              apiLogs.push({ name: it.name, data: data });
            } catch (e) {
              // Ignore parse errors
            }
            remaining--;
            if (remaining === 0) done();
          });
        })(it);
      }
      if (remaining === 0) done();
    });
  };

  // Utility function for slug normalization (not currently used but kept for consistency)
  // const slugify = (s: string): string => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  const showNotFound = (path: string): void => {
    try {
      const main = document.getElementById('main');
      const nf = document.getElementById('not-found');
      const nfPath = document.getElementById('nf-path');
      if (nfPath) nfPath.textContent = path || '';
      if (main) main.style.display = 'none';
      if (nf) nf.style.display = 'block';
      status('');
    } catch (e) {
      // Ignore errors
    }
  };

  const isInternalExercisePath = (p: string): boolean => {
    if (!p) return false;
    if (/^https?:/i.test(p)) return false;
    return /^(?:\.?\.?\/)?exercises\/[\w\-]+\.(?:json|md)$/i.test(p);
  };

  const start = (): void => {
    const params = qs();
    const path = params['file'] || '';
    if (!path) { status('Missing ?file=exercises/<name>.json'); return; }
    if (!isInternalExercisePath(path)) { showNotFound(path); return; }
    // Normalize and compute key
    const base = path.split('/').pop()!;
    let key = base.replace(/\.json$/i, '');
    // Normalize to hyphenated slug to match logger keys
    key = key.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
    // Load JSON file directly
    xhrGet(path, (err, text) => {
      if (!err) {
        try {
          const data: Exercise = JSON.parse(text || '{}');
          renderExercise(data);
          loadHistory(key);
          return;
        } catch (e) {
          // Ignore parse errors, fall through to markdown fallback
        }
      }
      // Fallback to markdown if JSON not found yet
      const mdPath = path.replace(/\.json$/i, '.md');
      xhrGet(mdPath, (err2, md) => {
        if (err2) { showNotFound(path); return; }
        // Naive parse: title = first H1, list items under cues; everything else minimal
        const name = (md!.match(/^#\s+(.+)$/m) || [])[1] || key.replace(/-/g, ' ');
        const cues: string[] = [];
        let li: RegExpExecArray | null;
        const re = /^-\s+(.*)$/gm;
        while ((li = re.exec(md!))) { cues.push(li[1]!); }
        const data: Exercise = { 
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

  // kickoff
  start();
})();

// Export for ES module compatibility (makes this file a module for TypeScript)
export {};
