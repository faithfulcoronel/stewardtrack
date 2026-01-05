import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

/**
 * Load environment variables from .env file
 * This ensures E2E test credentials are available
 */
dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI
    ? [['html'], ['junit', { outputFile: 'test-results/junit.xml' }]]
    : 'html',
  /* Global test timeout - increased for multi-step tests */
  timeout: 120000,
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    // Desktop browsers
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Mobile viewports - Android
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        // Add mobile-specific test tags
        testIdAttribute: 'data-testid',
      },
    },
    {
      name: 'mobile-chrome-landscape',
      use: {
        ...devices['Pixel 5 landscape'],
      },
    },

    // Mobile viewports - iOS
    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 12'],
        testIdAttribute: 'data-testid',
      },
    },
    {
      name: 'mobile-safari-landscape',
      use: {
        ...devices['iPhone 12 landscape'],
      },
    },

    // Tablet viewports
    {
      name: 'tablet-ipad',
      use: {
        ...devices['iPad (gen 7)'],
      },
    },
    {
      name: 'tablet-ipad-landscape',
      use: {
        ...devices['iPad (gen 7) landscape'],
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
