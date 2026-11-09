import { expect, test } from "@playwright/test";
import { entrar, nombreUnico, registrar, registrarSerie, salir } from "./cuentas";

test("registro, logout y login", async ({ page }) => {
  const usuario = nombreUnico("ana");
  await registrar(page, usuario);
  await expect(page.getByText(`Hola, ${usuario}`)).toBeVisible();

  await salir(page);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();

  await entrar(page, usuario, "contraseña-mala");
  await expect(page.getByRole("alert")).toHaveText("Usuario o contraseña incorrectos");

  await entrar(page, usuario);
  await expect(page.getByText(`Hola, ${usuario}`)).toBeVisible();
  await page.reload();
  await expect(page.getByText(`Hola, ${usuario}`)).toBeVisible();
});

test("sin código de invitación no se puede crear cuenta", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Crear una cuenta" }).click();
  await page.getByLabel("Usuario").fill(nombreUnico("intruso"));
  await page.getByLabel("Contraseña").fill("contraseña-larga");
  await page.getByLabel("Código de invitación").fill("adivinado");
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByRole("alert")).toHaveText("El código de invitación no es correcto");
});

test("dos cuentas no ven las series de la otra", async ({ browser }) => {
  const a = await (await browser.newContext()).newPage();
  const b = await (await browser.newContext()).newPage();
  await registrar(a, nombreUnico("ana"));
  await registrar(b, nombreUnico("bea"));

  await registrarSerie(a, "Press banca", "80", "8");
  await registrarSerie(b, "Sentadilla", "100", "5");
  await expect(a.getByRole("list", { name: "Series" })).toContainText("Press banca · 80 kg × 8");
  await expect(b.getByRole("list", { name: "Series" })).toContainText("Sentadilla · 100 kg × 5");

  await a.reload();
  await b.reload();
  await expect(a.getByRole("list", { name: "Series" })).not.toContainText("Sentadilla");
  await expect(b.getByRole("list", { name: "Series" })).not.toContainText("Press banca");
});
