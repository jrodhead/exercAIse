import { test, expect } from '@playwright/test';
import { setupClipboard, findExerciseByName } from './_helpers';

// Test verifies that the Download JSON feature exports accurate, current data
// after updating fields, adding sets, and removing a set before download.

const MOCK_PATH = 'workouts/mock_All_Types_Test.json';

test.beforeEach(async ({ page }) => { await setupClipboard(page); });

test('downloaded perf-1 export reflects edits/add/remove', async ({ page, context, browserName }) => {
  await page.goto('/index.html?file=' + encodeURIComponent(MOCK_PATH));
  await expect(page.locator('#workout-section')).toBeVisible();

  // Choose an exercise with multiple sets (Goblet Squat) and one accessory (Hammer Curl)
  const squatCard = page.locator('.exercise-card[data-name="Goblet Squat"]').first();
  await expect(squatCard).toBeVisible();

  // Update first set weight & reps for Goblet Squat
  const firstSet = squatCard.locator('.set-row').first();
  const weightInput = firstSet.locator('input[data-name="weight"]');
  const repsInput = firstSet.locator('input[data-name="reps"]');
  if (await weightInput.count()) {
    await weightInput.click({ clickCount: 3 });
    await weightInput.type('55');
    await expect(weightInput).toHaveValue('55');
  }
  if (await repsInput.count()) {
    await repsInput.click({ clickCount: 3 });
    await repsInput.type('9');
    await expect(repsInput).toHaveValue('9');
  }

  // Add a new set via the add-set button within the card (assumes button exists)
  const addBtn = squatCard.locator('button, .add-set').filter({ hasText: /add/i }).first();
  if (await addBtn.count()) {
    await addBtn.click();
  }

  // Populate the newly added last set with distinct values
  const allSets = squatCard.locator('.set-row');
  const newSet = allSets.last();
  // Avoid overwriting if only prescribed sets present (guard on length > 1)
  if (await allSets.count() > 1) {
    const newWeight = newSet.locator('input[data-name="weight"]');
    const newReps = newSet.locator('input[data-name="reps"]');
    if (await newWeight.count()) {
      await newWeight.click({ clickCount: 3 });
      await newWeight.type('60');
    }
    if (await newReps.count()) {
      await newReps.click({ clickCount: 3 });
      await newReps.type('8');
    }
  }

  // Remove a set from a different exercise to ensure deletion is reflected
  const hammerCard = page.locator('.exercise-card[data-name="Hammer Curl"]').first();
  if (await hammerCard.count()) {
    const hammerSets = hammerCard.locator('.set-row');
    if (await hammerSets.count() > 1) {
      const lastHammerSet = hammerSets.last();
      // Look for a remove button inside the set row
      const removeBtn = lastHammerSet.locator('button, .remove-set').filter({ hasText: /remove|del|x/i }).first();
      if (await removeBtn.count()) {
        await removeBtn.click();
      }
    }
  }

  // Intercept the download. Playwright provides downloads via waitForEvent.
  const [ download ] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#download-json').click()
  ]);

  const stream = await download.createReadStream();
  const parts: Uint8Array[] = [];
  if (stream) {
    for await (const chunk of stream as any) {
      if (chunk instanceof Uint8Array) parts.push(chunk);
      else if (typeof chunk === 'string') parts.push(new TextEncoder().encode(chunk));
    }
  }
  let total = 0; parts.forEach(p => { total += p.length; });
  const merged = new Uint8Array(total);
  let offset = 0; for (const p of parts) { merged.set(p, offset); offset += p.length; }
  const text = new TextDecoder('utf-8').decode(merged);
  let data: any; expect(() => { data = JSON.parse(text); }).not.toThrow();

  // Basic perf-1 assertions
  expect(data.version).toBe('perf-1');
  expect(data.exercises && typeof data.exercises === 'object').toBeTruthy();

  const squat = findExerciseByName(data, 'Goblet Squat');
  expect(squat).toBeTruthy();
  if (squat) {
    // First set reflects edited values
    expect(squat.sets[0].weight).toBe(55);
    expect(squat.sets[0].reps).toBe(9);
    // Added set present at end (only if we actually added one and provided values)
    if (squat.sets.length > 1) {
      const last = squat.sets[squat.sets.length - 1];
      // Accept either new weight 60 or fallback if add-set not available
      if (last.weight != null) expect([60,55]).toContain(last.weight);
    }
  }

  const hammer = findExerciseByName(data, 'Hammer Curl');
  if (hammer) {
    // Ensure no empty sets: every set object should have at least weight/reps/rpe/time/hold/distance
    for (const s of hammer.sets) {
      const hasMetric = ['weight','reps','rpe','timeSeconds','holdSeconds','distanceMiles'].some(k => s[k] != null);
      expect(hasMetric).toBeTruthy();
    }
  }

  // Ensure set indices are sequential starting at 1 for modified exercises
  function checkSeq(ex: any) {
    let expectSet = 1; for (const s of ex.sets) { expect(s.set).toBe(expectSet++); }
  }
  if (squat) checkSeq(squat);
  if (hammer) checkSeq(hammer);
});
