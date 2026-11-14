import { defineConfig, devices } from '@playwright/test';

const isCI = Boolean(process.env.CI);

/**
 * The dev server for the tests runs with every AI key blanked (an empty variable is not replaced by
 * .env.local), so no test can ever spend a real AI call; the tests mock the AI answers in the browser.
 */
const NO_AI_KEYS = Object.fromEntries(
  [
    'GEMINI_API_KEY',
    'GEMINI_API_KEYS',
    'GOOGLE_API_KEY',
    'OPENROUTER_API_KEY',
    'OPENROUTER_API_KEYS',
    'FAL_KEY',
    'FAL_KEYS',
    'FAL_API_KEY',
    'OPENAI_API_KEY',
    'OPENAI_API_KEYS',
    'CLOUDFLARE_API_TOKEN',
    'CLOUDFLARE_API_TOKENS',
    'CLOUDFLARE_ACCOUNT_ID',
  ].map((k) => [k, ''])
);

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  ...(isCI ? { workers: 1 } : {}),
  reporter: 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    viewport: { width: 1280, height: 720 },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    port: 3000,
    // A server already running on :3000 may have real AI keys: the tests mock every AI route anyway.
    reuseExistingServer: !isCI,
    timeout: 120 * 1000,
    env: NO_AI_KEYS,
  },
});
