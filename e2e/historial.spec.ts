import { expect, test } from "@playwright/test";
import { entrenar, nombreUnico, registrar } from "./cuentas";

test.beforeEach(async ({ page }) => {
  await registrar(page, nombreUnico("hist"));
});

test("80×8 y 85×6 salen en el mismo día, en el orden en que se hicieron, sin mezclar ejercicios", async ({
  page,
}) => {
  await entrenar(page, "Mixta", [
    ["Press de banca", "80", "8"],
    ["Press de banca", "85", "6"],
    ["Sentadilla", "100", "5"],
  ]);

  // Desde el diario, el nombre del ejercicio lleva a su historial
  await page.getByRole("link", { name: "Ver en el diario" }).click();
  await page.getByRole("article", { name: "Press de banca" }).getByRole("link", { name: "Press de banca" }).click();
  await expect(page.getByRole("heading", { name: "Historial: Press de banca" })).toBeVisible();

  const filas = page.getByRole("list", { name: /^Series del / }).getByRole("listitem");
  await expect(filas).toHaveCount(2);
  await expect(filas.nth(0)).toContainText("80 kg × 8");
  await expect(filas.nth(1)).toContainText("85 kg × 6");
  await expect(page.getByLabel("Resumen del ejercicio")).toContainText("Mejor serie85 kg × 6");
  await expect(page.getByText("100 kg")).toHaveCount(0);

  // Recargar mantiene la pantalla y «atrás» vuelve al entrenamiento del diario
  await page.reload();
  await expect(filas).toHaveCount(2);
  await page.goBack();
  await expect(page.getByRole("article", { name: "Sentadilla" })).toBeVisible();
});

test("desde la rutina, el ejercicio lleva a su historial", async ({ page }) => {
  await entrenar(page, "Pierna", [["Sentadilla", "100", "5"]]);
  await page.getByRole("link", { name: "Volver a la rutina" }).click();
  await page.getByRole("list", { name: "Ejercicios de la rutina" }).getByRole("link", { name: "Sentadilla" }).click();
  await expect(page.getByRole("heading", { name: "Historial: Sentadilla" })).toBeVisible();
  await expect(page.getByRole("list", { name: /^Series del / }).getByRole("listitem")).toHaveCount(1);
});
