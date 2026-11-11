import { expect, test, type Locator, type Page } from "@playwright/test";
import { irA, nombreUnico, registrar } from "./cuentas";

test.beforeEach(async ({ page }) => {
  await registrar(page, nombreUnico("plan"));
  // Mi rutina: copia de «Pecho» (3 × 8-12 por ejercicio)
  await irA(page, "Entrenar");
  await page
    .getByRole("list", { name: "Rutinas predefinidas" })
    .getByRole("link", { name: "Pecho" })
    .click();
  await page.getByRole("button", { name: "Copiar a mis rutinas" }).click();
  await expect(page.getByRole("button", { name: "Renombrar" })).toBeVisible();
});

const fila = (page: Page, nombre: string) =>
  page.getByRole("list", { name: "Ejercicios de la rutina" }).getByRole("listitem").filter({ hasText: nombre });

const hechas = (paso: Locator) =>
  paso.getByRole("list", { name: "Series de hoy" }).getByRole("listitem").filter({ hasText: "✓" });

test("4 × 8-10 en press de banca se guarda, sigue tras recargar y se completa al entrenar", async ({ page }) => {
  await page.getByRole("button", { name: "Más series de Press de banca" }).click();
  await expect(fila(page, "Press de banca")).toContainText("4 × 8-12");
  await page.getByRole("button", { name: "Repeticiones objetivo de Press de banca" }).click();
  await page.getByLabel("Repeticiones objetivo", { exact: true }).fill("8-10");
  await page.getByRole("button", { name: "Guardar objetivo" }).click();
  await expect(fila(page, "Press de banca")).toContainText("4 × 8-10");

  await page.reload();
  await expect(fila(page, "Press de banca")).toContainText("4 × 8-10");
  await expect(fila(page, "Aperturas con mancuernas")).toContainText("3 × 8-12");

  await page.getByRole("link", { name: "▶ Empezar entrenamiento" }).click();
  const paso = page.getByRole("article", { name: "Press de banca" });
  await expect(paso).toContainText("Objetivo: 4 × 8-10");
  for (const reps of ["10", "9", "8", "8"]) {
    await paso.getByLabel("Peso (kg)").fill("70");
    await paso.getByLabel("Repeticiones").fill(reps);
    await paso.getByRole("button", { name: "Guardar serie" }).click();
  }
  await expect(hechas(paso)).toHaveCount(4);
  await expect(paso.getByRole("status")).toHaveText("¡Ejercicio completado!");
  await expect(page.getByRole("list", { name: "Ejercicios del entrenamiento" })).toContainText(
    "Press de banca 4/4 ✓",
  );
});

test("añadir una serie durante el entrenamiento y guardarla en la rutina al terminar", async ({ page }) => {
  await page.getByRole("link", { name: "▶ Empezar entrenamiento" }).click();
  const paso = page.getByRole("article", { name: "Press de banca" });
  await paso.getByRole("button", { name: "+ Añadir serie" }).click();
  await expect(paso).toContainText("Objetivo: 4 × 8-12");

  await page.getByRole("link", { name: "Siguiente →" }).click();
  await page.getByRole("link", { name: "Terminar" }).click();
  const cambios = page.getByRole("complementary", { name: "Cambios en la rutina" });
  await expect(cambios).toContainText("Press de banca: 3 → 4 series");
  await cambios.getByRole("button", { name: "Guardar en la rutina" }).click();
  await expect(page.getByRole("status")).toContainText("Guardado en la rutina");

  await page.getByRole("link", { name: "← Volver a la rutina" }).click();
  await expect(fila(page, "Press de banca")).toContainText("4 × 8-12");
});
