import fs from 'node:fs'
import { defineConfig } from '@playwright/test'

function loadLocalEnv(filename = '.env.local') {
  if (!fs.existsSync(filename)) return
  const lines = fs.readFileSync(filename, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = /^([^=]+)=(.*)$/.exec(trimmed)
    if (!match) continue
    const key = match[1].trim()
    let value = match[2].trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  }
}

loadLocalEnv()

const isCI = Boolean(process.env.CI)
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4301'
const useExternalBaseUrl = Boolean(process.env.PLAYWRIGHT_BASE_URL)

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  use: {
    baseURL,
    headless: !process.env.PLAYWRIGHT_HEADED,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1440, height: 960 },
  },
  webServer: useExternalBaseUrl ? undefined : {
    command: 'npm run build:e2e && npm run preview:e2e -- --host 127.0.0.1 --port 4301 --strictPort',
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 180_000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
      },
    },
  ],
})
