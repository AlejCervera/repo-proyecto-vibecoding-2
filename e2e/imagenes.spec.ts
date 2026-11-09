import { expect, test } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { nombreUnico, registrar } from "./cuentas";

const FOTO = fileURLToPath(new URL("./fixtures/foto.png", import.meta.url));

test.beforeEach(async ({ page }) => {
  await registrar(page, nombreUnico("img"));
});

test("subir una imagen a un ejercicio propio y verla también tras recargar", async ({ page }) => {
  await page.getByLabel("Ejercicio").fill("Remo con goma");
  await page.getByRole("button", { name: "Crear «Remo con goma» como ejercicio propio" }).click();
  await expect(page.getByRole("img")).toHaveCount(0); // se puede crear sin imagen

  await page.getByLabel("Subir imagen").setInputFiles(FOTO);
  const imagen = page.getByRole("img", { name: "Imagen de Remo con goma" });
  await expect(imagen).toBeVisible();
  await expect.poll(() => imagen.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
  await expect(page.getByLabel("Cambiar imagen")).toBeVisible();

  await page.reload();
  await page.getByLabel("Ejercicio").fill("remo con goma");
  await page.getByRole("button", { name: "Remo con goma", exact: true }).click();
  await expect
    .poll(() => imagen.evaluate((i: HTMLImageElement) => i.naturalWidth))
    .toBeGreaterThan(0);
});

test("un archivo que no es imagen muestra el aviso", async ({ page }) => {
  await page.getByLabel("Ejercicio").fill("Plancha lateral");
  await page.getByRole("button", { name: /como ejercicio propio/ }).click();
  await page.getByLabel("Subir imagen").setInputFiles({
    name: "nota.png",
    mimeType: "image/png",
    buffer: Buffer.from("esto no es una imagen"),
  });
  await expect(page.getByRole("alert")).toHaveText("La imagen debe ser JPEG, PNG o WebP");
});
