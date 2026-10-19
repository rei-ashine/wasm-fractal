import { defineConfig, devices } from '@playwright/test';

// Browser tests of the built site (npm run build first), served by vite preview.
// Run with: npx playwright test
const PORT = 4173;

// Chromium only: a phone, where the simulator and the menu are used by touch, and a desktop.
// PW_CHROMIUM_PATH runs them with a Chromium already installed instead of Playwright's own.
const launchOptions = process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {};
const { defaultBrowserType: _, ...iphone } = devices['iPhone 13'];

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // A failure is a bug to find, not a flake to retry
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}/wasm-fractal/`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'phone', use: { ...iphone, browserName: 'chromium', launchOptions } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], launchOptions } },
  ],
  webServer: {
    command: `npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/wasm-fractal/`,
    reuseExistingServer: !process.env.CI,
  },
});
