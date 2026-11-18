import { expect, test, type Page } from "@playwright/test";
import { crearRutina, entrenar, irA, nombreUnico, registrar } from "./cuentas";

// Fase 9g: superseries, notas y calculadora de discos.

test.beforeEach(async ({ page }) => {
  await registrar(page, nombreUnico("herr"));
});

const hecha = (page: Page) => page.getByRole("button", { name: "Hecha · empezar descanso" });

test("superserie: tras A se pasa a B sin descanso; tras B, descanso y vuelta a A", async ({ page }) => {
  await crearRutina(page, "Torso", ["Press de banca", "Aperturas con mancuernas"]);
  await page.getByRole("button", { name: "Superserie con el siguiente (Press de banca)" }).click();
  await expect(page.getByText("Superserie", { exact: true })).toBeVisible();
  await page.reload(); // queda guardada en el servidor
  await expect(page.getByText("Superserie", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Empezar entrenamiento" }).click();
  const banca = page.getByRole("article", { name: "Press de banca" });
  await expect(banca.getByText("Superserie 1 de 2")).toBeVisible();
  await banca.getByLabel("Peso (kg)").fill("60");
  await banca.getByLabel("Repeticiones").fill("10");
  await hecha(page).click();

  // A → B, sin descanso
  const aperturas = page.getByRole("article", { name: "Aperturas con mancuernas" });
  await expect(aperturas.getByText("Superserie 2 de 2")).toBeVisible();
  await expect(page.getByRole("timer")).toHaveCount(0);
  await aperturas.getByLabel("Peso (kg)").fill("50");
  await aperturas.getByLabel("Repeticiones").fill("10");
  await hecha(page).click();

  // B → descanso y vuelta a A, que ya lleva su serie 1 hecha
  await expect(page.getByRole("timer")).toBeVisible();
  await expect(banca).toBeVisible();
  await expect(banca.getByRole("list", { name: "Series de hoy" }).locator("li.hecha")).toHaveCount(1);
});

test("una nota en una serie sale «la última vez» al volver a entrenar y en el historial", async ({ page }) => {
  test.slow();
  await entrenar(page, "Notas", [["Press de banca", "80", "8"]]);
  await page.getByRole("link", { name: "Volver a la rutina" }).click();
  await page.getByRole("link", { name: "Empezar entrenamiento" }).click();

  // Anotar la serie de hoy tocándola
  const paso = page.getByRole("article", { name: "Press de banca" });
  await paso.getByRole("button", { name: /Serie 1/ }).click();
  const hoja = page.getByRole("dialog", { name: "Nota de la serie 1" });
  await hoja.getByLabel("Nota", { exact: true }).fill("molestia en el hombro");
  await hoja.getByRole("button", { name: "Guardar nota" }).click();
  await expect(paso.getByRole("button", { name: /con nota/ })).toBeVisible();

  // En el historial; y al pasarla a otro día, es «la última vez»
  await paso.getByRole("link", { name: "Ver historial" }).click();
  await expect(page.getByText("«molestia en el hombro»")).toBeVisible();
  await page.getByRole("button", { name: "Editar" }).first().click();
  await page.getByRole("dialog").getByLabel("Fecha").fill("2026-01-05");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("«molestia en el hombro»")).toBeVisible(); // editar no borra la nota

  await irA(page, "Entrenar");
  await page.getByRole("list", { name: "Mis rutinas" }).getByRole("link", { name: "Notas", exact: true }).click();
  await page.getByRole("link", { name: "Empezar entrenamiento" }).click();
  await expect(page.getByRole("list", { name: "Notas de la última vez" })).toContainText("«molestia en el hombro»");
});

test("nota del entreno en el resumen; se ve en el diario", async ({ page }) => {
  await entrenar(page, "Pecho", [["Press de banca", "60", "10"]]);
  await page.getByRole("button", { name: "Añadir una nota del entreno" }).click();
  const hoja = page.getByRole("dialog", { name: "Nota del entreno" });
  await hoja.getByLabel("Nota", { exact: true }).fill("poco dormido");
  await hoja.getByRole("button", { name: "Guardar nota" }).click();
  await expect(page.getByText("«poco dormido»")).toBeVisible();
  await page.getByRole("link", { name: "Ver en el diario" }).click();
  await expect(page.getByText("«poco dormido»")).toBeVisible();
});

test("discos: 100 kg con la barra de 20 son 25 + 15 por lado; con barra de 15 cambia", async ({ page }) => {
  await crearRutina(page, "Fuerza", ["Sentadilla"]);
  await page.getByRole("link", { name: "Empezar entrenamiento" }).click();
  const paso = page.getByRole("article", { name: "Sentadilla" });
  await paso.getByLabel("Peso (kg)").fill("100");
  await paso.getByRole("button", { name: "Discos" }).click();
  const hoja = page.getByRole("dialog", { name: "Discos por lado" });
  await expect(hoja.locator(".discos-lista")).toHaveText("Por lado: 25 · 15");
  await hoja.getByRole("button", { name: /Cerrar/ }).click();

  // Barra de 15 en Perfil
  await page.getByRole("link", { name: "Salir del entreno" }).click();
  await irA(page, "Perfil");
  const barra = page.getByLabel("Peso de la barra (kg)");
  await expect(barra).toHaveValue("20");
  await page.getByRole("button", { name: "Restar 2,5 kg" }).click();
  await page.getByRole("button", { name: "Restar 2,5 kg" }).click();
  await expect(barra).toHaveValue("15");
  await page.getByRole("button", { name: "Guardar perfil" }).click();
  await expect(page.getByRole("status")).toContainText("Perfil guardado");

  await irA(page, "Entrenar");
  await page.getByRole("list", { name: "Mis rutinas" }).getByRole("link", { name: "Fuerza", exact: true }).click();
  await page.getByRole("link", { name: "Empezar entrenamiento" }).click();
  await paso.getByLabel("Peso (kg)").fill("100");
  await paso.getByRole("button", { name: "Discos" }).click();
  await expect(page.getByRole("dialog", { name: "Discos por lado" }).locator(".discos-lista")).toHaveText(
    "Por lado: 25 · 15 · 2,5",
  );
});
