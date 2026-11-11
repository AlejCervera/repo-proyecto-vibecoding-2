import { expect, test } from "@playwright/test";
import { crearEjercicioPropio, entrenar, irA, nombreUnico, registrar } from "./cuentas";

test.beforeEach(async ({ page }) => {
  await registrar(page, nombreUnico("edit"));
});

test("en el diario: corregir un peso y borrar una serie; persiste al recargar", async ({ page }) => {
  await entrenar(page, "Mixta", [
    ["Press de banca", "80", "8"],
    ["Sentadilla", "100", "5"],
  ]);
  await page.getByRole("link", { name: "Ver en el diario" }).click();

  // Corregir el peso de press de banca: 80 → 82,5
  const banca = page.getByRole("article", { name: "Press de banca" });
  await banca.getByRole("button", { name: "Editar" }).click();
  const form = page.getByRole("form", { name: "Editar serie" });
  await form.getByLabel("Peso (kg)").fill("82,5");
  await form.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(banca).toContainText("82,5 kg × 8");

  // Borrar la de sentadilla, con confirmación
  const sentadilla = page.getByRole("article", { name: "Sentadilla" });
  await sentadilla.getByRole("button", { name: "Editar" }).click();
  await sentadilla.getByRole("button", { name: "Borrar serie" }).click();
  await sentadilla.getByRole("button", { name: "Sí, borrar" }).click();
  await expect(page.getByRole("article", { name: "Sentadilla" })).toHaveCount(0);

  await page.reload();
  await expect(banca).toContainText("82,5 kg × 8");
  await expect(page.getByRole("article", { name: "Sentadilla" })).toHaveCount(0);
});

test("renombrar un ejercicio propio y borrarlo pasando sus series a otro", async ({ page }) => {
  await crearEjercicioPropio(page, "Remo maquina");
  await crearEjercicioPropio(page, "Remo en polea");
  await entrenar(page, "Espalda", [
    ["Remo maquina", "50", "10"],
    ["Remo maquina", "55", "8"],
    ["Remo en polea", "40", "12"],
  ]);

  await irA(page, "Ejercicios");
  const mis = page.getByRole("list", { name: "Mis ejercicios" });
  const remo = mis.getByRole("listitem").filter({ hasText: "Remo maquina" });
  await expect(remo).toContainText("2 series");

  // Renombrar «Remo en polea» → «Remo polea baja»
  const polea = mis.getByRole("listitem").filter({ hasText: "Remo en polea" });
  await polea.getByRole("button", { name: "Opciones de Remo en polea" }).click();
  await polea.getByRole("button", { name: "Renombrar" }).click();
  await page.getByLabel("Nuevo nombre").fill("Remo polea baja");
  await page.getByRole("button", { name: "Guardar nombre" }).click();
  await expect(mis.getByRole("link", { name: "Remo polea baja" })).toBeVisible();

  // Borrar «Remo maquina» pasando sus 2 series a «Remo polea baja»
  await remo.getByRole("button", { name: "Opciones de Remo maquina" }).click();
  await remo.getByRole("button", { name: "Borrar", exact: true }).click();
  await expect(remo).toContainText("tiene 2 series");
  await remo.getByRole("button", { name: "Pasarlas a otro ejercicio…" }).click();
  await remo.getByLabel("Pasar a").fill("polea baja");
  await remo.getByRole("button", { name: "Remo polea baja", exact: true }).click();
  await remo.getByRole("button", { name: "Pasar las series y borrar «Remo maquina»" }).click();
  await expect(mis.getByRole("listitem")).toHaveCount(1);
  await expect(mis).toContainText("Remo polea baja3 series");

  // El historial del destino tiene las 3 series y persiste tras recargar
  await mis.getByRole("link", { name: "Remo polea baja" }).click();
  await page.reload();
  await expect(page.getByRole("list", { name: /^Series del / }).getByRole("listitem")).toHaveCount(3);
});
