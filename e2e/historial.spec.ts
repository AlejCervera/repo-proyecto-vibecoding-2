import { expect, test } from "@playwright/test";
import { nombreUnico, registrar, registrarSerie } from "./cuentas";

test.beforeEach(async ({ page }) => {
  await registrar(page, nombreUnico("hist"));
});

test("80×8 y 85×6 salen como dos filas, la más reciente primero, sin mezclar ejercicios", async ({
  page,
}) => {
  await registrarSerie(page, "Press de banca", "80", "8");
  await registrarSerie(page, "Press de banca", "85", "6");
  await registrarSerie(page, "Sentadilla", "100", "5");

  // Desde la lista del diario, el nombre del ejercicio lleva a su historial
  await page
    .getByRole("list", { name: "Series" })
    .getByRole("link", { name: "Press de banca" })
    .first()
    .click();
  await expect(page.getByRole("heading", { name: "Historial: Press de banca" })).toBeVisible();

  const filas = page.getByRole("list", { name: "Historial" }).getByRole("listitem");
  await expect(filas).toHaveCount(2);
  await expect(filas.nth(0)).toContainText("85 kg × 6");
  await expect(filas.nth(1)).toContainText("80 kg × 8");
  await expect(page.getByRole("list", { name: "Historial" })).not.toContainText("100 kg");

  // Recargar mantiene la pantalla y «Volver» regresa al diario
  await page.reload();
  await expect(filas).toHaveCount(2);
  await page.getByRole("link", { name: "← Volver" }).click();
  await expect(page.getByRole("form", { name: "Registrar serie" })).toBeVisible();

  // «atrás» del navegador vuelve al historial
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Historial: Press de banca" })).toBeVisible();
});

test("desde el formulario, «Ver historial» del ejercicio elegido", async ({ page }) => {
  await registrarSerie(page, "Sentadilla", "100", "5");
  await page.getByRole("link", { name: "Ver historial" }).click();
  await expect(page.getByRole("heading", { name: "Historial: Sentadilla" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Historial" }).getByRole("listitem")).toHaveCount(1);
});
