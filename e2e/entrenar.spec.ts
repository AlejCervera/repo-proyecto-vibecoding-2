import { expect, test, type Locator } from "@playwright/test";
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

const hechas = (paso: Locator) =>
  paso.getByRole("list", { name: "Series de hoy" }).getByRole("listitem").filter({ hasText: "✓" });

async function guardar(paso: Locator, peso: string, reps: string) {
  await paso.getByLabel("Peso (kg)").fill(peso);
  await paso.getByLabel("Repeticiones").fill(reps);
  await paso.getByRole("button", { name: "Guardar serie" }).click();
}

test("desde «Pecho» registrar press de banca y verlo en su historial", async ({ page }) => {
  const paso = page.getByRole("article", { name: "Press de banca" });
  await expect(paso).toContainText("Primera vez con este ejercicio.");
  await expect(paso).toContainText("Objetivo: 3 × 8-12");
  await expect(paso.getByLabel("Repeticiones")).toHaveValue("8"); // mínimo del objetivo

  await guardar(paso, "80", "8");
  await expect(hechas(paso)).toHaveText(["✓ Serie 1 · 80 kg × 8"]);

  // La siguiente serie viene rellena con la anterior
  await expect(paso.getByLabel("Peso (kg)")).toHaveValue("80");
  await guardar(paso, "80", "7");
  await expect(hechas(paso)).toHaveCount(2);

  await paso.getByRole("link", { name: "Ver historial" }).click();
  await expect(page.getByRole("heading", { name: "Historial: Press de banca" })).toBeVisible();
  const filas = page.getByRole("list", { name: "Historial" }).getByRole("listitem");
  await expect(filas).toHaveCount(2);
  await expect(filas.nth(0)).toContainText("80 kg × 7");
});

test("pasar al siguiente, recargar a mitad y terminar con el resumen", async ({ page }) => {
  const banca = page.getByRole("article", { name: "Press de banca" });
  await guardar(banca, "60", "10");
  await expect(hechas(banca)).toHaveCount(1);

  await page.getByRole("link", { name: "Siguiente →" }).click();
  const aperturas = page.getByRole("article", { name: "Aperturas con mancuernas" });
  await expect(aperturas).toBeVisible();

  await page.reload();
  await expect(aperturas).toBeVisible();
  await expect(page.getByRole("list", { name: "Ejercicios del entrenamiento" })).toContainText(
    "Press de banca 1/3",
  );
  await guardar(aperturas, "14", "12");
  await expect(hechas(aperturas)).toHaveCount(1);

  await page.getByRole("link", { name: "Terminar" }).click();
  const resumen = page.getByRole("article", { name: "Resumen del entrenamiento" });
  await expect(resumen).toContainText("2 series en total.");
  await expect(resumen).toContainText("Press de banca: 60 kg × 10");
  await expect(resumen).toContainText("Aperturas con mancuernas: 14 kg × 12");
  // Es predefinida: no ofrece guardar cambios
  await expect(resumen.getByRole("complementary")).toHaveCount(0);

  // Guardarlo en el diario: queda con sus dos ejercicios y sus series
  await resumen.getByRole("button", { name: "Guardar en el diario" }).click();
  await resumen.getByRole("link", { name: "Ver en el diario" }).click();
  await expect(page.getByRole("article", { name: "Press de banca" })).toContainText("60 kg × 10");
  await expect(page.getByRole("article", { name: "Aperturas con mancuernas" })).toContainText("14 kg × 12");
});
