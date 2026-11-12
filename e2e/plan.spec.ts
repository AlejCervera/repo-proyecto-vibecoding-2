import { expect, test, type Page } from "@playwright/test";
import { irA, nombreUnico, registrar, serieEntrenando, terminarYGuardar } from "./cuentas";

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
/** Nombre del día de hoy tal y como sale en la hoja del plan semanal. */
const hoyEnPlan = () => DIAS[(new Date().getDay() + 6) % 7];

/** El botón de hoy en el calendario del diario. */
const hoyEnCalendario = (page: Page) =>
  page.getByRole("list", { name: /^Días de / }).locator('button[aria-current="date"]');

test.beforeEach(async ({ page }) => {
  await registrar(page, nombreUnico("plan"));
});

test("planificar «Pecho» para hoy, verlo en Inicio, entrenarlo y verlo hecho en el calendario", async ({ page }) => {
  // Plan semanal: hoy, Pecho (predefinida)
  await irA(page, "Diario");
  await page.getByRole("button", { name: "Editar plan semanal" }).click();
  const hoja = page.getByRole("dialog", { name: "Plan semanal" });
  await hoja.getByLabel(hoyEnPlan()).selectOption({ label: "Pecho" });
  await hoja.getByRole("button", { name: "Guardar plan" }).click();
  await expect(hoja).toHaveCount(0);
  await expect(hoyEnCalendario(page)).toHaveAttribute("aria-label", /: pendiente · Pecho$/);

  // Se guarda: sigue ahí al recargar
  await page.reload();
  await expect(hoyEnCalendario(page)).toHaveAttribute("aria-label", /: pendiente · Pecho$/);

  // Inicio dice que hoy toca Pecho
  await irA(page, "Inicio");
  const entrenar = page.getByRole("article", { name: "Entrenar" });
  await expect(entrenar).toContainText("Hoy toca");
  await expect(entrenar.getByRole("heading", { name: "Pecho" })).toBeVisible();
  await expect(page.getByRole("article", { name: "Esta semana" })).toContainText("0 de 1 entrenos");

  // Entrenarlo y terminar: se guarda solo en el diario
  await entrenar.getByRole("link", { name: "Empezar" }).click();
  await serieEntrenando(page, "Press de banca", "60", "10");
  await terminarYGuardar(page);

  // En el calendario, hoy sale hecho; en Inicio, «¡Hecho!» y la semana cumplida
  await irA(page, "Diario");
  await expect(hoyEnCalendario(page)).toHaveAttribute("aria-label", /: hecho · Pecho$/);
  await irA(page, "Inicio");
  await expect(page.getByRole("heading", { name: "¡Hecho! ✓" })).toBeVisible();
  await expect(page.getByRole("article", { name: "Esta semana" })).toContainText("1 de 1 entrenos · racha de 1");
});

test("cambiar solo hoy a descanso y volver al plan", async ({ page }) => {
  await irA(page, "Diario");
  await page.getByRole("button", { name: "Editar plan semanal" }).click();
  await page.getByRole("dialog").getByLabel(hoyEnPlan()).selectOption({ label: "Pecho" });
  await page.getByRole("button", { name: "Guardar plan" }).click();

  await hoyEnCalendario(page).click();
  const hoja = page.getByRole("dialog");
  await hoja.getByLabel("Cambiar solo este día").selectOption({ label: "Descanso" });
  await expect(hoja).toContainText("Toca: descanso (cambiado solo este día)");
  await hoja.getByRole("button", { name: "Cerrar" }).click();
  await expect(hoyEnCalendario(page)).toHaveAttribute("aria-label", /: descanso$/);

  await irA(page, "Inicio");
  await expect(page.getByRole("heading", { name: "Toca descanso" })).toBeVisible();

  await irA(page, "Diario");
  await hoyEnCalendario(page).click();
  await page.getByRole("dialog").getByRole("button", { name: "Volver al plan" }).click();
  await expect(page.getByRole("dialog")).toContainText("Toca: Pecho");
});
