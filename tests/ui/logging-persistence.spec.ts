import { test, expect } from '@playwright/test';

const MOCK_PATH = 'workouts/mock_All_Types_Test.json';

test('logging persistence: edit first set of Goblet Squat and restore after reload', async ({ page }) => {
  const url = '/index.html?file=' + encodeURIComponent(MOCK_PATH);
  await page.goto(url);
  await expect(page.locator('#workout-section')).toBeVisible();

  const card = page.locator('.exercise-card[data-name="Goblet Squat"]').first();
  await expect(card).toBeVisible();

  const firstSet = card.locator('.set-row').first();
  await expect(firstSet).toBeVisible();

  const weightInput = firstSet.locator('input[data-name="weight"]');
  const rpeInput = firstSet.locator('input[data-name="rpe"]');
  await weightInput.fill('50');
  await rpeInput.fill('7.5');

  await page.locator('#save-local').click();

  // Reload the page (new navigation) and assert values persisted
  await page.goto(url);
  const card2 = page.locator('.exercise-card[data-name="Goblet Squat"]').first();
  await expect(card2).toBeVisible();
  const firstSet2 = card2.locator('.set-row').first();
  const weightAfter = firstSet2.locator('input[data-name="weight"]');
  const rpeAfter = firstSet2.locator('input[data-name="rpe"]');
  await expect(weightAfter).toHaveValue(/50/);
  await expect(rpeAfter).toHaveValue(/7\.5|7.5/);
});
