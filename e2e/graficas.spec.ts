import { expect, test } from "@playwright/test";
import { entrenar, irA, nombreUnico, registrar } from "./cuentas";

test.beforeEach(async ({ page }) => {
  await registrar(page, nombreUnico("graf"));
});

test("tras entrenar, el diario enseña el progreso y el historial la evolución", async ({ page }) => {
  test.slow(); // recorrido largo: crear rutina, entrenar, diario e historial
  await entrenar(page, "Mixta", [
    ["Press de banca", "60", "10"],
    ["Press de banca", "62,5", "8"],
  ]);

  // Diario → Progreso: 1 entreno y su volumen esta semana (60×10 + 62,5×8 = 1100 kg)
  await irA(page, "Diario");
  const progreso = page.getByRole("region", { name: "Progreso" });
  await expect(progreso.getByRole("article", { name: "Entrenos por semana" }).locator(".lectura")).toHaveText(
    "1 entreno esta semana",
  );
  await expect(progreso.getByRole("article", { name: "Volumen semanal" }).locator(".lectura")).toHaveText(
    "1100 kg esta semana",
  );

  // Historial con una sola sesión: aún no hay gráfica
  await page.getByRole("link", { name: /Mixta/ }).first().click();
  await page.getByRole("article", { name: "Press de banca" }).getByRole("link", { name: "Press de banca" }).click();
  await expect(page.getByText("Necesitas al menos 2 sesiones para ver la evolución.")).toBeVisible();

  // Pasar la primera serie a otro día: ya son 2 sesiones y aparece la evolución
  await page.getByRole("button", { name: "Editar" }).first().click();
  await page.getByRole("dialog").getByLabel("Fecha").fill("2026-01-05");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  const evolucion = page.getByRole("region", { name: "Evolución" });
  await expect(evolucion).toBeVisible();
  await expect(evolucion.getByRole("table")).toContainText("05/0160 kg80 kg"); // 60×10 → 1RM 80
});
