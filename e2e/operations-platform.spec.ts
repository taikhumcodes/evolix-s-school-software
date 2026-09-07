import { test, expect } from '@playwright/test';

test.describe('Operations and Platform', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'admin@evolix.local');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button:has-text("Sign In")');
    await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 15000 });
  });

  test('Inventory and Assets', async ({ page }) => {
    await page.goto('http://localhost:5173/inventory');
    await expect(page.locator('text=Inventory').first()).toBeVisible();
    await page.goto('http://localhost:5173/assets');
    await expect(page).toHaveURL(/.*\/assets/);
  });

  test('Transport and Communication', async ({ page }) => {
    await page.goto('http://localhost:5173/transport');
    await expect(page.locator('text=Transport').first()).toBeVisible();
    await page.goto('http://localhost:5173/communication');
    await expect(page.locator('text=Communication').first()).toBeVisible();
  });

  test('Analytics and System Health', async ({ page }) => {
    await page.goto('http://localhost:5173/analytics');
    await expect(page.locator('text=Analytics').first()).toBeVisible();
    await page.goto('http://localhost:5173/platform/health');
    await expect(page).toHaveURL(/.*\/platform\/health/);
  });
});
