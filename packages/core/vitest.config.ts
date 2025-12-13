import { defineConfig } from "vitest/config";
// import { playwright } from "@vitest/browser-playwright";

export default defineConfig({
  test: {
    exclude: ["./test/browser/**"],
    // browser: {
    //   enabled: true,
    //   provider: playwright(),
    //   // https://vitest.dev/config/browser/playwright
    //   instances: [{ browser: "chromium" }],
    // },
  },
});
