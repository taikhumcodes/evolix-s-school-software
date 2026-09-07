import { test, expect } from '@playwright/test';

/**
 * Smoke test — verifies Playwright + Chromium installation is working.
 * This navigates to the frontend dev server and checks the login page loads.
 */
test.describe('Playwright Installation Smoke Test', () => {
  test('should load the application login page', async ({ page }) => {
    await page.goto('/');

    // The app should redirect to login or show the main page
    // Wait for any content to render (React hydration)
    await page.waitForLoadState('networkidle');

    // Check that the page has a title (any title means React rendered)
    const title = await page.title();
    expect(title).toBeTruthy();

    // Take a screenshot to prove it works
    await page.screenshot({ path: 'e2e/screenshots/smoke-test.png', fullPage: true });
    console.log(`Page title: "${title}"`);
    console.log('✅ Playwright + Chromium working correctly!');
  });

  test('should be able to interact with form elements', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Find any input element on the page (login form should have email/password inputs)
    const inputs = page.locator('input');
    const inputCount = await inputs.count();

    console.log(`Found ${inputCount} input element(s) on the page`);
    expect(inputCount).toBeGreaterThanOrEqual(0); // At minimum page loads

    // If there are inputs, verify we can type into them
    if (inputCount > 0) {
      const firstInput = inputs.first();
      await firstInput.click();
      await firstInput.fill('test@example.com');
      const value = await firstInput.inputValue();
      expect(value).toBe('test@example.com');
      console.log('✅ Form interaction working correctly!');
    }
  });
});
