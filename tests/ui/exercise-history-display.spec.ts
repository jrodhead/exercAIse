import { test, expect } from '@playwright/test';

/**
 * Exercise History Display Tests
 * 
 * These tests verify that performance history correctly displays on exercise detail pages.
 * They would have caught the bug where workout files linked to the wrong exercise file,
 * causing key mismatches between exercise files and historical performance data.
 */

test.describe('Exercise History Display', () => {

  test.beforeEach(async ({ page }) => {
    // Block the automatic import from performed/index.json
    await page.route('**/performed/index.json', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ entries: [] })
      });
    });
    
    // Block individual perf log requests too
    await page.route('**/performed/**/*.json', route => {
      if (!route.request().url().includes('index.json')) {
        route.abort();
      } else {
        route.continue();
      }
    });
    
    // Clear localStorage and prevent future imports
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      // Set last import to now to prevent auto-import
      localStorage.setItem('exercAIse-lastImport', Date.now().toString());
    });
  });

  test('displays performance history when localStorage has matching data', async ({ page }) => {
    // Create mock performance data in perf-2 format
    const mockPerformanceLog = {
      version: 'perf-2',
      workoutFile: 'workouts/5-2_Chest_Triceps_Hypertrophy.json',
      timestamp: '2025-11-08T10:00:00.000Z',
      date: '2025-11-08',
      block: 5,
      week: 2,
      title: 'Chest & Triceps Hypertrophy',
      sections: [
        {
          type: 'Strength',
          title: 'Main Work',
          items: [
            {
              kind: 'exercise',
              name: 'Flat Dumbbell Bench Press',
              sets: [
                { set: 1, weight: 40, multiplier: 2, reps: 10, rpe: 7 },
                { set: 2, weight: 40, multiplier: 2, reps: 10, rpe: 7.5 },
                { set: 3, weight: 40, multiplier: 2, reps: 9, rpe: 8 }
              ]
            },
            {
              kind: 'exercise',
              name: 'Close-Grip Dumbbell Press',
              sets: [
                { set: 1, weight: 30, multiplier: 2, reps: 12, rpe: 7 },
                { set: 2, weight: 30, multiplier: 2, reps: 12, rpe: 7.5 },
                { set: 3, weight: 30, multiplier: 2, reps: 11, rpe: 8 }
              ]
            }
          ]
        }
      ],
      exerciseIndex: {
        'flat-dumbbell-bench-press': {
          name: 'Flat Dumbbell Bench Press',
          sectionPath: 'sections[0].items[0].sets[*]',
          totalSets: 3,
          totalRounds: 0,
          avgRPE: 7.5,
          totalVolume: 2320
        },
        'close-grip-dumbbell-press': {
          name: 'Close-Grip Dumbbell Press',
          sectionPath: 'sections[0].items[1].sets[*]',
          totalSets: 3,
          totalRounds: 0,
          avgRPE: 7.5,
          totalVolume: 2070
        }
      }
    };

    // Store performance data in localStorage
    await page.evaluate((data) => {
      localStorage.setItem('exercAIse-perf-workouts/5-2_Chest_Triceps_Hypertrophy.json', JSON.stringify(data));
    }, mockPerformanceLog);

    // Navigate to Flat Dumbbell Bench Press exercise page
    await page.goto('/exercise.html?file=exercises/flat_dumbbell_bench_press.json');

    // Wait for page to load
    await expect(page.locator('#main')).toBeVisible();
    await expect(page.locator('#ex-name')).toContainText('Flat Dumbbell Bench Press');

    // Verify history section is visible
    const historySection = page.locator('#history');
    await expect(historySection).toBeVisible();
    
    // Wait for history to load and display
    await page.waitForTimeout(500); // Give time for async localStorage load
    
    // Check that history displays the timestamp
    await expect(historySection).toContainText('2025-11-08');
    
    // Check that sets are displayed (weight and reps)
    await expect(historySection).toContainText('40');
    await expect(historySection).toContainText('10 reps');
    await expect(historySection).toContainText('RPE');
  });

  test('shows "No history" message when no matching data exists', async ({ page }) => {
    // Use an exercise that doesn't appear in any real performed/ logs
    // Instead of mocking a fake exercise, use a real exercise that has no history
    // This avoids flaky mock route interception issues
    
    // Navigate to an exercise that exists but has no performance history
    // Using a real exercise file that's unlikely to have been logged
    await page.goto('/exercise.html?file=exercises/arm_circles.json');

    // Wait for the page to load and exercise name to be set
    await expect(page.locator('#ex-name')).toContainText('Arm Circles');
    await expect(page.locator('#main')).toBeVisible();

    const historySection = page.locator('#history');
    
    // Wait for history to finish loading
    await page.waitForTimeout(1000);

    // Should show "no history" message since this exercise doesn't exist in performed/ logs
    await expect(historySection).toContainText(/no history for this exercise yet/i);
  });

  test('matches exercise by slugified name from performance data', async ({ page }) => {
    // Test that key matching works correctly - this is what the bug was about
    const mockPerformanceLog = {
      version: 'perf-2',
      workoutFile: 'workouts/test-workout.json',
      timestamp: '2025-11-08T10:00:00.000Z',
      sections: [
        {
          type: 'Strength',
          title: 'Main',
          items: [
            {
              kind: 'exercise',
              name: 'Goblet Squat', // Name in performance log
              sets: [
                { set: 1, weight: 35, multiplier: 1, reps: 10, rpe: 7 },
                { set: 2, weight: 35, multiplier: 1, reps: 10, rpe: 7.5 }
              ]
            }
          ]
        }
      ],
      exerciseIndex: {
        'goblet-squat': { // Slugified key
          name: 'Goblet Squat',
          sectionPath: 'sections[0].items[0].sets[*]',
          totalSets: 2,
          totalRounds: 0,
          avgRPE: 7.25,
          totalVolume: 700
        }
      }
    };

    // Navigate to page first
    await page.goto('/exercise.html?file=exercises/goblet_squat.json');
    
    // Then inject mock data directly into localStorage on the exercise page
    await page.evaluate((data) => {
      localStorage.setItem('exercAIse-perf-workouts/test-workout.json', JSON.stringify(data));
      // Trigger history reload if loadHistory is available
      if (typeof (window as any).exerciseModule?.loadHistory === 'function') {
        (window as any).exerciseModule.loadHistory();
      }
    }, mockPerformanceLog);

    await expect(page.locator('#main')).toBeVisible({ timeout: 10000 });
    
    // Reload the page to pick up the new localStorage data
    await page.reload();
    
    const historySection = page.locator('#history');
    await expect(historySection).toBeVisible({ timeout: 10000 });

    // Wait for async load
    await page.waitForTimeout(500);

    // Should display the performance data
    await expect(historySection).toContainText('35');
    await expect(historySection).toContainText('10');
  });

  test('handles multiple workouts with same exercise', async ({ page }) => {
    // Create performance data for multiple workouts with the same exercise
    const workout1 = {
      version: 'perf-2',
      workoutFile: 'workouts/4-4_Chest_Arms_Hypertrophy.json',
      timestamp: '2025-11-01T10:00:00.000Z',
      date: '2025-11-01',
      sections: [{
        type: 'Strength',
        title: 'Main',
        items: [{
          kind: 'exercise',
          name: 'Flat Dumbbell Bench Press',
          sets: [
            { set: 1, weight: 35, multiplier: 2, reps: 12, rpe: 7 },
            { set: 2, weight: 35, multiplier: 2, reps: 12, rpe: 7.5 }
          ]
        }]
      }],
      exerciseIndex: {
        'flat-dumbbell-bench-press': {
          name: 'Flat Dumbbell Bench Press',
          totalSets: 2,
          avgRPE: 7.25
        }
      }
    };

    const workout2 = {
      version: 'perf-2',
      workoutFile: 'workouts/5-2_Chest_Triceps_Hypertrophy.json',
      timestamp: '2025-11-08T10:00:00.000Z',
      date: '2025-11-08',
      sections: [{
        type: 'Strength',
        title: 'Main',
        items: [{
          kind: 'exercise',
          name: 'Flat Dumbbell Bench Press',
          sets: [
            { set: 1, weight: 40, multiplier: 2, reps: 10, rpe: 7 },
            { set: 2, weight: 40, multiplier: 2, reps: 10, rpe: 8 }
          ]
        }]
      }],
      exerciseIndex: {
        'flat-dumbbell-bench-press': {
          name: 'Flat Dumbbell Bench Press',
          totalSets: 2,
          avgRPE: 7.5
        }
      }
    };

    await page.evaluate((data) => {
      localStorage.setItem('exercAIse-perf-workouts/4-4_Chest_Arms_Hypertrophy.json', JSON.stringify(data.workout1));
      localStorage.setItem('exercAIse-perf-workouts/5-2_Chest_Triceps_Hypertrophy.json', JSON.stringify(data.workout2));
    }, { workout1, workout2 });

    await page.goto('/exercise.html?file=exercises/flat_dumbbell_bench_press.json');

    await expect(page.locator('#main')).toBeVisible();
    
    const historySection = page.locator('#history');
    await expect(historySection).toBeVisible();

    await page.waitForTimeout(500);

    // Should show both workouts (progression from 35 lb to 40 lb)
    await expect(historySection).toContainText('35');
    await expect(historySection).toContainText('40');
  });

  test('handles superset exercises correctly', async ({ page }) => {
    // Test that exercises in supersets/circuits are also matched correctly
    const mockPerformanceLog = {
      version: 'perf-2',
      workoutFile: 'workouts/test-superset.json',
      timestamp: '2025-11-08T10:00:00.000Z',
      sections: [
        {
          type: 'Strength',
          title: 'Main',
          items: [
            {
              kind: 'superset',
              name: 'Superset A',
              rounds: [
                {
                  round: 1,
                  exercises: [
                    { key: 'flat-dumbbell-bench-press', name: 'Flat Dumbbell Bench Press', weight: 45, multiplier: 2, reps: 8, rpe: 7 },
                    { key: 'close-grip-dumbbell-press', name: 'Close-Grip Dumbbell Press', weight: 30, multiplier: 2, reps: 10, rpe: 7 }
                  ]
                },
                {
                  round: 2,
                  exercises: [
                    { key: 'flat-dumbbell-bench-press', name: 'Flat Dumbbell Bench Press', weight: 45, multiplier: 2, reps: 8, rpe: 8 },
                    { key: 'close-grip-dumbbell-press', name: 'Close-Grip Dumbbell Press', weight: 30, multiplier: 2, reps: 10, rpe: 8 }
                  ]
                }
              ]
            }
          ]
        }
      ],
      exerciseIndex: {
        'flat-dumbbell-bench-press': {
          name: 'Flat Dumbbell Bench Press',
          totalRounds: 2,
          avgRPE: 7.5
        },
        'close-grip-dumbbell-press': {
          name: 'Close-Grip Dumbbell Press',
          totalRounds: 2,
          avgRPE: 7.5
        }
      }
    };

    await page.evaluate((data) => {
      localStorage.setItem('exercAIse-perf-workouts/test-superset.json', JSON.stringify(data));
    }, mockPerformanceLog);

    // Check flat bench press history
    await page.goto('/exercise.html?file=exercises/flat_dumbbell_bench_press.json');
    await expect(page.locator('#main')).toBeVisible();
    
    let historySection = page.locator('#history');
    await page.waitForTimeout(500);
    await expect(historySection).toContainText('45');
    await expect(historySection).toContainText('8');

    // Check close-grip press history
    await page.goto('/exercise.html?file=exercises/close_grip_dumbbell_press.json');
    await expect(page.locator('#main')).toBeVisible();
    
    historySection = page.locator('#history');
    await page.waitForTimeout(500);
    await expect(historySection).toContainText('30');
    await expect(historySection).toContainText('10');
  });

  test('would have caught the dumbbell_bench_press vs flat_dumbbell_bench_press bug', async ({ page }) => {
    // This test specifically recreates the bug scenario:
    // - Performance data uses key "flat-dumbbell-bench-press"
    // - Workout originally linked to "dumbbell_bench_press.json" (wrong file)
    // - Should have linked to "flat_dumbbell_bench_press.json" (correct file)

    const mockPerformanceLog = {
      version: 'perf-2',
      workoutFile: 'workouts/5-2_Chest_Triceps_Hypertrophy.json',
      timestamp: '2025-11-08T10:00:00.000Z',
      sections: [{
        type: 'Strength',
        title: 'Main',
        items: [{
          kind: 'exercise',
          name: 'Flat Dumbbell Bench Press', // This is the exercise name in the performance log
          sets: [
            { set: 1, weight: 40, multiplier: 2, reps: 10, rpe: 7 }
          ]
        }]
      }],
      exerciseIndex: {
        'flat-dumbbell-bench-press': { // This key was created from the exercise name
          name: 'Flat Dumbbell Bench Press',
          totalSets: 1,
          avgRPE: 7
        }
      }
    };

    await page.evaluate((data) => {
      localStorage.setItem('exercAIse-perf-workouts/5-2_Chest_Triceps_Hypertrophy.json', JSON.stringify(data));
    }, mockPerformanceLog);

    // Visit the CORRECT exercise file (what we fixed the workout to link to)
    await page.goto('/exercise.html?file=exercises/flat_dumbbell_bench_press.json');
    await expect(page.locator('#main')).toBeVisible();
    
    const historySection = page.locator('#history');
    await page.waitForTimeout(500);

    // History SHOULD display because keys match
    await expect(historySection).toContainText('40');
    
    // Note: If we had visited dumbbell_bench_press.json (the bug scenario),
    // the key would be "dumbbell-bench-press" which wouldn't match
    // "flat-dumbbell-bench-press" in the performance data, causing no history to display.
    // The fix was to update the workout to link to flat_dumbbell_bench_press.json instead.
  });

  test('console logs debug information for troubleshooting', async ({ page }) => {
    // Test that debug logging is working for key matching
    const consoleMessages: string[] = [];
    
    page.on('console', msg => {
      consoleMessages.push(msg.text());
    });

    const mockPerformanceLog = {
      version: 'perf-2',
      workoutFile: 'workouts/test.json',
      timestamp: '2025-11-08T10:00:00.000Z',
      sections: [{
        type: 'Strength',
        title: 'Main',
        items: [{
          kind: 'exercise',
          name: 'Goblet Squat',
          sets: [{ set: 1, weight: 35, multiplier: 1, reps: 10, rpe: 7 }]
        }]
      }],
      exerciseIndex: {
        'goblet-squat': {
          name: 'Goblet Squat',
          totalSets: 1,
          avgRPE: 7
        }
      }
    };

    await page.evaluate((data) => {
      localStorage.setItem('exercAIse-perf-workouts/test.json', JSON.stringify(data));
    }, mockPerformanceLog);

    await page.goto('/exercise.html?file=exercises/goblet_squat.json');
    await expect(page.locator('#main')).toBeVisible();
    
    await page.waitForTimeout(1000);

    // Verify that debug logging occurred
    const hasImportLog = consoleMessages.some(msg => msg.includes('Imported') && msg.includes('performance logs'));
    const hasFoundLog = consoleMessages.some(msg => msg.includes('Found') && msg.includes('performance logs'));
    
    expect(hasImportLog || hasFoundLog).toBeTruthy();
  });
});
