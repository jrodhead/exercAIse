import { Page, expect, Locator } from '@playwright/test';

export async function setupClipboard(page: Page) {
  await page.addInitScript(() => {
    (window as any).__copiedJSON = null;
    const api = { writeText: (txt: string) => { (window as any).__copiedJSON = txt; return Promise.resolve(); } };
    try { (navigator as any).clipboard = api; } catch (e) {}
  });
}

export async function clickCopyAndGetJSON(page: Page): Promise<any> {
  await page.locator('#copy-json').click();
  const copied = await page.evaluate(() => (window as any).__copiedJSON || (document.getElementById('copy-target') as HTMLTextAreaElement)?.value || '');
  expect(copied, 'Copied JSON should not be empty').not.toEqual('');
  let data: any; expect(() => { data = JSON.parse(copied); }).not.toThrow();
  return data;
}

export function findExerciseByName(data: any, name: string) {
  if (!data || !data.exercises) return null;
  for (const key of Object.keys(data.exercises)) {
    const ex = data.exercises[key];
    if (ex && ex.name === name) return ex;
  }
  return null;
}

export async function ensureLoadInputsVisible(card: Locator): Promise<void> {
  if (!(await card.count())) return;
  const editBtn = card.locator('.exercise-card__load-edit');
  if (!(await editBtn.count())) return;
  const isEditing = await card.evaluate((el) => el.classList.contains('is-load-editing'));
  if (!isEditing) {
    await editBtn.click();
  }
}
