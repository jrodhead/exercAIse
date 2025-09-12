import { test, expect } from '@playwright/test';
import { setupClipboard, clickCopyAndGetJSON } from './_helpers';

// Validates new perf-1 export schema basics and validation warnings behavior.
// Focus points:
// - version === 'perf-1'
// - each logged exercise has logType in allowed set
// - set objects contain numeric fields only and set index starts at 1
// - rpe out of range triggers validationErrors attachment
// - distance/time parsing to numeric seconds/miles
// - weight & multiplier retained even if zero (tested by injecting a zero)

const MOCK_PATH = 'workouts/mock_All_Types_Test.json';
const ALLOWED = ['strength','endurance','carry','mobility','stretch'];

test.beforeEach(async ({ page }) => { await setupClipboard(page); });

test('perf-1 export structure and logType inclusion', async ({ page }) => {
  await page.goto('/index.html?file=' + encodeURIComponent(MOCK_PATH));
  await expect(page.locator('#workout-section')).toBeVisible();

  // Make minor edits: set RDL first set weight to 0 to ensure zero retained; set invalid RPE on one exercise to trigger validationErrors.
  const rdlCard = page.locator('.exercise-card[data-name="Dumbbell RDL"]').first();
  await expect(rdlCard).toBeVisible();
  const rdlFirst = rdlCard.locator('.set-row').first();
  const rdlWeight = rdlFirst.locator('input[data-name="weight"]');
  if (await rdlWeight.count()) {
    await rdlWeight.click({ clickCount: 3 });
    await rdlWeight.press('Backspace');
    await rdlWeight.type('0');
    await expect(rdlWeight).toHaveValue('0');
  }

  const benchCard = page.locator('.exercise-card[data-name="Flat DB Bench Press"]').first();
  await expect(benchCard).toBeVisible();
  const benchFirst = benchCard.locator('.set-row').first();
  const benchRPE = benchFirst.locator('input[data-name="rpe"]');
  if (await benchRPE.count()) {
    await benchRPE.click({ clickCount: 3 });
    await benchRPE.press('Backspace');
    await benchRPE.type('11'); // invalid >10
    await expect(benchRPE).toHaveValue('11');
  }

  const data = await clickCopyAndGetJSON(page);

  expect(data.version).toBe('perf-1');
  expect(typeof data.workoutFile).toBe('string');
  expect(typeof data.timestamp).toBe('string');
  expect(data.exercises && typeof data.exercises === 'object').toBeTruthy();

  const exercises = Object.values<any>(data.exercises);
  expect(exercises.length).toBeGreaterThan(0);
  for (const ex of exercises) {
    expect(ALLOWED).toContain(ex.logType);
    expect(Array.isArray(ex.sets)).toBe(true);
    expect(ex.sets.length).toBeGreaterThan(0);
    for (const s of ex.sets) {
      expect(typeof s.set).toBe('number');
      expect(s.set).toBeGreaterThan(0);
      for (const f of ['weight','multiplier','reps','rpe','timeSeconds','holdSeconds','distanceMiles']) {
        if (s[f] != null) {
          expect(typeof s[f]).toBe('number');
        }
      }
    }
  }

  // Zero weight retained check
  const rdlEntry = exercises.find(e => e.name === 'Dumbbell RDL');
  expect(rdlEntry).toBeTruthy();
  if (rdlEntry) {
    const w = rdlEntry.sets[0].weight;
    expect(w).toBe(0); // ensure zero preserved
  }

  // Validation errors due to invalid RPE should be present
  expect(Array.isArray(data.validationErrors)).toBe(true);
  expect(data.validationErrors.length).toBeGreaterThan(0);
  const hasRpeError = data.validationErrors.some((e: string) => /rpe/i.test(e));
  expect(hasRpeError).toBeTruthy();
});
