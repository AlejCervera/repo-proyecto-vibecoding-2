import { expect, test } from "@playwright/test";
import { nombreUnico, registrar } from "./cuentas";

test.beforeEach(async ({ page }) => {
  await registrar(page, nombreUnico("entr"));
  await page.getByRole("navigation").getByRole("link", { name: "Rutinas" }).click();
  await page
    .getByRole("list", { name: "Rutinas predefinidas" })
    .getByRole("link", { name: "Pecho" })
    .click();
  await page.getByRole("link", { name: "▶ Empezar entrenamiento" }).click();
});

test("desde «Pecho» registrar press de banca y verlo en su historial", async ({ page }) => {
  const paso = page.getByRole("article", { name: "Press de banca" });
  await expect(paso).toContainText("Primera vez con este ejercicio.");
  await paso.getByLabel("Peso (kg)").fill("80");
  await paso.getByLabel("Repeticiones").fill("8");
  await paso.getByRole("button", { name: "Guardar serie" }).click();
  await expect(paso.getByLabel("Series de hoy")).toHaveText("Hoy: 80 kg × 8");

  // Segunda serie: el formulario viene relleno con la anterior
  await expect(paso.getByLabel("Peso (kg)")).toHaveValue("80");
  await paso.getByLabel("Repeticiones").fill("7");
  await paso.getByRole("button", { name: "Guardar serie" }).click();
  await expect(paso.getByLabel("Series de hoy")).toHaveText("Hoy: 80 kg × 8 · 80 kg × 7");

  await paso.getByRole("link", { name: "Ver historial" }).click();
  await expect(page.getByRole("heading", { name: "Historial: Press de banca" })).toBeVisible();
  const filas = page.getByRole("list", { name: "Historial" }).getByRole("listitem");
  await expect(filas).toHaveCount(2);
  await expect(filas.nth(0)).toContainText("80 kg × 7");
});

test("pasar al siguiente, recargar a mitad y terminar con el resumen", async ({ page }) => {
  const banca = page.getByRole("article", { name: "Press de banca" });
  await banca.getByLabel("Peso (kg)").fill("60");
  await banca.getByLabel("Repeticiones").fill("10");
  await banca.getByRole("button", { name: "Guardar serie" }).click();
  await expect(banca.getByLabel("Series de hoy")).toHaveText("Hoy: 60 kg × 10");

  await page.getByRole("link", { name: "Siguiente →" }).click();
  const aperturas = page.getByRole("article", { name: "Aperturas con mancuernas" });
  await expect(aperturas).toBeVisible();

  await page.reload();
  await expect(aperturas).toBeVisible();
  await expect(page.getByRole("list", { name: "Ejercicios del entrenamiento" })).toContainText(
    "Press de banca ✓1",
  );
  await aperturas.getByLabel("Peso (kg)").fill("14");
  await aperturas.getByLabel("Repeticiones").fill("12");
  await aperturas.getByRole("button", { name: "Guardar serie" }).click();
  await expect(aperturas.getByLabel("Series de hoy")).toHaveText("Hoy: 14 kg × 12");

  await page.getByRole("link", { name: "Terminar" }).click();
  const resumen = page.getByRole("article", { name: "Resumen del entrenamiento" });
  await expect(resumen).toContainText("2 series en total.");
  await expect(resumen).toContainText("Press de banca: 60 kg × 10");
  await expect(resumen).toContainText("Aperturas con mancuernas: 14 kg × 12");

  // Las series también están en el diario
  await page.getByRole("link", { name: "Ir al diario" }).click();
  await expect(page.getByRole("list", { name: "Series" }).getByRole("listitem")).toHaveCount(2);
});
