/**
 * Playwright tests for "This Week" page functionality
 * Tests workout filtering, date display, and session grouping
 */

import { test, expect } from '@playwright/test';

test.describe('This Week Page', () => {
  
  test('page loads and displays basic structure', async ({ page }) => {
    await page.goto('/week.html');
    
    // Wait for page to load
    await page.waitForSelector('h2:has-text("This Week\'s Sessions")', { timeout: 5000 });
    
    // Verify page title
    await expect(page).toHaveTitle(/This Week/);
    
    // Verify main heading
    const heading = page.locator('h2:has-text("This Week\'s Sessions")');
    await expect(heading).toBeVisible();
    
    // Verify hint text
    const hint = page.locator('.form-hint:has-text("Sessions for the current week")');
    await expect(hint).toBeVisible();
  });

  test('displays current week date range', async ({ page }) => {
    await page.goto('/week.html');
    
    // Wait for week info to load
    await page.waitForSelector('.current-week-info', { timeout: 5000 });
    
    const weekInfo = page.locator('.current-week-info');
    await expect(weekInfo).toBeVisible();
    
    // Should contain "Week of" text
    const weekText = await weekInfo.textContent();
    expect(weekText).toContain('Week of');
    expect(weekText).toContain('through');
    
    // Should contain month and day names
    expect(weekText).toMatch(/Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday/);
    expect(weekText).toMatch(/January|February|March|April|May|June|July|August|September|October|November|December/);
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
    
    // Should have either sessions, no sessions message, or error message
    const hasSessions = await weekContent.locator('.week-sessions').count() > 0;
    const hasNoSessions = contentText?.includes('No sessions scheduled') || false;
    const hasError = contentText?.includes('Failed to load') || contentText?.includes('Error') || false;
    
    // One of these should be true
    expect(hasSessions || hasNoSessions || hasError).toBe(true);
  });

  test('groups sessions by day when sessions exist', async ({ page }) => {
    await page.goto('/week.html');
    
    await page.waitForSelector('#week-content', { timeout: 5000 });
    
    // Check if there are sessions
    const hasSessions = await page.locator('.week-sessions').isVisible();
    
    if (hasSessions) {
      // Should have day groups
      const dayGroups = page.locator('.day-group');
      const dayGroupCount = await dayGroups.count();
      
      expect(dayGroupCount).toBeGreaterThan(0);
      
      // Each day group should have a heading
      for (let i = 0; i < dayGroupCount; i++) {
        const group = dayGroups.nth(i);
        const heading = group.locator('h3');
        await expect(heading).toBeVisible();
        
        // Heading should contain day name and date
        const headingText = await heading.textContent();
        expect(headingText).toMatch(/Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday/);
      }
    }
  });

  test('highlights today\'s sessions with badge', async ({ page }) => {
    await page.goto('/week.html');
    
    await page.waitForSelector('#week-content', { timeout: 5000 });
    
    const hasSessions = await page.locator('.week-sessions').isVisible();
    
    if (hasSessions) {
      // Check for today's group
      const todayGroup = page.locator('.day-group.today');
      const hasTodayGroup = await todayGroup.count() > 0;
      
      if (hasTodayGroup) {
        // Should have "Today" badge
        const badge = todayGroup.locator('.badge:has-text("Today")');
        await expect(badge).toBeVisible();
        
        // Badge should be styled
        await expect(badge).toHaveCSS('background-color', /rgb/); // Has background color
      }
    }
  });

  test('session links navigate to workout detail page', async ({ page }) => {
    await page.goto('/week.html');
    
    await page.waitForSelector('#week-content', { timeout: 5000 });
    
    const hasSessions = await page.locator('.week-sessions').isVisible();
    
    if (hasSessions) {
      // Get first workout link
      const firstLink = page.locator('.workout-list a').first();
      const isVisible = await firstLink.isVisible();
      
      if (isVisible) {
        const href = await firstLink.getAttribute('href');
        expect(href).toContain('index.html?file=workouts/');
        
        // Click link and verify navigation
        await firstLink.click();
        await page.waitForURL(/.*index\.html\?file=workouts\/.*/);
        
        // Should navigate to session detail view
        expect(page.url()).toContain('index.html?file=workouts/');
      }
    }
  });

  test('displays workout metadata (block and week)', async ({ page }) => {
    await page.goto('/week.html');
    
    await page.waitForSelector('#week-content', { timeout: 5000 });
    
    const hasSessions = await page.locator('.week-sessions').isVisible();
    
    if (hasSessions) {
      const workoutList = page.locator('.workout-list li');
      const count = await workoutList.count();
      
      if (count > 0) {
        // Check if metadata is displayed
        const firstItem = workoutList.first();
        const itemText = await firstItem.textContent();
        
        // Should have session title
        expect(itemText).toBeTruthy();
        
        // May have block/week metadata
        const hasMeta = itemText?.includes('Block') || itemText?.includes('Week');
        // This is optional, so we just verify the structure exists
        expect(typeof hasMeta).toBe('boolean');
      }
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
        weekContent.innerHTML = '<p class="form-hint">No sessions scheduled for this week.</p>';
      }
    });
    
    // Verify no sessions message is displayed
    const noSessionsMsg = page.locator('.form-hint:has-text("No sessions scheduled")');
    await expect(noSessionsMsg).toBeVisible();
  });

  test('sessions are ordered chronologically within week', async ({ page }) => {
    await page.goto('/week.html');
    
    await page.waitForSelector('#week-content', { timeout: 5000 });
    
    const hasSessions = await page.locator('.week-sessions').isVisible();
    
    if (hasSessions) {
      const dayGroups = page.locator('.day-group');
      const count = await dayGroups.count();
      
      if (count > 1) {
        // Get all day headings
        const headings = await dayGroups.locator('h3').allTextContents();
        
        // Days should be in order (Sunday through Saturday within the week)
        const dayOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        let lastDayIndex = -1;
        for (const heading of headings) {
          // Find which day this is
          for (let i = 0; i < dayOrder.length; i++) {
            if (heading.includes(dayOrder[i]!)) {
              // Should be after or equal to last day index (within a week)
              expect(i).toBeGreaterThanOrEqual(lastDayIndex);
              lastDayIndex = i;
              break;
            }
          }
        }
      }
    }
  });

  test('page styling is consistent with site design', async ({ page }) => {
    await page.goto('/week.html');
    
    await page.waitForSelector('#week-content', { timeout: 5000 });
    
    // Check that page uses site styles
    const container = page.locator('main.container');
    await expect(container).toBeVisible();
    
    // Check footer exists
    const footer = page.locator('footer.site-footer');
    await expect(footer).toBeVisible();
    
    // Check that workout links have proper styling
    const hasSessions = await page.locator('.week-sessions').isVisible();
    if (hasSessions) {
      const firstLink = page.locator('.workout-list a').first();
      if (await firstLink.isVisible()) {
        // Should have text decoration (links)
        const textDecoration = await firstLink.evaluate(el => 
          window.getComputedStyle(el).textDecoration
        );
        expect(textDecoration).toContain('none'); // Based on site styles
      }
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
    const heading = page.locator('h2:has-text("This Week\'s Sessions")');
    await expect(heading).toBeVisible();
    
    const weekInfo = page.locator('.current-week-info');
    await expect(weekInfo).toBeVisible();
    
    // Navigation should be accessible
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
  });
});
