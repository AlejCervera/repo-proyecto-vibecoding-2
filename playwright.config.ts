import { defineConfig } from "@playwright/test";
import { WEB_URL } from "./e2e/entorno";

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  use: { baseURL: WEB_URL },
  // Con más procesos, WebKit en Windows deja clics colgados al azar; con 2 todo pasa y tarda menos.
  workers: 2,
  // Todo se prueba en escritorio, en un móvil Android (Chromium) y en un iPhone (WebKit, el motor de Safari).
  projects: [
    {
      name: "iphone",
      use: {
        browserName: "webkit",
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      },
    },
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
