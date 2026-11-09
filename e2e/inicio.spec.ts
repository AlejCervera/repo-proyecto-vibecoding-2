import { expect, test } from "@playwright/test";
import { irA, nombreUnico, registrar, registrarSerie } from "./cuentas";

test("el inicio: iniciar entrenamiento, la semana y el último entrenamiento", async ({ page }) => {
  await registrar(page, nombreUnico("ini"));
  await registrarSerie(page, "Press de banca", "80", "8");
  await registrarSerie(page, "Sentadilla", "100", "5");

  await irA(page, "Inicio");
  await expect(page.getByRole("article", { name: "Esta semana" })).toContainText("1 día · 2 series");
  await expect(page.getByRole("article", { name: "Último entrenamiento" })).toContainText(
    "Press de banca, Sentadilla",
  );

  // Sin rutina usada: «Iniciar entrenamiento» lleva a elegir rutina
  await page.getByRole("link", { name: "▶ Iniciar entrenamiento" }).click();
  await page
    .getByRole("list", { name: "Rutinas predefinidas" })
    .getByRole("link", { name: "Pecho" })
    .click();
  await page.getByRole("link", { name: "▶ Empezar entrenamiento" }).click();
  await expect(page.getByRole("heading", { name: "Entrenando: Pecho" })).toBeVisible();

  // Ahora el inicio ofrece continuar con «Pecho»
  await irA(page, "Inicio");
  await expect(page.getByRole("article", { name: "Entrenar" })).toContainText("Continuar con «Pecho»");
  await page.getByRole("link", { name: "▶ Iniciar entrenamiento" }).click();
  await expect(page.getByRole("heading", { name: "Entrenando: Pecho" })).toBeVisible();

  // El atajo del icono del móvil (#/empezar) hace lo mismo
  await page.goto("/#/empezar");
  await expect(page.getByRole("heading", { name: "Entrenando: Pecho" })).toBeVisible();
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
