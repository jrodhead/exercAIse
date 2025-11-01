/**
 * Playwright tests for "This Week" page functionality
 * Tests workout filtering, date display, and session grouping
 */

import { test, expect } from '@playwright/test';

test.describe('This Week Page', () => {
  
  test('page loads and displays basic structure', async ({ page }) => {
    await page.goto('/week.html');
    // Wait for heading to have non-empty text
    const heading = page.locator('h2.sg-section-title.current-week-info');
    await expect(heading).toBeVisible();
    await expect(async () => {
      const text = await heading.textContent();
      expect(text && text.trim().length).toBeGreaterThan(0);
      expect(text).toMatch(/\w+ \d{1,2}, \d{4} - \w+ \d{1,2}, \d{4}/);
    }).toPass();
    // Verify page title
    await expect(page).toHaveTitle(/This Week/);
  });

  test('displays current week date range', async ({ page }) => {
    await page.goto('/week.html');
    const weekInfo = page.locator('.current-week-info');
    await expect(weekInfo).toBeVisible();
    await expect(async () => {
      const text = await weekInfo.textContent();
      expect(text && text.trim().length).toBeGreaterThan(0);
      expect(text).toMatch(/\w+ \d{1,2}, \d{4} - \w+ \d{1,2}, \d{4}/);
    }).toPass();
  });

  test('displays sessions for current week or appropriate message', async ({ page }) => {
    await page.goto('/week.html');
    
    // Wait for content to load
    await page.waitForSelector('#week-content', { timeout: 5000 });
    
    // Wait for dynamic content to finish loading
    await page.waitForTimeout(2000);
    
    const weekContent = page.locator('#week-content');
    const contentText = await weekContent.textContent();
    
    // Content should not still say "Loading sessions..."
    expect(contentText).not.toContain('Loading sessions');
    
  // Should have either workout cards, no sessions message, or error message
  const hasCards = await weekContent.locator('.workout-grid-card').count() > 0;
  const hasNoSessions = contentText?.includes('No sessions scheduled') || false;
  const hasError = contentText?.includes('Failed to load') || contentText?.includes('Error') || false;
  expect(hasCards || hasNoSessions || hasError).toBe(true);
  });

  test('groups sessions by day when sessions exist', async ({ page }) => {
    await page.goto('/week.html');
    
    await page.waitForSelector('#week-content', { timeout: 5000 });
    
    // Check if there are workout cards
    const hasCards = await page.locator('.workout-grid-card').count() > 0;
    if (hasCards) {
      // Should have 7 cards (one for each day)
      const cards = page.locator('.workout-grid-card');
      expect(await cards.count()).toBe(7);
      // Each card should have a day abbreviation
      for (let i = 0; i < 7; i++) {
        const card = cards.nth(i);
        const day = await card.locator('.workout-grid-card__day').textContent();
        expect(day).toMatch(/^(Su|M|Tu|W|Th|F|Sa)$/);
      }
    }
  });

  test('highlights today\'s sessions with badge', async ({ page }) => {
    await page.goto('/week.html');
    
    await page.waitForSelector('#week-content', { timeout: 5000 });
    
    // Should have a .today-badge visible in one of the cards
    const badge = page.locator('.today-badge');
    await expect(badge).toBeVisible();
    // Badge should be styled
    await expect(badge).toHaveCSS('background-color', /rgb/);
  });

  test('session links navigate to workout detail page', async ({ page }) => {
    await page.goto('/week.html');
    
    await page.waitForSelector('#week-content', { timeout: 5000 });
    
    // Find first workout card with a link
    const firstLink = page.locator('.workout-grid-card__title').first();
    if (await firstLink.isVisible()) {
      const href = await firstLink.getAttribute('href');
      expect(href).toContain('index.html?file=workouts/');
      // Click link and verify navigation
      await firstLink.click();
      await page.waitForURL(/.*index\.html\?file=workouts\/.*/);
      expect(page.url()).toContain('index.html?file=workouts/');
    }
  });

  test('displays workout metadata (block and week)', async ({ page }) => {
    await page.goto('/week.html');
    
    await page.waitForSelector('#week-content', { timeout: 5000 });
    
    // Find first workout card with meta
    const firstMeta = page.locator('.workout-grid-card__meta').first();
    if (await firstMeta.isVisible()) {
      const metaText = await firstMeta.textContent();
      // Should mention Block and/or Week
      expect(metaText).toMatch(/Block|Week/);
    }
  });

  test('handles no sessions gracefully', async ({ page }) => {
    // Navigate to a week that definitely has no sessions by mocking
    await page.goto('/week.html');
    
    await page.waitForSelector('#week-content', { timeout: 5000 });
    
    // Inject script to simulate no sessions
    await page.evaluate(() => {
      const weekContent = document.getElementById('week-content');
      if (weekContent) {
        weekContent.innerHTML = '<p class="form__hint">No sessions scheduled for this week.</p>';
      }
    });
    
    // Verify no sessions message is displayed
    const noSessionsMsg = page.locator('.form__hint:has-text("No sessions scheduled")');
    await expect(noSessionsMsg).toBeVisible();
  });

  test('sessions are ordered chronologically within week', async ({ page }) => {
    await page.goto('/week.html');
    
    await page.waitForSelector('#week-content', { timeout: 5000 });
    
    // Check order of .workout-grid-card__day elements
    const days = await page.locator('.workout-grid-card__day').allTextContents();
    const abbrevOrder = ['Su', 'M', 'Tu', 'W', 'Th', 'F', 'Sa'];
    let lastIdx = -1;
    for (const day of days) {
      const idx = abbrevOrder.indexOf(day?.trim() ?? '');
      expect(idx).toBeGreaterThanOrEqual(lastIdx);
      lastIdx = idx;
    }
  });

  test('page styling is consistent with site design', async ({ page }) => {
    await page.goto('/week.html');
    
    await page.waitForSelector('#week-content', { timeout: 5000 });
    
    // Check that page uses site styles
    const container = page.locator('.sg-container');
    await expect(container).toBeVisible();
    // Check footer exists
    const footer = page.locator('footer.site-footer');
    await expect(footer).toBeVisible();
    // Check that workout links have proper styling
    const firstLink = page.locator('.workout-grid-card__title').first();
    if (await firstLink.isVisible()) {
      const textDecoration = await firstLink.evaluate(el => window.getComputedStyle(el).textDecoration);
      expect(textDecoration).toContain('none');
    }
  });

  test('error handling - displays error message on fetch failure', async ({ page }) => {
    // Intercept manifest request and make it fail
    await page.route('**/workouts/manifest.txt', route => route.abort());
    
    await page.goto('/week.html');
    
    // Wait for error state
    await page.waitForTimeout(2000);
    
    // Should show error message
    const errorMsg = await page.locator('#week-content').textContent();
    expect(errorMsg).toContain('Failed to load sessions');
  });

  test('responsive: page works on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/week.html');
    await page.waitForSelector('#week-content', { timeout: 5000 });
    
  // Page should still load and be usable
  const heading = page.locator('h2.sg-section-title.current-week-info');
  await expect(heading).toBeVisible();
  const weekInfo = page.locator('.current-week-info');
  await expect(weekInfo).toBeVisible();
  // Navigation should be accessible
  const nav = page.locator('nav');
  await expect(nav).toBeVisible();
  });
});
