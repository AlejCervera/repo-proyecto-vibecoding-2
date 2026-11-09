import { expect, test } from "@playwright/test";
import { nombreUnico, registrar, registrarSerie } from "./cuentas";

test.beforeEach(async ({ page }) => {
  await registrar(page, nombreUnico("serie"));
});

test("registrar press de banca 80 × 8 y verla en la lista", async ({ page }) => {
  await registrarSerie(page, "Press de banca", "80", "8");

  const lista = page.getByRole("list", { name: "Series" });
  await expect(lista).toContainText("Press de banca · 80 kg × 8");

  await page.reload();
  await expect(lista).toContainText("Press de banca · 80 kg × 8");
});

test("con el peso vacío sale el aviso y no se guarda", async ({ page }) => {
  await registrarSerie(page, "Press de banca", "", "8");

  await expect(page.getByRole("alert")).toHaveText("Falta el peso");
  await page.reload();
  await expect(page.getByText("Aún no hay series.")).toBeVisible();
});
