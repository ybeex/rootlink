import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

const BASE_URL = process.env['BASE_URL'] ?? 'http://localhost:3000';
const API_URL  = process.env['API_URL']  ?? 'http://localhost:3001';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 2 : 4,
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
    ...(process.env['CI'] ? [['github'] as ['github']] : []),
  ],
  timeout:       30_000,
  expect:        { timeout: 8_000 },
  use: {
    baseURL:            BASE_URL,
    trace:              'on-first-retry',
    screenshot:         'only-on-failure',
    video:              'retain-on-failure',
    actionTimeout:      10_000,
    navigationTimeout:  20_000,
    // Viewport matching mobile-first design
    viewport:           { width: 1280, height: 800 },
    // Locale for date formatting consistency
    locale:             'en-US',
    timezoneId:         'UTC',
  },

  projects: [
    // ── Setup project — runs once before all tests ──────────────────────────
    {
      name:      'setup',
      testMatch: /.*\.setup\.ts/,
    },

    // ── Desktop browsers ────────────────────────────────────────────────────
    {
      name:         'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'fixtures/auth-state.json',
      },
      dependencies: ['setup'],
    },
    {
      name:         'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: 'fixtures/auth-state.json',
      },
      dependencies: ['setup'],
    },
    {
      name:         'webkit',
      use: {
        ...devices['Desktop Safari'],
        storageState: 'fixtures/auth-state.json',
      },
      dependencies: ['setup'],
    },

    // ── Mobile ──────────────────────────────────────────────────────────────
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 7'],
        storageState: 'fixtures/auth-state.json',
      },
      dependencies: ['setup'],
    },

    // ── Unauthenticated project — for auth page tests ───────────────────────
    {
      name:    'auth-tests',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /.*\/auth\/.*/,
    },
  ],

  // Start dev servers automatically when running locally
  webServer: process.env['CI'] ? undefined : [
    {
      command:              'npm run dev --workspace=apps/api',
      url:                  `${API_URL}/health/live`,
      reuseExistingServer:  true,
      timeout:              60_000,
    },
    {
      command:              'npm run dev --workspace=apps/web',
      url:                  BASE_URL,
      reuseExistingServer:  true,
      timeout:              60_000,
    },
  ],
});
