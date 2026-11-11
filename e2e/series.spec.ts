import { expect, test } from "@playwright/test";
import { abrirPredefinida, irA, nombreUnico, registrar, serieEntrenando, terminarYGuardar } from "./cuentas";

test.beforeEach(async ({ page }) => {
  await registrar(page, nombreUnico("diario"));
});

test("entrenar «Pecho», guardarlo en el diario y ver sus ejercicios y series", async ({ page }) => {
  await abrirPredefinida(page, "Pecho");
  await page.getByRole("link", { name: "▶ Empezar entrenamiento" }).click();
  await serieEntrenando(page, "Press de banca", "80", "8");
  await serieEntrenando(page, "Press de banca", "85", "6");
  await serieEntrenando(page, "Aperturas con mancuernas", "14", "12");
  await terminarYGuardar(page);

  await page.getByRole("link", { name: "Ver en el diario" }).click();
  await expect(page.getByRole("heading", { name: /· Pecho$/ })).toBeVisible();
  const banca = page.getByRole("article", { name: "Press de banca" }).getByRole("listitem");
  await expect(banca).toHaveCount(2);
  await expect(banca.nth(0)).toContainText("80 kg × 8");
  await expect(banca.nth(1)).toContainText("85 kg × 6");
  await expect(page.getByRole("article", { name: "Aperturas con mancuernas" })).toContainText("14 kg × 12");

  // En la lista del diario
  await irA(page, "Diario");
  const entradas = page.getByRole("list", { name: "Entrenamientos" }).getByRole("listitem");
  await expect(entradas).toHaveCount(1);
  await expect(entradas.first()).toContainText("Pecho");
  await expect(entradas.first()).toContainText("2 ejercicios · 3 series");
});

test("quitar del diario no borra las series del historial", async ({ page }) => {
  await abrirPredefinida(page, "Pecho");
  await page.getByRole("link", { name: "▶ Empezar entrenamiento" }).click();
  await serieEntrenando(page, "Press de banca", "80", "8");
  await terminarYGuardar(page);
  await page.getByRole("link", { name: "Ver en el diario" }).click();

  await page.getByRole("button", { name: "Quitar del diario" }).click();
  await page.getByRole("button", { name: "Sí, quitar" }).click();
  await expect(page.getByText(/Aún no hay entrenamientos en el diario/)).toBeVisible();

  // El historial del ejercicio sigue teniendo la serie
  await abrirPredefinida(page, "Pecho");
  await page
    .getByRole("list", { name: "Ejercicios de la rutina" })
    .getByRole("link", { name: "Press de banca" })
    .click();
  await expect(page.getByRole("list", { name: "Historial" }).getByRole("listitem")).toHaveCount(1);
});

test("con el peso vacío sale el aviso y no se guarda", async ({ page }) => {
  await abrirPredefinida(page, "Pecho");
  await page.getByRole("link", { name: "▶ Empezar entrenamiento" }).click();
  const paso = page.getByRole("article", { name: "Press de banca" });
  await paso.getByLabel("Peso (kg)").fill("");
  await paso.getByRole("button", { name: "Hecha · empezar descanso" }).click();
  await expect(paso.getByRole("alert")).toHaveText("Falta el peso");
  await page.reload();
  await expect(paso.getByText("✓")).toHaveCount(0);
});
