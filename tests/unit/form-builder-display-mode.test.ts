/**
 * FormBuilder displayMode + perf-2 export tests
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

const buildDeps = () => {
  const workoutContent = document.createElement('div');
  const warmupMeta = {
    logType: 'mobility',
    prescription: { sets: 1, reps: 5 }
  };
  const strengthMeta = {
    logType: 'strength',
    prescription: { sets: 2, reps: 8, weight: '35 x2 lb' }
  };

  const warmupMetaAttr = JSON.stringify(warmupMeta).replace(/"/g, '&quot;');
  const strengthMetaAttr = JSON.stringify(strengthMeta).replace(/"/g, '&quot;');

  workoutContent.innerHTML = `
    <section data-sectype="Warm-up" data-display-mode="reference">
      <h2>Warm-up</h2>
      <ul>
        <li>
          <a href="exercises/cat_cow.json" data-exmeta="${warmupMetaAttr}">Cat Cow</a>
        </li>
      </ul>
    </section>
    <section data-sectype="Strength" data-display-mode="log">
      <h2>Main Work</h2>
      <ul>
        <li>
          <a href="exercises/goblet_squat.json" data-exmeta="${strengthMetaAttr}">Goblet Squat</a>
        </li>
      </ul>
    </section>
  `;

  const sessionJSON = {
    sections: [
      {
        type: 'Warm-up',
        title: 'Joint Prep',
        displayMode: 'reference',
        items: [
          {
            kind: 'exercise',
            name: 'Cat Cow',
            prescription: { sets: 1, reps: 5 }
          }
        ]
      },
      {
        type: 'Strength',
        title: 'Main Work',
        displayMode: 'log',
        items: [
          {
            kind: 'exercise',
            name: 'Goblet Squat',
            prescription: { sets: 2, reps: 8, weight: '35 x2 lb' }
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
      'goblet-squat': [
        { set: 1, reps: 8 },
        { set: 2, reps: 8 }
      ]
    })),
    parseMarkdownPrescriptions: vi.fn(() => ({})),
    loadSaved: vi.fn(() => null),
    saveLocal: vi.fn(),
    parseHMSToSeconds: vi.fn(() => null),
    secondsToHHMMSS: vi.fn(() => ''),
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

const populateStrengthInputs = (workoutContent: HTMLElement, weight: string, reps: string) => {
  const card = workoutContent.querySelector('[data-exkey="goblet-squat"]') as HTMLElement | null;
  expect(card).toBeTruthy();
  const weightInput = card?.querySelector('input[data-name="weight"]') as HTMLInputElement | null;
  const repsInput = card?.querySelector('input[data-name="reps"]') as HTMLInputElement | null;
  expect(weightInput).toBeTruthy();
  expect(repsInput).toBeTruthy();
  if (weightInput) weightInput.value = weight;
  if (repsInput) repsInput.value = reps;
};

const suppressClipboard = () => {
  const descriptor = Object.getOwnPropertyDescriptor(window.navigator, 'clipboard');
  try {
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      writable: true,
      value: undefined
    });
  } catch (err) {
    return () => {};
  }

  return () => {
    if (descriptor) {
      Object.defineProperty(window.navigator, 'clipboard', descriptor);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete (window.navigator as any).clipboard;
    }
  };
};

describe('FormBuilder perf-2 collection', () => {
  it('omits reference sections from exported logs', () => {
    const { deps, workoutContent, sessionJSON } = buildDeps();
    FormBuilder.init(deps);

    const raw = JSON.stringify(sessionJSON);
    FormBuilder.buildForm('workouts/6-1_Display_Mode.json', raw, true);

    populateStrengthInputs(workoutContent, '40', '8');

    deps.saveBtn.click();

    expect(deps.saveLocal).toHaveBeenCalledTimes(1);
    const payload = deps.saveLocal.mock.calls[0][1];
    expect(payload.sections).toHaveLength(1);
    expect(payload.sections[0]?.type).toBe('Strength');
    expect(payload.sections[0]?.items[0]?.sets[0]?.weight).toBe(40);
  });

  it('copy flow excludes reference sections when clipboard fallback is used', () => {
    const { deps, workoutContent, sessionJSON } = buildDeps();
    FormBuilder.init(deps);

    const raw = JSON.stringify(sessionJSON);
    FormBuilder.buildForm('workouts/6-1_Display_Mode.json', raw, true);

    populateStrengthInputs(workoutContent, '42', '9');

    const restoreClipboard = suppressClipboard();
    try {
      deps.copyBtn.click();

      expect(deps.copyWrapper.style.display).toBe('block');
      const exported = JSON.parse(deps.copyTarget.value || '{}');
      expect(exported.sections).toHaveLength(1);
      expect(exported.sections[0]?.items[0]?.sets[0]?.weight).toBe(42);
    } finally {
      restoreClipboard();
    }
  });

  it('download button exports log-only sections via Blob download path', () => {
    const { deps, workoutContent, sessionJSON } = buildDeps();
    FormBuilder.init(deps);

    const raw = JSON.stringify(sessionJSON);
    FormBuilder.buildForm('workouts/6-1_Display_Mode.json', raw, true);

    populateStrengthInputs(workoutContent, '48', '8');

    const originalBlob = (window as any).Blob;
    const payloads: string[] = [];
    class MockBlob {
      parts: any[];
      options: any;
      constructor(parts: any[], options: any) {
        this.parts = parts;
        this.options = options;
        payloads.push(String(parts[0] || ''));
      }
    }
    (window as any).Blob = MockBlob as any;

    const originalCreate = (window.URL as any).createObjectURL;
    const originalRevoke = (window.URL as any).revokeObjectURL;
    const createSpy = vi.fn(() => 'blob:mock');
    const revokeSpy = vi.fn();
    (window.URL as any).createObjectURL = createSpy;
    (window.URL as any).revokeObjectURL = revokeSpy;

    deps.downloadBtn.click();

    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(payloads).toHaveLength(1);
    const exported = JSON.parse(payloads[0] || '{}');
    expect(exported.sections).toHaveLength(1);
    expect(exported.sections[0]?.items[0]?.sets[0]?.weight).toBe(48);
    expect(deps.status).toHaveBeenCalled();
    expect(deps.status.mock.calls[0][0]).toContain('Downloaded');

    if (originalCreate) {
      (window.URL as any).createObjectURL = originalCreate;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete (window.URL as any).createObjectURL;
    }
    if (originalRevoke) {
      (window.URL as any).revokeObjectURL = originalRevoke;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete (window.URL as any).revokeObjectURL;
    }
    if (originalBlob) {
      (window as any).Blob = originalBlob;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete (window as any).Blob;
    }
  });

  it('download button falls back to manual copy when Blob fails', () => {
    const { deps, workoutContent, sessionJSON } = buildDeps();
    FormBuilder.init(deps);

    const raw = JSON.stringify(sessionJSON);
    FormBuilder.buildForm('workouts/6-1_Display_Mode.json', raw, true);

    populateStrengthInputs(workoutContent, '46', '7');

    const originalBlob = (window as any).Blob;
    class ThrowingBlob {
      constructor() {
        throw new Error('Blob unsupported');
      }
    }
    (window as any).Blob = ThrowingBlob as any;

    try {
      deps.downloadBtn.click();

      expect(deps.copyWrapper.style.display).toBe('block');
      const exported = JSON.parse(deps.copyTarget.value || '{}');
      expect(exported.sections).toHaveLength(1);
      expect(exported.sections[0]?.items[0]?.sets[0]?.weight).toBe(46);
      expect(deps.status).toHaveBeenCalled();
      expect(deps.status.mock.calls[0][0]).toContain('Download unsupported');
    } finally {
      if (originalBlob) {
        (window as any).Blob = originalBlob;
      } else {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete (window as any).Blob;
      }
    }
  });

  it('issue button wraps perf-2 JSON in the template when clipboard unavailable', () => {
    const { deps, workoutContent, sessionJSON } = buildDeps();
    FormBuilder.init(deps);

    const raw = JSON.stringify(sessionJSON);
    FormBuilder.buildForm('workouts/6-1_Display_Mode.json', raw, true);

    populateStrengthInputs(workoutContent, '50', '9');

    const restoreClipboard = suppressClipboard();
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null as any);

    try {
      deps.issueBtn.click();

      expect(deps.copyWrapper.style.display).toBe('block');
      const template = deps.copyTarget.value;
      expect(template).toContain('```json');
      const match = template.match(/```json\n([\s\S]+?)\n```/);
      expect(match).toBeTruthy();
      const exported = JSON.parse((match?.[1] || '').trim());
      expect(exported.sections).toHaveLength(1);
      expect(template.includes('Warm-up')).toBe(false);
      expect(openSpy).toHaveBeenCalledTimes(1);
    } finally {
      restoreClipboard();
      openSpy.mockRestore();
    }
  });
});
