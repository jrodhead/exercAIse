import { test, expect } from '@playwright/test';

test('Pasted workout JSON: items link only when link provided; no link -> non-link', async ({ page }) => {
  await page.goto('/');

  const workout = {
    version: '1',
    title: 'Pasted Workout',
    sections: [
      { type: 'Main', title: 'Main', items: [
        { kind: 'exercise', name: 'Has Link', link: 'exercises/hammer_curl.json', prescription: { sets: 1, reps: 10 } },
        { kind: 'exercise', name: 'No Link Provided', prescription: { sets: 1, reps: 8 } }
      ]}
    ]
  };

  await page.fill('#gen-json', JSON.stringify(workout));
  await page.click('#gen-load-json');
  await page.waitForTimeout(100); // Brief wait for form builder to process
  await expect(page.locator('#workout-section')).toBeVisible();

  const hasLink = page.locator('#workout-content a', { hasText: 'Has Link' }).first();
  await expect(hasLink).toBeVisible();
  await expect(hasLink).toHaveAttribute('href', /exercises\/hammer_curl\.json$/);

  const noLink = page.locator('#workout-content .ex-name.no-link', { hasText: 'No Link Provided' }).first();
  await expect(noLink).toBeVisible();
});

test('Pasted SessionPlan with unknown slug renders with non-link (no warning expected)', async ({ page }) => {
  await page.goto('/index.html');
  const badPlan = {
    version: '1.0',
    title: 'Bad Plan',
    date: '2025-09-15',
    notes: 'Contains an unknown exercise slug',
    sections: [
      {
        type: 'Main',
        title: 'Main',
        items: [
          { kind: 'exercise', slug: 'this_slug_does_not_exist', name: 'Mystery Move', prescription: { sets: 3, reps: 8, rpe: 7 } }
        ]
      }
    ]
  };
  await page.locator('#gen-json').fill(JSON.stringify(badPlan));
  await page.locator('#gen-load-json').click();
  // We should render the workout UI
  await expect(page.locator('#workout-section')).toBeVisible();
  // And the unknown exercise should appear as a non-link element
  const exName = page.locator('#workout-content .ex-name.no-link');
  await expect(exName.first()).toBeVisible();
});

test('Exercise not found screen is shown for missing internal file', async ({ page }) => {
  await page.goto('/');

  const plan = {
    version: '1.0',
    title: 'Missing Link Plan',
    sections: [
      {
        type: 'Main',
        title: 'Main',
        items: [
          { kind: 'exercise', name: 'Ghost Move', link: 'exercises/this_file_should_not_exist_abc123.json', prescription: { sets: 1, reps: 1 } }
        ]
      }
    ]
  };

  await page.fill('#gen-json', JSON.stringify(plan));
  await page.click('#gen-load-json');
  await expect(page.locator('#workout-section')).toBeVisible();

  const ghostLink = page.locator('#workout-content a', { hasText: 'Ghost Move' }).first();
  await expect(ghostLink).toBeVisible();
  
  // Wait for click handler to be attached (happens in async xhrGet callback)
  // Increase wait time for handler attachment
  await page.waitForTimeout(500);
  
  // Verify the link has the correct href
  await expect(ghostLink).toHaveAttribute('href', /exercise\.html\?file=exercises\/this_file_should_not_exist_abc123\.json/);
  
  // Click with navigation promise
  await Promise.all([
    page.waitForURL(/exercise\.html/, { timeout: 10000 }),
    ghostLink.click()
  ]);

  // The exercise viewer should show the not-found page
  await expect(page.locator('#not-found')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('#nf-path')).toContainText('exercises/this_file_should_not_exist_abc123.json');
});
