import { test, expect } from '@playwright/test';

test.describe('Authentication Flows', () => {
  test('Superadmin successful login', async ({ page }) => {
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'admin@evolix.local');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button:has-text("Sign In")');
    await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 15000 });
  });

  test('Invalid credentials rejection', async ({ page }) => {
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'admin@evolix.local');
    await page.fill('input[type="password"]', 'wrongpass');
    await page.click('button:has-text("Sign In")');
    await expect(page.locator('text=Incorrect email or password')).toBeVisible();
  });

  test('Cross-tenant intrusion prevention', async ({ page }) => {
    await page.goto('http://localhost:5173/dashboard?tenantId=attacker');
    await expect(page).toHaveURL(/.*\/login/);
  });
});
