import { defineConfig, devices } from '@playwright/test';

/**
 * Evolix School ERP — Playwright E2E Configuration
 * Used for Module 12+ workflow testing.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  /* Start dev servers before running tests */
  // webServer: [
  //   {
  //     command: 'pnpm dev:api',
  //     port: 3000,
  //     reuseExistingServer: true,
  //     timeout: 30_000,
  //   },
  //   {
  //     command: 'pnpm dev:web',
  //     port: 5173,
  //     reuseExistingServer: true,
  //     timeout: 30_000,
  //   },
  // ],
});
