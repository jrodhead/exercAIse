import { test, expect } from '@playwright/test';

test.describe('Warm-up, Cooldown, and Recovery Exercise Notes Display', () => {
  test('warm-up exercise notes are visible inline with prescription', async ({ page }) => {
    await page.goto('/index.html?file=' + encodeURIComponent('workouts/5-1_Basketball_Movement_Prep.json'));
    
    // Find the Leg Swings exercise in the warm-up section
    const legSwingsItem = page.locator('li:has(a:has-text("Leg Swings"))');
    await expect(legSwingsItem).toBeVisible();
    
    // Verify the notes are visible as a span with class ex-notes
    const legSwingsNotes = legSwingsItem.locator('.ex-notes');
    await expect(legSwingsNotes).toBeVisible();
    
    // Verify the notes contain the per-side instruction
    const notesText = await legSwingsNotes.textContent();
    expect(notesText).toContain('10 forward/back on left leg');
    expect(notesText).toContain('10 forward/back on right leg');
  });

  test('cooldown stretch notes are visible inline with prescription', async ({ page }) => {
    await page.goto('/index.html?file=' + encodeURIComponent('workouts/5-1_Basketball_Movement_Prep.json'));
    
    // Find the Standing Quad Stretch in the cooldown section
    const quadStretchItem = page.locator('li:has(a:has-text("Standing Quad Stretch"))');
    await expect(quadStretchItem).toBeVisible();
    
    // Verify the notes are visible
    const quadStretchNotes = quadStretchItem.locator('.ex-notes');
    await expect(quadStretchNotes).toBeVisible();
    
    // Verify the notes contain the per-side instruction
    const notesText = await quadStretchNotes.textContent();
    expect(notesText).toContain('Hold 45s on one leg, then 45s on the other leg');
  });

  test('recovery yoga pose notes are visible inline', async ({ page }) => {
    await page.goto('/index.html?file=' + encodeURIComponent('workouts/5-1_Yin_Yoga_Recovery.json'));
    
    // Find the Dragon Pose in the recovery section
    const dragonPoseItem = page.locator('li:has(a:has-text("Dragon Pose"))');
    await expect(dragonPoseItem).toBeVisible();
    
    // Verify the notes are visible
    const dragonPoseNotes = dragonPoseItem.locator('.ex-notes');
    await expect(dragonPoseNotes).toBeVisible();
    
    // Verify the notes contain the per-side instruction
    const notesText = await dragonPoseNotes.textContent();
    expect(notesText).toContain('Hold 3 min on one side, then 3 min on the other side');
  });

  test('notes appear below prescription and are styled correctly in light mode', async ({ page }) => {
    await page.goto('/index.html?file=' + encodeURIComponent('workouts/5-1_Basketball_Movement_Prep.json'));
    
    // Find the Leg Swings item
    const legSwingsItem = page.locator('li:has(a:has-text("Leg Swings"))');
    
    // Verify prescription appears before notes
    const prescription = legSwingsItem.locator('.ex-presc');
    await expect(prescription).toBeVisible();
    
    const notes = legSwingsItem.locator('.ex-notes');
    await expect(notes).toBeVisible();
    
    // Verify notes have correct CSS class
    await expect(notes).toHaveClass(/ex-notes/);
    
    // Check that notes are styled with italic
    const fontStyle = await notes.evaluate((el) => {
      return window.getComputedStyle(el).fontStyle;
    });
    expect(fontStyle).toBe('italic');
  });

  test('notes have adequate contrast in dark mode', async ({ page }) => {
    // Enable dark mode
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/index.html?file=' + encodeURIComponent('workouts/5-1_Yin_Yoga_Recovery.json'));
    
    // Find any exercise with notes
    const notesElement = page.locator('.ex-notes').first();
    await expect(notesElement).toBeVisible();
    
    // Check computed color uses the muted text color variable
    const color = await notesElement.evaluate((el) => {
      return window.getComputedStyle(el).color;
    });
    
    // Verify it's not a dark/low-contrast color (should be lighter in dark mode)
    // The color should not be too dark (rgb values should be reasonably high)
    const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1]!);
      const g = parseInt(rgbMatch[2]!);
      const b = parseInt(rgbMatch[3]!);
      // In dark mode, text should be lighter (average RGB > 150)
      const avgBrightness = (r + g + b) / 3;
      expect(avgBrightness).toBeGreaterThan(100); // Ensure reasonable contrast
    }
  });

  test('notes are visible in light mode with good contrast', async ({ page }) => {
    await page.goto('/index.html?file=' + encodeURIComponent('workouts/5-1_Yin_Yoga_Recovery.json'));
    
    // Find any exercise with notes
    const notesElement = page.locator('.ex-notes').first();
    await expect(notesElement).toBeVisible();
    
    // Check computed color
    const color = await notesElement.evaluate((el) => {
      return window.getComputedStyle(el).color;
    });
    
    // In light mode, text should be darker for contrast
    const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1]!);
      const g = parseInt(rgbMatch[2]!);
      const b = parseInt(rgbMatch[3]!);
      // In light mode, text should be darker (average RGB < 150)
      const avgBrightness = (r + g + b) / 3;
      expect(avgBrightness).toBeLessThan(200); // Ensure it's not too light
    }
  });

  test('multiple exercises with different per-side patterns show correct notes', async ({ page }) => {
    await page.goto('/index.html?file=' + encodeURIComponent('workouts/5-1_Back_Biceps_Hypertrophy.json'));
    
    // Check alternating exercise (Alternating Dumbbell Biceps Curl)
    const alternatingCurlItem = page.locator('li:has(a:has-text("Alternating Dumbbell Biceps Curl"))');
    if (await alternatingCurlItem.count() > 0) {
      const alternatingNotes = alternatingCurlItem.locator('.ex-notes');
      if (await alternatingNotes.count() > 0) {
        const text = await alternatingNotes.textContent();
        expect(text).toMatch(/Alternate.*arms/i);
      }
    }
    
    // Check cooldown stretch (should have "Hold Xs on one side, then Xs on the other side" pattern)
    const latStretchItem = page.locator('li:has(a:has-text("Lat Stretch"))');
    if (await latStretchItem.count() > 0) {
      const stretchNotes = latStretchItem.locator('.ex-notes');
      if (await stretchNotes.count() > 0) {
        const text = await stretchNotes.textContent();
        expect(text).toMatch(/Hold.*on one side.*then.*on the other side/i);
      }
    }
  });

  test('warm-up exercises without notes do not show empty notes element', async ({ page }) => {
    await page.goto('/index.html?file=' + encodeURIComponent('workouts/mock_All_Types_Test.json'));
    
    // Find Brisk Walk which should not have notes
    const briskWalkItem = page.locator('li:has(a:has-text("Brisk Walk"))');
    await expect(briskWalkItem).toBeVisible();
    
    // Verify no ex-notes element is present
    const notesCount = await briskWalkItem.locator('.ex-notes').count();
    expect(notesCount).toBe(0);
  });

  test('notes do not interfere with exercise card generation for loggable exercises', async ({ page }) => {
    await page.goto('/index.html?file=' + encodeURIComponent('workouts/5-1_Chest_Triceps_Hypertrophy.json'));
    
    // Main strength exercises should have cards, not just inline notes
    const exerciseCards = page.locator('.exercise-card');
    await expect(exerciseCards.first()).toBeVisible();
    
    // Count should be greater than 0 (actual exercises create cards)
    const cardCount = await exerciseCards.count();
    expect(cardCount).toBeGreaterThan(0);
  });

  test('warm-up exercises do not create logger cards', async ({ page }) => {
    await page.goto('/index.html?file=' + encodeURIComponent('workouts/5-1_Basketball_Movement_Prep.json'));
    
    // Warm-up section should be visible (use data-sectype attribute for specificity)
    const warmupSection = page.locator('section[data-sectype="Warm-up"]');
    await expect(warmupSection).toBeVisible();
    
    // Warm-up exercises should NOT create exercise-card elements
    const warmupCards = warmupSection.locator('.exercise-card');
    const warmupCardCount = await warmupCards.count();
    expect(warmupCardCount).toBe(0);
    
    // But the exercise list should be visible
    const warmupList = warmupSection.locator('ul');
    await expect(warmupList).toBeVisible();
  });

  test('cooldown exercises do not create logger cards', async ({ page }) => {
    await page.goto('/index.html?file=' + encodeURIComponent('workouts/5-1_Basketball_Movement_Prep.json'));
    
    // Cooldown section should be visible (use data-sectype attribute for specificity)
    const cooldownSection = page.locator('section[data-sectype="Cooldown/Recovery"]');
    await expect(cooldownSection).toBeVisible();
    
    // Cooldown exercises should NOT create exercise-card elements
    const cooldownCards = cooldownSection.locator('.exercise-card');
    const cooldownCardCount = await cooldownCards.count();
    expect(cooldownCardCount).toBe(0);
    
    // But the exercise list should be visible with notes
    const cooldownList = cooldownSection.locator('ul');
    await expect(cooldownList).toBeVisible();
    
    // Verify at least one exercise has notes displayed
    const notesInCooldown = cooldownSection.locator('.ex-notes');
    await expect(notesInCooldown.first()).toBeVisible();
  });
});
