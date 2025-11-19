/**
 * E2E tests for perf-2 nested structure format
 * Tests full workflow: load JSON workout, fill data, verify nested structure
 */

import { test, expect } from '@playwright/test';
import { setupClipboard, clickCopyAndGetJSON, ensureLoadInputsVisible } from './_helpers';

test.beforeEach(async ({ page }) => {
  await setupClipboard(page);
});

test.describe('Perf-2 Nested Structure', () => {
  test('should use perf-2 format for JSON workouts', async ({ page }) => {
    // Load a real JSON workout from Block 5
    await page.goto('/index.html?file=workouts/5-1_Chest_Triceps_Hypertrophy.json');
    await expect(page.locator('#workout-section')).toBeVisible();

    // Wait for form to render
    await page.waitForSelector('.exercise-card', { timeout: 5000 });

    // Fill in some performance data for the first exercise
    const firstCard = page.locator('.exercise-card').first();
    await expect(firstCard).toBeVisible();
    await ensureLoadInputsVisible(firstCard);

    const firstSetRow = firstCard.locator('.set-row').first();
    const weightInput = firstSetRow.locator('input[data-name="weight"]');
    const repsInput = firstSetRow.locator('input[data-name="reps"]');
    const rpeInput = firstSetRow.locator('input[data-name="rpe"]');

    if (await weightInput.count() > 0) {
      await weightInput.fill('50');
    }
    if (await repsInput.count() > 0) {
      await repsInput.fill('8');
    }
    if (await rpeInput.count() > 0) {
      await rpeInput.fill('7');
    }

    // Click copy button and get JSON
    const data = await clickCopyAndGetJSON(page);

    // Verify perf-2 format
    expect(data.version).toBe('perf-2');
    expect(data.timestamp).toBeDefined();
    expect(typeof data.timestamp).toBe('string');

    // Verify metadata (at root level)
    expect(data.title).toBeDefined();
    expect(data.date).toBeDefined();
    expect(data.block).toBe(5);
    expect(data.week).toBe(1);

    // Verify sections structure
    expect(Array.isArray(data.sections)).toBe(true);
    expect(data.sections.length).toBeGreaterThan(0);

    // Check section structure
    const firstSection = data.sections[0];
    expect(firstSection.type).toBeDefined(); // Should be "Warm-up", "Strength", etc.
    expect(Array.isArray(firstSection.items)).toBe(true);

    // Check item structure
    if (firstSection.items.length > 0) {
      const firstItem = firstSection.items[0];
      expect(firstItem.kind).toMatch(/exercise|superset|circuit/);
      expect(firstItem.name).toBeDefined();

      // For standalone exercises, should have sets array
      if (firstItem.kind === 'exercise') {
        expect(Array.isArray(firstItem.sets)).toBe(true);
        if (firstItem.sets.length > 0) {
          const set = firstItem.sets[0];
          expect(typeof set.weight === 'number' || set.weight === null).toBe(true);
          expect(typeof set.reps === 'number' || set.reps === null).toBe(true);
          expect(typeof set.rpe === 'number' || set.rpe === null).toBe(true);
        }
      }

      // For supersets/circuits, should have rounds array
      if (firstItem.kind === 'superset' || firstItem.kind === 'circuit') {
        expect(Array.isArray(firstItem.rounds)).toBe(true);
        if (firstItem.rounds.length > 0) {
          const round = firstItem.rounds[0];
          expect(typeof round.roundNumber === 'number' || typeof round.round === 'number').toBe(true);
          expect(Array.isArray(round.exercises)).toBe(true);
          expect(typeof round.restAfterRound === 'number' || typeof round.prescribedRestSeconds === 'number' || round.restAfterRound === null).toBe(true);
        }
      }
    }

    // Verify exerciseIndex exists
    expect(data.exerciseIndex).toBeDefined();
    expect(typeof data.exerciseIndex).toBe('object');

    // Check exerciseIndex structure
    const indexKeys = Object.keys(data.exerciseIndex);
    expect(indexKeys.length).toBeGreaterThan(0);

    const firstExercise = data.exerciseIndex[indexKeys[0]];
    expect(firstExercise.name).toBeDefined();
    expect(typeof firstExercise.totalSets).toBe('number');
    expect(typeof firstExercise.totalVolume).toBe('number');
    expect(typeof firstExercise.sectionPath).toBe('string'); // JSONPath reference
  });

  test('should handle supersets with rounds in perf-2', async ({ page }) => {
    // Load a workout with supersets
    await page.goto('/index.html?file=workouts/5-1_Chest_Triceps_Hypertrophy.json');
    await expect(page.locator('#workout-section')).toBeVisible();

    // Wait for form to render
    await page.waitForSelector('.exercise-card', { timeout: 5000 });

    // Look for a superset card
    const supersetCard = page.locator('.exercise-card').filter({ hasText: /superset|circuit/i }).first();

    if (await supersetCard.count() > 0) {
      // Fill in first round data for superset exercises
      const firstRound = supersetCard.locator('[data-round="1"]').first();
      if (await firstRound.count() > 0) {
        const inputs = firstRound.locator('input');
        const inputCount = await inputs.count();

        // Fill in the first few inputs with test data
        for (let i = 0; i < Math.min(inputCount, 6); i++) {
          const input = inputs.nth(i);
          const dataName = await input.getAttribute('data-name');

          if (dataName === 'weight') {
            await input.fill('45');
          } else if (dataName === 'reps') {
            await input.fill('10');
          } else if (dataName === 'rpe') {
            await input.fill('7');
          }
        }
      }

      // Get the exported data
      const data = await clickCopyAndGetJSON(page);

      // Find superset/circuit items in the structure
      const supersetItems = data.sections
        .flatMap((section: any) => section.items)
        .filter((item: any) => item.itemKind === 'superset' || item.itemKind === 'circuit');

      expect(supersetItems.length).toBeGreaterThan(0);

      const superset = supersetItems[0];
      expect(superset.rounds).toBeDefined();
      expect(Array.isArray(superset.rounds)).toBe(true);
      expect(superset.rounds.length).toBeGreaterThan(0);

      // Verify round structure
      const round = superset.rounds[0];
      expect(round.roundNumber).toBe(1);
      expect(Array.isArray(round.exercises)).toBe(true);
      expect(round.exercises.length).toBeGreaterThan(0);

      // Verify exercise in round
      const exercise = round.exercises[0];
      expect(exercise.name).toBeDefined();
      expect(typeof exercise.weight === 'number' || exercise.weight === null).toBe(true);
      expect(typeof exercise.reps === 'number' || exercise.reps === null).toBe(true);
      expect(typeof exercise.rpe === 'number' || exercise.rpe === null).toBe(true);

      // Verify rest interval
      expect(typeof round.restAfterRound === 'number' || round.restAfterRound === null).toBe(true);

      // Verify exercises appear in exerciseIndex
      for (const ex of round.exercises) {
        const exKey = ex.name.toLowerCase();
        expect(data.exerciseIndex[exKey]).toBeDefined();
        expect(data.exerciseIndex[exKey].totalSets).toBeGreaterThan(0);
      }
    }
  });

  test('should build complete exerciseIndex across all sections', async ({ page }) => {
    await page.goto('/index.html?file=workouts/5-1_Chest_Triceps_Hypertrophy.json');
    await expect(page.locator('#workout-section')).toBeVisible();

    // Wait for form to render
    await page.waitForSelector('.exercise-card', { timeout: 5000 });

    // Fill in data for multiple exercises
    const cards = page.locator('.exercise-card');
    const cardCount = await cards.count();

    for (let i = 0; i < Math.min(cardCount, 3); i++) {
      const card = cards.nth(i);
      if (await card.locator('.exercise-card__load-edit').count()) {
        await ensureLoadInputsVisible(card);
      }
      const firstRow = card.locator('.set-row').first();

      const weightInput = firstRow.locator('input[data-name="weight"]');
      const repsInput = firstRow.locator('input[data-name="reps"]');
      const rpeInput = firstRow.locator('input[data-name="rpe"]');

      if (await weightInput.count() > 0) await weightInput.fill(String(40 + i * 5));
      if (await repsInput.count() > 0) await repsInput.fill(String(8 + i));
      if (await rpeInput.count() > 0) await rpeInput.fill('7');
    }

    const data = await clickCopyAndGetJSON(page);

    // Verify exerciseIndex completeness
    expect(Object.keys(data.exerciseIndex).length).toBeGreaterThan(0);

    // Check each exercise in index
    for (const [key, exercise] of Object.entries<any>(data.exerciseIndex)) {
      // Verify required fields
      expect(exercise.name).toBeDefined();
      expect(typeof exercise.totalSets).toBe('number');
      expect(exercise.totalSets).toBeGreaterThan(0);
      expect(typeof exercise.totalVolume).toBe('number');
      expect(typeof exercise.sectionPath).toBe('string');

      // If avgRPE is present, it should be a number
      if (exercise.avgRPE !== null && exercise.avgRPE !== undefined) {
        expect(typeof exercise.avgRPE).toBe('number');
        expect(exercise.avgRPE).toBeGreaterThanOrEqual(0);
        expect(exercise.avgRPE).toBeLessThanOrEqual(10);
      }
    }
  });

  // Note: Markdown workout fallback to perf-1 is tested separately in performance-export.spec.ts

  test('should validate perf-2 structure', async ({ page }) => {
    await page.goto('/index.html?file=workouts/5-1_Chest_Triceps_Hypertrophy.json');
    
    // Wait for workout section to be visible (not just present)
    await expect(page.locator('#workout-section')).toBeVisible({ timeout: 10000 });

    // Wait for form to be fully rendered
    await page.waitForSelector('.exercise-card', { state: 'visible', timeout: 5000 });

    // Fill minimal data
    const firstCard = page.locator('.exercise-card').first();
    await ensureLoadInputsVisible(firstCard);
    const firstRow = firstCard.locator('.set-row').first();
    const weightInput = firstRow.locator('input[data-name="weight"]');
    if (await weightInput.count() > 0) {
      await weightInput.fill('50');
    }

    const data = await clickCopyAndGetJSON(page);

    // Basic structure validation
    expect(data.version).toBe('perf-2');
    expect(data.timestamp).toBeDefined();
    expect(data.title).toBeDefined();
    expect(data.date).toBeDefined();
    expect(typeof data.block).toBe('number');
    expect(typeof data.week).toBe('number');

    // Sections validation
    expect(Array.isArray(data.sections)).toBe(true);
    for (const section of data.sections) {
      expect(section.type).toBeDefined(); // "Warm-up", "Strength", "Conditioning", etc.
      expect(Array.isArray(section.items)).toBe(true);

      for (const item of section.items) {
        expect(['exercise', 'superset', 'circuit']).toContain(item.kind);
        expect(item.name).toBeDefined();

        if (item.kind === 'exercise') {
          expect(Array.isArray(item.sets)).toBe(true);
        } else {
          expect(Array.isArray(item.rounds)).toBe(true);
          for (const round of item.rounds) {
            expect(typeof round.round === 'number' || typeof round.roundNumber === 'number').toBe(true);
            expect(Array.isArray(round.exercises)).toBe(true);
          }
        }
      }
    }

    // ExerciseIndex validation
    expect(typeof data.exerciseIndex).toBe('object');
    for (const [key, exercise] of Object.entries<any>(data.exerciseIndex)) {
      expect(typeof key).toBe('string');
      expect(exercise.name).toBeDefined();
      expect(typeof exercise.totalSets).toBe('number');
      expect(typeof exercise.totalVolume).toBe('number');
      expect(typeof exercise.sectionPath).toBe('string');
    }
  });
});
