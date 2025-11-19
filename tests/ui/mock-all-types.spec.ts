import { test, expect } from '@playwright/test';

test('mock session renders all sections and types', async ({ page }) => {
  await page.goto('/index.html?file=' + encodeURIComponent('workouts/mock_All_Types_Test.json'));
  await expect(page.locator('#workout-section')).toBeVisible();

  // Sections
  await expect(page.getByRole('heading', { level: 2, name: /Warm-up — General Warm-up/i })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: /Strength — Strength — Lower\/Push/i })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: /Strength — Conditioning Circuit/i })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: /Conditioning — Easy Aerobic/i })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: /Accessory\/Core — Arms & Core/i })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: /Cooldown\/Recovery — Cooldown & Reset/i })).toBeVisible();

  // Warm-up renders list items, not cards
  await expect(page.locator('section:has(h2:has-text("Warm-up")) li a[href*="exercises/"]').first()).toBeVisible();

  // Main sets produce logging cards for strength and carry
  await expect(page.locator('.exercise-card:has-text("Goblet Squat")')).toBeVisible();
  await expect(page.locator('.exercise-card:has-text("Farmer Carry")')).toBeVisible();

  // Superset container renders badge/title metadata and notes
  const superset = page.locator('.session-superset--superset').first();
  await expect(superset).toBeVisible();
  await expect(superset.locator('.session-superset__badge')).toHaveAttribute('title', /Bench \+ Row/i);
  await expect(superset.locator('.session-superset__notes')).toContainText('Perform both exercises back-to-back');
  await expect(page.locator('.exercise-card[data-name="Flat DB Bench Press"]').first()).toBeVisible();
  await expect(page.locator('.exercise-card[data-name="Chest Supported Dumbbell Row"]').first()).toBeVisible();

  // Circuit container renders badge/title metadata and notes
  const circuit = page.locator('.session-superset--circuit').first();
  await expect(circuit).toBeVisible();
  await expect(circuit.locator('.session-superset__badge')).toHaveAttribute('title', /RDL \+ Thruster \+ Deadbug/i);
  await expect(circuit.locator('.session-superset__notes')).toContainText('Move quickly between exercises');
  await expect(page.locator('.exercise-card[data-name="Dumbbell RDL"]').first()).toBeVisible();
  await expect(page.locator('.exercise-card[data-name="Dumbbell Thruster"]').first()).toBeVisible();
  await expect(page.locator('.exercise-card[data-name="Deadbug"]').first()).toBeVisible();

  // Endurance item becomes a logging card in the Conditioning section
  await expect(page.locator('.exercise-card[data-name="Easy Jog"]').first()).toBeVisible();

  // Accessory strength cards visible
  await expect(page.locator('.exercise-card:has-text("Hammer Curl")')).toBeVisible();

  // Cooldown items are list-only
  await expect(page.locator('section:has(h2:has-text("Cooldown")) li a[href*="exercises/"]').first()).toBeVisible();
});
