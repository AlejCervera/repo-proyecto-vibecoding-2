import { expect, test, type Page } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { crearEjercicioPropio, nombreUnico, registrar } from "./cuentas";

const FOTO = fileURLToPath(new URL("./fixtures/foto.png", import.meta.url));

test.beforeEach(async ({ page }) => {
  await registrar(page, nombreUnico("img"));
});

/** Crea un ejercicio propio y abre su historial (donde se ve y se sube su imagen). */
async function abrirPropio(page: Page, nombre: string) {
  await crearEjercicioPropio(page, nombre);
  await page.getByRole("list", { name: "Mis ejercicios" }).getByRole("link", { name: nombre }).click();
  await expect(page.getByRole("heading", { name: `Historial: ${nombre}` })).toBeVisible();
}

test("subir una imagen a un ejercicio propio y verla también tras recargar", async ({ page }) => {
  await abrirPropio(page, "Remo con goma");
  await expect(page.getByRole("img")).toHaveCount(0); // se puede crear sin imagen

  await page.getByLabel("Subir imagen").setInputFiles(FOTO);
  const imagen = page.getByRole("img", { name: "Imagen de Remo con goma" });
  await expect(imagen).toBeVisible();
  await expect.poll(() => imagen.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
  await expect(page.getByLabel("Cambiar imagen")).toBeVisible();

  await page.reload();
  await expect
    .poll(() => imagen.evaluate((i: HTMLImageElement) => i.naturalWidth))
    .toBeGreaterThan(0);
});

test("un archivo que no es imagen muestra el aviso", async ({ page }) => {
  await abrirPropio(page, "Plancha lateral");
  await page.getByLabel("Subir imagen").setInputFiles({
    name: "nota.png",
    mimeType: "image/png",
    buffer: Buffer.from("esto no es una imagen"),
  });
  await expect(page.getByRole("alert")).toHaveText("La imagen debe ser JPEG, PNG o WebP");
});
