import { test, expect } from '@playwright/test';

// Asserts that pasting a SessionPlan with an unknown slug fails with a status error.

test('generate: pasted SessionPlan with unknown slug is rejected', async ({ page }) => {
  await page.goto('/index.html');
  // Open the paste JSON details
  await page.locator('#generate-section details summary').click();
  const badPlan = {
    version: '1.0',
    title: 'Bad Plan',
    date: '2025-09-15',
    notes: 'Contains an unknown exercise slug',
    exercises: [
      { slug: 'this_slug_does_not_exist', name: 'Mystery Move', prescribed: { sets: 3, reps: 8, rpe: 7 } }
    ]
  };
  await page.locator('#gen-json').fill(JSON.stringify(badPlan));
  await page.locator('#gen-load-json').click();
  const status = page.locator('#status');
  await expect(status).toContainText('Link validation failed', { timeout: 3000 });
  await expect(status).toContainText('Unknown slugs', { timeout: 3000 });
  // Ensure we did not render the workout section
  await expect(page.locator('#workout-section')).toBeHidden();
});
