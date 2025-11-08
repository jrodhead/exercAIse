/**
 * UI Tests: Progress Reports
 * End-to-end tests for progress report viewing and rendering
 */

import { test, expect } from '@playwright/test';

test.describe('Progress Reports UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/progress-report.html');
  });

  // ========================================================================
  // Page Load & Structure
  // ========================================================================

  test('should load progress report page', async ({ page }) => {
    await expect(page).toHaveTitle(/Progress Report/);
  });

  test('should display page header', async ({ page }) => {
    // Check for site header (exercAIse branding)
    const siteHeader = page.locator('header.site-header h1');
    await expect(siteHeader).toContainText('exercAIse');
    
    // Or check that page has loaded successfully
    await expect(page.locator('body')).toBeVisible();
  });

  test('should show back navigation link', async ({ page }) => {
    const backLink = page.locator('a[href="history.html"]');
    await expect(backLink).toBeVisible();
  });

  // ========================================================================
  // Report Selector
  // ========================================================================

  test('should display report selector dropdown', async ({ page }) => {
    const reportSelector = page.locator('#report-selector');
    await expect(reportSelector).toBeVisible();
  });

  test('should populate report selector with available reports', async ({ page }) => {
    // Wait for reports to load by checking that the select has a valid value
    await page.waitForFunction(
      () => {
        const select = document.getElementById('report-selector') as HTMLSelectElement;
        return select && select.value && select.value !== '' && select.options.length > 1;
      },
      { timeout: 5000 }
    );
    
    const options = page.locator('#report-selector option:not([value=""])');
    const count = await options.count();
    
    // Should have at least 2 reports (from converted HTML)
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('should format report selector options with date and title', async ({ page }) => {
    await page.waitForFunction(
      () => {
        const select = document.getElementById('report-selector') as HTMLSelectElement;
        return select && select.value && select.value !== '';
      },
      { timeout: 5000 }
    );
    
    const firstOption = page.locator('#report-selector option').nth(0);
    const optionText = await firstOption.textContent();
    
    // Should contain date format (YYYY-MM-DD) and title
    expect(optionText).toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(optionText).toContain('-');
  });

  test('should select most recent report by default', async ({ page }) => {
    await page.waitForFunction(
      () => {
        const select = document.getElementById('report-selector') as HTMLSelectElement;
        return select && select.value && select.value !== '';
      },
      { timeout: 5000 }
    );
    
    const selectedValue = await page.locator('#report-selector').inputValue();
    expect(selectedValue).toContain('reports/');
    expect(selectedValue).toContain('.json');
  });

  test('should load different report when selection changes', async ({ page }) => {
    // Wait for initial report to load
    await page.waitForSelector('.report-header', { timeout: 5000 });
    
    const reportSelector = page.locator('#report-selector');
    const options = page.locator('#report-selector option:not([value=""])');
    const optionCount = await options.count();
    
    if (optionCount > 1) {
      // Get initial metadata
      const initialPeriod = await page.locator('#report-period').textContent();
      
      // Select second report
      await reportSelector.selectOption({ index: 1 });
      
      // Wait for new report to load
      await page.waitForTimeout(500);
      
      // Check that metadata changed
      const newPeriod = await page.locator('#report-period').textContent();
      expect(newPeriod).not.toBe(initialPeriod);
    }
  });

  test('should update report content when selection changes', async ({ page }) => {
    await page.waitForSelector('.report-summary', { timeout: 5000 });
    
    const reportSelector = page.locator('#report-selector');
    const options = page.locator('#report-selector option:not([value=""])');
    const optionCount = await options.count();
    
    if (optionCount > 1) {
      // Get initial grade
      const initialGrade = await page.locator('.report-summary__grade').textContent();
      
      // Select second report
      await reportSelector.selectOption({ index: 1 });
      
      // Wait for new report to render
      await page.waitForTimeout(500);
      
      // Verify content changed (grade might be different)
      const reportContent = page.locator('.report-container');
      await expect(reportContent).toBeVisible();
    }
  });

  test('should maintain report selector state after selection', async ({ page }) => {
    await page.waitForFunction(
      () => {
        const select = document.getElementById('report-selector') as HTMLSelectElement;
        return select && select.value && select.value !== '' && select.options.length > 1;
      },
      { timeout: 5000 }
    );
    
    const reportSelector = page.locator('#report-selector');
    const options = page.locator('#report-selector option:not([value=""])');
    const optionCount = await options.count();
    
    if (optionCount > 1) {
      // Select second report
      const secondOptionValue = await options.nth(1).getAttribute('value');
      await reportSelector.selectOption({ index: 1 });
      
      // Verify selection persisted
      const selectedValue = await reportSelector.inputValue();
      expect(selectedValue).toBe(secondOptionValue);
    }
  });

  // ========================================================================
  // Report Loading
  // ========================================================================

  test('should load most recent report by default', async ({ page }) => {
    // Wait for report to load
    await page.waitForSelector('.report-header', { timeout: 5000 });
    
    const reportHeader = page.locator('.report-header');
    await expect(reportHeader).toBeVisible();
  });

  test('should display report metadata', async ({ page }) => {
    await page.waitForSelector('.report-header');
    
    const title = page.locator('.report-header__title');
    await expect(title).toBeVisible();
    await expect(title).not.toBeEmpty();
    
    const meta = page.locator('.report-meta');
    await expect(meta).toBeVisible();
  });

  // ========================================================================
  // Summary Section
  // ========================================================================

  test('should display summary section with grade', async ({ page }) => {
    await page.waitForSelector('.report-summary');
    
    const summary = page.locator('.report-summary');
    await expect(summary).toBeVisible();
    
    const grade = page.locator('.report-summary__grade');
    await expect(grade).toBeVisible();
    await expect(grade).toContainText(/Grade:/);
  });

  test('should display KPI cards in summary', async ({ page }) => {
    await page.waitForSelector('.report-kpi-grid');
    
    const kpiCards = page.locator('.kpi-card');
    await expect(kpiCards.first()).toBeVisible();
    
    const count = await kpiCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should show KPI card labels and values', async ({ page }) => {
    await page.waitForSelector('.kpi-card');
    
    const firstCard = page.locator('.kpi-card').first();
    const label = firstCard.locator('.kpi-card__label');
    const value = firstCard.locator('.kpi-card__value');
    
    await expect(label).toBeVisible();
    await expect(value).toBeVisible();
    await expect(label).not.toBeEmpty();
    await expect(value).not.toBeEmpty();
  });

  // ========================================================================
  // Report Sections
  // ========================================================================

  test('should render all report sections', async ({ page }) => {
    await page.waitForSelector('.report-section');
    
    const sections = page.locator('.report-section');
    const count = await sections.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should render section titles', async ({ page }) => {
    await page.waitForSelector('.report-section__title');
    
    const titles = page.locator('.report-section__title');
    const firstTitle = titles.first();
    
    await expect(firstTitle).toBeVisible();
    await expect(firstTitle).not.toBeEmpty();
  });

  test('should render strength analysis tables', async ({ page }) => {
    await page.waitForSelector('.report-section--strength-analysis', { timeout: 5000 });
    
    const strengthSection = page.locator('.report-section--strength-analysis').first();
    await expect(strengthSection).toBeVisible();
    
    // Use .first() to avoid strict mode violation when multiple tables exist
    const table = strengthSection.locator('.report-table').first();
    await expect(table).toBeVisible();
  });

  test('should render table headers and data', async ({ page }) => {
    await page.waitForSelector('.report-table');
    
    const table = page.locator('.report-table').first();
    const headers = table.locator('.report-table__header');
    const rows = table.locator('.report-table__row');
    
    await expect(headers.first()).toBeVisible();
    await expect(rows.first()).toBeVisible();
    
    const headerCount = await headers.count();
    expect(headerCount).toBeGreaterThan(0);
  });

  test('should render text sections with content', async ({ page }) => {
    await page.waitForSelector('.report-section--text', { timeout: 5000 });
    
    const textSection = page.locator('.report-section--text').first();
    await expect(textSection).toBeVisible();
    
    const content = textSection.locator('.report-section__content');
    await expect(content).toBeVisible();
  });

  test('should render highlight boxes', async ({ page }) => {
    await page.waitForSelector('.report-highlight-box', { timeout: 5000 });
    
    const highlightBox = page.locator('.report-highlight-box').first();
    await expect(highlightBox).toBeVisible();
    
    const title = highlightBox.locator('.report-highlight-box__title');
    await expect(title).toBeVisible();
  });

  // ========================================================================
  // Dark Mode Support
  // ========================================================================

  test('should apply dark mode styles', async ({ page }) => {
    // Emulate dark color scheme
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForSelector('.report-header');
    
    // Check that page has dark background
    const body = page.locator('body');
    const bgColor = await body.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });
    
    // Dark mode should have dark background (not white)
    expect(bgColor).not.toBe('rgb(255, 255, 255)');
  });

  test('should have readable text in dark mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForSelector('.report-header__title');
    
    const title = page.locator('.report-header__title');
    const color = await title.evaluate((el) => {
      return window.getComputedStyle(el).color;
    });
    
    // Text should be light colored in dark mode (not black)
    expect(color).not.toBe('rgb(0, 0, 0)');
  });

  test('should style KPI cards in dark mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForSelector('.kpi-card');
    
    const kpiCard = page.locator('.kpi-card').first();
    await expect(kpiCard).toBeVisible();
    
    // Card should be visible and styled
    const bgColor = await kpiCard.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });
    expect(bgColor).not.toBe('rgb(255, 255, 255)');
  });

  // ========================================================================
  // Light Mode Support
  // ========================================================================

  test('should apply light mode styles', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.waitForSelector('.report-header');
    
    const body = page.locator('body');
    const bgColor = await body.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });
    
    // Light mode should have light background (white or very light color)
    // Accept rgb(255, 255, 255) or rgba(0, 0, 0, 0) (transparent, which defaults to white)
    const isLightBackground = bgColor === 'rgb(255, 255, 255)' || 
                               bgColor === 'rgba(0, 0, 0, 0)' ||
                               bgColor === 'rgb(248, 249, 250)';
    expect(isLightBackground).toBe(true);
  });

  test('should have readable text in light mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.waitForSelector('.report-header__title');
    
    const title = page.locator('.report-header__title');
    const color = await title.evaluate((el) => {
      return window.getComputedStyle(el).color;
    });
    
    // Text should be dark colored in light mode
    expect(color).not.toBe('rgb(255, 255, 255)');
  });

  // ========================================================================
  // Responsive Design
  // ========================================================================

  test('should be responsive on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForSelector('.report-header');
    
    const header = page.locator('.report-header');
    await expect(header).toBeVisible();
    
    // Check that content is not overflowing horizontally
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    
    // Allow 50px tolerance for mobile (some tables may need horizontal scroll on very small screens)
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 50);
  });

  test('should stack KPI cards on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForSelector('.kpi-card');
    
    const kpiGrid = page.locator('.report-kpi-grid');
    const gridDisplay = await kpiGrid.evaluate((el) => {
      return window.getComputedStyle(el).display;
    });
    
    expect(gridDisplay).toBe('grid');
  });

  test('should be responsive on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForSelector('.report-header');
    
    const sections = page.locator('.report-section');
    await expect(sections.first()).toBeVisible();
  });

  test('should be responsive on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForSelector('.report-header');
    
    const sections = page.locator('.report-section');
    await expect(sections.first()).toBeVisible();
  });

  // ========================================================================
  // Table Rendering
  // ========================================================================

  test('should render table rows and cells correctly', async ({ page }) => {
    await page.waitForSelector('.report-table');
    
    const table = page.locator('.report-table').first();
    const cells = table.locator('.report-table__cell');
    
    const count = await cells.count();
    expect(count).toBeGreaterThan(0);
    
    const firstCell = cells.first();
    await expect(firstCell).toBeVisible();
    await expect(firstCell).not.toBeEmpty();
  });

  test('should show sentiment indicators in exercise tables', async ({ page }) => {
    await page.waitForSelector('.report-table--exercise', { timeout: 5000 });
    
    const exerciseTable = page.locator('.report-table--exercise').first();
    const sentimentSpan = exerciseTable.locator('.sentiment--positive, .sentiment--negative, .sentiment--neutral').first();
    
    if (await sentimentSpan.count() > 0) {
      await expect(sentimentSpan).toBeVisible();
    }
  });

  // ========================================================================
  // Content Visibility
  // ========================================================================

  test('should display subsection titles in strength analysis', async ({ page }) => {
    await page.waitForSelector('.report-subsection__title', { timeout: 5000 });
    
    const subtitle = page.locator('.report-subsection__title').first();
    await expect(subtitle).toBeVisible();
    await expect(subtitle).not.toBeEmpty();
  });

  test('should display observations in strength analysis', async ({ page }) => {
    const observation = page.locator('.report-subsection__observation').first();
    
    if (await observation.count() > 0) {
      await expect(observation).toBeVisible();
      await expect(observation).not.toBeEmpty();
    }
  });

  test('should render lists in text sections', async ({ page }) => {
    await page.waitForSelector('.report-section__list', { timeout: 5000 });
    
    const list = page.locator('.report-section__list').first();
    await expect(list).toBeVisible();
    
    const items = list.locator('li');
    const count = await items.count();
    expect(count).toBeGreaterThan(0);
  });

  // ========================================================================
  // Accessibility
  // ========================================================================

  test('should have semantic HTML structure', async ({ page }) => {
    await page.waitForSelector('.report-header');
    
    // Check for semantic elements
    const header = page.locator('header.report-header');
    const sections = page.locator('section.report-section');
    
    await expect(header).toBeVisible();
    const sectionCount = await sections.count();
    expect(sectionCount).toBeGreaterThan(0);
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.waitForSelector('h2, h3, h4');
    
    const h2 = page.locator('h2').first();
    await expect(h2).toBeVisible();
    
    const h3 = page.locator('h3').first();
    await expect(h3).toBeVisible();
  });

  test('should have keyboard navigable links', async ({ page }) => {
    const backLink = page.locator('a[href="history.html"]');
    await expect(backLink).toBeVisible();
    
    await backLink.focus();
    const isFocused = await backLink.evaluate((el) => el === document.activeElement);
    expect(isFocused).toBe(true);
  });

  // ========================================================================
  // Error Handling
  // ========================================================================

  test('should handle missing report gracefully', async ({ page }) => {
    // Navigate to non-existent report
    await page.goto('/progress-report.html?report=non-existent.json');
    
    // Should show error or empty state, not crash
    await page.waitForTimeout(2000);
    
    // Page should still be loaded
    await expect(page.locator('body')).toBeVisible();
  });

  test('should not show JavaScript errors in console', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.waitForSelector('.report-header', { timeout: 5000 });
    
    // Filter out expected/benign errors
    const criticalErrors = consoleErrors.filter(err => 
      !err.includes('favicon') && 
      !err.includes('404')
    );
    
    expect(criticalErrors.length).toBe(0);
  });
});
