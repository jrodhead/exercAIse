import { test, expect, Page } from '@playwright/test';

async function clickNav(page: Page, id: string) {
  await page.click(`#${id}`);
}

test.describe('Index and menu navigation', () => {
  test('Home shows paste JSON UI by default', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#generate-section')).toBeVisible();
    await expect(page.locator('#readme-section')).toBeHidden();
    await expect(page.locator('#logs-section')).toBeHidden();
  });

  test('Workouts loads README and clicking a workout renders session UI (not raw JSON)', async ({ page }) => {
    await page.goto('/');
    await clickNav(page, 'nav-workouts');
    await expect(page.locator('#readme-section')).toBeVisible();
    // Click first workout link in README content
    const firstWorkout = page.locator('#readme-content a[href^="workouts/"]').first();
    await firstWorkout.click();
    // Session UI elements should show
    await expect(page.locator('#workout-meta')).toBeVisible();
    await expect(page.locator('#workout-section')).toBeVisible();
    await expect(page.locator('#form-section')).toBeVisible();
    // Should have rendered exercise cards (at least one)
    await expect(page.locator('.exercise-card').first()).toBeVisible();
  });

  test('History uses local manifest and shows entries or a clear message', async ({ page }) => {
    await page.goto('/');
    await clickNav(page, 'nav-history');
    await expect(page.locator('#logs-section')).toBeVisible();
    const listFirst = page.locator('#logs-list li').first();
    await expect(listFirst).toBeVisible();
  });

  test('Paste SessionPlan JSON renders as UI', async ({ page }) => {
    await page.goto('/');
    await page.fill('#gen-json', '{"version":"1.0","title":"Test Session","exercises":[{"slug":"goblet_squat","name":"Goblet Squat","prescribed":{"sets":2,"reps":8}}]}');
    await page.click('#gen-load-json');
    await expect(page.locator('#workout-section')).toBeVisible();
    await expect(page.locator('.exercise-card').first()).toBeVisible();
  });
});
