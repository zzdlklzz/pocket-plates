import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  reporter: "html",
  use: {
    baseURL,
    trace: "on-first-retry"
  },
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3000",
    url: baseURL,
    reuseExistingServer: !process.env.CI
  },
  projects: [
    {
      name: "mobile-safari-size",
      use: { ...devices["iPhone 14"] }
    },
    {
      name: "desktop-chrome",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
