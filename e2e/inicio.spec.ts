import { expect, test } from "@playwright/test";
import { abrirPredefinida, irA, nombreUnico, registrar, serieEntrenando, terminarYGuardar } from "./cuentas";

test("el inicio: iniciar entrenamiento, la semana y el último entrenamiento", async ({ page }) => {
  await registrar(page, nombreUnico("ini"));
  await expect(page.getByRole("article", { name: "Último entrenamiento" })).toContainText(
    "Aún no hay entrenamientos en el diario.",
  );

  // Sin rutina usada: «Iniciar entrenamiento» lleva a elegir rutina
  await page.getByRole("link", { name: "▶ Iniciar entrenamiento" }).click();
  await page
    .getByRole("list", { name: "Rutinas predefinidas" })
    .getByRole("link", { name: "Pecho" })
    .click();
  await page.getByRole("link", { name: "▶ Empezar entrenamiento" }).click();
  await serieEntrenando(page, "Press de banca", "80", "8");
  await serieEntrenando(page, "Aperturas con mancuernas", "14", "12");
  await terminarYGuardar(page);

  await irA(page, "Inicio");
  await expect(page.getByRole("article", { name: "Esta semana" })).toContainText("1 día · 2 series");
  const ultimo = page.getByRole("article", { name: "Último entrenamiento" });
  await expect(ultimo).toContainText("Pecho");
  await expect(ultimo).toContainText("2 ejercicios · 2 series");

  // Ahora el inicio ofrece continuar con «Pecho»
  await expect(page.getByRole("article", { name: "Entrenar" })).toContainText("Continuar con «Pecho»");
  await page.getByRole("link", { name: "▶ Iniciar entrenamiento" }).click();
  await expect(page.getByRole("heading", { name: "Entrenando: Pecho" })).toBeVisible();

  // El atajo del icono del móvil (#/empezar) hace lo mismo
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
