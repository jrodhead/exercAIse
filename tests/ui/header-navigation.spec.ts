/**
 * Playwright tests for header navigation component
 * Tests that the header loads correctly on all pages and navigation works properly
 */

import { test, expect } from '@playwright/test';

const PAGES = [
  { path: '/', name: 'Home (index.html)', activeNavId: 'nav-home' },
  { path: '/week.html', name: 'This Week', activeNavId: 'nav-week' },
  { path: '/rpe-guide.html', name: 'RPE Guide', activeNavId: null },
  { path: '/exercise.html?file=exercises/goblet_squat.json', name: 'Exercise Detail', activeNavId: null }
];

test.describe('Header Navigation Component', () => {
  
  test('header component loads on all pages', async ({ page }) => {
    for (const pageInfo of PAGES) {
      await page.goto(pageInfo.path);
      
      // Wait for header to load
      await page.waitForSelector('header.site-header', { timeout: 5000 });
      
      // Verify header structure
      const header = page.locator('header.site-header');
      await expect(header).toBeVisible();
      
      // Verify site title
      const h1 = header.locator('h1');
      await expect(h1).toHaveText('exercAIse');
      
      // Verify navigation exists
      const nav = header.locator('nav');
      await expect(nav).toBeVisible();
      
      console.log(`✓ Header loaded successfully on ${pageInfo.name}`);
    }
  });

  test('all navigation links are present', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('header.site-header nav');
    
    const nav = page.locator('header.site-header nav');
    
    // Check for all expected navigation links
    const expectedLinks = [
      { id: 'nav-home', text: 'Home', href: 'index.html' },
      { id: 'nav-week', text: 'This Week', href: 'week.html' },
      { id: 'nav-workouts', text: 'Workouts', href: 'workouts.html' },
      { id: 'nav-history', text: 'History', href: 'history.html' },
      { text: 'RPE Guide', href: 'rpe-guide.html' },
      { text: 'README' }
    ];
    
    for (const link of expectedLinks) {
      if (link.id) {
        const linkElement = nav.locator(`#${link.id}`);
        await expect(linkElement).toBeVisible();
        await expect(linkElement).toHaveText(link.text);
        if (link.href) {
          await expect(linkElement).toHaveAttribute('href', link.href);
        }
      } else {
        const linkElement = nav.locator(`a:has-text("${link.text}")`);
        await expect(linkElement).toBeVisible();
      }
    }
  });

  test('active navigation link is set correctly on each page', async ({ page }) => {
    // Test Home page
    await page.goto('/');
    await page.waitForSelector('#nav-home.active', { timeout: 5000 });
    await expect(page.locator('#nav-home')).toHaveClass(/active/);
    
    // Test This Week page
    await page.goto('/week.html');
    await page.waitForSelector('#nav-week.active', { timeout: 5000 });
    await expect(page.locator('#nav-week')).toHaveClass(/active/);
    
    // Test RPE Guide page
    await page.goto('/rpe-guide.html');
    await page.waitForSelector('header.site-header', { timeout: 5000 });
    const rpeLink = page.locator('a[href="rpe-guide.html"]');
    await expect(rpeLink).toHaveClass(/active/);
  });

  test('navigation links are clickable and navigate correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('header.site-header nav');
    
    // Test This Week navigation
    await page.click('#nav-week');
    await page.waitForURL('**/week.html');
    expect(page.url()).toContain('week.html');
    
    // Test Home navigation
    await page.click('#nav-home');
    await page.waitForURL('**/index.html');
    expect(page.url()).toMatch(/index\.html$/);
    
    // Test RPE Guide navigation
    await page.click('a[href="rpe-guide.html"]');
    await page.waitForURL('**/rpe-guide.html');
    expect(page.url()).toContain('rpe-guide.html');
  });

  test('header component has fallback if fetch fails', async ({ page }) => {
    // Intercept the component request and make it fail
    await page.route('**/components/header.html', route => route.abort());
    
    await page.goto('/');
    
    // Wait a bit for fallback to render
    await page.waitForTimeout(1000);
    
    // Fallback header should still be present
    const header = page.locator('header.site-header');
    await expect(header).toBeVisible();
    
    // Navigation should still work
    const nav = header.locator('nav');
    await expect(nav).toBeVisible();
    
    // Verify key links exist
    await expect(page.locator('#nav-home')).toBeVisible();
    await expect(page.locator('#nav-week')).toBeVisible();
  });

  test('README link opens in new tab', async ({ page, context }) => {
    await page.goto('/');
    await page.waitForSelector('header.site-header nav');
    
    const readmeLink = page.locator('nav a:has-text("README")');
    
    // Verify it has target="_blank"
    await expect(readmeLink).toHaveAttribute('target', '_blank');
    await expect(readmeLink).toHaveAttribute('rel', 'noopener');
  });

  test('header is consistent across all pages', async ({ page }) => {
    const headerHtmls: string[] = [];
    
    for (const pageInfo of PAGES.slice(0, 3)) { // Test first 3 pages
      await page.goto(pageInfo.path);
      await page.waitForSelector('header.site-header');
      
      // Get header structure (without active classes)
      const headerHtml = await page.locator('header.site-header').evaluate(el => {
        const clone = el.cloneNode(true) as HTMLElement;
        // Remove active classes and empty class attributes for comparison
        clone.querySelectorAll('.active').forEach(el => el.classList.remove('active'));
        clone.querySelectorAll('[class=""]').forEach(el => el.removeAttribute('class'));
        return clone.innerHTML;
      });
      
      headerHtmls.push(headerHtml);
    }
    
    // All headers should have the same structure
    const firstHeader = headerHtmls[0];
    for (let i = 1; i < headerHtmls.length; i++) {
      expect(headerHtmls[i]).toBe(firstHeader);
    }
  });
});
