import { test, expect } from '@playwright/test';

const MOCK_PATH = 'workouts/mock_All_Types_Test.json';

test.describe('Edit load controls', () => {
  test('toggle reveals load fields and updates per-set summary', async ({ page }) => {
    const url = '/index.html?file=' + encodeURIComponent(MOCK_PATH);
    await page.goto(url);

    const card = page.locator('.exercise-card[data-name="Goblet Squat"]').first();
    await expect(card).toBeVisible();

    const editButton = card.locator('.exercise-card__load-edit');
    await expect(editButton).toBeVisible();

    const firstRow = card.locator('.set-row').first();
    const loadSummary = firstRow.locator('.set-row__load');
    await expect(loadSummary).toBeVisible();

    const weightInput = firstRow.locator('input[data-name="weight"]');
    const multiplierInput = firstRow.locator('input[data-name="multiplier"]');

    await expect(weightInput).not.toBeVisible();
    await expect(multiplierInput).not.toBeVisible();

    await editButton.click();
    await expect(card).toHaveClass(/is-load-editing/);
    await expect(weightInput).toBeVisible();
    await expect(multiplierInput).toBeVisible();

    await weightInput.fill('65');
    await multiplierInput.fill('2');
    await expect(loadSummary).toHaveText(/65 lb ×2/);

    await editButton.click();
    await expect(card).not.toHaveClass(/is-load-editing/);
    await expect(weightInput).not.toBeVisible();
    await expect(multiplierInput).not.toBeVisible();
    await expect(loadSummary).toHaveText(/65 lb ×2/);
  });
});
