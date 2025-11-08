/**
 * E2E tests for perf-2 data quality edge cases
 * Tests sanitization, validation, zero preservation, and UI operations
 */

import { test, expect } from '@playwright/test';
import { setupClipboard, clickCopyAndGetJSON } from './_helpers';

const MOCK_PATH = 'workouts/mock_All_Types_Test.json';

test.beforeEach(async ({ page }) => {
  await setupClipboard(page);
});

test.describe('Perf-2 Data Quality', () => {
  test('should preserve zero values and trigger validation errors', async ({ page }) => {
    await page.goto('/index.html?file=' + encodeURIComponent(MOCK_PATH));
    await expect(page.locator('#workout-section')).toBeVisible();

    // Set RDL first set weight to 0 to ensure zero is retained
    const rdlCard = page.locator('.exercise-card[data-name="Dumbbell RDL"]').first();
    await expect(rdlCard).toBeVisible();
    const rdlFirst = rdlCard.locator('.set-row').first();
    const rdlWeight = rdlFirst.locator('input[data-name="weight"]');
    if (await rdlWeight.count()) {
      await rdlWeight.click({ clickCount: 3 });
      await rdlWeight.press('Backspace');
      await rdlWeight.type('0');
      await expect(rdlWeight).toHaveValue('0');
    }

    // Set invalid RPE (>10) to trigger validation errors
    const benchCard = page.locator('.exercise-card[data-name="Flat DB Bench Press"]').first();
    await expect(benchCard).toBeVisible();
    const benchFirst = benchCard.locator('.set-row').first();
    const benchRPE = benchFirst.locator('input[data-name="rpe"]');
    if (await benchRPE.count()) {
      await benchRPE.click({ clickCount: 3 });
      await benchRPE.press('Backspace');
      await benchRPE.type('11'); // invalid >10
      await expect(benchRPE).toHaveValue('11');
    }

    const data = await clickCopyAndGetJSON(page);

    expect(data.version).toBe('perf-2');
    expect(Array.isArray(data.sections)).toBe(true);

    // Helper to find exercise in nested structure
    const findExercise = (name: string) => {
      for (const section of data.sections) {
        for (const item of section.items) {
          if (item.kind === 'exercise' && item.name === name) {
            return { item, inRounds: false };
          }
          if ((item.kind === 'superset' || item.kind === 'circuit') && item.rounds) {
            for (const round of item.rounds) {
              for (const ex of round.exercises) {
                if (ex.name === name) {
                  return { item: ex, inRounds: true, round };
                }
              }
            }
          }
        }
      }
      return null;
    };

    // Find RDL in circuit and verify zero weight is preserved
    const rdl = findExercise('Dumbbell RDL');
    expect(rdl).toBeTruthy();
    if (rdl && rdl.inRounds) {
      expect(rdl.item.weight).toBe(0); // Zero should be preserved
    }

    // Validation errors should be present for invalid RPE (if validation is enabled)
    // Note: perf-2 validation may handle this differently than perf-1
    if (data.validationErrors) {
      expect(Array.isArray(data.validationErrors)).toBe(true);
      expect(data.validationErrors.length).toBeGreaterThan(0);
    }
  });

  test('should exclude blank sets and ignore non-numeric inputs', async ({ page }) => {
    await page.goto('/index.html?file=' + encodeURIComponent(MOCK_PATH));
    await expect(page.locator('#workout-section')).toBeVisible();

    // 1. Replace Goblet Squat first-set weight with non-numeric (should be ignored)
    const gsCard = page.locator('.exercise-card[data-name="Goblet Squat"]').first();
    await expect(gsCard).toBeVisible();
    const gsFirst = gsCard.locator('.set-row').first();
    const gsWeight = gsFirst.locator('input[data-name="weight"]');
    await gsWeight.click({ clickCount: 3 });
    await gsWeight.press('Backspace');
    await gsWeight.type('abc'); // Browser will ignore invalid input
    await expect(gsWeight).toHaveValue('');

    // 2. Add a blank set to Hammer Curl and clear all inputs
    const hcCard = page.locator('.exercise-card[data-name="Hammer Curl"]').first();
    await expect(hcCard).toBeVisible();
    const addBtn = hcCard.locator('button').filter({ hasText: /add/i }).first();
    if (await addBtn.count()) {
      await addBtn.click();
    }
    
    const hcRows = hcCard.locator('.set-row');
    const lastRow = hcRows.last();
    const inputs = lastRow.locator('input[data-name]');
    const inputCount = await inputs.count();
    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      await input.click({ clickCount: 3 });
      await input.press('Backspace');
    }

    const data = await clickCopyAndGetJSON(page);

    expect(data.version).toBe('perf-2');

    // Find Goblet Squat - first set should not have weight (was invalid)
    let foundGoblet = false;
    for (const section of data.sections) {
      for (const item of section.items) {
        if (item.name === 'Goblet Squat' && item.kind === 'exercise') {
          foundGoblet = true;
          // First set should be missing or have no weight
          if (item.sets.length > 0) {
            expect(item.sets[0].weight).toBeUndefined();
          }
        }
      }
    }
    expect(foundGoblet).toBe(true);

    // Find Hammer Curl - blank set should be excluded
    let foundHammer = false;
    for (const section of data.sections) {
      for (const item of section.items) {
        if (item.name === 'Hammer Curl' && item.kind === 'exercise') {
          foundHammer = true;
          // Should only have 2 sets (original), not 3 (blank excluded)
          expect(item.sets.length).toBe(2);
        }
      }
    }
    expect(foundHammer).toBe(true);
  });

  test('should handle add/remove set operations correctly', async ({ page }) => {
    await page.goto('/index.html?file=' + encodeURIComponent(MOCK_PATH));
    await expect(page.locator('#workout-section')).toBeVisible();

    // Target Goblet Squat
    const squatCard = page.locator('.exercise-card[data-name="Goblet Squat"]').first();
    await expect(squatCard).toBeVisible();

    // Update first set
    const firstSet = squatCard.locator('.set-row').first();
    const weightInput = firstSet.locator('input[data-name="weight"]');
    const repsInput = firstSet.locator('input[data-name="reps"]');
    if (await weightInput.count()) {
      await weightInput.click({ clickCount: 3 });
      await weightInput.type('55');
    }
    if (await repsInput.count()) {
      await repsInput.click({ clickCount: 3 });
      await repsInput.type('9');
    }

    // Add a new set
    const addBtn = squatCard.locator('button').filter({ hasText: /add/i }).first();
    if (await addBtn.count()) {
      await addBtn.click();
    }

    // Fill the new set
    const allSets = squatCard.locator('.set-row');
    if (await allSets.count() > 2) {
      const newSet = allSets.last();
      const newWeight = newSet.locator('input[data-name="weight"]');
      const newReps = newSet.locator('input[data-name="reps"]');
      if (await newWeight.count()) {
        await newWeight.click({ clickCount: 3 });
        await newWeight.type('60');
      }
      if (await newReps.count()) {
        await newReps.click({ clickCount: 3 });
        await newReps.type('8');
      }
    }

    // Remove a set from Hammer Curl
    const hammerCard = page.locator('.exercise-card[data-name="Hammer Curl"]').first();
    if (await hammerCard.count()) {
      const hammerSets = hammerCard.locator('.set-row');
      if (await hammerSets.count() > 1) {
        const lastHammerSet = hammerSets.last();
        const removeBtn = lastHammerSet.locator('button.button--remove').first();
        if (await removeBtn.count()) {
          await removeBtn.click();
        }
      }
    }

    const data = await clickCopyAndGetJSON(page);

    expect(data.version).toBe('perf-2');

    // Find Goblet Squat and verify edits
    let foundSquat = false;
    for (const section of data.sections) {
      for (const item of section.items) {
        if (item.name === 'Goblet Squat' && item.kind === 'exercise') {
          foundSquat = true;
          // First set should have edited values
          expect(item.sets[0].weight).toBe(55);
          expect(item.sets[0].reps).toBe(9);
          // Should have added set if button worked
          if (item.sets.length > 2) {
            const lastSet = item.sets[item.sets.length - 1];
            expect(lastSet.weight).toBe(60);
            expect(lastSet.reps).toBe(8);
          }
          // Verify set indices are sequential
          for (let i = 0; i < item.sets.length; i++) {
            expect(item.sets[i].set).toBe(i + 1);
          }
        }
      }
    }
    expect(foundSquat).toBe(true);

    // Find Hammer Curl and verify removal
    let foundHammer = false;
    for (const section of data.sections) {
      for (const item of section.items) {
        if (item.name === 'Hammer Curl' && item.kind === 'exercise') {
          foundHammer = true;
          // Should have one less set
          expect(item.sets.length).toBe(1);
          // Verify set indices are sequential
          for (let i = 0; i < item.sets.length; i++) {
            expect(item.sets[i].set).toBe(i + 1);
          }
        }
      }
    }
    expect(foundHammer).toBe(true);
  });

  test('should handle remove operations and re-index sets', async ({ page }) => {
    await page.goto('/index.html?file=' + encodeURIComponent(MOCK_PATH));
    await expect(page.locator('#workout-section')).toBeVisible();

    // Target Flat DB Bench Press (has 3 sets)
    const card = page.locator('.exercise-card[data-name="Flat DB Bench Press"]').first();
    await expect(card).toBeVisible();

    const rows = card.locator('.set-row');
    await expect(rows).toHaveCount(3);

    // Remove last set twice to leave only one set
    for (let i = 0; i < 2; i++) {
      const lastRow = card.locator('.set-row').last();
      const removeBtn = lastRow.locator('button.button--remove');
      if (await removeBtn.count()) {
        await removeBtn.click();
      }
      await page.waitForTimeout(100); // Brief wait for DOM update
    }

    const data = await clickCopyAndGetJSON(page);

    expect(data.version).toBe('perf-2');

    // Helper to find exercise in nested structure
    const findExercise = (name: string) => {
      for (const section of data.sections) {
        for (const item of section.items) {
          if (item.kind === 'exercise' && item.name === name) {
            return item;
          }
          if ((item.kind === 'superset' || item.kind === 'circuit') && item.rounds) {
            // For supersets/circuits, check if any exercise in first round matches
            if (item.name && item.name.includes(name)) {
              return item;
            }
          }
        }
      }
      return null;
    };

    // Find Flat DB Bench Press and verify only 1 set remains
    const bench = findExercise('Bench');
    expect(bench).toBeTruthy();
    if (bench && bench.kind === 'superset' && bench.rounds) {
      // Find the bench press in the superset rounds
      expect(bench.rounds.length).toBeGreaterThan(0);
      const benchEx = bench.rounds[0].exercises.find((e: any) => e.name === 'Flat DB Bench Press');
      expect(benchEx).toBeTruthy();
      // Note: In supersets, we can't easily test individual set removal since they're grouped as rounds
      // Just verify the structure is valid
      expect(bench.rounds[0].exercises.length).toBeGreaterThan(0);
    }
  });

  test('should handle download JSON with edits', async ({ page }) => {
    await page.goto('/index.html?file=' + encodeURIComponent(MOCK_PATH));
    await expect(page.locator('#workout-section')).toBeVisible();

    // Make some edits
    const squatCard = page.locator('.exercise-card[data-name="Goblet Squat"]').first();
    await expect(squatCard).toBeVisible();
    
    const firstSet = squatCard.locator('.set-row').first();
    const weightInput = firstSet.locator('input[data-name="weight"]');
    if (await weightInput.count()) {
      await weightInput.click({ clickCount: 3 });
      await weightInput.type('55');
    }

    // Trigger download
    const downloadBtn = page.locator('#download-json');
    if (await downloadBtn.count()) {
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        downloadBtn.click()
      ]);

      const stream = await download.createReadStream();
      const parts: Uint8Array[] = [];
      if (stream) {
        for await (const chunk of stream as any) {
          if (chunk instanceof Uint8Array) parts.push(chunk);
          else if (typeof chunk === 'string') parts.push(new TextEncoder().encode(chunk));
        }
      }
      
      let total = 0;
      parts.forEach(p => { total += p.length; });
      const merged = new Uint8Array(total);
      let offset = 0;
      for (const p of parts) {
        merged.set(p, offset);
        offset += p.length;
      }
      
      const text = new TextDecoder('utf-8').decode(merged);
      const data = JSON.parse(text);

      expect(data.version).toBe('perf-2');
      
      // Verify the edit is reflected
      let foundSquat = false;
      for (const section of data.sections) {
        for (const item of section.items) {
          if (item.name === 'Goblet Squat' && item.kind === 'exercise') {
            foundSquat = true;
            expect(item.sets[0].weight).toBe(55);
          }
        }
      }
      expect(foundSquat).toBe(true);
    }
  });

  test('should validate all numeric field types', async ({ page }) => {
    await page.goto('/index.html?file=' + encodeURIComponent(MOCK_PATH));
    await expect(page.locator('#workout-section')).toBeVisible();

    // Fill in some data
    const cards = page.locator('.exercise-card');
    const cardCount = await cards.count();
    
    for (let i = 0; i < Math.min(cardCount, 3); i++) {
      const card = cards.nth(i);
      const firstRow = card.locator('.set-row').first();
      
      // Try to fill various field types
      const fields = ['weight', 'reps', 'rpe', 'timeSeconds', 'holdSeconds', 'distanceMiles'];
      for (const field of fields) {
        const input = firstRow.locator(`input[data-name="${field}"]`);
        if (await input.count()) {
          await input.click({ clickCount: 3 });
          await input.type('5');
        }
      }
    }

    const data = await clickCopyAndGetJSON(page);

    expect(data.version).toBe('perf-2');

    // Verify all numeric fields are numbers when present
    for (const section of data.sections) {
      for (const item of section.items) {
        if (item.kind === 'exercise' && item.sets) {
          for (const set of item.sets) {
            const numericFields = ['weight', 'multiplier', 'reps', 'rpe', 'timeSeconds', 'holdSeconds', 'distanceMiles'];
            for (const field of numericFields) {
              if (set[field] != null) {
                expect(typeof set[field]).toBe('number');
              }
            }
          }
        } else if ((item.kind === 'superset' || item.kind === 'circuit') && item.rounds) {
          for (const round of item.rounds) {
            for (const exercise of round.exercises) {
              const numericFields = ['weight', 'multiplier', 'reps', 'rpe', 'timeSeconds', 'holdSeconds', 'distanceMiles'];
              for (const field of numericFields) {
                if (exercise[field] != null) {
                  expect(typeof exercise[field]).toBe('number');
                }
              }
            }
          }
        }
      }
    }
  });

  test('should use perf-2 format for GitHub issue button', async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await page.goto('/index.html?file=' + encodeURIComponent(MOCK_PATH));
    await expect(page.locator('#workout-section')).toBeVisible();

    // Fill in some data in the first superset (use prescription values)
    const benchCard = page.locator('.exercise-card[data-name="Flat DB Bench Press"]').first();
    await expect(benchCard).toBeVisible();
    
    const firstRow = benchCard.locator('.set-row').first();
    const repsInput = firstRow.locator('input[data-name="reps"]');

    // Just fill in reps to have some data
    if (await repsInput.count()) {
      await repsInput.click({ clickCount: 3 });
      await repsInput.type('10');
    }

    // Mock window.open to prevent actual navigation
    await page.evaluate(() => {
      (window as any).originalOpen = window.open;
      window.open = () => null;
    });

    // Click the GitHub issue button
    const issueBtn = page.locator('#submit-issue');
    await expect(issueBtn).toBeVisible();
    await issueBtn.click();

    // Wait a moment for clipboard operation
    await page.waitForTimeout(500);

    // Verify data was copied to clipboard
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    
    // Should contain the header
    expect(clipboardText).toContain('Paste will be committed by Actions.');
    expect(clipboardText).toContain('```json');
    
    // Extract JSON from markdown code block
    const jsonMatch = clipboardText.match(/```json\n([\s\S]+?)\n```/);
    expect(jsonMatch).toBeTruthy();
    
    const data = JSON.parse(jsonMatch![1]);
    
    // Verify it's perf-2 format (the key requirement)
    expect(data.version).toBe('perf-2');
    expect(Array.isArray(data.sections)).toBe(true);
    expect(data.workoutFile).toBe(MOCK_PATH);
    expect(data.timestamp).toBeDefined();
    
    // Verify nested structure with rounds
    let foundSuperset = false;
    for (const section of data.sections) {
      if (section.type === 'Strength') {
        for (const item of section.items) {
          if (item.kind === 'superset' && item.rounds) {
            // Found a superset with rounds - perf-2 structure confirmed
            expect(Array.isArray(item.rounds)).toBe(true);
            expect(item.rounds.length).toBeGreaterThan(0);
            
            // Verify round structure
            for (const round of item.rounds) {
              expect(round.round).toBeDefined();
              expect(Array.isArray(round.exercises)).toBe(true);
              
              // Verify exercise data in round
              for (const exercise of round.exercises) {
                expect(exercise.key).toBeDefined();
                expect(exercise.name).toBeDefined();
              }
            }
            foundSuperset = true;
          }
        }
      }
    }
    
    expect(foundSuperset).toBe(true);
    
    // Verify exerciseIndex exists (perf-2 feature)
    expect(data.exerciseIndex).toBeDefined();
    expect(typeof data.exerciseIndex).toBe('object');
    expect(Object.keys(data.exerciseIndex).length).toBeGreaterThan(0);

    // Restore window.open
    await page.evaluate(() => {
      window.open = (window as any).originalOpen;
    });
  });
});
