import { expect, test } from "@playwright/test";
import { anadirARutina, crearRutina, nombreUnico, registrar } from "./cuentas";

test.beforeEach(async ({ page }) => {
  await registrar(page, nombreUnico("ejer"));
  await crearRutina(page, "Prueba", []);
});

const ejerciciosRutina = (page: import("@playwright/test").Page) =>
  page.getByRole("list", { name: "Ejercicios de la rutina" }).getByRole("link");

test("buscar un ejercicio importado (sin tildes ni mayúsculas) y usarlo", async ({ page }) => {
  // «Deadlift» solo tiene nombre en inglés en el catálogo de prueba
  await anadirARutina(page, "DEAD", "Deadlift");
  await expect(ejerciciosRutina(page)).toHaveText(["Deadlift"]);
});

test("crear un ejercicio propio al añadirlo y que no se duplique", async ({ page }) => {
  await page.getByRole("button", { name: "Añadir ejercicio" }).click();
  await page.getByLabel("Ejercicio a añadir").fill("Remo en máquina");
  await page.getByRole("button", { name: "Crear «Remo en máquina» como ejercicio propio" }).click();
  await page.getByRole("button", { name: "Añadir a la rutina" }).click();
  await expect(ejerciciosRutina(page)).toHaveText(["Remo en máquina"]);

  // Al buscarlo de nuevo aparece como existente y no se ofrece crearlo otra vez
  await page.getByRole("button", { name: "Añadir ejercicio" }).click();
  await page.getByLabel("Ejercicio a añadir").fill("remo EN maquina");
  await expect(page.getByRole("button", { name: "Remo en máquina", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /como ejercicio propio/ })).toHaveCount(0);
});

test("una variante de un nombre del catálogo muestra el existente y no deja duplicarlo", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Añadir ejercicio" }).click();
  await page.getByLabel("Ejercicio a añadir").fill("  press DE bánca ");
  await expect(page.getByRole("button", { name: "Press de banca", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /como ejercicio propio/ })).toHaveCount(0);
});
