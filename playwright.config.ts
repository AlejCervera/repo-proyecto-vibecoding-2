import { defineConfig } from "@playwright/test";
import { WEB_MOVIL_URL, WEB_URL } from "./e2e/entorno";

// rendimiento.spec.ts solo corre contra la versión optimizada (proyecto «produccion»).
const SOLO_PRODUCCION = /rendimiento\.spec\.ts/;
const IPHONE = {
  browserName: "webkit" as const,
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
};

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  use: { baseURL: WEB_URL },
  // Con más procesos, WebKit en Windows deja clics colgados al azar; con 2 todo pasa y tarda menos.
  workers: 2,
  // Todo se prueba en escritorio, en un móvil Android (Chromium) y en un iPhone (WebKit, el motor de Safari).
  projects: [
    { name: "iphone", testIgnore: SOLO_PRODUCCION, use: IPHONE },
    { name: "escritorio", testIgnore: SOLO_PRODUCCION, use: { browserName: "chromium" } },
    {
      name: "movil",
      testIgnore: SOLO_PRODUCCION,
      use: {
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      },
    },
    // La versión optimizada, como la abre el iPhone en http://<IP>:4173 (Fase 9e2)
    { name: "produccion", testMatch: SOLO_PRODUCCION, use: { ...IPHONE, baseURL: WEB_MOVIL_URL } },
  ],
});
