import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  timeout: 45000,
  testDir: './test/browser',
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
