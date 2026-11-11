import { expect, test, type Page } from "@playwright/test";
import { irA, nombreUnico, registrar } from "./cuentas";

test.beforeEach(async ({ page }) => {
  await registrar(page, nombreUnico("rut"));
  await irA(page, "Entrenar");
});

const ejercicios = (page: Page) =>
  page.getByRole("list", { name: "Ejercicios de la rutina" }).getByRole("link");

async function anadir(page: Page, busqueda: string, nombre: string) {
  await page.getByRole("button", { name: "Añadir ejercicio" }).click();
  await page.getByLabel("Ejercicio a añadir").fill(busqueda);
  await page
    .getByRole("list", { name: "Sugerencias" })
    .getByRole("button", { name: nombre, exact: true })
    .click();
  await page.getByRole("button", { name: "Añadir a la rutina" }).click();
  await expect(ejercicios(page).filter({ hasText: nombre })).toHaveCount(1);
}

test("«Pecho» con press de banca y aperturas, renombrar, reordenar y recargar", async ({ page }) => {
  await page.getByLabel("Nueva rutina").fill("Pecho");
  await page.getByRole("button", { name: "Crear" }).click();
  await expect(page.getByRole("heading", { name: "Pecho", exact: true })).toBeVisible();

  await anadir(page, "press de", "Press de banca");
  await anadir(page, "apertur", "Aperturas con mancuernas");
  await expect(ejercicios(page)).toHaveText(["Press de banca", "Aperturas con mancuernas"]);

  await page.getByRole("button", { name: "Subir Aperturas con mancuernas" }).click();
  await expect(ejercicios(page)).toHaveText(["Aperturas con mancuernas", "Press de banca"]);

  await page.getByRole("button", { name: "Renombrar" }).click();
  await page.getByLabel("Nuevo nombre").fill("Pecho del lunes");
  await page.getByRole("button", { name: "Guardar nombre" }).click();
  await expect(page.getByRole("heading", { name: "Pecho del lunes" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Pecho del lunes" })).toBeVisible();
  await expect(ejercicios(page)).toHaveText(["Aperturas con mancuernas", "Press de banca"]);

  await page.getByRole("link", { name: "← Rutinas" }).click();
  await expect(page.getByRole("list", { name: "Mis rutinas" })).toContainText(
    "Pecho del lunes (2 ejercicios)",
  );
});

test("la predefinida «Pecho» no se edita; su copia sí", async ({ page }) => {
  await page
    .getByRole("list", { name: "Rutinas predefinidas" })
    .getByRole("link", { name: "Pecho" })
    .click();
  await expect(page.getByText("Rutina predefinida: no se puede modificar.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Añadir ejercicio" })).toHaveCount(0);
  await expect(ejercicios(page)).toHaveText(["Press de banca", "Aperturas con mancuernas"]);

  await page.getByRole("button", { name: "Copiar a mis rutinas" }).click();
  await expect(page.getByRole("button", { name: "Renombrar" })).toBeVisible();
  await anadir(page, "militar", "Press militar");
  await expect(ejercicios(page)).toHaveText([
    "Press de banca",
    "Aperturas con mancuernas",
    "Press militar",
  ]);

  // La predefinida sigue igual
  await page.getByRole("link", { name: "← Rutinas" }).click();
  await expect(page.getByRole("list", { name: "Rutinas predefinidas" })).toContainText(
    "Pecho (2 ejercicios)",
  );
  await expect(page.getByRole("list", { name: "Mis rutinas" })).toContainText("Pecho (3 ejercicios)");
});
