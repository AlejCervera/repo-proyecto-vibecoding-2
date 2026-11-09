import { defineConfig } from "@playwright/test";
import { WEB_URL } from "./e2e/entorno";

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  use: { baseURL: WEB_URL },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
