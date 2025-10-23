import { test, expect } from '@playwright/test';
import { setupClipboard, clickCopyAndGetJSON, findExerciseByName } from './_helpers';

const MOCK_PATH = 'workouts/mock_All_Types_Test.json';

test.beforeEach(async ({ page }) => { await setupClipboard(page); });

test('removed rows do not appear in perf-1 export', async ({ page }) => {
  await page.goto('/index.html?file=' + encodeURIComponent(MOCK_PATH));
  await expect(page.locator('#workout-section')).toBeVisible();

  // Target an exercise with 3 sets (Flat DB Bench Press)
  const card = page.locator('.exercise-card[data-name="Flat DB Bench Press"]').first();
  await expect(card).toBeVisible();

  const rows = card.locator('.set-row');
  await expect(rows).toHaveCount(3);

  // Remove the last set twice to leave a single set
  for (let i = 0; i < 2; i++) {
    const lastRow = card.locator('.set-row').last();
    const removeBtn = lastRow.locator('button.remove-set-btn');
    await expect(removeBtn).toBeVisible();
    await removeBtn.click();
    await expect(card.locator('.set-row')).toHaveCount(3 - (i + 1));
  }

  // Copy/export JSON
  const data = await clickCopyAndGetJSON(page);

  // Find the Bench Press export entry
  const ex = findExerciseByName(data, 'Flat DB Bench Press');
  expect(ex).toBeTruthy();
  if (!ex) return;

  // Assert only one set remains in export and it's the first
  expect(Array.isArray(ex.sets)).toBe(true);
  expect(ex.sets.length).toBe(1);
  expect(ex.sets[0].set).toBe(1);

  // Sanity: it should still contain performed numeric fields from the prescription
  // (weight and reps likely present; RPE may be present if prescribed)
  expect(typeof ex.sets[0].reps).toBe('number');
  expect(typeof ex.sets[0].weight).toBe('number');
});
