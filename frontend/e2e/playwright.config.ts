import { defineConfig, devices } from "@playwright/test"

/**
 * End-to-end suite for the three critical flows (plan A3.6). It needs a
 * backend running with APP_ENV=test and E2E_AUTH=true against an empty test
 * database, so it runs in .github/workflows/e2e.yml (manual + nightly), never
 * against production and never on every PR.
 */
export default defineConfig({
  testDir: ".",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
})
