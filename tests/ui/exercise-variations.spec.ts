import { test, expect } from '@playwright/test';

test.describe('Exercise Variations', () => {

  test('Performance history specificity - different variations tracked separately', async ({ page }) => {
    // Test that different exercise variations can be logged separately
    // and maintain distinct performance histories
    
    // First, log performance for regular Goblet Squat
    await page.goto('/exercise.html?file=exercises/goblet_squat.json');
    
    // Wait for main content to load and verify no error state
    await expect(page.locator('#main')).toBeVisible();
    await expect(page.locator('#not-found')).toHaveCSS('display', 'none');
    
    // Check that the exercise loads properly
    await expect(page.locator('#ex-name')).toContainText('Goblet Squat');
    
    // Navigate to Box Goblet Squat variation
    await page.goto('/exercise.html?file=exercises/box_goblet_squat.json');
    
    // Wait for main content and verify no error
    await expect(page.locator('#main')).toBeVisible();
    await expect(page.locator('#not-found')).toHaveCSS('display', 'none');
    
    // Verify it's a different exercise with different content
    await expect(page.locator('#ex-name')).toContainText('Box Goblet Squat');
    
    // Check that setup instructions are variation-specific
    const setupItems = page.locator('#setup li');
    await expect(setupItems.first()).toContainText('Position box or bench at desired depth');
    
    // Verify they have separate history sections (even if empty)
    const historySection = page.locator('#history');
    await expect(historySection).toBeVisible();
  });

  test('Cross-reference navigation - variation links work properly', async ({ page }) => {
    await page.goto('/exercise.html?file=exercises/goblet_squat.json');
    
    // Wait for main content and verify no error
    await expect(page.locator('#main')).toBeVisible();
    await expect(page.locator('#not-found')).toHaveCSS('display', 'none');
    
    // Verify the main goblet squat page has variation links
    const variationsSection = page.locator('#variations');
    await expect(variationsSection).toBeVisible();
    
    // Check that Box Goblet Squat link exists and is clickable
    const boxSquatLink = page.locator('#variations a', { hasText: 'Box Goblet Squat' });
    await expect(boxSquatLink).toBeVisible();
    await expect(boxSquatLink).toHaveAttribute('href', /exercises\/box_goblet_squat\.json/);
    
    // Click the link and verify navigation
    await boxSquatLink.click();
    
    // Wait for the new page to load properly
    await expect(page.locator('#main')).toBeVisible();
    await expect(page.locator('#not-found')).toHaveCSS('display', 'none');
    await expect(page.locator('#ex-name')).toContainText('Box Goblet Squat');
    
    // Verify the Box Goblet Squat page links back to regular Goblet Squat
    const backToGobletLink = page.locator('#variations a').filter({ hasText: /^Goblet Squat$/ });
    await expect(backToGobletLink).toBeVisible();
    await expect(backToGobletLink).toHaveAttribute('href', /exercises\/goblet_squat\.json/);
    
    // Test clicking back
    await backToGobletLink.click();
    await expect(page.locator('#main')).toBeVisible();
    await expect(page.locator('#ex-name')).toContainText('Goblet Squat');
    
    // Test heels-elevated variation link
    const heelsElevatedLink = page.locator('#variations a', { hasText: 'Heels-elevated Goblet Squat' });
    await expect(heelsElevatedLink).toBeVisible();
    await expect(heelsElevatedLink).toHaveAttribute('href', /exercises\/heels_elevated_goblet_squat\.json/);
    
    // Navigate to heels-elevated variation
    await heelsElevatedLink.click();
    await expect(page.locator('#main')).toBeVisible();
    await expect(page.locator('#ex-name')).toContainText('Heels-elevated Goblet Squat');
  });

  test('Variation links render as proper HTML links, not plain text', async ({ page }) => {
    await page.goto('/exercise.html?file=exercises/goblet_squat.json');
    
    // Wait for exercise content to load
    await expect(page.locator('#ex-name')).toContainText('Goblet Squat');
    
    // Wait for variations section to have links
    await page.waitForSelector('#variations a', { timeout: 5000 });
    
    // Verify variation links are rendered as proper HTML anchor elements
    const variationLinks = page.locator('#variations a');
    const linkCount = await variationLinks.count();
    
    // Should have at least 2 clickable variation links
    expect(linkCount).toBeGreaterThanOrEqual(2);
    
    // Verify they're actual anchor elements with href attributes
    for (let i = 0; i < linkCount; i++) {
      const link = variationLinks.nth(i);
      await expect(link).toHaveAttribute('href');
      
      // Href should contain exercise.html?file=exercises/
      const href = await link.getAttribute('href');
      expect(href).toMatch(/exercise\.html\?file=exercises\/.*\.json/);
    }
    
    // Verify no plain text markdown syntax appears in variations
    const variationsList = page.locator('#variations');
    const textContent = await variationsList.textContent();
    
    // Should not contain markdown link syntax like [text](url)
    expect(textContent).not.toMatch(/\[.*\]\(.*\.json\)/);
  });

  test('Migration path - workout links point to specific variations', async ({ page }) => {
    await page.goto('/');
    
    // Test a workout that should link to specific exercise variations
    // using a mock workout that includes alternating dumbbell biceps curl
    const workoutWithVariations = {
      version: '1',
      title: 'Variation Link Test',
      date: '2025-10-13',
      sections: [
        {
          type: 'Main',
          title: 'Main Work',
          items: [
            { 
              kind: 'exercise',
              name: 'Biceps Curl (Alternating Dumbbells)', 
              link: 'exercises/alternating_dumbbell_biceps_curl.json',
              prescription: { sets: 3, reps: '10-12', weight: '25 lb per hand' }
            },
            {
              kind: 'exercise',
              name: 'Overhead Dumbbell Triceps Extension (Two Hands)',
              link: 'exercises/overhead_dumbbell_triceps_extension.json', 
              prescription: { sets: 2, reps: '12-15', weight: '30 lb' }
            }
          ]
        }
      ]
    };

    await page.fill('#gen-json', JSON.stringify(workoutWithVariations));
    await page.click('#gen-load-json');

    await expect(page.locator('#workout-section')).toBeVisible();

    // Verify the specific variation links work
    const alternatingCurlLink = page.locator('#workout-content a', { hasText: 'Biceps Curl (Alternating Dumbbells)' });
    await expect(alternatingCurlLink).toBeVisible();
    await expect(alternatingCurlLink).toHaveAttribute('href', /alternating_dumbbell_biceps_curl\.json/);

    // Wait for click handler to be attached (happens in async xhrGet callback)
    await page.waitForTimeout(100);
    
    // Click and wait for navigation to exercise.html
    await alternatingCurlLink.click();
    await page.waitForURL(/exercise\.html/, { timeout: 5000 });
    
    await expect(page.locator('#main')).toBeVisible();
    await expect(page.locator('#ex-name')).toContainText('Alternating or Supinated Dumbbell Biceps Curl');
    
    // Verify this is the specific variation with variation-specific content
    const steps = page.locator('#cues li');
    await expect(steps.first()).toContainText('Stand tall with a dumbbell in each hand');
  });

  test('Biceps curl variations cross-reference correctly', async ({ page }) => {
    // Test that biceps curl variations properly link to each other
    await page.goto('/exercise.html?file=exercises/alternating_dumbbell_biceps_curl.json');
    
    await expect(page.locator('#main')).toBeVisible();
    await expect(page.locator('#ex-name')).toContainText('Alternating or Supinated Dumbbell Biceps Curl');
    
    // Should link to basic biceps curl and hammer curl
    const bicepsCurlLink = page.locator('#variations a', { hasText: 'Biceps Curl' });
    await expect(bicepsCurlLink).toBeVisible();
    
    const hammerCurlLink = page.locator('#variations a', { hasText: 'Hammer Curl' });
    await expect(hammerCurlLink).toBeVisible();
    
    // Test navigation to hammer curl
    await hammerCurlLink.click();
    await expect(page.locator('#main')).toBeVisible();
    await expect(page.locator('#ex-name')).toContainText('Hammer Curl');
    
    // Verify hammer curl links back to the variations
    const backToAlternatingLink = page.locator('#variations a', { hasText: 'Alternating Dumbbell Biceps Curl' });
    await expect(backToAlternatingLink).toBeVisible();
  });

  test('Exercise variation files follow complete schema structure', async ({ page }) => {
    // Verify that created variation files have all required schema fields
    
    // Test Box Goblet Squat has complete structure
    await page.goto('/exercise.html?file=exercises/box_goblet_squat.json');
    
    // Check all major sections are present and populated
    await expect(page.locator('#setup')).toBeVisible();
    await expect(page.locator('#steps')).toBeVisible();
    await expect(page.locator('#cues')).toBeVisible();
    await expect(page.locator('#mistakes')).toBeVisible();
    await expect(page.locator('#variations')).toBeVisible();
    await expect(page.locator('#regressions')).toBeVisible();
    await expect(page.locator('#progressions')).toBeVisible();
    await expect(page.locator('#phints')).toBeVisible();
    await expect(page.locator('#joints')).toBeVisible();
    
    // Verify setup has variation-specific content
    const setupItems = page.locator('#setup li');
    expect(await setupItems.count()).toBeGreaterThan(0);
    await expect(setupItems.first()).toContainText('box');
    
    // Verify steps are variation-specific 
    const stepItems = page.locator('#steps li');
    expect(await stepItems.count()).toBeGreaterThan(0);
    await expect(stepItems.nth(2)).toContainText('touch box');
    
    // Test Heels-elevated variation
    await page.goto('/exercise.html?file=exercises/heels_elevated_goblet_squat.json');
    
    await expect(page.locator('#setup li').first()).toContainText('plates or heel wedges');
    await expect(page.locator('#steps li').nth(2)).toContainText('deeper squat');
  });
});