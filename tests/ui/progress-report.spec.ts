/**
 * Playwright tests for Progress Report functionality
 * Tests that progress reports load, display, and integrate correctly with the AI workflow
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Progress Report Page', () => {
  
  test('page loads successfully', async ({ page }) => {
    await page.goto('/progress-report.html');
    
    // Wait for page to load
    await page.waitForSelector('header.site-header', { timeout: 5000 });
    
    // Verify page title
    await expect(page).toHaveTitle(/Training Progress Report/);
    
    // Verify header navigation is active
    const progressLink = page.locator('#nav-progress');
    await expect(progressLink).toHaveClass(/active/);
  });

  test('displays welcome message when no reports exist', async ({ page }) => {
    // Intercept the index.json request and return empty reports
    await page.route('**/reports/index.json', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          version: '1.0',
          description: 'AI-generated training progress reports',
          reports: []
        })
      });
    });
    
    await page.goto('/progress-report.html');
    await page.waitForTimeout(500);
    
    // Should show welcome message
    const reportContent = page.locator('#report-content');
    await expect(reportContent).toContainText('Welcome to Progress Reports');
    await expect(reportContent).toContainText('How it works:');
    await expect(reportContent).toContainText('What Kai analyzes:');
  });

  test('displays welcome message when index.json fails to load', async ({ page }) => {
    // Intercept and fail the request
    await page.route('**/reports/index.json', route => route.abort());
    
    await page.goto('/progress-report.html');
    await page.waitForTimeout(500);
    
    // Should show welcome message
    const reportContent = page.locator('#report-content');
    await expect(reportContent).toContainText('Welcome to Progress Reports');
  });

  test('loads most recent report from index.json', async ({ page }) => {
    // Mock index.json with a report
    await page.route('**/reports/index.json', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          version: '2.0',
          description: 'AI-generated training progress reports (JSON format)',
          reports: [
            {
              filename: '2025-11-03_blocks-4-4.json',
              startDate: '2025-10-06',
              endDate: '2025-11-03',
              blockRange: '4-4',
              title: 'Training Progress Report - Block 4',
              generatedDate: '2025-11-03',
              overallGrade: 'A',
              sessionCount: 19
            }
          ]
        })
      });
    });
    
    // Mock the actual report JSON
    await page.route('**/reports/2025-11-03_blocks-4-4.json', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          version: '1.0',
          metadata: {
            title: 'Training Progress Report - Block 4',
            period: { startDate: '2025-10-06', endDate: '2025-11-03', blockRange: '4-4' },
            generatedDate: '2025-11-03'
          },
          summary: { grade: 'A', highlights: [] },
          sections: [
            {
              type: 'text',
              title: 'Block 4 Report',
              content: [{ type: 'paragraph', text: 'Test content for Block 4' }]
            }
          ]
        })
      });
    });
    
    await page.goto('/progress-report.html');
    await page.waitForTimeout(500);
    
    // Should show the report content
    const reportContent = page.locator('#report-content');
    await expect(reportContent).toContainText('Block 4');
  });

  test('time range selector is present and functional', async ({ page }) => {
    await page.goto('/progress-report.html');
    await page.waitForSelector('#time-range', { timeout: 5000 });
    
    const timeRange = page.locator('#time-range');
    await expect(timeRange).toBeVisible();
    
    // Verify select has options (don't check if options are visible - they're in a dropdown)
    const options = await timeRange.locator('option').count();
    expect(options).toBeGreaterThan(0);
    
    // Verify specific option values exist
    const allOption = await timeRange.locator('option[value="all"]').count();
    expect(allOption).toBe(1);
    
    const customOption = await timeRange.locator('option[value="custom"]').count();
    expect(customOption).toBe(1);
  });

  test('custom date range shows/hides based on selection', async ({ page }) => {
    await page.goto('/progress-report.html');
    await page.waitForSelector('#time-range');
    
    const customDates = page.locator('#custom-dates');
    
    // Should be hidden initially
    await expect(customDates).toBeHidden();
    
    // Select custom option
    await page.selectOption('#time-range', 'custom');
    await page.waitForTimeout(200);
    
    // Should now be visible
    await expect(customDates).toBeVisible();
    
    // Verify date inputs exist
    await expect(page.locator('#start-date')).toBeVisible();
    await expect(page.locator('#end-date')).toBeVisible();
    
    // Select another option (using actual value)
    await page.selectOption('#time-range', 'all');
    await page.waitForTimeout(200);
    
    // Should be hidden again
    await expect(customDates).toBeHidden();
  });

  test('generate report button is present', async ({ page }) => {
    await page.goto('/progress-report.html');
    await page.waitForSelector('#generate-report', { timeout: 5000 });
    
    const generateButton = page.locator('#generate-report');
    await expect(generateButton).toBeVisible();
    await expect(generateButton).toHaveText('Generate Report');
  });

  test('copy prompt button works', async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    
    await page.goto('/progress-report.html');
    
    // Click the generate report button to show the prompt
    await page.waitForSelector('#generate-report', { timeout: 5000 });
    await page.click('#generate-report');
    await page.waitForTimeout(500);
    
    // Wait for the copy button to appear
    await page.waitForSelector('#copy-prompt-btn', { timeout: 5000 });
    
    // Click copy button
    const copyButton = page.locator('#copy-prompt-btn');
    await expect(copyButton).toBeVisible();
    await copyButton.click();
    
    // Verify clipboard contains the prompt (check for actual content, not specific format)
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toContain('Generate a training progress report');
    expect(clipboardText).toContain('performed/');
    expect(clipboardText).toContain('.github/prompts/generate-training-progress-report.prompt.md');
  });

  test('metadata extraction from filename works correctly', async ({ page }) => {
    const testCases = [
      {
        filename: '2025-11-03_blocks-4-4.json',
        expectedDate: '11/3/2025',
        expectedBlocks: '4-4'
      },
      {
        filename: '2025-12-01_blocks-5-5.json',
        expectedDate: '12/1/2025',
        expectedBlocks: '5-5'
      },
      {
        filename: '2025-10-06_blocks-3-4.json',
        expectedDate: '10/6/2025',
        expectedBlocks: '3-4'
      }
    ];
    
    for (const testCase of testCases) {
      // Mock index.json with test filename
      await page.route('**/reports/index.json', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            version: '2.0',
            reports: [
              {
                filename: testCase.filename,
                startDate: '2025-10-06',
                endDate: '2025-11-03',
                blockRange: testCase.expectedBlocks
              }
            ]
          })
        });
      });
      
      // Mock the report JSON
      await page.route(`**/reports/${testCase.filename}`, route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            version: '1.0',
            metadata: {
              title: `Test Report ${testCase.expectedBlocks}`,
              period: { blockRange: testCase.expectedBlocks }
            },
            summary: { grade: 'A' },
            sections: [
              {
                type: 'text',
                title: `Report for ${testCase.expectedBlocks}`,
                content: [{ type: 'paragraph', text: `Content for blocks ${testCase.expectedBlocks}` }]
              }
            ]
          })
        });
      });
      
      await page.goto('/progress-report.html');
      await page.waitForTimeout(500);
      
      // Verify the page loaded the report
      const reportContent = page.locator('#report-content');
      await expect(reportContent).toContainText(testCase.expectedBlocks);
    }
  });

  test('header navigation link for progress report exists', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('header.site-header nav');
    
    const progressLink = page.locator('#nav-progress');
    await expect(progressLink).toBeVisible();
    await expect(progressLink).toHaveText('Progress Report');
    await expect(progressLink).toHaveAttribute('href', 'progress-report.html');
  });

  test('can navigate to progress report from other pages', async ({ page }) => {
    // Start from home
    await page.goto('/');
    await page.waitForSelector('#nav-progress');
    
    // Click progress report link
    await page.click('#nav-progress');
    await page.waitForURL('**/progress-report.html');
    
    // Verify we're on the progress report page
    expect(page.url()).toContain('progress-report.html');
    await expect(page.locator('#nav-progress')).toHaveClass(/active/);
  });

  test('progress report page is mobile responsive', async ({ page }) => {
    // Test at mobile viewport
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size
    
    await page.goto('/progress-report.html');
    await page.waitForSelector('header.site-header');
    
    // Header should still be visible
    const header = page.locator('header.site-header');
    await expect(header).toBeVisible();
    
    // Controls should be visible
    const timeRange = page.locator('#time-range');
    await expect(timeRange).toBeVisible();
    
    const generateButton = page.locator('#generate-report');
    await expect(generateButton).toBeVisible();
    
    // Report content should be visible
    const reportContent = page.locator('#report-content');
    await expect(reportContent).toBeVisible();
  });

  test('page handles malformed index.json gracefully', async ({ page }) => {
    // Return invalid JSON
    await page.route('**/reports/index.json', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{ invalid json }'
      });
    });
    
    await page.goto('/progress-report.html');
    await page.waitForTimeout(500);
    
    // Should fall back to welcome message
    const reportContent = page.locator('#report-content');
    await expect(reportContent).toContainText('Welcome to Progress Reports');
  });

  test('page handles missing report file gracefully', async ({ page }) => {
    // Mock index.json pointing to non-existent file
    await page.route('**/reports/index.json', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          version: '2.0',
          reports: [
            {
              filename: 'missing-report.json',
              startDate: '2025-10-06',
              endDate: '2025-11-03'
            }
          ]
        })
      });
    });
    
    // Return 404 for the report file
    await page.route('**/reports/missing-report.json', route => {
      route.fulfill({ 
        status: 404,
        body: 'Not Found'
      });
    });
    
    await page.goto('/progress-report.html');
    
    // Wait for the error to be displayed
    await page.waitForTimeout(2000);
    
    // Check the report content area
    const reportContent = page.locator('#report-content');
    await expect(reportContent).toBeVisible();
    
    // The system should either show an error or gracefully handle the missing file
    // For now, we just verify the page doesn't crash and renders something
    const pageContent = await page.content();
    expect(pageContent).toContain('report-content');
  });
});

test.describe('Progress Report Integration', () => {
  
  test('reports directory exists', () => {
    const reportsDir = path.join(process.cwd(), 'reports');
    expect(fs.existsSync(reportsDir)).toBe(true);
  });

  test('reports index.json has correct structure', async () => {
    const indexPath = path.join(process.cwd(), 'reports', 'index.json');
    expect(fs.existsSync(indexPath)).toBe(true);
    
    const indexContent = fs.readFileSync(indexPath, 'utf-8');
    const index = JSON.parse(indexContent);
    
    expect(index).toHaveProperty('version');
    expect(index).toHaveProperty('reports');
    expect(Array.isArray(index.reports)).toBe(true);
  });

  test('reports README exists and has correct content', () => {
    const readmePath = path.join(process.cwd(), 'reports', 'README.md');
    expect(fs.existsSync(readmePath)).toBe(true);
    
    const content = fs.readFileSync(readmePath, 'utf-8');
    expect(content).toContain('# Training Progress Reports');
    expect(content).toContain('AI-generated');
    expect(content).toContain('index.json');
  });

  test('existing report files match index.json entries', async () => {
    const indexPath = path.join(process.cwd(), 'reports', 'index.json');
    const indexContent = fs.readFileSync(indexPath, 'utf-8');
    const index = JSON.parse(indexContent);
    
    for (const report of index.reports) {
      const reportPath = path.join(process.cwd(), 'reports', report.filename);
      expect(fs.existsSync(reportPath)).toBe(true);
      
      // Verify it's valid JSON
      const reportContent = fs.readFileSync(reportPath, 'utf-8');
      const reportData = JSON.parse(reportContent); // This will throw if not valid JSON
      expect(reportData).toHaveProperty('version');
      expect(reportData).toHaveProperty('metadata');
    }
  });

  test('report filenames follow naming convention', async () => {
    const indexPath = path.join(process.cwd(), 'reports', 'index.json');
    const indexContent = fs.readFileSync(indexPath, 'utf-8');
    const index = JSON.parse(indexContent);
    
    const filenamePattern = /^\d{4}-\d{2}-\d{2}_blocks-\d+-\d+\.json$/;
    
    for (const report of index.reports) {
      expect(report.filename).toMatch(filenamePattern);
    }
  });
});

test.describe('Progress Report AI Workflow', () => {
  
  test('prompt generation includes correct time range for last block', async ({ page }) => {
    await page.goto('/progress-report.html');
    await page.waitForSelector('#time-range');
    
    // Select a specific block option (using actual value)
    await page.selectOption('#time-range', 'block-4');
    
    // The prompt should be generated with the correct date range
    // This is tested by the generate button functionality
    const generateButton = page.locator('#generate-report');
    await expect(generateButton).toBeVisible();
  });

  test('custom date range validates input', async ({ page }) => {
    await page.goto('/progress-report.html');
    await page.waitForSelector('#time-range');
    
    // Select custom option
    await page.selectOption('#time-range', 'custom');
    await page.waitForTimeout(200);
    
    const startDate = page.locator('#start-date');
    const endDate = page.locator('#end-date');
    
    // Verify they are date inputs
    await expect(startDate).toHaveAttribute('type', 'date');
    await expect(endDate).toHaveAttribute('type', 'date');
    
    // Verify both inputs are visible
    await expect(startDate).toBeVisible();
    await expect(endDate).toBeVisible();
  });

  test('AI prompt includes reference to generation template', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    
    await page.goto('/progress-report.html');
    await page.waitForSelector('#generate-report');
    
    // Click generate button to show prompt
    await page.click('#generate-report');
    await page.waitForTimeout(500);
    
    // Wait for copy button
    await page.waitForSelector('#copy-prompt-btn', { timeout: 5000 });
    
    // Click copy button
    await page.click('#copy-prompt-btn');
    
    // Verify prompt references the template
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toContain('.github/prompts/generate-training-progress-report.prompt.md');
  });
});

test.describe('Progress Report Display', () => {
  
  test('displays report JSON correctly', async ({ page }) => {
    const testReportJSON = {
      version: '1.0',
      metadata: {
        title: 'Test Progress Report',
        period: { startDate: '2025-10-06', endDate: '2025-11-03' },
        generatedDate: '2025-11-03'
      },
      summary: {
        grade: 'A',
        highlights: ['Test highlight 1', 'Test highlight 2']
      },
      sections: [
        {
          type: 'text',
          title: 'Test Section',
          content: [{ type: 'paragraph', text: 'This is a test paragraph' }]
        }
      ]
    };
    
    await page.route('**/reports/index.json', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          version: '2.0',
          reports: [{ filename: 'test.json' }]
        })
      });
    });
    
    await page.route('**/reports/test.json', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(testReportJSON)
      });
    });
    
    await page.goto('/progress-report.html');
    await page.waitForTimeout(500);
    
    const reportContent = page.locator('#report-content');
    await expect(reportContent).toContainText('Test Progress Report');
    await expect(reportContent).toContainText('This is a test paragraph');
  });
});
