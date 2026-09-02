import { test, expect } from '@playwright/test';

test.describe('EVOLIX Foundation Flows (REAL E2E)', () => {
  // Use a longer timeout for the first test to allow backend/frontend to fully spin up
  test.setTimeout(60000);

  test('FLOW 1: English Login -> Shell -> Logout', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1')).toContainText('Sign In');

    // Login
    await page.fill('input[type="email"]', 'admin_a@evolix.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');

    // Should redirect to dashboard and load tenant context
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('h1').first()).toContainText('Dashboard');

    // Wait for the shell to become active (meaning /auth/me succeeded)
    await expect(page.locator('body')).toContainText('Foundation Shell Active');

    // Logout flow
    const logoutBtn = page.getByRole('button', { name: /Logout|लॉग आउट/i });
    await logoutBtn.click();

    // Back to login
    await expect(page).toHaveURL(/.*login/);
  });

  test('FLOW 2: Hindi Login -> Switch Lang -> Shell -> Refresh -> Persist', async ({ page }) => {
    await page.goto('/login');

    // Change language to Hindi
    const langBtn = page.getByText('हिंदी');
    await langBtn.click();
    await expect(page.locator('h1')).toContainText('साइन इन करें');

    // Login
    await page.fill('input[type="email"]', 'admin_a@evolix.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');

    // Dashboard in Hindi
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('h1').first()).toContainText('डैशबोर्ड');

    // Refresh page
    await page.reload();

    // Persistence check
    await expect(page.locator('h1').first()).toContainText('डैशबोर्ड');
  });

  test('FLOW 3: Invalid Login -> Backend Rejection', async ({ page }) => {
    await page.goto('/login');

    // Invalid credentials
    await page.fill('input[type="email"]', 'admin_a@evolix.com');
    await page.fill('input[type="password"]', 'wrongpass');
    await page.click('button[type="submit"]');

    // Expecting error (backend returns 401, frontend translates or displays it)
    await expect(page.locator('.text-red-600')).toBeVisible();
    await expect(page.locator('.text-red-600')).toContainText(/Invalid|email or password|गलत/i);
  });

  test('FLOW 4: RBAC -> Restricted User Behavior', async ({ page, request }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'restricted_a@evolix.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/.*dashboard/);

    // Try to access a protected UI route or perform a restricted action in UI (if exists)
    // For now, we will grab the token from localStorage and hit the backend API directly to prove 403

    const token = await page.evaluate(() => localStorage.getItem('access_token'));
    expect(token).toBeTruthy();

    // Fetch school ID from /auth/me
    const meRes = await request.get('/api/v1/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const meData = await meRes.json();
    const schoolId = meData.schools[0].id;

    // Try a restricted API route (e.g. settings write)
    const restrictedRes = await request.post(`/api/v1/schools/${schoolId}/settings`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(restrictedRes.status()).toBe(403);
  });

  test('FLOW 5: Tenant Isolation -> Cannot access School B', async ({ page, request }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin_a@evolix.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/.*dashboard/);

    const token = await page.evaluate(() => localStorage.getItem('access_token'));
    expect(token).toBeTruthy();

    // Use a fake integer ID for School B
    const fakeSchoolBUuid = 999;

    const tenantRes = await request.get(`/api/v1/schools/${fakeSchoolBUuid}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    // Backend should reject this request
    expect(tenantRes.ok()).toBeFalsy();
  });
});
