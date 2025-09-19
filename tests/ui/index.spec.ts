import { test, expect } from '@playwright/test';

// Simple static server assumption: http://localhost:8000 serving repo root
// Tests target a comprehensive mock session file.

const MOCK_PATH = 'workouts/mock_All_Types_Test.json';

test('mock session: logging cards present for main strength/carry', async ({ page }) => {
  await page.goto('/index.html?file=' + encodeURIComponent(MOCK_PATH));
  await expect(page.locator('#workout-section')).toBeVisible();
  await expect(page.locator('.exercise-card').first()).toBeVisible();
});

test('mock session: warm-up/cooldown render as list-only', async ({ page }) => {
  await page.goto('/index.html?file=' + encodeURIComponent(MOCK_PATH));
  await expect(page.locator('section:has(h2:has-text("Warm-up")) li a[href*="exercises/"]').first()).toBeVisible();
  await expect(page.locator('section:has(h2:has-text("Cooldown")) li a[href*="exercises/"]').first()).toBeVisible();
});
