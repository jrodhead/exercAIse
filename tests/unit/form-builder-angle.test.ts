/**
 * FormBuilder angle rendering tests
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';

let FormBuilder: any;

beforeAll(async () => {
  await import('../../dist/assets/form-builder.js');
  FormBuilder = (window as any).ExercAIse?.FormBuilder;
  if (!FormBuilder) {
    throw new Error('FormBuilder module not available. Did you run `npm run build`?');
  }
});

const buildDeps = (angle = 30) => {
  const workoutContent = document.createElement('div');
  const meta = {
    logType: 'strength',
    prescription: {
      sets: 2,
      reps: 8,
      weight: '45 lb per hand',
      angle
    },
    cues: ['Keep wrists neutral']
  };

  workoutContent.innerHTML = `
    <section data-sectype="Strength">
      <h2>Main Work</h2>
      <ul>
        <li>
          <a href="exercises/incline_dumbbell_bench_press.json" data-exmeta='${JSON.stringify(meta)}'>Incline DB Bench Press</a>
        </li>
      </ul>
    </section>
  `;

  const sessionJSON = {
    sections: [
      {
        type: 'Strength',
        title: 'Main Work',
        items: [
          {
            kind: 'exercise',
            name: '[Incline DB Bench Press](../exercises/incline_dumbbell_bench_press.json)',
            logType: 'strength',
            prescription: {
              sets: 2,
              reps: 8,
              weight: '45 lb per hand',
              angle
            }
          }
        ]
      }
    ]
  };

  const deps = {
    slugify: (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    extractExercisesFromJSON: vi.fn(() => []),
    extractExercisesFromMarkdown: vi.fn(() => []),
    parseJSONPrescriptions: vi.fn(() => ({
      'incline-dumbbell-bench-press': [
        { set: 1, reps: 8, angle },
        { set: 2, reps: 8, angle }
      ]
    })),
    parseMarkdownPrescriptions: vi.fn(() => ({})),
    loadSaved: vi.fn(() => null),
    saveLocal: vi.fn(),
    parseHMSToSeconds: vi.fn(() => null),
    secondsToHHMMSS: vi.fn((sec: number) => {
      if (typeof sec !== 'number') return '';
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }),
    renderMarkdownBasic: vi.fn((md: string) => md),
    fixExerciseAnchors: vi.fn(),
    status: vi.fn(),
    getCurrentSessionJSON: vi.fn(() => JSON.stringify(sessionJSON)),
    workoutContent,
    exerciseFormsEl: document.createElement('div'),
    saveBtn: document.createElement('button'),
    copyBtn: document.createElement('button'),
    downloadBtn: document.createElement('button'),
    issueBtn: document.createElement('button'),
    clearBtn: document.createElement('button'),
    copyWrapper: document.createElement('div'),
    copyTarget: document.createElement('textarea'),
    openIssueLink: document.createElement('a')
  };

  return { deps, workoutContent, sessionJSON };
};

describe('FormBuilder angle badges', () => {
  it('renders incline badge chips when prescription metadata defines an angle', () => {
    const { deps, workoutContent, sessionJSON } = buildDeps(30);
    FormBuilder.init(deps);

    const raw = JSON.stringify(sessionJSON);
    FormBuilder.buildForm('workouts/5-2_Test.json', raw, true);

    const card = workoutContent.querySelector('.exercise-card');
    expect(card).toBeTruthy();
    expect(card?.getAttribute('data-angle')).toBe('30');

    const badge = card?.querySelector('.ex-angle');
    expect(badge?.textContent).toContain('30° Incline');
    expect(badge?.className).toContain('ex-angle--incline');
  });
});
