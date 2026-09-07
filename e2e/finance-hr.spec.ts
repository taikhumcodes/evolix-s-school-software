import { test, expect } from '@playwright/test';

test.describe('Finance and HR', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'admin@evolix.local');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button:has-text("Sign In")');
    await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 15000 });
  });

  test('Fee Invoice and Payment', async ({ page }) => {
    await page.goto('http://localhost:5173/finance');
    await expect(page.locator('text=Finance').first()).toBeVisible();
  });

  test('Employee Lifecycle and Payroll', async ({ page }) => {
    await page.goto('http://localhost:5173/hr/payroll');
    await expect(page.locator('text=Payroll').first()).toBeVisible();
  });
});
