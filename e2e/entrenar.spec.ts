import { expect, test, type Locator } from "@playwright/test";
import { irA, listaEntreno, nombreUnico, registrar } from "./cuentas";

test.beforeEach(async ({ page }) => {
  await registrar(page, nombreUnico("entr"));
  await irA(page, "Entrenar");
  await page
    .getByRole("list", { name: "Rutinas predefinidas" })
    .getByRole("link", { name: "Pecho", exact: true })
    .click();
  await page.getByRole("link", { name: "Empezar entrenamiento" }).click();
});

const hechas = (paso: Locator) =>
  paso.getByRole("list", { name: "Series de hoy" }).getByRole("listitem").filter({ hasText: "✓" });

async function guardar(paso: Locator, peso: string, reps: string) {
  await paso.getByLabel("Peso (kg)").fill(peso);
  await paso.getByLabel("Repeticiones").fill(reps);
  await paso.getByRole("button", { name: "Hecha · empezar descanso" }).click();
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
  // Mismo día: en el orden en que se hicieron
  const filas = page.getByRole("list", { name: /^Series del / }).getByRole("listitem");
  await expect(filas).toHaveCount(2);
  await expect(filas.nth(0)).toContainText("80 kg × 8");
  await expect(filas.nth(1)).toContainText("80 kg × 7");
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
  await expect(await listaEntreno(page)).toContainText(
    "Press de banca 1/3",
  );
  await page.getByRole("button", { name: "Cerrar" }).click();
  await guardar(aperturas, "14", "12");
  await expect(hechas(aperturas)).toHaveCount(1);

  await page.getByRole("link", { name: "Terminar" }).click();
  const resumen = page.getByRole("article", { name: "Resumen del entrenamiento" });
  await expect(resumen).toContainText("2 series en total.");
  await expect(resumen).toContainText("Press de banca: 60 kg × 10");
  await expect(resumen).toContainText("Aperturas con mancuernas: 14 kg × 12");
  // Es predefinida: no ofrece guardar cambios
  await expect(resumen.getByRole("complementary")).toHaveCount(0);

  // Se guarda solo en el diario: queda con sus dos ejercicios y sus series
  await expect(resumen.getByRole("button", { name: "Guardar en el diario" })).toHaveCount(0);
  await resumen.getByRole("link", { name: "Ver en el diario" }).click();
  await expect(page.getByRole("article", { name: "Press de banca" })).toContainText("60 kg × 10");
  await expect(page.getByRole("article", { name: "Aperturas con mancuernas" })).toContainText("14 kg × 12");
});

test("entrenar «Pecho» entero solo con los botones − / +, sin teclado", async ({ page }) => {
  const sumar = (paso: Locator, veces: number) =>
    Array.from({ length: veces }).reduce<Promise<void>>(
      (p) => p.then(() => paso.getByRole("button", { name: "Sumar 2,5 kg" }).click()),
      Promise.resolve(),
    );
  const hecha = (paso: Locator) => paso.getByRole("button", { name: "Hecha · empezar descanso" });

  // Primera vez: el peso empieza vacío y las repeticiones en el mínimo del objetivo (8)
  const banca = page.getByRole("article", { name: "Press de banca" });
  await sumar(banca, 4);
  await expect(banca.getByLabel("Peso (kg)")).toHaveValue("10");
  for (let i = 1; i <= 3; i++) {
    await hecha(banca).click();
    await expect(hechas(banca)).toHaveCount(i);
  }
  await expect(page.getByText("Serie guardada: 10 kg × 8")).toBeVisible();
  await page.getByRole("link", { name: "Siguiente ejercicio" }).click();

  const aperturas = page.getByRole("article", { name: "Aperturas con mancuernas" });
  await sumar(aperturas, 2);
  await aperturas.getByRole("button", { name: "Sumar 1 rep." }).click();
  for (let i = 1; i <= 3; i++) {
    await hecha(aperturas).click();
    await expect(hechas(aperturas)).toHaveCount(i);
  }
  await expect(hechas(aperturas)).toHaveText([
    "✓ Serie 1 · 5 kg × 9",
    "✓ Serie 2 · 5 kg × 9",
    "✓ Serie 3 · 5 kg × 9",
  ]);
  await page.getByRole("link", { name: "Terminar entreno" }).click();

  const resumen = page.getByRole("article", { name: "Resumen del entrenamiento" });
  await expect(resumen.getByRole("heading", { name: "¡Entreno hecho!" })).toBeVisible();
  await expect(resumen).toContainText("6 series en total.");
  await expect(resumen).toContainText("Volumen375 kg"); // 3 × 10×8 + 3 × 5×9
  await expect(resumen.getByRole("status")).toContainText("Guardado en el diario.");
});

test("la foto en círculo abre la hoja del ejercicio y «Deshacer» quita la serie", async ({ page }) => {
  const banca = page.getByRole("article", { name: "Press de banca" });
  await banca.getByRole("button", { name: "Ver foto de Press de banca" }).click();
  const hoja = page.getByRole("dialog", { name: "Press de banca" });
  await expect(hoja).toContainText("Mejor serie");
  await hoja.getByRole("button", { name: "Cerrar" }).click();

  await guardar(banca, "50", "10");
  await expect(hechas(banca)).toHaveCount(1);
  await page.getByRole("button", { name: "Deshacer" }).click();
  await expect(hechas(banca)).toHaveCount(0);
  await page.reload();
  await expect(hechas(banca)).toHaveCount(0);
});
