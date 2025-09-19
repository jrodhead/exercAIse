import { test, expect } from '@playwright/test';

// Verifies that each exercise card renders the correct input fields
// based on explicit logType meta (strength, endurance, carry, mobility, stretch).

const MOCK_PATH = 'workouts/mock_All_Types_Test.json';

interface Expectation {
  name: string;
  present: boolean; // whether a logging card should exist
  fields?: string[]; // expected data-name fields (order not enforced)
}

// Only include exercises that should produce logging cards (exclude warm-up & cooldown)
const EXPECT: Expectation[] = [
  { name: 'Goblet Squat', present: true, fields: ['weight','multiplier','reps','rpe'] },
  { name: 'Flat DB Bench Press', present: true, fields: ['weight','multiplier','reps','rpe'] },
  { name: 'Chest Supported Dumbbell Row', present: true, fields: ['weight','multiplier','reps','rpe'] },
  { name: 'Farmer Carry', present: true, fields: ['weight','multiplier','timeSeconds','rpe'] },
  { name: 'Dumbbell RDL', present: true, fields: ['weight','multiplier','reps','rpe'] },
  { name: 'Dumbbell Thruster', present: true, fields: ['weight','multiplier','reps','rpe'] },
  { name: 'Deadbug', present: true, fields: ['holdSeconds','rpe'] }, // mobility inside a non-warmup section
  { name: 'Easy Jog', present: true, fields: ['distanceMiles','timeSeconds','rpe'] },
  { name: 'Hammer Curl', present: true, fields: ['weight','multiplier','reps','rpe'] },
  { name: 'Dumbbell Floor Skullcrushers', present: true, fields: ['weight','multiplier','reps','rpe'] },
  { name: 'Dynamic Flow', present: false }, // loggable=false
  // Warm-up & cooldown / stretch items intentionally omitted: no logging cards expected
];

test('field presence matches logType expectations', async ({ page }) => {
  await page.goto('/index.html?file=' + encodeURIComponent(MOCK_PATH));
  await expect(page.locator('#workout-section')).toBeVisible();

  for (const exp of EXPECT) {
    const card = page.locator(`.exercise-card[data-name="${exp.name}"]`).first();
    if (!exp.present) {
      await expect(card, exp.name + ' absent card').toHaveCount(0);
      continue;
    }
    await expect(card, exp.name + ' visible card').toBeVisible();
    // Collect data-name attributes of inputs
    const names = await card.locator('input[data-name]').evaluateAll(els => els.map(e => e.getAttribute('data-name')||''));
    const uniq = Array.from(new Set(names));
    const expected = exp.fields || [];
    // Compare as sets (order-agnostic)
    expect(uniq.length, exp.name + ' field count').toBe(expected.length);
    for (const f of expected) {
      expect(uniq, exp.name + ' has field ' + f).toContain(f);
    }
  }
});
