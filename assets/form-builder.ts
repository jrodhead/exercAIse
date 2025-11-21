/**
 * Form Builder Module
 * Dynamic exercise card generation, form field management, and workout logging
 */

import type { PerformanceLog, SetEntry } from '../types/performance.types';
import type { FormBuilderDependencies } from '../types/global.types';

// ============================================================================
// Local Type Definitions
// ============================================================================

interface PrescriptionRow {
  set: number;
  reps?: number;
  weight?: number;
  multiplier?: number;
  rpe?: number;
  timeSeconds?: number;
  holdSeconds?: number;
  distanceMeters?: number;
  distanceMiles?: number;
  angle?: number;
}

interface ExerciseMetadata {
  logType?: string;
  notes?: string;
  cues?: string[];
  prescription?: {
    sets?: number;
    reps?: number | string;
    weight?: number | string;
    multiplier?: number;
    rpe?: number;
    timeSeconds?: number;
    holdSeconds?: number;
    distanceMeters?: number;
    distanceMiles?: number;
    restSeconds?: number;
    angle?: number;
  };
}

interface CardOptions {
  readOnly?: boolean;
  explicitLogType?: string;
}

interface FieldSpec {
  name: string;
  placeholder: string;
  type: string;
  min?: number | string;
  step?: string;
  max?: number | string;
}

interface CollectedBlocks {
  html: string;
  nodes: Node[];
}

type SectionDisplayMode = 'reference' | 'log';

// ============================================================================
// Implementation
// ============================================================================

(window as any).ExercAIse = (window as any).ExercAIse || {};

(window as any).ExercAIse.FormBuilder = (() => {
  'use strict';

  // Module dependencies (will be injected via init)
  let deps: Partial<FormBuilderDependencies> = {};

  // Constants
  const METERS_PER_MILE = 1609.34;
  const LOAD_FIELD_NAMES = new Set(['weight', 'multiplier']);

  const isLoadFieldName = (name: string | null | undefined): boolean => {
    if (!name) return false;
    return LOAD_FIELD_NAMES.has(name);
  };

  const coerceNumber = (value: string | number | null | undefined): number | null => {
    if (value == null || value === '') return null;
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  };

  const formatNumeric = (value: number | null): string => {
    if (value == null) return '';
    return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '');
  };

  const formatLoadSummaryFromValues = (
    weight: string | number | null | undefined,
    multiplier: string | number | null | undefined
  ): string | null => {
    const weightNum = coerceNumber(weight);
    const multiplierNum = coerceNumber(multiplier);
    const parts: string[] = [];

    if (weightNum != null && weightNum > 0) {
      parts.push(`${formatNumeric(weightNum)} lb`);
    }

    if (multiplierNum != null) {
      if (multiplierNum === 0) {
        if (!parts.length) parts.push('Bodyweight');
        else parts.push('(Bodyweight)');
      } else if (multiplierNum !== 1) {
        parts.push(`×${formatNumeric(multiplierNum)}`);
      }
    }

    if (!parts.length) return null;
    return parts.join(' ');
  };

  const isValidAngle = (value: unknown): value is number => {
    return typeof value === 'number' && isFinite(value) && value !== 0;
  };

  const angleDirectionLabel = (angle: number): 'Incline' | 'Decline' => {
    return angle > 0 ? 'Incline' : 'Decline';
  };

  const findAngleInRows = (rows?: PrescriptionRow[] | null): number | null => {
    if (!rows || !rows.length) return null;
    for (let i = 0; i < rows.length; i++) {
      const candidate = rows[i]?.angle;
      if (isValidAngle(candidate)) return candidate;
    }
    return null;
  };

  const resolveAngleValue = (
    metadata: ExerciseMetadata | null,
    presetRows?: PrescriptionRow[] | null,
    savedRows?: PrescriptionRow[] | null
  ): number | null => {
    const fromMeta = metadata?.prescription?.angle;
    if (isValidAngle(fromMeta)) return fromMeta as number;
    const fromPreset = findAngleInRows(presetRows);
    if (fromPreset != null) return fromPreset;
    return findAngleInRows(savedRows);
  };

  const applyAngleBadgeToHeader = (angle: number, headerEl: HTMLElement, cardEl: HTMLElement): void => {
    const direction = angleDirectionLabel(angle);
    const modifier = angle > 0 ? 'ex-angle--incline' : 'ex-angle--decline';
    let badge = headerEl.querySelector('.ex-angle') as HTMLElement | null;
    if (!badge) {
      badge = document.createElement('span');
      headerEl.appendChild(badge);
    }
    badge.textContent = `${angle}° ${direction}`;
    badge.className = `exercise-card__angle ex-angle ex-angle--chip ${modifier}`;
    badge.setAttribute('title', `${direction} bench angle`);
    cardEl.setAttribute('data-angle', String(angle));
  };

  const readAngleFromCard = (card: HTMLElement | null): number | null => {
    if (!card) return null;
    const attr = card.getAttribute('data-angle');
    if (!attr && attr !== '0') return null;
    const num = Number(attr);
    if (!isValidAngle(num)) return null;
    return num;
  };

  const normalizeAngleValue = (value: unknown): number | null => {
    if (value == null) return null;
    const num = Number(value);
    return Number.isFinite(num) ? Math.round(num) : null;
  };

  const detectAngleFromSets = (sets?: Array<{ angle?: number }> | null): number | null => {
    if (!sets || !Array.isArray(sets)) return null;
    for (let i = 0; i < sets.length; i++) {
      const candidate = normalizeAngleValue(sets[i]?.angle);
      if (candidate != null) return candidate;
    }
    return null;
  };

  const detectAngleFromRounds = (rounds: any[] | undefined, exerciseIndex: number): number | null => {
    if (!rounds || !Array.isArray(rounds)) return null;
    for (let i = 0; i < rounds.length; i++) {
      const ex = rounds[i]?.exercises?.[exerciseIndex];
      if (!ex) continue;
      const candidate = normalizeAngleValue(ex.angle);
      if (candidate != null) return candidate;
    }
    return null;
  };

  const buildExerciseIndexKey = (slug: string, angle: number | null): string => {
    const normalized = typeof angle === 'number' && isFinite(angle) ? angle : 0;
    return `${slug}_${normalized}`;
  };

  /**
   * Extract sets for a given exercise key from perf-2 nested structure
   * Traverses sections → items → finds exercise by key
   * Returns flat array of sets/rounds for form restoration
   */
  function extractSetsFromPerf2(log: PerformanceLog, exerciseKey: string): PrescriptionRow[] {
    const rows: PrescriptionRow[] = [];
    
    for (const section of log.sections) {
      for (const item of section.items) {
        // Standalone exercise
        if (item.kind === 'exercise' && item.sets) {
          // For standalone exercises, match by slugified name
          // (since they don't store a key field, only name)
          const itemKey = (window as any).ExercAIse?.SessionParser?.slugify?.(item.name) || item.name.toLowerCase().replace(/\s+/g, '-');
          
          if (itemKey === exerciseKey) {
            // Found the matching exercise, extract from sets
            item.sets.forEach((setEntry: SetEntry) => {
              rows.push({
                set: setEntry.set,
                weight: setEntry.weight,
                multiplier: setEntry.multiplier,
                reps: setEntry.reps,
                rpe: setEntry.rpe,
                timeSeconds: setEntry.timeSeconds,
                holdSeconds: setEntry.holdSeconds,
                distanceMeters: setEntry.distanceMeters,
                angle: setEntry.angle
              });
            });
            return rows; // Found it, return early
          }
        }
        
        // Superset or circuit
        if ((item.kind === 'superset' || item.kind === 'circuit') && item.rounds) {
          for (const round of item.rounds) {
            for (const exercise of round.exercises) {
              if (exercise.key === exerciseKey) {
                // Found exercise in this round
                rows.push({
                  set: round.round,
                  weight: exercise.weight,
                  multiplier: exercise.multiplier,
                  reps: exercise.reps,
                  rpe: exercise.rpe,
                  timeSeconds: exercise.timeSeconds,
                  holdSeconds: exercise.holdSeconds,
                  distanceMeters: exercise.distanceMeters,
                  angle: exercise.angle
                });
              }
            }
          }
        }
      }
    }
    
    return rows;
  }

  /**
   * Initialize the FormBuilder module with required dependencies from app.js
   */
  const init = (dependencies: Partial<FormBuilderDependencies>): void => {
    deps = dependencies || {};
    
    // Validate required dependencies
    const required: (keyof FormBuilderDependencies)[] = [
      'slugify', 'extractExercisesFromJSON', 'extractExercisesFromMarkdown',
      'parseJSONPrescriptions', 'parseMarkdownPrescriptions',
      'loadSaved', 'saveLocal', 'parseHMSToSeconds', 'secondsToHHMMSS',
      'renderMarkdownBasic', 'fixExerciseAnchors', 'status',
      // DOM elements
      'workoutContent', 'exerciseFormsEl', 'saveBtn', 'copyBtn', 'downloadBtn',
      'issueBtn', 'clearBtn', 'copyWrapper', 'copyTarget', 'openIssueLink'
    ];
    
    for (let i = 0; i < required.length; i++) {
      if (!deps[required[i]!]) {
        console.warn('FormBuilder: missing dependency:', required[i]);
      }
    }
  };

  /**
   * Build the workout form by injecting exercise cards into the DOM
   */
  const buildForm = (filePath: string, raw: string, isJSON: boolean): void => {
    // Note: exercises extracted but not used directly; cards are generated from DOM walking
    // const _exercises = isJSON ? deps.extractExercisesFromJSON!(raw) : deps.extractExercisesFromMarkdown!(raw);
    const prescriptions = isJSON ? deps.parseJSONPrescriptions!(raw) : deps.parseMarkdownPrescriptions!(raw);
    
    // Clear existing forms
    if (deps.exerciseFormsEl) deps.exerciseFormsEl.innerHTML = '';

    const saved = deps.loadSaved!(filePath);
    const isPerf2 = saved && (saved as any).version === 'perf-2';

    // Document-level helpers for fallback parsing (e.g., distance in title "4 Miles")
    const getFirstHeadingText = (tagName: string): string => {
      if (!deps.workoutContent) return '';
      const h = deps.workoutContent.querySelector(tagName);
      return h ? (h.textContent || '').trim() : '';
    };
    
    const docH1Title = getFirstHeadingText('h1');
    const fullDocText = deps.workoutContent ? ((deps.workoutContent.textContent || (deps.workoutContent as any).innerText) || '') : '';
    
    // Heuristic: detect suggested rounds/sets from headings like "3 Rounds" or "4 sets"
    const detectRoundsHint = (scopeText: string): number | null => {
      const t = String(scopeText || '');
      let m = t.match(/(\d+)\s*(?:x|×)?\s*rounds?/i);
      if (m) return parseInt(m[1]!, 10) || null;
      m = t.match(/(\d+)\s*sets?/i);
      if (m) return parseInt(m[1]!, 10) || null;
      return null;
    };
    
    const docRoundsHint = detectRoundsHint(fullDocText);

    /**
     * Create an exercise card with logging inputs
     */
    const createExerciseCard = (
      title: string,
      presetRows: PrescriptionRow[] = [],
      savedRows: PrescriptionRow[] = [],
      headerHTML?: string,
      opts?: CardOptions
    ): HTMLElement => {
      const options = opts || {};
      const isReadOnly = !!options.readOnly;
      const exKey = deps.slugify!(title);
      
      const card = document.createElement('div');
      card.className = 'exercise-card exercise-card--compact' + (isReadOnly ? ' exercise-card--readonly' : '');
      card.setAttribute('data-exkey', exKey);
      card.setAttribute('data-name', title);

      // Optional header area to include the original exercise text (name + notes) inside the card
      let resolvedAngle: number | null = null;
      if (headerHTML) {
        const header = document.createElement('div');
        header.className = 'exercise-card__header';
        header.innerHTML = headerHTML;

        let metadata: ExerciseMetadata | null = null;
        try {
          const metaElement = header.querySelector('[data-exmeta]');
          if (metaElement) {
            const metaRaw = metaElement.getAttribute('data-exmeta') || '';
            metadata = metaRaw ? JSON.parse(metaRaw) : null;
          }
        } catch (e) {
          metadata = null;
        }

        if (metadata && metadata.notes) {
          const notesDiv = document.createElement('div');
          notesDiv.className = 'exercise-card__notes';
          notesDiv.textContent = metadata.notes;
          header.appendChild(notesDiv);
        }

        resolvedAngle = resolveAngleValue(metadata, presetRows, savedRows);
        if (resolvedAngle != null) {
          applyAngleBadgeToHeader(resolvedAngle, header, card);
        }

        card.appendChild(header);
      } else {
        resolvedAngle = resolveAngleValue(null, presetRows, savedRows);
      }
      
      if (resolvedAngle != null && !card.getAttribute('data-angle')) {
        card.setAttribute('data-angle', String(resolvedAngle));
      }

      const updateSetLabelsLocal = (): void => {
        if (isReadOnly || !setsWrap) return;
        const rows = setsWrap.getElementsByClassName('set-row');
        for (let i = 0; i < rows.length; i++) {
          const lbl = rows[i]!.getElementsByClassName('set-label')[0];
          if (lbl) lbl.textContent = 'Set ' + (i + 1);
        }
      };

      /**
       * Determine which input fields to show based on workout type
       */
      const pickFieldsFromRows = (rows: PrescriptionRow[], titleForHeuristic: string, explicitLogType: string | null): string[] => {
        // Determine which inputs to show based on preset/saved row keys
        let hasHold = false, hasTime = false, hasDist = false, hasWeight = false, hasReps = false;
        
        for (let i = 0; i < rows.length; i++) {
          const rr: PrescriptionRow = rows[i] || {} as PrescriptionRow;
          if (rr.holdSeconds != null) hasHold = true;
          if (rr.timeSeconds != null) hasTime = true;
          if (rr.distanceMeters != null || rr.distanceMiles != null) hasDist = true;
          if (rr.weight != null) hasWeight = true;
          if (rr.reps != null) hasReps = true;
        }
        
        // Prioritize hold/time-only prescriptions before forcing defaults based on logType
        if (hasHold) {
          const fields = hasWeight ? ['weight', 'multiplier', 'holdSeconds', 'rpe'] : ['holdSeconds', 'rpe'];
          return fields;
        }
        if (hasTime && !hasReps && !hasDist) {
          const fields = hasWeight ? ['weight', 'multiplier', 'timeSeconds', 'rpe'] : ['timeSeconds', 'rpe'];
          return fields;
        }

        if (explicitLogType === 'mobility' || explicitLogType === 'stretch') return ['holdSeconds', 'rpe'];
        if (explicitLogType === 'endurance') return ['distanceMiles', 'timeSeconds', 'rpe'];
        if (explicitLogType === 'carry') return ['weight', 'multiplier', 'timeSeconds', 'rpe'];
        if (explicitLogType === 'strength') {
          if (!hasReps && (hasTime || hasDist)) return ['timeSeconds', 'rpe'];
          return ['weight', 'multiplier', 'reps', 'rpe'];
        }
        
        // Ensure reps are not hidden when both weight & reps are prescribed, even if time is also present
        if (hasReps && hasWeight && hasTime) return ['weight', 'multiplier', 'reps', 'timeSeconds', 'rpe'];
        if (hasReps && hasWeight) return ['weight', 'multiplier', 'reps', 'rpe'];
        if (hasHold) return ['holdSeconds', 'rpe'];
        
        const t = String(titleForHeuristic || '').toLowerCase();
        const isEndurance = /\b(run|jog|walk|tempo|quality run|easy run|bike|cycle|ride|rower|rowing|erg|swim)\b/.test(t);
        
        // Force endurance-style fields when the title looks like endurance
        if (isEndurance) return ['distanceMiles', 'timeSeconds', 'rpe'];
        
        // Timed & weighted (e.g., Farmer Carry): show weight + time + RPE
        if (hasTime && hasWeight) return ['weight', 'multiplier', 'timeSeconds', 'rpe'];
        if (hasDist && hasTime) return ['distanceMiles', 'timeSeconds', 'rpe'];
        if (hasDist) return ['distanceMiles', 'rpe'];
        if (hasTime) return ['timeSeconds', 'rpe'];
        
        return ['weight', 'multiplier', 'reps', 'rpe'];
      };

      const initialRows = (savedRows && savedRows.length) ? savedRows : (presetRows || []);
      let explicitType: string | null = null;
      
      if (opts && opts.explicitLogType) {
        explicitType = opts.explicitLogType;
      } else {
        try {
          const headerProbe = document.createElement('div');
          headerProbe.innerHTML = headerHTML || '';
          const aProbe = headerProbe.querySelector('a[data-exmeta]');
          if (aProbe) {
            const raw = aProbe.getAttribute('data-exmeta') || '';
            const m: ExerciseMetadata | null = raw ? JSON.parse(raw) : null;
            if (m && m.logType) explicitType = m.logType;
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
      
      const fieldOrder = isReadOnly ? [] : pickFieldsFromRows(initialRows, title, explicitType);
      const hasLoadControls = !isReadOnly && fieldOrder.some((name) => isLoadFieldName(name));
      let loadEditBtn: HTMLButtonElement | null = null;

      // In read-only mode (warm-up/mobility/recovery), don't render logging inputs
      let setsWrap: HTMLElement | null = null;
      let addBtn: HTMLButtonElement | null = null;

      const updateRowLoadSummary = (rowEl: HTMLElement | null): void => {
        if (!hasLoadControls || !rowEl) return;
        const indicator = rowEl.querySelector('.set-row__load') as HTMLElement | null;
        if (!indicator) return;
        const weightInput = rowEl.querySelector('input[data-name="weight"]') as HTMLInputElement | null;
        const multiplierInput = rowEl.querySelector('input[data-name="multiplier"]') as HTMLInputElement | null;
        const summary = formatLoadSummaryFromValues(weightInput?.value, multiplierInput?.value);
        indicator.textContent = summary || '—';
      };

      if (!isReadOnly) {
        setsWrap = document.createElement('div');
        setsWrap.className = 'exercise-sets';
        card.appendChild(setsWrap);

        const actionsBar = document.createElement('div');
        actionsBar.className = 'exercise-card__set-actions';

        addBtn = document.createElement('button');
        addBtn.className = 'button--secondary';
        addBtn.type = 'button';
        addBtn.appendChild(document.createTextNode('Add set'));
        actionsBar.appendChild(addBtn);

        if (hasLoadControls) {
          loadEditBtn = document.createElement('button');
          loadEditBtn.type = 'button';
          loadEditBtn.className = 'button--ghost exercise-card__load-edit';
          loadEditBtn.textContent = 'Edit load';
          actionsBar.appendChild(loadEditBtn);
        }

        card.appendChild(actionsBar);

        if (hasLoadControls && loadEditBtn) {
          const editBtn = loadEditBtn;
          editBtn.onclick = () => {
            const editing = card.classList.toggle('is-load-editing');
            editBtn.textContent = editing ? 'Done editing load' : 'Edit load';
          };
        }

        if (hasLoadControls && setsWrap) {
          setsWrap.addEventListener('input', (event: Event) => {
            const target = event.target as HTMLInputElement | null;
            if (!target) return;
            const fieldName = target.getAttribute('data-name');
            if (isLoadFieldName(fieldName)) {
              const rowEl = target.closest('.set-row') as HTMLElement | null;
              updateRowLoadSummary(rowEl);
            }
          });
        }
      }

      /**
       * Add a set row to the exercise card
       */
      const addSetRow = (row: PrescriptionRow | null, idx?: number): void => {
        if (isReadOnly || !setsWrap) return; // no set rows in read-only mode and ensure container exists
        
        const r = document.createElement('div');
        r.className = 'set-row';
        
        // Non-editable label for set number (inferred by order)
        const label = document.createElement('span');
        label.className = 'set-label';
        label.appendChild(document.createTextNode('Set'));
        r.appendChild(label);

        let perSetLoad: HTMLElement | null = null;
        if (hasLoadControls) {
          perSetLoad = document.createElement('span');
          perSetLoad.className = 'set-row__load';
          perSetLoad.textContent = '—';
          r.appendChild(perSetLoad);
        }

        const placeholders: { [key: string]: string } = {
          weight: 'Weight',
          multiplier: 'Multiplier',
          reps: 'Reps',
          rpe: 'RPE',
          timeSeconds: 'Time (hh:mm:ss)',
          holdSeconds: 'Hold (hh:mm:ss)',
          distanceMeters: 'Distance (mi)',
          distanceMiles: 'Distance (mi)'
        };
        
        const types: { [key: string]: { type: string; step?: string; min?: number | string; max?: number | string } } = {
          weight: { type: 'number', step: 'any' },
          multiplier: { type: 'number', min: 0, step: '1' },
          reps: { type: 'number', min: 0 },
          rpe: { type: 'number', step: 'any' },
          timeSeconds: { type: 'text' },
          holdSeconds: { type: 'text' },
          distanceMeters: { type: 'number', min: 0, step: 'any' },
          distanceMiles: { type: 'number', min: 0, step: 'any' }
        };
        
        const inputs: FieldSpec[] = [];
        for (let fi = 0; fi < fieldOrder.length; fi++) {
          const name = fieldOrder[fi]!;
          const spec = types[name] || { type: 'text' };
          inputs.push({ name, placeholder: placeholders[name] || name, type: spec.type, min: spec.min, step: spec.step });
        }
        
        for (let i = 0; i < inputs.length; i++) {
          const spec = inputs[i]!;
          const fieldWrap = document.createElement('div');
          fieldWrap.className = 'set-field';
          if (isLoadFieldName(spec.name)) fieldWrap.classList.add('set-field--load');
          
          // Special inline label for multiplier: show × before the field
          if (spec.name === 'multiplier') {
            const times = document.createElement('span');
            times.appendChild(document.createTextNode('×'));
            times.className = 'set-field__times';
            times.setAttribute('aria-hidden', 'true');
            fieldWrap.appendChild(times);
          }
          
          const input = document.createElement('input');
          input.type = spec.type;
          input.placeholder = spec.placeholder;
          if (spec.min != null) (input as any).min = spec.min;
          if (spec.step) input.step = spec.step;
          
          if (spec.name === 'multiplier') {
            input.setAttribute('title', 'Multiplier (e.g., 2 for pair, 1 for single, 0 for bodyweight)');
            input.setAttribute('aria-label', 'Multiplier (e.g., 2 for pair, 1 for single, 0 for bodyweight)');
            input.style.maxWidth = '5em';
          }
          
          if (spec.name === 'rpe') {
            input.setAttribute('title', 'RPE (Rate of Perceived Exertion), 1–10 scale — 4–5 = easy conversational, 7–8 = tempo/comfortably hard');
            input.setAttribute('aria-label', 'RPE (Rate of Perceived Exertion), 1–10 scale; 4–5 easy conversational, 7–8 tempo/comfortably hard');
            try { (input as any).min = 0; (input as any).max = 10; } catch (e) {
              // Ignore
            }
          }
          
          if (spec.name === 'distanceMeters' || spec.name === 'distanceMiles') {
            input.setAttribute('title', 'Distance (miles)');
            input.setAttribute('aria-label', 'Distance in miles');
          }
          
          if (row) {
            let v: any = null;
            if ((row as any)[spec.name] != null) v = (row as any)[spec.name];
            
            // If UI uses miles but source row provided meters, convert for display
            if (v == null && spec.name === 'distanceMiles' && row.distanceMeters != null) v = (row.distanceMeters / METERS_PER_MILE);
            if (v == null && spec.name === 'distanceMeters' && row.distanceMiles != null) v = (row.distanceMiles * METERS_PER_MILE);
            
            // If still missing distance, look up from prescription row (same index or first)
            if (v == null && spec.name === 'distanceMiles' && presetRows) {
              const pRow = (typeof idx === 'number' && presetRows[idx]) ? presetRows[idx] : (presetRows[0] || null);
              if (pRow) {
                if (pRow.distanceMiles != null) v = Number(pRow.distanceMiles);
                else if (pRow.distanceMeters != null) v = Number(pRow.distanceMeters) / METERS_PER_MILE;
              }
            }
            
            // Fallback: parse distance like "4 miles" from the card title
            if (v == null && spec.name === 'distanceMiles') {
              const tstr = String(title || '');
              let mt = tstr.match(/(\d+(?:\.\d+)?)\s*(?:mi|miles?|mile)\b/i);
              if (mt) v = Number(mt[1]!);
              
              // Try the document H1 title
              if (v == null && docH1Title) {
                const mh1 = docH1Title.match(/(\d+(?:\.\d+)?)\s*(?:mi|miles?|mile)\b/i);
                if (mh1) v = Number(mh1[1]!);
              }
              
              // Try scanning the full document text as a last resort (may pick first match)
              if (v == null && fullDocText) {
                const mdoc = fullDocText.match(/(\d+(?:\.\d+)?)\s*(?:mi|miles?|mile)\b/i);
                if (mdoc) v = Number(mdoc[1]!);
              }
            }
            
            if (v != null) {
              if (spec.name === 'distanceMeters') {
                const miles = v / METERS_PER_MILE;
                const milesRounded = Math.round(miles * 100) / 100;
                input.value = String(milesRounded);
              } else if (spec.name === 'distanceMiles') {
                const milesRounded2 = Math.round(Number(v) * 100) / 100;
                input.value = String(milesRounded2);
              } else if (spec.name === 'timeSeconds' || spec.name === 'holdSeconds') {
                input.value = deps.secondsToHHMMSS!(v);
              } else {
                input.value = v;
              }
            }
          }
          
          input.setAttribute('data-name', spec.name);
          if (spec.name === 'reps' || spec.name === 'rpe') {
            fieldWrap.classList.add('set-field--compact');
            input.classList.add('input--compact');
          }
          fieldWrap.appendChild(input);
          r.appendChild(fieldWrap);
        }
        
        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'button--remove';
        del.setAttribute('aria-label', 'Remove set');
        del.title = 'Remove set';
        
        // Add fallback text for browsers that don't support CSS mask
        const iconText = document.createElement('span');
        iconText.className = 'icon-text';
        iconText.textContent = '🗑';
        del.appendChild(iconText);
        
        del.onclick = () => {
          setsWrap!.removeChild(r);
          updateSetLabelsLocal();
        };
        r.appendChild(del);
        
        setsWrap.appendChild(r);
        updateSetLabelsLocal();
        if (hasLoadControls) {
          updateRowLoadSummary(r);
        }
      };

      const snapshotLastRow = (): PrescriptionRow | null => {
        if (!setsWrap) return null;
        const rows = setsWrap.getElementsByClassName('set-row');
        if (!rows || !rows.length) return null;
        
        const last = rows[rows.length - 1]!;
        const inputs = last.getElementsByTagName('input');
        const obj: Record<string, any> = {};
        
        for (let i = 0; i < inputs.length; i++) {
          const inEl = inputs[i]!;
          const name = inEl.getAttribute('data-name');
          const val = inEl.value;
          if (val === '' || !name) continue;
          
          if (name === 'timeSeconds' || name === 'holdSeconds') {
            const sec = deps.parseHMSToSeconds!(val);
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
        return obj as PrescriptionRow;
      };

      if (!isReadOnly && addBtn) {
        addBtn.onclick = () => {
          const snap = snapshotLastRow();
          if (snap) {
            const rowsNow = setsWrap!.getElementsByClassName('set-row');
            addSetRow(snap, rowsNow ? rowsNow.length : undefined);
            return;
          }
          if (presetRows && presetRows.length) { addSetRow(presetRows[0]!, 0); return; }
          addSetRow({} as PrescriptionRow, undefined);
        };
      }

      // Cards are always editable and expanded; no toggle button
      const rows = initialRows;
      for (let i = 0; i < rows.length; i++) addSetRow(rows[i]!, i);

      // Sanitize: remove any extra exercise-link bullets accidentally pulled into header/notes
      try {
        const mainKey = deps.slugify!(title);
        const extraAnchors = card.querySelectorAll('a[href*="exercises/"]');
        for (let ai = 0; ai < extraAnchors.length; ai++) {
          const ahref = extraAnchors[ai]!.getAttribute('href') || '';
          const m = ahref.match(/exercises\/([\w\-]+)\.(?:md|json)$/);
          if (!m || !m[1]) continue;
          const slug = m[1];
          if (deps.slugify!(slug) !== mainKey) {
            // Remove the closest list item or the anchor itself
            let n: Node | null = extraAnchors[ai]!;
            while (n && n !== card && !((n as Element).tagName && ((n as Element).tagName === 'LI' || (n as Element).tagName === 'P' || (n as Element).className === 'exercise-card__notes'))) n = n.parentNode;
            if (n && n !== card && n.parentNode) n.parentNode.removeChild(n);
          }
        }
      } catch (e) {
        // Ignore errors
      }
      
      return card;
    };

    // Find exercise anchors and non-link exercise name spans within the rendered workout content
    const anchors = deps.workoutContent ? Array.prototype.slice.call(deps.workoutContent.getElementsByTagName('a')) : [];
    const noLinkSpans = deps.workoutContent ? Array.prototype.slice.call(deps.workoutContent.querySelectorAll('span.ex-name')) : [];
    const exNodes: HTMLElement[] = anchors.concat(noLinkSpans);

    const nearestBlockContainer = (node: Node): Element => {
      let n: Node | null = node;
      while (n && n !== deps.workoutContent) {
        if ((n as Element).tagName && ((n as Element).tagName === 'LI' || (n as Element).tagName === 'P' || (n as Element).tagName === 'DIV')) return n as Element;
        n = n.parentNode;
      }
      return (node.parentNode as Element) || deps.workoutContent!;
    };

    const findListParent = (node: Node): Element | null => {
      let n: Node | null = node;
      while (n && n !== deps.workoutContent) {
        if ((n as Element).tagName && ((n as Element).tagName === 'UL' || (n as Element).tagName === 'OL')) return n as Element;
        n = n.parentNode;
      }
      return null;
    };

    const findSupersetBody = (node: Node): HTMLElement | null => {
      let current: Node | null = node;
      while (current && current !== deps.workoutContent) {
        if ((current as Element).classList && (current as Element).classList.contains('session-superset__body')) {
          return current as HTMLElement;
        }
        current = current.parentNode;
      }
      return null;
    };

    const ensureSupersetCardsWrapper = (bodyEl: HTMLElement): HTMLElement => {
      let wrapper = bodyEl.querySelector('.session-superset__cards') as HTMLElement | null;
      if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.className = 'session-superset__cards';
        bodyEl.appendChild(wrapper);
      }
      return wrapper;
    };

    // Find the actual nearest heading element (H1-H4) above a node
    const findNearestHeadingEl = (node: Node): Element | null => {
      let n: Node | null = node;
      while (n && n !== deps.workoutContent) {
        let s: Node | null = n.previousSibling;
        while (s) {
          if (s.nodeType === 1 && (s as Element).tagName && /^H[1-4]$/.test((s as Element).tagName)) return s as Element;
          s = s.previousSibling;
        }
        n = n.parentNode;
      }
      return null;
    };

    // Collect following sibling nodes (prescriptions/cues) until next heading or next exercise anchor section
    const collectFollowingBlocks = (startEl: Element | null): CollectedBlocks => {
      const htmlParts: string[] = [];
      const toHide: Node[] = [];
      if (!startEl) return { html: '', nodes: [] };
      
      let s: Node | null = startEl.nextSibling;
      while (s) {
        if (s.nodeType === 1 && (s as Element).tagName && /^H[1-4]$/.test((s as Element).tagName)) break; // stop at next heading
        
        //Stop if upcoming node contains an exercise anchor or a non-link exercise name span
        let hasNextExercise = false;
        try {
          if ((s as Element).querySelector) {
            if ((s as Element).querySelector('a[href*="exercises/"]')) hasNextExercise = true;
            else if ((s as Element).querySelector('span.ex-name')) hasNextExercise = true;
          } else {
            const testHtml = (s as Element).outerHTML || (s.textContent || '');
            hasNextExercise = /(\b|\/)(exercises\/[\w\-]+\.(?:md|json))\b/.test(String(testHtml || ''));
          }
        } catch (e) {
          // Ignore errors
        }
        
        if (hasNextExercise) break;
        
        // Serialize this node
        if (s.nodeType === 1) {
          htmlParts.push((s as Element).outerHTML);
        } else if (s.nodeType === 3) {
          const txt = String(s.textContent || '');
          // preserve line breaks visually
          const safe = txt.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
          if (safe.trim()) htmlParts.push('<div class="md-text">' + safe + '</div>');
        }
        
        toHide.push(s);
        s = s.nextSibling;
      }
      
      return { html: htmlParts.join(''), nodes: toHide };
    };

    const findPreviousHeading = (node: Node): string => {
      let n: Node | null = node;
      while (n && n !== deps.workoutContent) {
        // Walk previous siblings of n
        let s: Node | null = n.previousSibling;
        while (s) {
          if (s.nodeType === 1 && (s as Element).tagName && /^H[1-4]$/.test((s as Element).tagName)) {
            return (s.textContent || '').trim();
          }
          s = s.previousSibling;
        }
        n = n.parentNode;
      }
      return '';
    };

    const DISPLAY_MODE_REFERENCE: SectionDisplayMode = 'reference';
    const DISPLAY_MODE_LOG: SectionDisplayMode = 'log';
    const LEGACY_REFERENCE_REGEX = /(warm|warm-up|warmup|cool|cool-down|cooldown|mobility|recovery|yin|flow)/i;

    const findEnclosingSection = (node: Node | null): HTMLElement | null => {
      let current: Node | null = node;
      while (current && current !== deps.workoutContent) {
        if (current.nodeType === 1) {
          const el = current as Element;
          if (el.tagName && el.tagName.toLowerCase() === 'section') {
            return el as HTMLElement;
          }
        }
        current = current.parentNode;
      }
      return null;
    };

    const inferLegacyDisplayMode = (sectionTitle: string, sectionType: string): SectionDisplayMode => {
      const haystack = `${sectionType || ''} ${sectionTitle || ''}`.toLowerCase();
      if (haystack && LEGACY_REFERENCE_REGEX.test(haystack)) return DISPLAY_MODE_REFERENCE;
      return DISPLAY_MODE_LOG;
    };

    const resolveSectionModeFromJSON = (section: any): SectionDisplayMode => {
      if (!section || typeof section !== 'object') return DISPLAY_MODE_LOG;
      try {
        const parserApi = (window as any).ExercAIse?.SessionParser;
        if (parserApi && typeof parserApi.resolveSectionDisplayMode === 'function') {
          return parserApi.resolveSectionDisplayMode(section);
        }
      } catch (e) {
        console.warn('SessionParser.resolveSectionDisplayMode failed, defaulting to legacy inference.', e);
      }
      const sectionTitle = typeof section.title === 'string' ? section.title : '';
      const sectionType = typeof section.type === 'string' ? section.type : '';
      return inferLegacyDisplayMode(sectionTitle, sectionType);
    };

    const resolveSectionModeForAnchor = (anchorEl: HTMLElement, sectionTitle: string): SectionDisplayMode => {
      const sectionEl = findEnclosingSection(anchorEl);
      if (sectionEl) {
        const raw = (sectionEl.getAttribute('data-display-mode') || '').toLowerCase();
        if (raw === DISPLAY_MODE_REFERENCE || raw === DISPLAY_MODE_LOG) {
          return raw as SectionDisplayMode;
        }
        if (raw) {
          console.warn('Unknown data-display-mode "%s"; falling back to legacy heuristics.', raw);
        }
        const secTypeAttr = sectionEl.getAttribute('data-sectype') || '';
        return inferLegacyDisplayMode(sectionTitle, secTypeAttr);
      }
      return inferLegacyDisplayMode(sectionTitle, '');
    };

    let foundCount = 0;
    const foundKeys: { [key: string]: boolean } = {};
    
    for (let ai = 0; ai < exNodes.length; ai++) {
      const a = exNodes[ai]!;
      const isAnchorNode = !!(a && a.tagName && a.tagName.toLowerCase() === 'a');
      const href = isAnchorNode ? (a.getAttribute('href') || '') : '';
      
      // Accept internal exercise links in various forms: exercises/..., ./exercises/..., ../exercises/..., exercise.html?file=exercises/..., or absolute http(s) with /exercises/...
      if (isAnchorNode && !/(?:^(?:https?:\/\/[^\/]+\/)?|\.?\.\/|\/)?(?:exercise\.html\?file=)?exercises\/[\w\-]+\.(?:md|json)$/.test(href)) continue;
      
      let title = a.textContent || (a as any).innerText || '';
      
      // Normalize title by removing parenthetical hints, e.g., "Easy Run (Easy Jog)" -> "Easy Run"
      const normTitle = title.replace(/\s*\([^\)]*\)\s*$/, '').trim();
      if (!normTitle) continue;
      
      const exKey = deps.slugify!(normTitle);
      
      // Inspect anchor meta for embedded cues/log type metadata
      const metaRaw0 = a.getAttribute('data-exmeta') || '';
      let meta0: ExerciseMetadata | null = null; 
      try { meta0 = metaRaw0 ? JSON.parse(metaRaw0) : null; } catch (e) { meta0 = null; }
      
      // Determine section by nearest previous heading; skip warm-up/cool-down
      const container = nearestBlockContainer(a);
      const sectionTitle = findPreviousHeading(container);
      const sectionMode = resolveSectionModeForAnchor(a, sectionTitle);
      const isReferenceSection = sectionMode === DISPLAY_MODE_REFERENCE;
      
      // Extract saved data from perf-2 format
      let savedRows: PrescriptionRow[] = [];
      if (saved) {
        if (isPerf2) {
          // perf-2: Extract from nested structure
          savedRows = extractSetsFromPerf2(saved as PerformanceLog, exKey);
        } else if ((saved as any).exercises) {
          // Legacy format detected - should not happen after migration
          console.warn('Legacy performance log format detected, ignoring saved data');
        }
      }
      
      let preset = prescriptions[exKey] || prescriptions[deps.slugify!(title)] || [];
      
      // Do not seed defaults for JSON-driven sessions; rely on explicit prescriptions
      if (!isJSON && !isReferenceSection && (!preset || !preset.length)) {
        const secRounds = detectRoundsHint(sectionTitle) || docRoundsHint || 3;
        const defaults: PrescriptionRow[] = [];
        for (let di = 1; di <= Math.max(1, secRounds); di++) defaults.push({ set: di });
        preset = defaults;
      }
      
      const headEl = findNearestHeadingEl(a) || null;
      
      // Prefer a simple header with the clean exercise name as a link
      let headerHTML = '';
      if (a) {
        const cleanText = (a.textContent || (a as any).innerText || '').replace(/^\s*\d+[\)\.-]\s*/, '').trim();
        const hrefFixed = isAnchorNode ? (a.getAttribute('href') || '') : '';
        
        // Meta (cues/prescription) passed via data-exmeta on anchor from JSON renderer
        const metaRaw = a.getAttribute('data-exmeta') || '';
        let meta: ExerciseMetadata | null = null;
        try { meta = metaRaw ? JSON.parse(metaRaw) : null; } catch (e) { meta = null; }
        
        let extraBits = '';
        if (meta && meta.prescription) {
          const p = meta.prescription;
          const parts: string[] = [];
          if (p.sets != null && p.reps != null) parts.push(String(p.sets) + ' x ' + String(p.reps));
          
          // Weight: append ' lb' only when numeric; if string, use as-is (may include x2/units)
          if (p.weight != null) {
            if (typeof p.weight === 'number') parts.push(String(p.weight) + ' lb');
            else parts.push(String(p.weight));
          }
          
          // Multiplier tag only if not already expressed in a weight string
          const weightStr = (typeof p.weight === 'string') ? p.weight.toLowerCase() : '';
          if (p.multiplier === 2 && !(weightStr && /(x2|×2|per\s*hand|each|per\s*side)/.test(weightStr))) parts.push('x2');
          if (p.multiplier === 0 && !(weightStr && /bodyweight/.test(weightStr))) parts.push('bodyweight');
          
          if (p.timeSeconds != null) {
            // reuse secondsToHHMMSS
            try { parts.push(deps.secondsToHHMMSS!(p.timeSeconds)); } catch (e) {
              // Ignore
            }
          }
          
          if (p.distanceMiles != null) parts.push(String(p.distanceMiles) + ' mi');
          if (p.rpe != null) parts.push('RPE ' + String(p.rpe));
          if (p.restSeconds != null) parts.push('Rest ' + String(p.restSeconds) + 's');
          if (parts.length) extraBits += ' — <span class="ex-presc">' + parts.join(' · ') + '</span>';
        }
        
        if (meta && meta.cues && meta.cues.length) {
          extraBits += '<ul class="ex-cues">' + meta.cues.map((c) => '<li>' + c + '</li>').join('') + '</ul>';
        }
        
        // Preserve original meta so downstream field selection can read explicit logType without re-parsing the DOM
        // Inline escape for attribute context (avoid relying on later attrEscape definitions)
        const _escAttr = (s: string): string => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
        
        if (hrefFixed) {
          headerHTML = '<a href="' + hrefFixed + '" data-exmeta="' + _escAttr(metaRaw) + '">' + cleanText + '</a>' + extraBits;
        } else {
          headerHTML = '<span class="ex-name no-link" data-exmeta="' + _escAttr(metaRaw) + '">' + cleanText + '</span>' + extraBits;
        }
      } else if (container) {
        headerHTML = container.innerHTML || '';
      } else if (headEl) {
        headerHTML = (headEl as HTMLElement).outerHTML || '';
      }
      
      // Skip card injection for sections marked as reference-only
      if (isReferenceSection) {
        // Do not inject cards for warm-up/cooldown/mobility; mark as handled so we don't auto-inject later
        foundKeys[exKey] = true;
        continue;
      }
      
      const card = createExerciseCard(normTitle, preset, savedRows, headerHTML, { explicitLogType: (meta0 && meta0.logType) ? meta0.logType : undefined });
      
      // Pull prescription/cues following this container into the card
      const extra = collectFollowingBlocks(container);
      if (extra && extra.html) {
        const notes = document.createElement('div');
        notes.className = 'exercise-card__notes';
        notes.innerHTML = extra.html;
        card.appendChild(notes);
      }
      
      // Place card and remove original blocks.
      const supersetBody = findSupersetBody(container);
      if (supersetBody) {
        const cardWrapper = ensureSupersetCardsWrapper(supersetBody);
        cardWrapper.appendChild(card);
      } else if (container && container.tagName === 'LI') {
        const parentList = findListParent(container);
        const listHolder = parentList && parentList.parentNode ? parentList.parentNode : deps.workoutContent!;
        const insertAfter = parentList && (parentList as any).__lastCard ? (parentList as any).__lastCard : parentList;
        if (listHolder && (listHolder as Element).insertBefore) {
          if (insertAfter && insertAfter.nextSibling) (listHolder as Element).insertBefore(card, insertAfter.nextSibling);
          else listHolder.appendChild(card);
        } else {
          deps.workoutContent!.appendChild(card);
        }
        if (parentList) (parentList as any).__lastCard = card;
      } else {
        const parent = container.parentNode || deps.workoutContent!;
        if (parent && (parent as Element).insertBefore) {
          if (container.nextSibling) (parent as Element).insertBefore(card, container.nextSibling);
          else parent.appendChild(card);
        } else {
          deps.workoutContent!.appendChild(card);
        }
      }

      // Remove the original container entirely
      try { container.parentNode && container.parentNode.removeChild(container); } catch (e) {
        // Ignore
      }

      // Clean up empty reference lists (e.g., superset ULs) to avoid blank bullets in log sections
      const parentListCleanup = findListParent(container);
      if (parentListCleanup && !parentListCleanup.querySelector('li')) {
        try {
          parentListCleanup.parentNode && parentListCleanup.parentNode.removeChild(parentListCleanup);
        } catch (cleanupErr) {
          // Ignore
        }
      }
      
      // Remove any collected following blocks now that they're inside the card
      if (extra && extra.nodes) {
        for (let hideIdx = 0; hideIdx < extra.nodes.length; hideIdx++) {
          const nodeToHide = extra.nodes[hideIdx]!;
          try {
            if (nodeToHide && nodeToHide.parentNode) nodeToHide.parentNode.removeChild(nodeToHide);
          } catch (e) {
            // Ignore
          }
        }
      }
      
      foundCount++;
      foundKeys[exKey] = true;
    }

    // Fallback: inject cards for any prescriptions without a visible exercise link (e.g., run main set)
    const titleCaseFromKey = (k: string): string => {
      const parts = String(k || '').split('-');
      for (let i = 0; i < parts.length; i++) {
        if (parts[i]!.length) parts[i] = parts[i]!.charAt(0).toUpperCase() + parts[i]!.slice(1);
      }
      return parts.join(' ');
    };

    const findMainHeadingNode = (): Element | null => {
      const headings = deps.workoutContent ? deps.workoutContent.querySelectorAll('h2, h3, h4') : [];
      for (let i = 0; i < headings.length; i++) {
        const t = (headings[i]!.textContent || '').toLowerCase();
        if (t.indexOf('main') !== -1 || t.indexOf('conditioning') !== -1) return headings[i]!;
      }
      return null;
    };

    const mainHead = findMainHeadingNode();
    
    // Heuristic: detect if this workout is an endurance-style session (to filter injected cards)
    const docTextForHeuristic = (deps.workoutContent && (deps.workoutContent.textContent || (deps.workoutContent as any).innerText) || '').toLowerCase();
    const isEnduranceDoc = /\b(run|jog|walk|tempo|quality run|easy run|bike|cycle|ride|rower|rowing|erg|swim)\b/.test(docTextForHeuristic);
    
    // If this is a JSON session (isJSON) and we already rendered items with anchors, do not inject fallback cards
    if (isJSON) {
      // Skip fallback injection
    } else {
      for (const pKey in prescriptions) {
        if (!prescriptions.hasOwnProperty(pKey)) continue;
        if (foundKeys[pKey]) continue;
        
        const presetRows = prescriptions[pKey] || [];
        if (!presetRows || !presetRows.length) continue;
        
        // Skip if these look like warm/cool prescriptions (heuristic below)
        let skip = true;
        for (let rr = 0; rr < presetRows.length; rr++) {
          const row: PrescriptionRow = presetRows[rr] || {} as PrescriptionRow;
          const hasDist = (row.distanceMiles != null || row.distanceMeters != null);
          const hasTime = (row.timeSeconds != null);
          const hasRpe = (row.rpe != null);
          const hasWeight = (row.weight != null || (row as any).load != null);
          const hasReps = (row.reps != null);
          
          if (isEnduranceDoc) {
            // In endurance docs, only inject rows that are endurance-like (distance/time/RPE), and avoid pure weight/reps
            if ((hasDist || hasTime || hasRpe) && !(hasWeight || hasReps)) { skip = false; break; }
          } else {
            // General heuristic: allow if meaningful work (distance/reps/weight) or long timed efforts (>90s)
            if (hasDist || hasReps || hasWeight) { skip = false; break; }
            if (hasTime && row.timeSeconds && row.timeSeconds > 90) { skip = false; break; }
          }
        }
        
        if (skip) continue;
        
        const display = titleCaseFromKey(pKey);
        
        // Extract saved data from perf-2 format
        let savedRows2: PrescriptionRow[] = [];
        if (saved) {
          if (isPerf2) {
            // perf-2: Extract from nested structure
            savedRows2 = extractSetsFromPerf2(saved as PerformanceLog, pKey);
          } else if ((saved as any).exercises) {
            // Legacy format detected - should not happen after migration
            console.warn('Legacy performance log format detected, ignoring saved data');
          }
        }
        
        const cardX = createExerciseCard(display, presetRows, savedRows2);
        
        if (mainHead && mainHead.parentNode) {
          if (mainHead.nextSibling) mainHead.parentNode.insertBefore(cardX, mainHead.nextSibling);
          else mainHead.parentNode.appendChild(cardX);
        } else {
          deps.workoutContent!.appendChild(cardX);
        }
        
        foundCount++;
        foundKeys[pKey] = true;
      }
    }

    // ========================================================================
    // perf-2: Nested Structure Collection
    // ========================================================================

    /**
     * Convert exercise name to slug for exercise key mapping
     * Reuses the slugify function from dependencies
     */
    const exerciseKeyFromName = (name: string): string => {
      return deps.slugify!(name);
    };

    /**
     * Get the number of sets/rows logged for a specific exercise
     */
    const getNumSetsForExercise = (exKey: string) => {
      const scope = deps.workoutContent || document;
      const card = scope.querySelector(`[data-exkey="${exKey}"]`) as HTMLElement;
      if (!card) return 0;
      const rows = card.getElementsByClassName('set-row');
      return rows.length;
    };

    /**
     * Get performance data for one set of an exercise
     * Returns null if no data entered for that set
     */
    const getSetDataForExercise = (exKey: string, setNumber: number) => {
      const scope = deps.workoutContent || document;
      const card = scope.querySelector(`[data-exkey="${exKey}"]`) as HTMLElement;
      if (!card) return null;
      
      const rows = card.getElementsByClassName('set-row');
      if (setNumber < 1 || setNumber > rows.length) return null;
      
      const rowEl = rows[setNumber - 1]!;
      const inputs = rowEl.getElementsByTagName('input');
      const obj: Record<string, any> = {};
      
      for (let k = 0; k < inputs.length; k++) {
        const inEl = inputs[k]!;
        const name = inEl.getAttribute('data-name');
        const val = inEl.value;
        if (val === '' || !name) continue;
        
        if (name === 'distanceMeters' || name === 'distanceMiles') {
          const numDist = Number(val);
          if (!isNaN(numDist)) obj.distanceMiles = numDist;
          continue;
        }
        
        if (name === 'timeSeconds' || name === 'holdSeconds') {
          const sec = deps.parseHMSToSeconds!(val);
          if (sec != null) obj[name] = sec;
          continue;
        }
        
        const num = Number(val);
        if (!isNaN(num)) obj[name] = num;
      }
      
      const angleForCard = readAngleFromCard(card);
      if (angleForCard != null) obj.angle = angleForCard;
      // Return null if no data was entered
      const hasAny = (obj.weight != null || obj.multiplier != null || obj.reps != null || 
             obj.rpe != null || obj.timeSeconds != null || obj.holdSeconds != null || 
             obj.distanceMiles != null);
      if (!hasAny) return null;
      
      return obj;
    };

    /**
     * Collect sets for a standalone exercise
     */
    const collectSetsForExercise = (exKey: string) => {
      const scope = deps.workoutContent || document;
      const card = scope.querySelector(`[data-exkey="${exKey}"]`) as HTMLElement;
      if (!card) return [];
      
      const rows = card.getElementsByClassName('set-row');
      const setsArr: any[] = [];
      
      for (let r = 0; r < rows.length; r++) {
        const rowEl = rows[r]!;
        const inputs = rowEl.getElementsByTagName('input');
        const obj: Record<string, any> = { set: (r + 1) };
        
        for (let k = 0; k < inputs.length; k++) {
          const inEl = inputs[k]!;
          const name = inEl.getAttribute('data-name');
          const val = inEl.value;
          if (val === '' || !name) continue;
          
          if (name === 'distanceMeters' || name === 'distanceMiles') {
            const numDist = Number(val);
            if (!isNaN(numDist)) obj.distanceMiles = numDist;
            continue;
          }
          
          if (name === 'timeSeconds' || name === 'holdSeconds') {
            const sec = deps.parseHMSToSeconds!(val);
            if (sec != null) obj[name] = sec;
            continue;
          }
          
          const num = Number(val);
          if (!isNaN(num)) obj[name] = num;
        }
        
        const angleForCard = readAngleFromCard(card);
        if (angleForCard != null) obj.angle = angleForCard;
        const hasAny = (obj.weight != null || obj.multiplier != null || obj.reps != null || 
                 obj.rpe != null || obj.timeSeconds != null || obj.holdSeconds != null || 
                 obj.distanceMiles != null);
        if (hasAny) {
          setsArr.push(obj);
        }
      }
      
      return setsArr;
    };

    /**
     * Group sets into rounds for supersets and circuits
     * Each round contains performance data for all exercises in the superset/circuit
     */
    const collectRoundsForSuperset = (children: any[], prescribedRest?: number) => {
      const exerciseKeys = children.map((child: any) => exerciseKeyFromName(child.name));
      const numSets = Math.max(...exerciseKeys.map(key => getNumSetsForExercise(key)), 0);
      const rounds: any[] = [];
      
      for (let r = 1; r <= numSets; r++) {
        const exercises: any[] = [];
        
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
          const round: any = {
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

    /**
     * Build exercise index for fast queries
     * Calculates volume, average RPE, and provides JSONPath to location
     */
    const buildExerciseIndex = (sections: any[]) => {
      const index: Record<string, any> = {};
      
      sections.forEach((section, sIdx) => {
        section.items.forEach((item: any, iIdx: number) => {
          if (item.kind === 'exercise' && item.sets && item.sets.length > 0) {
            const key = exerciseKeyFromName(item.name);
            const angleValue = detectAngleFromSets(item.sets);
            const indexKey = buildExerciseIndexKey(key, angleValue);
            const storedAngle = typeof angleValue === 'number' && isFinite(angleValue) ? angleValue : 0;
            const totalVolume = item.sets.reduce((sum: number, set: any) => {
              const weight = (set.weight || 0) * (set.multiplier || 1);
              return sum + (weight * (set.reps || 0));
            }, 0);
            const avgRPE = item.sets.reduce((sum: number, set: any) => sum + (set.rpe || 0), 0) / item.sets.length;
            
            index[indexKey] = {
              angle: storedAngle,
              name: item.name,
              sectionPath: `sections[${sIdx}].items[${iIdx}].sets[*]`,
              totalSets: item.sets.length,
              totalRounds: 0,
              avgRPE: avgRPE,
              totalVolume: totalVolume
            };
          } else if ((item.kind === 'superset' || item.kind === 'circuit') && item.rounds && item.rounds.length > 0) {
            item.rounds[0]?.exercises.forEach((ex: any, exIdx: number) => {
              const slug = (typeof ex.key === 'string' && ex.key.length) ? ex.key : exerciseKeyFromName(ex.name);
              const angleValue = detectAngleFromRounds(item.rounds, exIdx);
              const indexKey = buildExerciseIndexKey(slug, angleValue);
              const storedAngle = typeof angleValue === 'number' && isFinite(angleValue) ? angleValue : 0;
              const totalVolume = item.rounds.reduce((sum: number, round: any) => {
                const exercise = round.exercises[exIdx];
                if (!exercise) return sum;
                const weight = (exercise.weight || 0) * (exercise.multiplier || 1);
                return sum + (weight * (exercise.reps || 0));
              }, 0);
              const avgRPE = item.rounds.reduce((sum: number, round: any) => {
                return sum + (round.exercises[exIdx]?.rpe || 0);
              }, 0) / item.rounds.length;
              
              index[indexKey] = {
                angle: storedAngle,
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

    /**
     * Collect nested performance data (perf-2 format)
     * Mirrors session structure with sections, items, and rounds
     * TODO: Wire this up to button handlers for perf-2 migration
     */
    // @ts-ignore - will be used for perf-2 migration
    const collectNestedData = (sessionJSON: string) => {
      // Parse session JSON to get structure
      let sessionData: any = null;
      try {
        sessionData = JSON.parse(sessionJSON);
      } catch (e) {
        console.error('Failed to parse session JSON:', e);
        return null;
      }
      
      // Normalize workoutFile
      let wf = String(filePath || '');
      wf = wf.replace(/^(?:\.\.\/)+/, '').replace(/^\.\//, '');
      const mWf = wf.match(/workouts\/.*$/);
      if (mWf) wf = mWf[0]!;
      
      // Initialize perf-2 log
      const log: any = {
        version: 'perf-2',
        workoutFile: wf,
        timestamp: new Date().toISOString(),
        sections: []
      };
      
      // Copy metadata from session
      if (sessionData.date) log.date = sessionData.date;
      if (sessionData.block != null) log.block = sessionData.block;
      if (sessionData.week != null) log.week = sessionData.week;
      if (sessionData.title) log.title = sessionData.title;
      
      // Traverse session sections and build nested structure
      if (sessionData.sections && Array.isArray(sessionData.sections)) {
        for (const sessionSection of sessionData.sections) {
          const sectionMode = resolveSectionModeFromJSON(sessionSection);
          if (sectionMode === DISPLAY_MODE_REFERENCE) {
            continue; // Do not include reference-only sections in perf logs
          }
          const section: any = {
            type: sessionSection.type,
            title: sessionSection.title,
            items: []
          };
          
          if (sessionSection.notes) section.notes = sessionSection.notes;
          
          // Process items in this section
          if (sessionSection.items && Array.isArray(sessionSection.items)) {
            for (const sessionItem of sessionSection.items) {
              if (sessionItem.kind === 'exercise') {
                // Standalone exercise: collect sets
                const exKey = exerciseKeyFromName(sessionItem.name);
                const sets = collectSetsForExercise(exKey);
                
                if (sets.length > 0) {
                  const item: any = {
                    kind: 'exercise',
                    name: sessionItem.name,
                    sets: sets
                  };
                  if (sessionItem.notes) item.notes = sessionItem.notes;
                  section.items.push(item);
                }
              } else if (sessionItem.kind === 'superset' || sessionItem.kind === 'circuit') {
                // Superset/circuit: group sets into rounds
                const prescribedRest = sessionItem.children?.[sessionItem.children.length - 1]?.prescription?.restSeconds;
                const rounds = collectRoundsForSuperset(sessionItem.children || [], prescribedRest);
                
                if (rounds.length > 0) {
                  const item: any = {
                    kind: sessionItem.kind,
                    name: sessionItem.name,
                    rounds: rounds
                  };
                  if (sessionItem.notes) item.notes = sessionItem.notes;
                  section.items.push(item);
                }
              }
            }
          }
          
          // Only include sections with items that have data
          if (section.items.length > 0) {
            log.sections.push(section);
          }
        }
      }
      
      // Build exercise index for fast queries
      if (log.sections.length > 0) {
        log.exerciseIndex = buildExerciseIndex(log.sections);
      }
      
      return log;
    };

    /**
     * Validate perf-2 performance log
     * TODO: Wire this up for perf-2 validation
     */
    // @ts-ignore - will be used for perf-2 validation
    const validatePerformanceV2 = (data: any) => {
      const errors: string[] = [];
      const isNum = (v: any): boolean => typeof v === 'number' && !isNaN(v);
      
      if (!data || typeof data !== 'object') { errors.push('root: not object'); return errors; }
      if (data.version !== 'perf-2') errors.push('version must be perf-2');
      if (!data.workoutFile || typeof data.workoutFile !== 'string') errors.push('workoutFile missing');
      if (!data.timestamp || typeof data.timestamp !== 'string') errors.push('timestamp missing');
      if (!data.sections || !Array.isArray(data.sections)) errors.push('sections missing or not array');
      else {
        data.sections.forEach((section: any, sIdx: number) => {
          if (!section.type) errors.push(`section ${sIdx}: type missing`);
          if (!section.title) errors.push(`section ${sIdx}: title missing`);
          if (!section.items || !Array.isArray(section.items)) errors.push(`section ${sIdx}: items missing or not array`);
          else {
            section.items.forEach((item: any, iIdx: number) => {
              const itemPath = `section ${sIdx} item ${iIdx}`;
              if (!item.kind || !['exercise', 'superset', 'circuit'].includes(item.kind)) {
                errors.push(`${itemPath}: invalid kind`);
              }
              if (!item.name) errors.push(`${itemPath}: name missing`);
              
              if (item.kind === 'exercise') {
                if (!item.sets || !Array.isArray(item.sets)) errors.push(`${itemPath}: sets missing or not array`);
                else {
                  item.sets.forEach((set: any, setIdx: number) => {
                    if (!isNum(set.set) || set.set < 1) errors.push(`${itemPath} set ${setIdx}: invalid set number`);
                  });
                }
              } else if (item.kind === 'superset' || item.kind === 'circuit') {
                if (!item.rounds || !Array.isArray(item.rounds)) errors.push(`${itemPath}: rounds missing or not array`);
                else {
                  item.rounds.forEach((round: any, rIdx: number) => {
                    if (!isNum(round.round) || round.round < 1) errors.push(`${itemPath} round ${rIdx}: invalid round number`);
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

    // Wire up action buttons
    deps.saveBtn!.onclick = () => {
      // Use perf-2 format for localStorage (nested structure preserving workout organization)
      const sessionJSON = deps.getCurrentSessionJSON ? deps.getCurrentSessionJSON() : null;
      let data: any;
      
      if (sessionJSON) {
        // Use perf-2 nested structure format
        try {
          data = collectNestedData(sessionJSON);
          if (!data) {
            console.error('❌ perf-2 collection returned null');
            deps.status!('Error: Could not collect performance data', { important: true });
            return;
          }
          console.log('✅ Using perf-2 nested structure format for localStorage');
        } catch (e) {
          console.error('❌ Error collecting perf-2 data:', e);
          deps.status!('Error: Could not collect performance data', { important: true });
          return;
        }
      } else {
        console.error('❌ No session JSON available for perf-2 collection');
        deps.status!('Error: Workout session data not available', { important: true });
        return;
      }
      
      deps.saveLocal!(filePath, data);
      deps.status!(`Saved locally at ` + new Date().toLocaleTimeString(), { important: true });
    };

    deps.copyBtn!.onclick = () => {
      // Use perf-2 nested structure format
      const sessionJSON = deps.getCurrentSessionJSON ? deps.getCurrentSessionJSON() : null;
      
      if (!sessionJSON) {
        console.error('❌ No session JSON available for perf-2 collection');
        deps.status!('Error: Workout session data not available', { important: true });
        return;
      }
      
      let data: any;
      let errs: string[] = [];
      
      try {
        data = collectNestedData(sessionJSON);
        if (!data) {
          console.error('❌ perf-2 collection returned null');
          deps.status!('Error: Could not collect performance data', { important: true });
          return;
        }
        errs = validatePerformanceV2(data);
        console.log('✅ Using perf-2 nested structure format');
      } catch (e) {
        console.error('❌ Error collecting perf-2 data:', e);
        deps.status!('Error: Could not collect performance data', { important: true });
        return;
      }
      
      if (errs.length) {
        // Attach errors for debugging (not schema-defined) but do not block copy
        (data as any).validationErrors = errs.slice(0);
        console.warn('Performance validation errors (perf-2):', errs);
      }
      
      const json = JSON.stringify(data, null, 2);
      let didCopy = false;
      
      if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(json).then(() => { 
          didCopy = true; 
          deps.status!('Copied JSON' + (errs.length ? ' (WITH WARNINGS)' : '') + '.', { important: true }); 
        }).catch(() => {
          // Ignore
        });
      }
      
      if (!didCopy) {
        deps.copyWrapper!.style.display = 'block';
        deps.copyTarget!.value = json;
        deps.copyTarget!.focus();
        deps.copyTarget!.select();
        deps.status!('Copy JSON shown below; select-all and copy manually.' + (errs.length ? ' (Validation warnings in console)' : ''));
      }
    };

    if (deps.downloadBtn) deps.downloadBtn.onclick = () => {
      // Use perf-2 nested structure format
      const sessionJSON = deps.getCurrentSessionJSON ? deps.getCurrentSessionJSON() : null;
      
      if (!sessionJSON) {
        console.error('❌ No session JSON available for perf-2 collection');
        deps.status!('Error: Workout session data not available', { important: true });
        return;
      }
      
      let data: any;
      let errs: string[] = [];
      
      try {
        data = collectNestedData(sessionJSON);
        if (!data) {
          console.error('❌ perf-2 collection returned null');
          deps.status!('Error: Could not collect performance data', { important: true });
          return;
        }
        errs = validatePerformanceV2(data);
        console.log('✅ Using perf-2 nested structure format');
      } catch (e) {
        console.error('❌ Error collecting perf-2 data:', e);
        deps.status!('Error: Could not collect performance data', { important: true });
        return;
      }
      
      if (errs.length) {
        (data as any).validationErrors = errs.slice(0);
        console.warn('Performance validation errors (perf-2):', errs);
      }
      
      const json = JSON.stringify(data, null, 2);
      const wf = data.workoutFile || 'session';
      // Derive a safe base name (strip folders, extension)
      const base = wf.split('/').pop()!.replace(/\.[^.]+$/, '') || 'session';
      const ts = (new Date().toISOString().replace(/[:]/g, '').replace(/\..+/, ''));
      const fileName = base + '_' + ts + '.json';
      
      try {
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { try { document.body.removeChild(a); URL.revokeObjectURL(url); } catch (e) {
          // Ignore
        } }, 250);
        deps.status!(`Downloaded ${fileName}` + (errs.length ? ' (WITH WARNINGS)' : ''), { important: true });
      } catch (e) {
        // Fallback: reveal JSON for manual save
        deps.copyWrapper!.style.display = 'block';
        deps.copyTarget!.value = json;
        deps.status!('Download unsupported; JSON shown for manual copy.' + (errs.length ? ' (Warnings in console)' : ''), { important: true });
      }
    };

    deps.issueBtn!.onclick = () => {
      // Use perf-2 nested structure format
      const sessionJSON = deps.getCurrentSessionJSON ? deps.getCurrentSessionJSON() : null;
      
      if (!sessionJSON) {
        console.error('❌ No session JSON available for perf-2 collection');
        deps.status!('Error: Workout session data not available', { important: true });
        return;
      }
      
      let data: any;
      let errs: string[] = [];
      
      try {
        data = collectNestedData(sessionJSON);
        if (!data) {
          console.error('❌ perf-2 collection returned null');
          deps.status!('Error: Could not collect performance data', { important: true });
          return;
        }
        errs = validatePerformanceV2(data);
        console.log('✅ Using perf-2 nested structure format for GitHub issue');
      } catch (e) {
        console.error('❌ Error collecting perf-2 data:', e);
        deps.status!('Error: Could not collect performance data', { important: true });
        return;
      }
      
      if (errs.length) {
        (data as any).validationErrors = errs.slice(0);
        console.warn('Performance validation errors (perf-2):', errs);
      }
      
      const json = JSON.stringify(data, null, 2);
      const owner = 'jrodhead';
      const repo = 'exercAIse';
      const title = 'Workout log ' + (data.workoutFile || (data as any).file || '') + ' @ ' + new Date().toISOString();
      
      // Include the marker and fenced code block so the GitHub Action can detect and parse it
      const header = 'Paste will be committed by Actions.\n\n';
      const issueBodyTemplate = header + '```json\n' + json + '\n```\n';

      const showTextarea = (): void => {
        deps.copyWrapper!.style.display = 'block';
        deps.copyTarget!.value = issueBodyTemplate;
        try { deps.copyTarget!.focus(); deps.copyTarget!.select(); } catch (e) {
          // Ignore
        }
        deps.status!('Template shown below — paste into the Issue body.');
      };
      
      const openIssue = (): void => {
        if (deps.openIssueLink) deps.openIssueLink.style.display = 'none';
        const url = 'https://github.com/' + owner + '/' + repo + '/issues/new?title=' + encodeURIComponent(title);
        try { window.open(url, '_blank'); } catch (e) { window.location.href = url; }
      };

      // Always attempt to copy the full issue body template automatically, then open the Issue page with title-only.
      if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(issueBodyTemplate)
          .then(() => {
            deps.status!('Copied template to clipboard. Opening Issue page…', { important: true });
            openIssue();
          })
          .catch(() => {
            showTextarea();
            openIssue();
          });
      } else {
        showTextarea();
        openIssue();
      }
    };

    deps.clearBtn!.onclick = () => {
      if (!confirm('Clear all entries for this workout?')) return;
      
      // Re-render the workout content from the original raw text to restore hidden blocks
      if (isJSON) {
        let pretty = '';
        try { pretty = JSON.stringify(JSON.parse(raw || '{}'), null, 2); } catch (e) { pretty = raw || ''; }
        deps.workoutContent!.innerHTML = '<pre>' + (pretty || '') + '</pre>';
      } else {
        deps.workoutContent!.innerHTML = deps.renderMarkdownBasic!(raw || '');
        deps.fixExerciseAnchors!(deps.workoutContent!);
      }
      
      // Rebuild the form and re-inject fresh cards (no saved rows)
      buildForm(filePath, raw, isJSON);
      deps.status!('Cleared form.', { important: true });
    };
  };

  // Public API
  return {
    init,
    buildForm
  };
})();

// Export for ES module compatibility (makes this file a module for TypeScript)
