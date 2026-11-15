import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  workers: 1,
  timeout: 60_000,
  reporter: 'list',
  grep: /@leitura/,
  use: { baseURL: 'https://siger-saude.pages.dev', browserName: 'chromium' },
})
