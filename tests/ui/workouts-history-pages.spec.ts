import { test, expect } from '@playwright/test';

test.describe('Workouts Page', () => {
  test('should load and display workouts list', async ({ page }) => {
    await page.goto('http://localhost:8000/workouts.html');
    
    // Should load header
    const header = page.locator('header');
    await expect(header).toBeVisible();
    
    // Should show "Workouts" as active
    const workoutsLink = page.locator('nav a[href="workouts.html"]');
    await expect(workoutsLink).toHaveClass(/active/);
    
    // Should have workouts content container
    const content = page.locator('#workouts-content');
    await expect(content).toBeVisible();
    
    // Should display workouts (wait for manifest to load)
    await page.waitForSelector('#workouts-content ul li a', { timeout: 5000 });
    const workoutLinks = page.locator('#workouts-content ul li a');
    await expect(workoutLinks.first()).toBeVisible();
  });

  test('should have working workout links', async ({ page }) => {
    await page.goto('http://localhost:8000/workouts.html');
    
    // Wait for workouts to load
    await page.waitForSelector('#workouts-content ul li a', { timeout: 5000 });
    
    // Click first workout
    const firstWorkout = page.locator('#workouts-content ul li a').first();
    await firstWorkout.click();
    
    // Should navigate to index.html with file param (current implementation)
    await expect(page).toHaveURL(/index\.html\?file=/);
  });

  test('should show "Workouts" as active when viewing workout session', async ({ page }) => {
    // Navigate directly to a workout session URL
    await page.goto('http://localhost:8000/index.html?file=workouts/1-1_Upper_Body_Strength_Mobility.json');
    
    // Wait for header to load
    await page.waitForSelector('header nav');
    
    // Should show "Workouts" as active, NOT "Home"
    const workoutsLink = page.locator('nav a[href="workouts.html"]');
    await expect(workoutsLink).toHaveClass(/active/);
    
    // Home should NOT be active
    const homeLink = page.locator('nav a[href="index.html"]');
    await expect(homeLink).not.toHaveClass(/active/);
  });

  test('should show error message if manifest fails to load', async ({ page }) => {
    // Block manifest request
    await page.route('**/workouts/manifest.txt', route => route.abort());
    
    await page.goto('http://localhost:8000/workouts.html');
    
    // Should show error message
    const content = page.locator('#workouts-content');
    await expect(content).toContainText(/Failed to load workouts/i);
  });
});

test.describe('History Page', () => {
  test('should load and display history page', async ({ page }) => {
    await page.goto('http://localhost:8000/history.html');
    
    // Should load header
    const header = page.locator('header');
    await expect(header).toBeVisible();
    
    // Should show "History" as active
    const historyLink = page.locator('nav a[href="history.html"]');
    await expect(historyLink).toHaveClass(/active/);
    
    // Should have history content container
    const content = page.locator('#history-content');
    await expect(content).toBeVisible();
  });

  test('should show placeholder message when no history exists', async ({ page }) => {
    // Block history index request
    await page.route('**/performed/index.json', route => route.abort());
    
    await page.goto('http://localhost:8000/history.html');
    
    // Should show placeholder message
    const content = page.locator('#history-content');
    await expect(content).toContainText(/History unavailable/i);
  });
});

test.describe('Navigation Between Pages', () => {
  test('should navigate from Home to Workouts', async ({ page }) => {
    await page.goto('http://localhost:8000/');
    
    // Click Workouts link
    const workoutsLink = page.locator('nav a[href="workouts.html"]');
    await workoutsLink.click();
    
    // Should be on workouts page
    await expect(page).toHaveURL(/workouts\.html$/);
    
    // Workouts should be active
    const activeLink = page.locator('nav a.active');
    await expect(activeLink).toHaveText('Workouts');
  });

  test('should navigate from Workouts to History', async ({ page }) => {
    await page.goto('http://localhost:8000/workouts.html');
    
    // Click History link
    const historyLink = page.locator('nav a[href="history.html"]');
    await historyLink.click();
    
    // Should be on history page
    await expect(page).toHaveURL(/history\.html$/);
    
    // History should be active
    const activeLink = page.locator('nav a.active');
    await expect(activeLink).toHaveText('History');
  });

  test('should navigate from History to This Week', async ({ page }) => {
    await page.goto('http://localhost:8000/history.html');
    
    // Click This Week link
    const weekLink = page.locator('nav a[href="week.html"]');
    await weekLink.click();
    
    // Should be on week page
    await expect(page).toHaveURL(/week\.html$/);
    
    // This Week should be active
    const activeLink = page.locator('nav a.active');
    await expect(activeLink).toHaveText('This Week');
  });

  test('should maintain header consistency across all pages', async ({ page }) => {
  const pages = ['index.html', 'week.html', 'workouts.html', 'history.html', 'rpe-guide.html'];
    const headers: string[] = [];
    
    for (const pagePath of pages) {
      await page.goto(`http://localhost:8000/${pagePath}`);
      try {
        await page.waitForSelector('header nav', { timeout: 10000 });
      } catch (e) {
        // Log which page failed
        console.error(`header nav not found on page: ${pagePath}`);
        throw new Error(`header nav not found on page: ${pagePath}`);
      }
      const header = page.locator('header nav');
      const html = await header.innerHTML();
      // Normalize by removing all class attributes (since active state varies)
      headers.push(html.replace(/\s*class="[^"]*"/g, ''));
    }
    
    // All headers should have identical structure (without class attributes)
    const firstHeader = headers[0];
    for (let i = 1; i < headers.length; i++) {
      expect(headers[i]).toBe(firstHeader);
    }
  });
});
