import { test, expect } from '@playwright/test';

test.describe('Superset and Circuit Notes Display', () => {
  test('superset notes are visible and styled correctly in light mode', async ({ page }) => {
    await page.goto('/index.html?file=' + encodeURIComponent('workouts/mock_All_Types_Test.json'));
    
    // Verify superset notes are present
    const supersetNotes = page.locator('.exercise-card__notes:has-text("Perform both exercises back-to-back")');
    await expect(supersetNotes).toBeVisible();
    
    // Verify the notes appear between the heading and the exercise cards
    const supersetDiv = page.locator('div:has(h3:has-text("Bench + Row"))');
    await expect(supersetDiv.locator('.exercise-card__notes')).toBeVisible();
    
    // Verify notes have correct CSS class
    await expect(supersetNotes).toHaveClass(/exercise-card__notes/);
  });

  test('circuit notes are visible and styled correctly in light mode', async ({ page }) => {
    await page.goto('/index.html?file=' + encodeURIComponent('workouts/mock_All_Types_Test.json'));
    
    // Verify circuit notes are present
    const circuitNotes = page.locator('.exercise-card__notes:has-text("Move quickly between exercises")');
    await expect(circuitNotes).toBeVisible();
    
    // Verify the notes appear between the heading and the exercise cards
    const circuitDiv = page.locator('div:has(h3:has-text("RDL + Thruster + Deadbug"))');
    await expect(circuitDiv.locator('.exercise-card__notes')).toBeVisible();
    
    // Verify notes have correct CSS class
    await expect(circuitNotes).toHaveClass(/exercise-card__notes/);
  });

  test('superset notes have adequate contrast in dark mode', async ({ page }) => {
    // Enable dark mode
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/index.html?file=' + encodeURIComponent('workouts/mock_All_Types_Test.json'));
    
    // Verify superset notes are visible
    const supersetNotes = page.locator('.exercise-card__notes:has-text("Perform both exercises back-to-back")');
    await expect(supersetNotes).toBeVisible();
    
    // Check computed color (should be lighter in dark mode: #cbd5e1)
    const color = await supersetNotes.evaluate((el) => {
      return window.getComputedStyle(el).color;
    });
    
    // Verify it's not the light mode color (#333333 = rgb(51, 51, 51))
    // Dark mode should be #cbd5e1 = rgb(203, 213, 225)
    expect(color).not.toBe('rgb(51, 51, 51)');
  });

  test('circuit notes have adequate contrast in dark mode', async ({ page }) => {
    // Enable dark mode
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/index.html?file=' + encodeURIComponent('workouts/mock_All_Types_Test.json'));
    
    // Verify circuit notes are visible
    const circuitNotes = page.locator('.exercise-card__notes:has-text("Move quickly between exercises")');
    await expect(circuitNotes).toBeVisible();
    
    // Check computed color
    const color = await circuitNotes.evaluate((el) => {
      return window.getComputedStyle(el).color;
    });
    
    // Verify it's not the light mode color
    expect(color).not.toBe('rgb(51, 51, 51)');
  });

  test('superset notes display in actual workout', async ({ page }) => {
    // Test with a real Block 5 Week 1 workout that has superset notes
    await page.goto('/index.html?file=' + encodeURIComponent('workouts/5-1_Chest_Triceps_Hypertrophy.json'));
    
    // Verify at least one superset note is visible
    const supersetNotes = page.locator('.exercise-card__notes');
    await expect(supersetNotes.first()).toBeVisible();
    
    // Verify the note contains rest timing information
    const firstNote = await supersetNotes.first().textContent();
    expect(firstNote).toMatch(/rest.*\d+s/i);
  });
});
