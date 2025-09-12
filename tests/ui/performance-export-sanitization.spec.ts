import { test, expect } from '@playwright/test';
import { setupClipboard, clickCopyAndGetJSON, findExerciseByName } from './_helpers';

const MOCK_PATH = 'workouts/mock_All_Types_Test.json';

test.beforeEach(async ({ page }) => { await setupClipboard(page); });

test('non-numeric inputs are ignored and blank sets excluded', async ({ page }) => {
  await page.goto('/index.html?file=' + encodeURIComponent(MOCK_PATH));
  await expect(page.locator('#workout-section')).toBeVisible();

  // 1. Replace Goblet Squat first-set weight with non-numeric
  const gsCard = page.locator('.exercise-card[data-name="Goblet Squat"]').first();
  await expect(gsCard).toBeVisible();
  const gsFirst = gsCard.locator('.set-row').first();
  const gsWeight = gsFirst.locator('input[data-name="weight"]');
  await gsWeight.click({ clickCount: 3 });
  await gsWeight.press('Backspace');
  // Attempt to type non-numeric; number input will ignore invalid chars -> expect blank
  await gsWeight.type('abc');
  await expect(gsWeight).toHaveValue('');

  // 2. Replace Easy Jog distance with invalid text
  const jogCard = page.locator('.exercise-card[data-name="Easy Jog"]').first();
  await expect(jogCard).toBeVisible();
  const jogFirst = jogCard.locator('.set-row').first();
  const jogDist = jogFirst.locator('input[data-name="distanceMiles"]');
  await jogDist.click({ clickCount: 3 });
  await jogDist.type('1.two');
  // Browser will keep '1' then stop at non-numeric or possibly just '1' depending on engine
  const jogVal = await jogDist.inputValue();
  expect(/^1?$/.test(jogVal)).toBeTruthy();

  // 3. Add a set to Hammer Curl; it auto-clones prescription values (acceptable). Clear them to simulate user blanking.
  const hcCard = page.locator('.exercise-card[data-name="Hammer Curl"]').first();
  await expect(hcCard).toBeVisible();
  await hcCard.locator('button:has-text("Add set")').click();
  // New third set should appear but remain blank
  const hcRows = hcCard.locator('.set-row');
  await expect(hcRows).toHaveCount(3); // UI shows it
  const third = hcRows.nth(2);
  // Ensure its inputs are blank (just a safety assertion)
  const thirdInputs = third.locator('input[data-name]');
  const thirdInputsList = await thirdInputs.elementHandles();
  for (const h of thirdInputsList) {
    await h.click({ clickCount: 3 });
    await h.press('Backspace');
  }
  // Confirm cleared (some browsers may retain placeholder but value should be '')
  const clearedValues = await thirdInputs.evaluateAll(els => els.map(e => (e as HTMLInputElement).value));
  for (const v of clearedValues) { expect(v).toBe(''); }

  const data = await clickCopyAndGetJSON(page);

  // Goblet Squat: first set should NOT include weight now (was invalid), but other sets retain weight
  const gsExport = findExerciseByName(data, 'Goblet Squat');
  expect(gsExport).toBeTruthy();
  if (gsExport) {
    expect(gsExport.sets[0].weight).toBeUndefined();
    expect(gsExport.sets[1].weight).toBe(60);
  }

  // Easy Jog: distanceMiles may remain 1 (first char) – treat as present if numeric; otherwise omitted
  const jogExport = findExerciseByName(data, 'Easy Jog');
  expect(jogExport).toBeTruthy();
  if (jogExport) {
    if (jogExport.sets[0].distanceMiles != null) {
      expect(jogExport.sets[0].distanceMiles).toBe(1);
    } else {
      expect(jogExport.sets[0].distanceMiles).toBeUndefined();
    }
    expect(jogExport.sets[0].rpe).toBe(6);
  }

  // Hammer Curl: blank third set is excluded from export; only original 2 sets present
  const hcExport = findExerciseByName(data, 'Hammer Curl');
  expect(hcExport).toBeTruthy();
  if (hcExport) {
    expect(hcExport.sets.length).toBe(2);
    expect(hcExport.sets[0].set).toBe(1);
    expect(hcExport.sets[1].set).toBe(2);
  }
});
