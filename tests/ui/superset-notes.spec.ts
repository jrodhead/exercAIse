import { test, expect } from '@playwright/test';

test.describe('Superset and Circuit Notes Display', () => {
  test('superset notes are visible and styled correctly in light mode', async ({ page }) => {
    await page.goto('/index.html?file=' + encodeURIComponent('workouts/mock_All_Types_Test.json'));
    
    // Verify superset notes are present
    const superset = page.locator('.session-superset--superset').first();
    const supersetNotes = superset.locator('.session-superset__notes');
    await expect(superset).toBeVisible();
    await expect(supersetNotes).toBeVisible();
    await expect(supersetNotes).toContainText('Perform both exercises back-to-back');
    
    // Verify the notes live between the header and the exercise cards
    await expect(superset.locator('.session-superset__header + .session-superset__notes')).toBeVisible();
    await expect(superset.locator('.session-superset__body .exercise-card').first()).toBeVisible();
    
    // Verify notes have correct CSS class
    await expect(supersetNotes).toHaveClass(/session-superset__notes/);
  });

  test('circuit notes are visible and styled correctly in light mode', async ({ page }) => {
    await page.goto('/index.html?file=' + encodeURIComponent('workouts/mock_All_Types_Test.json'));
    
    // Verify circuit notes are present
    const circuit = page.locator('.session-superset--circuit').first();
    const circuitNotes = circuit.locator('.session-superset__notes');
    await expect(circuit).toBeVisible();
    await expect(circuitNotes).toBeVisible();
    await expect(circuitNotes).toContainText('Move quickly between exercises');
    
    // Verify the notes appear between the heading and the exercise cards
    await expect(circuit.locator('.session-superset__header + .session-superset__notes')).toBeVisible();
    await expect(circuit.locator('.session-superset__body .exercise-card').first()).toBeVisible();
    
    // Verify notes have correct CSS class
    await expect(circuitNotes).toHaveClass(/session-superset__notes/);
  });

  test('superset notes have adequate contrast in dark mode', async ({ page }) => {
    // Enable dark mode
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/index.html?file=' + encodeURIComponent('workouts/mock_All_Types_Test.json'));
    
    // Verify superset notes are visible
    const superset = page.locator('.session-superset--superset').first();
    const supersetNotes = superset.locator('.session-superset__notes');
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
    const circuit = page.locator('.session-superset--circuit').first();
    const circuitNotes = circuit.locator('.session-superset__notes');
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
    const supersetNotes = page.locator('.session-superset__notes');
    const firstNoteEl = supersetNotes.first();
    await expect(firstNoteEl).toBeVisible();
    
    // Verify the note contains rest timing information
    const firstNote = await firstNoteEl.textContent();
    expect(firstNote).toMatch(/rest.*\d+s/i);
  });
});
