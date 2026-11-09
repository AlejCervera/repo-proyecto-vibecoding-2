import { expect, test } from "@playwright/test";

// Nombre único para no confundir los datos de prueba con los reales.
const ejercicio = () => `Press banca e2e-${Date.now()}`;

test("registrar press banca 80 × 8 y verla en la lista", async ({ page }) => {
  const nombre = ejercicio();
  await page.goto("/");
  await page.getByLabel("Ejercicio").fill(nombre);
  await page.getByLabel("Peso (kg)").fill("80");
  await page.getByLabel("Repeticiones").fill("8");
  await page.getByRole("button", { name: "Guardar" }).click();

  const lista = page.getByRole("list", { name: "Series" });
  await expect(lista).toContainText(`${nombre} · 80 kg × 8`);

  await page.reload();
  await expect(lista).toContainText(`${nombre} · 80 kg × 8`);
});

test("con el peso vacío sale el aviso y no se guarda", async ({ page }) => {
  const nombre = ejercicio();
  await page.goto("/");
  await page.getByLabel("Ejercicio").fill(nombre);
  await page.getByLabel("Repeticiones").fill("8");
  await page.getByRole("button", { name: "Guardar" }).click();

  await expect(page.getByRole("alert")).toHaveText("Falta el peso");
  await page.reload();
  await expect(page.getByText(nombre)).toHaveCount(0);
});
