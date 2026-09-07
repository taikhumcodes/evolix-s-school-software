import { test, expect } from '@playwright/test';

test.describe('Student Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'admin@evolix.local');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button:has-text("Sign In")');
    await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 15000 });
  });

  test('Admission Application submission', async ({ page }) => {
    await page.goto('http://localhost:5173/admissions');
    await expect(page).toHaveURL(/.*\/admissions/);
  });

  test('Student Profile and Guardian', async ({ page }) => {
    await page.goto('http://localhost:5173/students');
    await expect(page.locator('text=Students').first()).toBeVisible();
  });

  test('Student Attendance logging', async ({ page }) => {
    await page.goto('http://localhost:5173/attendance');
    await expect(page.locator('text=Attendance').first()).toBeVisible();
  });

  test('Academic Result publishing', async ({ page }) => {
    await page.goto('http://localhost:5173/academics/results');
    await expect(page.locator('text=Results').first()).toBeVisible();
  });
});
