import { expect, test, type Page } from "@playwright/test";
import { entrar, entrenar, irA, nombreUnico, registrarSinSaltar, salir } from "./cuentas";

// Fase 9f: primeros pasos para cuentas nuevas y repetir la última vez serie a serie.

const pasoActual = (page: Page) => page.locator(".bienvenida-paso");

test("cuenta nueva: copia una rutina, la planifica toda la semana y Inicio dice que hoy toca", async ({ page }) => {
  const usuario = nombreUnico("bienv");
  await registrarSinSaltar(page, usuario);
  await expect(page.getByRole("heading", { name: `Hola, ${usuario}. Elige con qué empezar` })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Secciones" })).toHaveCount(0);

  // Paso 1: copiar «Pecho»
  await page.getByRole("button", { name: "Copiar Pecho" }).click();
  await expect(page.getByRole("button", { name: "Pecho copiada" })).toBeDisabled();
  await page.getByRole("button", { name: "Siguiente" }).click();

  // Paso 2: la copia, todos los días (así «hoy» toca seguro)
  await expect(pasoActual(page)).toHaveText("Paso 2 de 3");
  const plan = page.getByRole("group", { name: "Plan semanal" });
  const copia = plan.getByLabel("Lunes").locator("option", { hasText: /Pecho/ }).last();
  const idCopia = (await copia.getAttribute("value"))!;
  for (const dia of ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]) {
    await plan.getByLabel(dia).selectOption(idCopia);
  }
  await page.getByRole("button", { name: "Guardar y seguir" }).click();

  // Paso 3: el resumen y a Inicio
  await expect(page.getByRole("heading", { name: "¡Listo!" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Tu semana" }).getByRole("listitem")).toHaveCount(7);
  await page.getByRole("button", { name: "Ir al inicio" }).click();
  await expect(page.getByRole("navigation", { name: "Secciones" })).toBeVisible();
  const hoy = page.getByRole("article", { name: "Entrenar" });
  await expect(hoy.getByText("Hoy toca")).toBeVisible();
  await expect(hoy.getByRole("heading", { name: /Pecho/ })).toBeVisible();

  // Ya no vuelve: ni al recargar ni al entrar de nuevo (se guarda en el servidor)
  await page.reload();
  await expect(page.getByRole("navigation", { name: "Secciones" })).toBeVisible();
  await salir(page);
  await entrar(page, usuario);
  await expect(page.getByText(`Hola, ${usuario}`)).toBeVisible();
  await expect(pasoActual(page)).toHaveCount(0);
});

test("se puede saltar, no vuelve a salir y se puede ver otra vez desde Perfil", async ({ page }) => {
  await registrarSinSaltar(page, nombreUnico("salta"));
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByRole("button", { name: /Atrás/ }).click();
  await expect(pasoActual(page)).toHaveText("Paso 1 de 3");
  await page.getByRole("button", { name: "Saltar" }).click();
  await expect(page.getByRole("navigation", { name: "Secciones" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("navigation", { name: "Secciones" })).toBeVisible();
  await expect(pasoActual(page)).toHaveCount(0);

  await irA(page, "Perfil");
  await page.getByRole("link", { name: "Ver la bienvenida otra vez" }).click();
  await expect(pasoActual(page)).toHaveText("Paso 1 de 3");
  await page.getByRole("button", { name: "Saltar" }).click();
  await expect(page.getByRole("navigation", { name: "Secciones" })).toBeVisible();
});

test("al volver a entrenar, cada serie propone la misma serie de la última vez", async ({ page }) => {
  test.slow(); // entrena, mueve las series a otro día y vuelve a entrenar
  await registrarSinSaltar(page, nombreUnico("repite"));
  await page.getByRole("button", { name: "Saltar" }).click();
  await entrenar(page, "Repite", [
    ["Press de banca", "80", "8"],
    ["Press de banca", "77,5", "6"],
  ]);

  // Las dos series pasan a otro día: esa es «la última vez»
  await page.getByRole("link", { name: "Ver en el diario" }).click();
  await page.getByRole("article", { name: "Press de banca" }).getByRole("link", { name: "Press de banca" }).click();
  for (let i = 0; i < 2; i++) {
    await page.getByRole("button", { name: "Editar" }).first().click();
    await page.getByRole("dialog").getByLabel("Fecha").fill("2026-01-05");
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }

  await irA(page, "Entrenar");
  await page.getByRole("list", { name: "Mis rutinas" }).getByRole("link", { name: "Repite", exact: true }).click();
  await page.getByRole("link", { name: "Empezar entrenamiento" }).click();
  const peso = page.getByLabel("Peso (kg)");
  const reps = page.getByLabel("Repeticiones");
  await expect(peso).toHaveValue("80"); // la serie 1 de la última vez, no la última
  await expect(reps).toHaveValue("8");
  await page.getByRole("button", { name: "Hecha · empezar descanso" }).click();
  await expect(peso).toHaveValue("77,5"); // y ahora la serie 2 de entonces
  await expect(reps).toHaveValue("6");
});
