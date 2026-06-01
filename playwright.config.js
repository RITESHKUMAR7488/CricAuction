import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    headless: true,
  },
  projects: [
    // --- AUTH SETUP PROJECTS ---
    {
      name: 'setup:host',
      testMatch: 'auth.setup.js',
      use: {
        ...devices['Desktop Chrome'],
        storageState: undefined, // Setup projects run without cached session
      },
    },
    {
      name: 'setup:cohost',
      testMatch: 'auth.setup.js',
      use: {
        ...devices['Desktop Chrome'],
        storageState: undefined,
      },
    },

    // --- DESKTOP E2E TESTS (Host Session) ---
    {
      name: 'desktop:host',
      testMatch: ['teams.spec.js', 'players.spec.js', 'auction.spec.js', 'rankings.spec.js', 'logout.spec.js', 'auctionFlow.spec.js'],
      dependencies: ['setup:host'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/host.json',
      },
    },

    // --- MOBILE E2E TESTS (Host Session) ---
    {
      name: 'mobile:host',
      testMatch: ['teams.spec.js', 'players.spec.js', 'auction.spec.js', 'rankings.spec.js', 'logout.spec.js', 'auctionFlow.spec.js'],
      dependencies: ['setup:host'],
      use: {
        ...devices['Pixel 5'],
        storageState: 'playwright/.auth/host.json',
      },
    },

    // --- CO-HOST TESTS (Co-Host Session) ---
    {
      name: 'desktop:cohost',
      testMatch: ['cohost.spec.js'],
      dependencies: ['setup:cohost'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/cohost.json',
      },
    },

    // --- PUBLIC GUEST TESTS (No Auth Caching) ---
    {
      name: 'desktop:public',
      testMatch: ['landing.spec.js'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: undefined,
      },
    },
  ],
  // Reuses the running Vite dev server
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    stdout: 'ignore',
    stderr: 'pipe',
  },
})
