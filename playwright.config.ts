import { defineConfig } from "@playwright/test";
import { WEB_URL } from "./e2e/entorno";

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  use: { baseURL: WEB_URL },
  // Todo se prueba dos veces: en escritorio y con el tamaño y el tacto de un móvil.
  projects: [
    { name: "escritorio", use: { browserName: "chromium" } },
    {
      name: "movil",
      use: {
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
