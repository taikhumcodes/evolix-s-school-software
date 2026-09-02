import { test, expect } from '@playwright/test';

test.describe('EVOLIX Administration Module Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin_a@evolix.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('Navigate to Users and check list', async ({ page }) => {
    // Navigate via sidebar or direct URL
    await page.goto('/admin/users');
    await expect(page.locator('h1')).toContainText(/Users|उपयोगकर्ता/i);

    // Expect at least one user (the seeded admin)
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('table')).toContainText('admin_a@evolix.com');
  });

  test('Navigate to Roles and check list', async ({ page }) => {
    await page.goto('/admin/roles');
    await expect(page.locator('h1')).toContainText(/Roles|भूमिका/i);

    // Expect the superadmin role
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('table')).toContainText('superadmin');
  });

  test('Navigate to Academic Years and check list', async ({ page }) => {
    await page.goto('/admin/academic-years');
    await expect(page.locator('h1')).toContainText(/Academic Years|शैक्षणिक वर्ष/i);

    // Check for create button
    const createBtn = page.locator('a', { hasText: 'Add Year' });
    await expect(createBtn).toBeVisible();
  });

  test('Navigate to Audit Logs and check list', async ({ page }) => {
    await page.goto('/admin/audit-logs');
    await expect(page.locator('h1')).toContainText(/Audit Logs|ऑडिट लॉग/i);

    // Ensure table is rendered
    await expect(page.locator('table')).toBeVisible();
  });
});
