import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  workers: 1,
  fullyParallel: false,
  timeout: 90_000,
  reporter: 'list',
  globalSetup: './e2e/preparar.ts',
  use: {
    baseURL: 'http://localhost:8788',
    browserName: 'chromium',
    channel: process.env.PW_CHANNEL,
    launchOptions: { slowMo: Number(process.env.PW_SLOWMO) || 0 },
  },
  webServer: [
    {
      command: 'npx wrangler dev --port 8787',
      cwd: '../backend',
      url: 'http://localhost:8787/api/sessao',
      reuseExistingServer: true,
      timeout: 180_000,
    },
    {
      command: 'npm run build && npm run preview',
      url: 'http://localhost:8788/api/sessao',
      reuseExistingServer: true,
      timeout: 180_000,
    },
  ],
})
