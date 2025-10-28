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

  test('Workouts view shows workout list and clicking a workout renders session UI', async ({ page }) => {
    await page.goto('/workouts.html');
    // Wait for "Workouts" heading
    await expect(page.locator('h2:has-text("Workouts")')).toBeVisible({ timeout: 10000 });
    // Wait for workout list to load from manifest
    const workoutLinks = page.locator('#workouts-content a[href^="index.html?file=workouts/"]');
    await expect(workoutLinks.first()).toBeVisible({ timeout: 10000 });
    // Click the third workout (index 2) to ensure we get one with exercises
    // (first two in manifest are basketball warmup and yin yoga which have no exercise cards)
    await workoutLinks.nth(2).click();
    // Should navigate to index.html with file parameter
    await expect(page).toHaveURL(/index\.html\?file=workouts\//);
    // Session UI elements should show
    await expect(page.locator('#workout-meta')).toBeVisible();
    await expect(page.locator('#workout-section')).toBeVisible();
    await expect(page.locator('#form-section')).toBeVisible();
    // Should have rendered exercise cards (at least one)
    await expect(page.locator('.exercise-card').first()).toBeVisible();
  });

  test('History uses local manifest and shows entries or a clear message', async ({ page }) => {
    await page.goto('/history.html');
    await expect(page.locator('#history-content')).toBeVisible();
    // Wait for history to load - either the list or a message
    await page.waitForSelector('#history-content ul.history-list, #history-content .form-hint', { timeout: 10000 });
    // Check if we have a list or a message
    const hasList = await page.locator('#history-content ul.history-list').isVisible().catch(() => false);
    const hasMessage = await page.locator('#history-content .form-hint').isVisible().catch(() => false);
    expect(hasList || hasMessage).toBeTruthy();
  });

  test('Paste SessionPlan JSON renders as UI', async ({ page }) => {
    await page.goto('/');
    await page.fill('#gen-json', '{"version":"1.0","title":"Test Session","exercises":[{"slug":"goblet_squat","name":"Goblet Squat","prescribed":{"sets":2,"reps":8}}]}');
    await page.click('#gen-load-json');
    await expect(page.locator('#workout-section')).toBeVisible();
    await expect(page.locator('.exercise-card').first()).toBeVisible();
  });
});
