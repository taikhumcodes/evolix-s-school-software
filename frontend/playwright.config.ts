import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'Desktop 1440',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'Desktop 1024',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1024, height: 768 } },
    },
    {
      name: 'Tablet 768',
      use: { ...devices['iPad Mini'] }, // Usually 768px width
    },
    {
      name: 'Mobile 390',
      use: { ...devices['iPhone 12'] }, // 390px width
    },
  ],
  webServer: [
    {
      command:
        'cd ../backend && .\\venv311\\Scripts\\uvicorn app.main:app --host 127.0.0.1 --port 8000',
      port: 8000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run dev',
      port: 5173,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
