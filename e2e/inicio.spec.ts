import { expect, test } from "@playwright/test";
import { abrirPredefinida, irA, nombreUnico, registrar, serieEntrenando, terminarYGuardar } from "./cuentas";

test("el inicio: iniciar entrenamiento, la semana y el último entrenamiento", async ({ page }) => {
  await registrar(page, nombreUnico("ini"));
  await expect(page.getByRole("article", { name: "Último entrenamiento" })).toContainText(
    "Aún no hay entrenamientos en el diario.",
  );

  // Sin rutina usada: «Elegir rutina» lleva a la lista
  await expect(page.getByRole("heading", { name: "¿Qué entrenas hoy?" })).toBeVisible();
  await page.getByRole("link", { name: "Elegir rutina" }).click();
  await page
    .getByRole("list", { name: "Rutinas predefinidas" })
    .getByRole("link", { name: "Pecho", exact: true })
    .click();
  await page.getByRole("link", { name: "Empezar entrenamiento" }).click();
  await serieEntrenando(page, "Press de banca", "80", "8");
  await serieEntrenando(page, "Aperturas con mancuernas", "14", "12");
  await terminarYGuardar(page);

  await irA(page, "Inicio");
  await expect(page.getByRole("article", { name: "Esta semana" })).toContainText("1 día · 2 series");
  const ultimo = page.getByRole("article", { name: "Último entrenamiento" });
  await expect(ultimo).toContainText("Pecho");
  await expect(ultimo).toContainText("2 ejercicios · 2 series");

  // Ya se ha entrenado hoy (se guardó solo en el diario): «¡Hecho!»
  const entrenar = page.getByRole("article", { name: "Entrenar" });
  await expect(entrenar.getByRole("heading", { name: "¡Hecho! ✓" })).toBeVisible();
  await expect(entrenar).toContainText("Pecho · 2 ejercicios · 2 series");

  // Sin plan, el atajo del icono del móvil (#/empezar) lleva a la última rutina usada
  await page.goto("/#/empezar");
  await expect(page.getByRole("heading", { name: "Entrenando: Pecho" })).toBeVisible();

  // Mientras se entrena no hay pestañas: se sale con la ✕ (a la rutina) y desde ahí, a Inicio
  await expect(page.getByRole("navigation", { name: "Secciones" })).toHaveCount(0);
  await page.getByRole("link", { name: "Salir del entreno" }).click();
  await expect(page.getByRole("heading", { name: "Pecho", exact: true })).toBeVisible();

  // Y el último entrenamiento lleva a su detalle en el diario
  await irA(page, "Inicio");
  await ultimo.getByRole("link").click();
  await expect(page.getByRole("article", { name: "Press de banca" })).toContainText("80 kg × 8");
});

test("el manifiesto y los iconos para «Añadir a pantalla de inicio» se sirven", async ({ request }) => {
  const manifiesto = await request.get("/manifest.webmanifest");
  expect(manifiesto.ok()).toBe(true);
  const datos = await manifiesto.json();
  expect(datos.name).toBe("Gym Log");
  expect(datos.display).toBe("standalone");
  expect(datos.shortcuts[0]).toMatchObject({ name: "Iniciar entrenamiento", url: "/#/empezar" });
  for (const icono of datos.icons) {
    const r = await request.get(icono.src);
    expect(r.ok()).toBe(true);
    expect(r.headers()["content-type"]).toContain("image/png");
  }
});
