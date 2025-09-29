const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/ui',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:8000',
    headless: true,
    trace: 'on-first-retry'
  },
  webServer: {
    command: 'node ./scripts/serve.js',
    url: 'http://localhost:8000',
    reuseExistingServer: true,
    timeout: 30000,
    env: { PORT: '8000' },
    cwd: __dirname,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
