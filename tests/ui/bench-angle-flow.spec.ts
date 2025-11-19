import { test, expect, Locator } from '@playwright/test';
import { setupClipboard, clickCopyAndGetJSON, ensureLoadInputsVisible } from './_helpers';

const SESSION_FILE = 'tests/sessionplans/bench_angle_session.json';
const SESSION_URL = '/index.html?file=' + encodeURIComponent(SESSION_FILE);

const findExerciseSectionItem = (payload: any, target: string) => {
  const sections = payload?.sections || [];
  for (const section of sections) {
    const items = section?.items || [];
    for (const item of items) {
      if (item?.kind === 'exercise' && item?.name === target) {
        return item;
      }
    }
  }
  return null;
};

const fillFirstSet = async (cardLocator: Locator, values: Record<string, string>) => {
  await ensureLoadInputsVisible(cardLocator);
  const firstRow = cardLocator.locator('.set-row').first();
  await expect(firstRow, 'set row should render').toBeVisible();
  for (const [field, raw] of Object.entries(values)) {
    const input = firstRow.locator(`input[data-name="${field}"]`).first();
    await expect(input, `${field} input present`).toHaveCount(1);
    await input.fill('');
    await input.type(raw);
    await expect(input, `${field} input captured`).toHaveValue(raw);
  }
};

test.beforeEach(async ({ page }) => {
  await setupClipboard(page);
});

test('bench angle badges render and perf-2 export preserves incline metadata', async ({ page }) => {
  await page.goto(SESSION_URL);
  await expect(page.locator('#workout-section')).toBeVisible();

  const inclineCard = page.locator('.exercise-card[data-name="Incline Dumbbell Bench Press"]').first();
  await expect(inclineCard).toBeVisible();
  const inclineBadge = inclineCard.locator('.ex-angle');
  await expect(inclineBadge).toHaveText('30° Incline');
  await expect(inclineBadge).toHaveClass(/ex-angle--incline/);
  await expect(inclineCard).toHaveAttribute('data-angle', '30');

  const flatCard = page.locator('.exercise-card[data-name="Flat Dumbbell Bench Press"]').first();
  await expect(flatCard).toBeVisible();
  await expect(flatCard.locator('.ex-angle')).toHaveCount(0);
  const flatAngleAttr = await flatCard.getAttribute('data-angle');
  expect(flatAngleAttr).toBeNull();

  await fillFirstSet(inclineCard, { weight: '55', reps: '8', rpe: '7' });
  await fillFirstSet(flatCard, { weight: '60', reps: '8', rpe: '7' });

  const payload = await clickCopyAndGetJSON(page);
  expect(payload.version).toBe('perf-2');
  expect(Array.isArray(payload.sections)).toBe(true);

  const incline = findExerciseSectionItem(payload, 'Incline Dumbbell Bench Press');
  expect(incline?.sets?.length).toBeGreaterThan(0);
  expect(incline?.sets?.[0]?.angle).toBe(30);

  const flat = findExerciseSectionItem(payload, 'Flat Dumbbell Bench Press');
  expect(flat?.sets?.length).toBeGreaterThan(0);
  expect(flat?.sets?.[0]?.angle).toBeUndefined();

  const index = payload.exerciseIndex || {};
  expect(index['incline-dumbbell-bench-press_30']).toBeTruthy();
  expect(index['incline-dumbbell-bench-press_30']?.angle).toBe(30);
  expect(index['flat-dumbbell-bench-press_0']).toBeTruthy();
  expect(index['flat-dumbbell-bench-press_0']?.angle).toBe(0);
});
