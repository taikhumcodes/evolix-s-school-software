import { expect, Page, test } from '@playwright/test';

test('Module 03 configuration profile persists on desktop and mobile', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[type="email"]', 'admin_a@evolix.com');
  await page.fill('input[type="password"]', 'password');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/.*dashboard/);

  await page.goto('/configuration/school');
  await expect(page.locator('h1')).toContainText(/School Profile|विद्यालय प्रोफ़ाइल/);

  const legalName = page.getByLabel('Legal Name');
  await legalName.fill('EVOLIX Verification School');
  await page.getByRole('button', { name: /Save|सहेजें/ }).click();
  await expect(page.getByRole('status')).toContainText(/saved|सहेजा/i);

  await page.reload();
  await expect(page.getByLabel('Legal Name')).toHaveValue('EVOLIX Verification School');
});

async function login(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', 'admin_a@evolix.com');
  await page.fill('input[type="password"]', 'password');
  await expect(page.locator('button[type="submit"]')).toBeEnabled({ timeout: 30000 });
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/.*dashboard/, { timeout: 30000 });
}

test('Module 03 attendance and fee rules persist', async ({ page }) => {
  await login(page);
  await page.goto('/configuration/attendance');
  await expect(page.getByLabel('Lock After Hours')).toBeEditable({ timeout: 30000 });
  await page.getByLabel('Lock After Hours').fill('18');
  await page.getByRole('button', { name: /Save|सहेजें/ }).click();
  await expect(page.getByRole('status')).toContainText(/saved|सहेजा/i);

  await page.goto('/configuration/fees');
  await expect(page.getByLabel('Partial Payment')).toBeVisible({ timeout: 30000 });
  await page.getByLabel('Partial Payment').uncheck();
  await page.getByRole('button', { name: /Save|सहेजें/ }).click();
  await expect(page.getByRole('status')).toContainText(/saved|सहेजा/i);
  await page.reload();
  await expect(page.getByLabel('Partial Payment')).not.toBeChecked();
});

test('Module 03 branding upload rejects unsafe files', async ({ page }) => {
  await login(page);
  await page.goto('/configuration/branding');
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({
    name: 'logo.png',
    mimeType: 'image/png',
    buffer: Buffer.from('\x89PNG\r\n\x1a\nvalid'),
  });
  await expect(page.getByText(/Logo uploaded|लोगो अपलोड हो गया/)).toBeVisible();
  await page.reload();
  await expect(page.getByText(/Logo uploaded|लोगो अपलोड हो गया/)).toBeVisible();
  await fileInput.setInputFiles({
    name: 'unsafe.png',
    mimeType: 'image/png',
    buffer: Buffer.from('not-an-image'),
  });
  await expect(page.getByRole('alert')).toContainText(
    /Choose a PNG|फ़ाइल चुनें|upload failed|अपलोड नहीं/
  );
});

test('Module 03 number-series preview and history are available', async ({ page }) => {
  await login(page);
  await page.goto('/configuration/number-series');
  const empty = page.getByText(/No number series|कोई नंबर सीरीज़/);
  if (await empty.isVisible().catch(() => false))
    test.skip(true, 'No configured number series in the development database');
  await expect(page.getByText(/Next identifier preview|अगले नंबर/)).toBeVisible();
  await page.goto('/configuration/history');
  await expect(page.locator('h1')).toContainText(/History|इतिहास/);
});

test('Module 03 Hindi configuration flow preserves route', async ({ page }) => {
  await login(page);
  await page.getByRole('button', { name: 'हिंदी' }).click();
  await page.goto('/configuration/attendance');
  await expect(page.locator('h1')).toContainText('उपस्थिति');
  await expect(page.getByLabel('उपस्थिति लॉक')).toBeVisible();
  await page.getByRole('button', { name: 'सहेजें' }).click();
  await expect(page.getByRole('status')).toContainText('कॉन्फ़िगरेशन सहेजा गया');
});
