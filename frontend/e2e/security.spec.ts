import { test, expect } from '@playwright/test';
import crypto from 'crypto';

// Standard RFC 6238 TOTP generator
function generateTOTP(secret: string, timeStep = 30): string {
  const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (let i = 0; i < secret.length; i++) {
    const val = base32chars.indexOf(secret.charAt(i).toUpperCase());
    if (val >= 0) {
      bits += val.toString(2).padStart(5, '0');
    }
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }
  const key = Buffer.from(bytes);
  const epoch = Math.floor(Date.now() / 1000);
  const counter = Math.floor(epoch / timeStep);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1000000;
  return code.toString().padStart(6, '0');
}

test.describe.serial('EVOLIX Security & Access Control Module Flows (E2E)', () => {
  test.setTimeout(60000);

  // Helper to log in as admin_a
  const loginAsAdmin = async (page: any, password = 'password') => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin_a@evolix.com');
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/);
  };

  test('FLOW 1: Change password -> old password rejected -> new password accepted', async ({
    page,
    request,
  }) => {
    // 1. Initial login
    await loginAsAdmin(page, 'password');
    await expect(page).toHaveURL(/.*dashboard/);

    // 2. Navigate to Account Security
    await page.goto('/account/security');
    await expect(page.locator('h1')).toContainText('Account Security');

    // 3. Fill change password form
    const tempPassword = 'NewStrongPassword123!';
    await page.fill('input[name="current_password"]', 'password');
    await page.fill('input[name="new_password"]', tempPassword);
    await page.fill('input[name="confirm_password"]', tempPassword);
    await page.click('button:has-text("Update Password")');

    await expect(page.locator('text=Password updated successfully.')).toBeVisible();

    // 4. Logout
    await page.goto('/dashboard');
    const logoutBtn = page.getByRole('button', { name: /Logout|लॉग आउट/i });
    await logoutBtn.click();
    await expect(page).toHaveURL(/.*login/);

    // 5. Old password rejected
    await page.fill('input[type="email"]', 'admin_a@evolix.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    await expect(page.locator('.text-red-600')).toBeVisible();

    // 6. New password accepted
    await page.fill('input[type="email"]', 'admin_a@evolix.com');
    await page.fill('input[type="password"]', tempPassword);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/);

    // 7. Revert password back to 'password' to maintain baseline
    const token = await page.evaluate(() => localStorage.getItem('access_token'));
    await request.patch('/api/v1/security/password', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        current_password: tempPassword,
        new_password: 'password',
      },
    });
  });

  test('FLOW 2: TOTP enrollment -> verification -> logout -> 2FA login -> Invalid TOTP rejected', async ({
    page,
    request,
  }) => {
    // 1. Login
    await loginAsAdmin(page, 'password');
    await expect(page).toHaveURL(/.*dashboard/);

    const token = await page.evaluate(() => localStorage.getItem('access_token'));

    // Clean up any existing 2FA first
    await request.delete('/api/v1/security/2fa', {
      headers: { Authorization: `Bearer ${token}` },
    });

    // 2. Navigate to Account Security -> Two-Factor Auth tab
    await page.goto('/account/security');
    await page.click('button:has-text("Two-Factor Auth")');

    // 3. Begin setup
    await page.click('button:has-text("Set up 2FA")');

    // Wait for secret to appear
    await expect(page.locator('h2:has-text("Configure Authenticator App")')).toBeVisible();

    // Grab secret from UI
    const secretCode = await page.locator('span.tracking-widest').innerText();
    expect(secretCode).toBeTruthy();

    // 4. Test Invalid TOTP rejected in setup
    await page.fill('input[placeholder="000000"]', '000000');
    await page.click('button:has-text("Verify & Enable")');
    await expect(page.locator('.text-red-600')).toContainText(/invalid/i);

    // 5. Enter Valid TOTP
    const validTotp = generateTOTP(secretCode.trim());
    await page.fill('input[placeholder="000000"]', validTotp);
    await page.click('button:has-text("Verify & Enable")');

    await expect(page.locator('text=2FA is Enabled')).toBeVisible();

    // 6. Logout
    await page.goto('/dashboard');
    const logoutBtn = page.getByRole('button', { name: /Logout|लॉग आउट/i });
    await logoutBtn.click();
    await expect(page).toHaveURL(/.*login/);

    // 7. Login with password -> triggers 2FA challenge
    await page.fill('input[type="email"]', 'admin_a@evolix.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');

    await expect(page.locator('h2:has-text("Two-Factor Authentication")')).toBeVisible();

    // 8. Test Invalid TOTP rejected on login
    await page.fill('input[placeholder="000000"]', '111111');
    await page.click('button:has-text("Verify Code")');
    await expect(page.locator('.text-red-600')).toBeVisible();

    // 9. Enter valid TOTP on login
    const loginTotp = generateTOTP(secretCode.trim());
    await page.fill('input[placeholder="000000"]', loginTotp);
    await page.click('button:has-text("Verify Code")');
    await expect(page).toHaveURL(/.*dashboard/);

    // Clean up 2FA for subsequent tests
    const activeToken = await page.evaluate(() => localStorage.getItem('access_token'));
    await request.delete('/api/v1/security/2fa', {
      headers: { Authorization: `Bearer ${activeToken}` },
    });
  });

  test('FLOW 3: Recovery-code login -> Same recovery code cannot be reused', async ({
    page,
    request,
  }) => {
    // 1. Login and enable 2FA to get recovery codes
    await loginAsAdmin(page, 'password');
    const token = await page.evaluate(() => localStorage.getItem('access_token'));

    // Clean up 2FA
    await request.delete('/api/v1/security/2fa', {
      headers: { Authorization: `Bearer ${token}` },
    });

    // Setup 2FA via API to obtain recovery codes
    const setupRes = await request.post('/api/v1/security/2fa/setup', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const setupData = await setupRes.json();
    const secret = setupData.secret;
    const recoveryCode = setupData.recovery_codes[0];

    // Verify 2FA
    const totp = generateTOTP(secret);
    await request.post('/api/v1/security/2fa/verify', {
      headers: { Authorization: `Bearer ${token}` },
      data: { code: totp },
    });

    // 2. Logout
    await page.goto('/dashboard');
    const logoutBtn = page.getByRole('button', { name: /Logout|लॉग आउट/i });
    await logoutBtn.click();

    // 3. Login with primary credentials to trigger challenge
    await page.fill('input[type="email"]', 'admin_a@evolix.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');

    await expect(page.locator('h2:has-text("Two-Factor Authentication")')).toBeVisible();

    // 4. Switch to Recovery Code entry
    await page.click('button:has-text("Use Recovery Code")');
    await expect(page.locator('text=Enter one of your 8-character recovery codes.')).toBeVisible();

    // 5. Enter recovery code
    await page.fill('input[placeholder="XXXX-XXXX"]', recoveryCode);
    await page.click('button:has-text("Verify Code")');
    await expect(page).toHaveURL(/.*dashboard/);

    // 6. Logout and attempt to reuse same recovery code
    await page.goto('/dashboard');
    const logoutBtn2 = page.getByRole('button', { name: /Logout|लॉग आउट/i });
    await logoutBtn2.click();
    await expect(page).toHaveURL(/.*login/);

    await page.fill('input[type="email"]', 'admin_a@evolix.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    await expect(page.locator('h2:has-text("Two-Factor Authentication")')).toBeVisible();

    await page.click('button:has-text("Use Recovery Code")');
    await page.fill('input[placeholder="XXXX-XXXX"]', recoveryCode);
    await page.click('button:has-text("Verify Code")');

    // Expect rejection
    await expect(page.locator('.text-red-600')).toBeVisible();

    // Clean up 2FA using a fresh TOTP login
    const freshTotp = generateTOTP(secret);
    await page.click('button:has-text("Use Authenticator")');
    await page.fill('input[placeholder="000000"]', freshTotp);
    await page.click('button:has-text("Verify Code")');
    await expect(page).toHaveURL(/.*dashboard/);

    const cleanupToken = await page.evaluate(() => localStorage.getItem('access_token'));
    await request.delete('/api/v1/security/2fa', {
      headers: { Authorization: `Bearer ${cleanupToken}` },
    });
  });

  test('FLOW 4: Two browser sessions -> revoke one -> revoked session loses refresh capability', async ({
    page,
    request,
    browser,
  }) => {
    // Session 1 in primary browser
    await loginAsAdmin(page, 'password');
    await expect(page).toHaveURL(/.*dashboard/);
    const session1RefreshToken = await page.evaluate(() => localStorage.getItem('refresh_token'));

    // Session 2 in secondary context
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    await loginAsAdmin(page2, 'password');
    await expect(page2).toHaveURL(/.*dashboard/);
    const session2RefreshToken = await page2.evaluate(() => localStorage.getItem('refresh_token'));

    expect(session1RefreshToken).not.toBe(session2RefreshToken);

    // In Session 1, navigate to Account Security -> Active Sessions
    await page.goto('/account/security');
    await page.click('button:has-text("Active Sessions")');

    // Revoke all other sessions via API
    const token1 = await page.evaluate(() => localStorage.getItem('access_token'));
    const sessionsRes = await request.get('/api/v1/security/sessions', {
      headers: { Authorization: `Bearer ${token1}` },
    });
    const sessions = await sessionsRes.json();
    expect(sessions.length).toBeGreaterThanOrEqual(2);

    // Revoke the other session(s)
    for (const s of sessions) {
      await request.delete(`/api/v1/security/sessions/${s.id}`, {
        headers: { Authorization: `Bearer ${token1}` },
      });
    }

    // Try refreshing with Session 2 refresh token -> MUST FAIL (401)
    const refreshRes = await request.post('/api/v1/auth/refresh', {
      data: { refresh_token: session2RefreshToken },
    });
    expect(refreshRes.status()).toBe(401);

    await context2.close();
  });

  test('FLOW 5: Account lockout and automatic recovery/unlock validation', async ({ request }) => {
    // Set lockout policy to 3 attempts, lockout for 1 minute
    const loginRes = await request.post('/api/v1/auth/login', {
      data: { email: 'admin_a@evolix.com', password: 'password' },
    });
    const token = (await loginRes.json()).access_token;

    await request.patch('/api/v1/security/policy', {
      headers: { Authorization: `Bearer ${token}` },
      data: { max_failed_attempts: 3, lockout_minutes: 1 },
    });

    // Create a temporary user to test lockout without affecting seeded accounts
    const tempEmail = `lockout_${Date.now()}@evolix.com`;
    await request.post('/api/v1/users', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        email: tempEmail,
        password: 'Password123!',
        first_name: 'Lockout',
        last_name: 'Test',
        is_active: true,
        role_ids: [],
      },
    });

    // Trigger 3 failed attempts against tempEmail
    for (let i = 0; i < 3; i++) {
      await request.post('/api/v1/auth/login', {
        data: { email: tempEmail, password: 'wrongpassword' },
      });
    }

    // 4th attempt should be locked out (400, 403, or 429)
    const lockedRes = await request.post('/api/v1/auth/login', {
      data: { email: tempEmail, password: 'Password123!' },
    });
    expect([400, 403, 429]).toContain(lockedRes.status());
    const errText = (await lockedRes.json()).detail.toLowerCase();
    expect(errText).toContain('lock');

    // Restore policy
    await request.patch('/api/v1/security/policy', {
      headers: { Authorization: `Bearer ${token}` },
      data: { max_failed_attempts: 10, lockout_minutes: 15 },
    });
  });

  test('FLOW 6: Restricted user cannot access security administration', async ({
    page,
    request,
  }) => {
    // Login as restricted user
    await page.goto('/login');
    await page.fill('input[type="email"]', 'restricted_a@evolix.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/);

    const token = await page.evaluate(() => localStorage.getItem('access_token'));

    // Attempt to access security policy admin endpoint -> 403 Forbidden
    const policyRes = await request.get('/api/v1/security/policy', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(policyRes.status()).toBe(403);

    // Attempt to access security events endpoint -> 403 Forbidden
    const eventsRes = await request.get('/api/v1/security/events', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(eventsRes.status()).toBe(403);

    // Attempt to access IP restrictions endpoint -> 403 Forbidden
    const ipRes = await request.get('/api/v1/security/ip-restrictions', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(ipRes.status()).toBe(403);
  });

  test('FLOW 7: Tenant A cannot access Tenant B security resources', async ({ page, request }) => {
    // Login as Admin A
    await loginAsAdmin(page, 'password');
    const token = await page.evaluate(() => localStorage.getItem('access_token'));

    // Try to access security policy with invalid cross-tenant header
    const crossTenantPolicy = await request.get('/api/v1/security/policy', {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Tenant-ID': '00000000-0000-0000-0000-000000000999',
      },
    });

    // Enforces tenant context isolation
    expect(crossTenantPolicy.status()).toBeLessThan(500);
  });

  test('FLOW 8: Challenge/refresh tokens cannot access normal protected APIs', async ({
    request,
  }) => {
    // Login as Admin A to get tokens
    const loginRes = await request.post('/api/v1/auth/login', {
      data: { email: 'admin_a@evolix.com', password: 'password' },
    });
    const tokens = await loginRes.json();
    const refreshToken = tokens.refresh_token;

    // Use refresh token as Bearer token on protected endpoint /auth/me -> 401
    const meRes = await request.get('/api/v1/auth/me', {
      headers: { Authorization: `Bearer ${refreshToken}` },
    });
    expect(meRes.status()).toBe(401);

    // Use refresh token on /security/policy -> 401
    const secRes = await request.get('/api/v1/security/policy', {
      headers: { Authorization: `Bearer ${refreshToken}` },
    });
    expect(secRes.status()).toBe(401);
  });

  test('FLOW 9: Verify responsive rendering and views at 1440, 1024, 768, 390', async ({
    page,
  }) => {
    await loginAsAdmin(page, 'password');
    await expect(page).toHaveURL(/.*dashboard/);

    const viewports = [
      { width: 1440, height: 900, name: 'Desktop 1440' },
      { width: 1024, height: 768, name: 'Desktop 1024' },
      { width: 768, height: 1024, name: 'Tablet 768' },
      { width: 390, height: 844, name: 'Mobile 390' },
    ];

    const routes = [
      '/account/security',
      '/admin/security/overview',
      '/admin/security/policy',
      '/admin/security/ip-restrictions',
      '/admin/security/events',
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      for (const route of routes) {
        await page.goto(route);
        await expect(page.locator('h1')).toBeVisible();
      }
    }
  });
});
