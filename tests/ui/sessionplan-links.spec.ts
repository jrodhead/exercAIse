import { test, expect } from '@playwright/test';

test('SessionPlan: links render only when provided and internal; external link warned and non-linked', async ({ page }) => {
  await page.goto('/');

  const plan = {
    version: '1.0',
    title: 'Links Plan',
    date: '2025-10-05',
    exercises: [
      { name: 'Goblet Squat', link: 'exercises/goblet_squat.json', prescribed: { sets: 1, reps: 8 } },
      { name: 'Mystery Move', prescribed: { sets: 1, reps: 5 } },
      { name: 'Bad External', link: 'https://example.com/notallowed.json', prescribed: { sets: 1, reps: 3 } }
    ]
  };

  await page.fill('#gen-json', JSON.stringify(plan));
  await page.click('#gen-load-json');

  await expect(page.locator('#workout-section')).toBeVisible();

  // Check banner early to avoid transient clear
  const status = page.locator('#status');
  await expect(status).toContainText('Invalid links', { timeout: 5000 });

  // 1) Internal link present -> anchor rendered
  const gsLink = page.locator('#workout-content a', { hasText: 'Goblet Squat' }).first();
  await expect(gsLink).toBeVisible();
  await expect(gsLink).toHaveAttribute('href', /exercises\/goblet_squat\.json$/);

  // 2) No link provided -> non-link rendered
  const mysteryNoLink = page.locator('#workout-content .ex-name.no-link', { hasText: 'Mystery Move' }).first();
  await expect(mysteryNoLink).toBeVisible();

  // 3) External link is disallowed -> shows non-link + warning banner
  const badNoLink = page.locator('#workout-content .ex-name.no-link', { hasText: 'Bad External' }).first();
  await expect(badNoLink).toBeVisible();
});
