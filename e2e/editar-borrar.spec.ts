import { expect, test, type Page } from "@playwright/test";
import { nombreUnico, registrar, registrarSerie } from "./cuentas";

test.beforeEach(async ({ page }) => {
  await registrar(page, nombreUnico("edit"));
});

const lista = (page: Page) => page.getByRole("list", { name: "Series" });

test("corregir un peso y borrar una serie; los cambios persisten al recargar", async ({ page }) => {
  await registrarSerie(page, "Press de banca", "80", "8");
  await registrarSerie(page, "Sentadilla", "100", "5");
  await expect(lista(page).getByRole("listitem")).toHaveCount(2);

  // Corregir el peso de press de banca: 80 → 82,5
  const banca = lista(page).getByRole("listitem").filter({ hasText: "Press de banca" });
  await banca.getByRole("button", { name: "Editar" }).click();
  const form = page.getByRole("form", { name: "Editar serie" });
  await form.getByLabel("Peso (kg)").fill("82,5");
  await form.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(lista(page)).toContainText("Press de banca · 82,5 kg × 8");

  // Borrar la de sentadilla, con confirmación
  const sentadilla = lista(page).getByRole("listitem").filter({ hasText: "Sentadilla" });
  await sentadilla.getByRole("button", { name: "Borrar", exact: true }).click();
  await sentadilla.getByRole("button", { name: "Sí, borrar" }).click();
  await expect(lista(page).getByRole("listitem")).toHaveCount(1);

  await page.reload();
  await expect(lista(page).getByRole("listitem")).toHaveCount(1);
  await expect(lista(page)).toContainText("Press de banca · 82,5 kg × 8");
  await expect(lista(page)).not.toContainText("Sentadilla");
});

async function crearPropio(page: Page, nombre: string) {
  const cambiar = page.getByRole("button", { name: "Cambiar", exact: true });
  if (await cambiar.isVisible()) await cambiar.click();
  await page.getByLabel("Ejercicio").fill(nombre);
  await page.getByRole("button", { name: `Crear «${nombre}» como ejercicio propio` }).click();
  await expect(page.getByText(`Ejercicio: ${nombre}`)).toBeVisible();
}

async function guardarSerie(page: Page, peso: string, reps: string) {
  await page.getByLabel("Peso (kg)").fill(peso);
  await page.getByLabel("Repeticiones").fill(reps);
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
}

test("renombrar un ejercicio propio y borrarlo pasando sus series a otro", async ({ page }) => {
  await crearPropio(page, "Remo maquina");
  await guardarSerie(page, "50", "10");
  await expect(lista(page)).toContainText("Remo maquina · 50 kg × 10");
  await guardarSerie(page, "55", "8");
  await crearPropio(page, "Remo en polea");
  await guardarSerie(page, "40", "12");
  await expect(lista(page).getByRole("listitem")).toHaveCount(3);

  await page.getByRole("link", { name: "Mis ejercicios" }).click();
  const mis = page.getByRole("list", { name: "Mis ejercicios" });
  const remo = mis.getByRole("listitem").filter({ hasText: "Remo maquina" });
  await expect(remo).toContainText("(2 series)");

  // Renombrar «Remo en polea» → «Remo polea baja»
  const polea = mis.getByRole("listitem").filter({ hasText: "Remo en polea" });
  await polea.getByRole("button", { name: "Renombrar" }).click();
  await page.getByLabel("Nuevo nombre").fill("Remo polea baja");
  await page.getByRole("button", { name: "Guardar nombre" }).click();
  await expect(mis.getByRole("link", { name: "Remo polea baja" })).toBeVisible();

  // Borrar «Remo maquina» pasando sus 2 series a «Remo polea baja»
  await remo.getByRole("button", { name: "Borrar", exact: true }).click();
  await expect(remo).toContainText("tiene 2 series");
  await remo.getByRole("button", { name: "Pasarlas a otro ejercicio…" }).click();
  await remo.getByLabel("Pasar a").fill("polea baja");
  await remo.getByRole("button", { name: "Remo polea baja", exact: true }).click();
  await remo.getByRole("button", { name: "Pasar las series y borrar «Remo maquina»" }).click();
  await expect(mis.getByRole("listitem")).toHaveCount(1);
  await expect(mis).toContainText("Remo polea baja (3 series)");

  // El historial del destino tiene las 3 series y persiste tras recargar
  await mis.getByRole("link", { name: "Remo polea baja" }).click();
  await page.reload();
  await expect(page.getByRole("list", { name: "Historial" }).getByRole("listitem")).toHaveCount(3);
});
