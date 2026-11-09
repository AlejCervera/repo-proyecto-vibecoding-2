import { expect, test, type Page } from "@playwright/test";
import { irA, nombreUnico, registrar, registrarSerie } from "./cuentas";

// Comprobaciones de diseño a 390 px: solo tienen sentido en el proyecto «movil».
test.skip(({ viewport }) => (viewport?.width ?? 0) > 500, "solo con tamaño de móvil");

/** Ninguna pantalla debe obligar a hacer scroll de lado. */
async function sinScrollHorizontal(page: Page, pantalla: string) {
  const { ancho, visible } = await page.evaluate(() => ({
    ancho: document.documentElement.scrollWidth,
    visible: window.innerWidth,
  }));
  expect(ancho, `scroll horizontal en ${pantalla}`).toBeLessThanOrEqual(visible);
}

/** Todos los botones y enlaces-botón visibles miden al menos 44 px de alto. */
async function botonesGrandes(page: Page, pantalla: string) {
  const bajos = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("button, .boton, .secciones a, nav[aria-label=Pasos] a")]
      .filter((b) => b.offsetParent !== null)
      .map((b) => ({ texto: b.textContent?.trim(), alto: b.getBoundingClientRect().height }))
      .filter((b) => b.alto < 44),
  );
  expect(bajos, `botones pequeños en ${pantalla}`).toEqual([]);
}

async function revisar(page: Page, pantalla: string) {
  await sinScrollHorizontal(page, pantalla);
  await botonesGrandes(page, pantalla);
}

test("todas las pantallas caben a 390 px y sus botones se pueden tocar", async ({ page }) => {
  await page.goto("/");
  await revisar(page, "inicio de sesión");

  await registrar(page, nombreUnico("movil"));
  await registrarSerie(page, "Press de banca", "80", "8");
  await revisar(page, "diario");

  await page.getByRole("list", { name: "Series" }).getByRole("link", { name: "Press de banca" }).click();
  await expect(page.getByRole("heading", { name: "Historial: Press de banca" })).toBeVisible();
  await revisar(page, "historial");

  await irA(page, "Inicio");
  await expect(page.getByRole("article", { name: "Esta semana" })).toBeVisible();
  await revisar(page, "inicio");

  await irA(page, "Mis ejercicios");
  await expect(page.getByRole("heading", { name: "Mis ejercicios" })).toBeVisible();
  await revisar(page, "mis ejercicios");

  await irA(page, "Rutinas");
  await expect(page.getByRole("list", { name: "Rutinas predefinidas" })).toBeVisible();
  await revisar(page, "rutinas");

  await page.getByRole("list", { name: "Rutinas predefinidas" }).getByRole("link", { name: "Pecho" }).click();
  await page.getByRole("button", { name: "Copiar a mis rutinas" }).click();
  await expect(page.getByRole("button", { name: "Renombrar" })).toBeVisible();
  await revisar(page, "rutina propia");

  await page.getByRole("link", { name: "▶ Empezar entrenamiento" }).click();
  const paso = page.getByRole("article", { name: "Press de banca" });
  await paso.getByLabel("Peso (kg)").fill("80");
  await paso.getByRole("button", { name: "Guardar serie" }).click();
  await expect(page.getByRole("timer")).toBeVisible();
  await revisar(page, "entrenar");

  // El descanso sigue a la vista al bajar hasta el final de la pantalla
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(page.getByRole("timer")).toBeInViewport();

  await page.getByRole("link", { name: "Siguiente →" }).click();
  await page.getByRole("link", { name: "Terminar" }).click();
  await expect(page.getByRole("article", { name: "Resumen del entrenamiento" })).toBeVisible();
  await revisar(page, "resumen");
});
