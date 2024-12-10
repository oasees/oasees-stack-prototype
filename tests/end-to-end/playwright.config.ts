// Import necessary Playwright and Synpress modules
import { defineConfig, devices } from "@playwright/test";

// Define Playwright configuration
export default defineConfig({
  testDir: "./test",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    // Set base URL for tests
    baseURL: "http://10.160.1.205:3000",
    trace: "on-first-retry",
    
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Additional Synpress-specific configuration can be added here
});