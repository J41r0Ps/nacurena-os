import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://localhost:4173";

export default defineConfig({
  testDir: "./tests/e2e",
  // A stray test.only must not silently skip the other tests on CI.
  forbidOnly: !!process.env.CI,
  use: { baseURL },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Serves the built out/ folder rather than `next dev`, so these tests see
  // exactly what visitors get. Run `npm run build` first.
  webServer: {
    command: "npm run preview",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
});
