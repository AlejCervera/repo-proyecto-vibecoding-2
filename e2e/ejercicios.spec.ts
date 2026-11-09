import { expect, test } from "@playwright/test";
import { elegirEjercicio, nombreUnico, registrar } from "./cuentas";

test.beforeEach(async ({ page }) => {
  await registrar(page, nombreUnico("ejer"));
});

async function guardar(page: import("@playwright/test").Page, peso: string, reps: string) {
  await page.getByLabel("Peso (kg)").fill(peso);
  await page.getByLabel("Repeticiones").fill(reps);
  await page.getByRole("button", { name: "Guardar" }).click();
}

test("buscar un ejercicio importado (sin tildes ni mayúsculas) y usarlo", async ({ page }) => {
  // «Deadlift» solo tiene nombre en inglés en el catálogo de prueba
  await elegirEjercicio(page, "DEAD", "Deadlift");
  await guardar(page, "120", "5");
  await expect(page.getByRole("list", { name: "Series" })).toContainText("Deadlift · 120 kg × 5");
});

test("crear un ejercicio propio, usarlo y que no se duplique", async ({ page }) => {
  await page.getByLabel("Ejercicio").fill("Remo en máquina");
  await page.getByRole("button", { name: "Crear «Remo en máquina» como ejercicio propio" }).click();
  await expect(page.getByText("Ejercicio: Remo en máquina")).toBeVisible();
  await guardar(page, "50", "12");
  const lista = page.getByRole("list", { name: "Series" });
  await expect(lista).toContainText("Remo en máquina · 50 kg × 12");

  // Al buscarlo de nuevo aparece como propio y no se ofrece crearlo otra vez
  await page.getByRole("button", { name: "Cambiar" }).click();
  await page.getByLabel("Ejercicio").fill("remo EN maquina");
  await expect(page.getByRole("button", { name: "Remo en máquina", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /como ejercicio propio/ })).toHaveCount(0);
});

test("una variante de un nombre del catálogo muestra el existente y no deja duplicarlo", async ({
  page,
}) => {
  await page.getByLabel("Ejercicio").fill("  press DE bánca ");
  await expect(page.getByRole("button", { name: "Press de banca", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /como ejercicio propio/ })).toHaveCount(0);
});
