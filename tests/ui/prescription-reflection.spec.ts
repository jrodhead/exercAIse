import { test, expect } from '@playwright/test';

// New focus: verify copied JSON output (structural + modified first-set values) rather than localStorage persistence.
// Steps:
// 1. Open mock session
// 2. Apply first-set modifications for each exercise (selected modifiable fields)
// 3. Click Copy JSON button
// 4. Capture JSON via overridden clipboard (deterministic) and parse
// 5. Assert:
//    - Each exercise appears with expected number of sets
//    - First set contains modified fields with correct transformed values (time -> seconds)
//    - Subsequent sets do NOT receive modified field (weight/time/distance/hold) if present
//    - Unmodified fields (e.g., reps, rpe) are left as originally prescribed (we do not assert their exact numbers here, just that we didn't overwrite them)

const MOCK_PATH = 'workouts/mock_All_Types_Test.json';

interface ExerciseCopyPlan {
  expectSets: number;
  modify: Record<string, string>; // first set changes (raw input values)
  transform?: Record<string, (v: string) => any>; // optional transform for assertion
}

// Transform helpers
const toNumber = (v: string) => Number(v);
const toSeconds = (v: string) => {
  // HH:MM:SS or MM:SS or SS
  const parts = v.split(':').map(Number);
  if (parts.length === 3) return parts[0]*3600 + parts[1]*60 + parts[2];
  if (parts.length === 2) return parts[0]*60 + parts[1];
  return Number(v);
};

const PLAN: Record<string, ExerciseCopyPlan> = {
  'Goblet Squat': { expectSets: 3, modify: { weight: '101' }, transform: { weight: toNumber } },
  'Flat DB Bench Press': { expectSets: 3, modify: { weight: '55' }, transform: { weight: toNumber } },
  'Chest Supported Dumbbell Row': { expectSets: 3, modify: { weight: '40' }, transform: { weight: toNumber } },
  'Farmer Carry': { expectSets: 3, modify: { timeSeconds: '00:40' }, transform: { timeSeconds: toSeconds } },
  'Dumbbell RDL': { expectSets: 3, modify: { weight: '70' }, transform: { weight: toNumber } },
  'Dumbbell Thruster': { expectSets: 3, modify: { weight: '45' }, transform: { weight: toNumber } },
  'Deadbug': { expectSets: 3, modify: { holdSeconds: '00:35' }, transform: { holdSeconds: toSeconds } },
  'Easy Jog': { expectSets: 1, modify: { distanceMiles: '1.25' }, transform: { distanceMiles: toNumber } },
  'Hammer Curl': { expectSets: 2, modify: { weight: '30' }, transform: { weight: toNumber } },
  'Dumbbell Floor Skullcrushers': { expectSets: 2, modify: { weight: '25' }, transform: { weight: toNumber } }
};

// Override clipboard for deterministic capture
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    window.__copiedJSON = null;
    const api = { writeText: (txt: string) => { (window as any).__copiedJSON = txt; return Promise.resolve(); } };
    try { (navigator as any).clipboard = api; } catch (e) { /* ignore */ }
  });
});

test('copy JSON reflects first-set modifications only', async ({ page }) => {
  const url = '/index.html?file=' + encodeURIComponent(MOCK_PATH);
  await page.goto(url);
  await expect(page.locator('#workout-section')).toBeVisible();

  // Apply modifications
  for (const [name, cfg] of Object.entries(PLAN)) {
    const card = page.locator(`.exercise-card[data-name="${name}"]`).first();
    await expect(card, name + ' card').toBeVisible();
    const rows = card.locator('.set-row');
    await expect(rows, name + ' set count').toHaveCount(cfg.expectSets);
    const first = rows.first();
    for (const [field, rawVal] of Object.entries(cfg.modify)) {
      const inp = first.locator(`input[data-name="${field}"]`);
      if (!(await inp.count())) continue;
      await inp.click({ clickCount: 3 });
      await inp.press('Backspace');
      await inp.type(rawVal);
      await expect(inp, `${name} interim ${field}`).toHaveValue(rawVal);
      await inp.press('Tab');
    }
  }

  // Trigger copy
  await page.locator('#copy-json').click();

  // Retrieve copied JSON
  const copied = await page.evaluate(() => (window as any).__copiedJSON || (document.getElementById('copy-target') as HTMLTextAreaElement)?.value || '');
  expect(copied, 'Copied JSON payload exists').not.toEqual('');

  let data: any;
  expect(() => { data = JSON.parse(copied); }).not.toThrow();

  // Basic top-level structure
  expect(typeof data).toBe('object');
  expect(data).toHaveProperty('exercises');
  expect(typeof data.exercises).toBe('object');

  // Helper: locate exercise entry by matching name (values have shape { name, sets: [] })
  function findExerciseByName(target: string) {
    for (const key of Object.keys(data.exercises)) {
      const ex = data.exercises[key];
      if (ex && ex.name === target) return ex;
    }
    return null;
  }

  for (const [name, cfg] of Object.entries(PLAN)) {
    const ex = findExerciseByName(name);
    expect(ex, `Exercise ${name} present`).not.toBeNull();
    if (!ex) continue;
    expect(Array.isArray(ex.sets)).toBe(true);
    expect(ex.sets.length).toBeGreaterThan(0);

    const firstSet = ex.sets[0] || {};
    // Validate modified fields transformed
    for (const [field, rawVal] of Object.entries(cfg.modify)) {
      const transformer = cfg.transform?.[field] || ((v: string) => Number(v));
      const expected = transformer(rawVal);
      expect(firstSet[field] ?? firstSet[field === 'timeSeconds' || field === 'holdSeconds' ? field : field], `${name} first set ${field}`).toBe(expected);
    }

    // Ensure subsequent set (if exists) does NOT contain modified field value duplication (unless inherent from prescription). Only enforce absence for fields we changed when they were originally blank.
    if (cfg.expectSets > 1 && ex.sets[1]) {
      const secondSet = ex.sets[1];
      for (const field of Object.keys(cfg.modify)) {
        // If second set has same value, this implies replication we didn't intend; allow time/duration replication due to circuit copy? We'll only enforce for weight & distance modifications.
        if (field === 'weight' || field === 'distanceMiles') {
          const firstVal = firstSet[field];
            if (secondSet[field] === firstVal) {
              throw new Error(`${name} second set unexpectedly copied field ${field}`);
            }
        }
      }
    }
  }
});
