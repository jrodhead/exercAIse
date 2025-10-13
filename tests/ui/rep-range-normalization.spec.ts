import { test, expect } from '@playwright/test';

test.describe('Rep Range Normalization (REPRANGE-01)', () => {
  test('validates rep range normalization in pasted SessionPlan', async ({ page }) => {
    await page.goto('/');

    // Create a SessionPlan with various rep formats
    const sessionPlan = {
      version: '1.0',
      title: 'Rep Range Test Session',
      date: '2025-10-10',
      exercises: [
        {
          slug: 'goblet_squat',
          name: 'Goblet Squat',
          prescribed: {
            sets: 3,
            reps: '8-12', // Normal range
            rpe: 7,
            weight: 25
          }
        },
        {
          slug: 'push_ups',
          name: 'Push-ups', 
          prescribed: {
            sets: 2,
            reps: '12-8', // Reversed range (should be swapped)
            rpe: 6
          }
        },
        {
          slug: 'plank_hold',
          name: 'Plank Hold',
          prescribed: {
            sets: 3,
            reps: 15, // Integer reps
            rpe: 7
          }
        }
      ]
    };

    // Paste the SessionPlan
    await page.fill('#gen-json', JSON.stringify(sessionPlan));
    await page.click('#gen-load-json');

    // Wait for the session to load
    await expect(page.locator('#workout-section')).toBeVisible();

    // Check that exercises are rendered properly
    await expect(page.locator('text=Goblet Squat')).toBeVisible();
    await expect(page.locator('text=Push-ups')).toBeVisible();
    await expect(page.locator('text=Plank Hold')).toBeVisible();

    // Check that rep ranges are displayed correctly
    // The UI should show the original reps_display values
    await expect(page.locator('text=8-12')).toBeVisible(); // Normal range
    await expect(page.locator('text=12-8')).toBeVisible(); // Reversed range (display original)
    await expect(page.locator('text=15')).toBeVisible();   // Integer

    // Verify that no fatal errors occurred during normalization
    const fatalErrors = page.locator('#status:has-text("invalid")');
    await expect(fatalErrors).toHaveCount(0);
  });

  test('handles malformed rep ranges gracefully', async ({ page }) => {
    await page.goto('/');

    // Create SessionPlan with malformed reps
    const sessionPlan = {
      version: '1.0',
      title: 'Malformed Reps Test',
      date: '2025-10-10',
      exercises: [
        {
          slug: 'goblet_squat',
          name: 'Goblet Squat',
          prescribed: {
            sets: 3,
            reps: 'invalid-range', // Malformed
            rpe: 7
          }
        },
        {
          slug: 'push_ups',
          name: 'Push-ups',
          prescribed: {
            sets: 2,
            reps: '8-', // Incomplete range
            rpe: 6
          }
        }
      ]
    };

    await page.fill('#gen-json', JSON.stringify(sessionPlan));
    await page.click('#gen-load-json');

    // Should still render the session (graceful degradation)
    await expect(page.locator('#workout-section')).toBeVisible();

    // Check that exercises are rendered
    await expect(page.locator('text=Goblet Squat')).toBeVisible();
    await expect(page.locator('text=Push-ups')).toBeVisible();

    // Check that malformed reps are still displayed
    await expect(page.locator('text=invalid-range')).toBeVisible();
    await expect(page.locator('text=8-')).toBeVisible();

    // Should not prevent session from loading or cause fatal errors
    const fatalErrors = page.locator('#status:has-text("invalid")');
    await expect(fatalErrors).toHaveCount(0);
  });
});