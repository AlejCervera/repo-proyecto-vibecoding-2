import { expect, test } from "@playwright/test";
import { entrar, entrenar, irA, nombreUnico, registrar, salir } from "./cuentas";

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

  await entrenar(a, "Rutina de Ana", [["Press de banca", "80", "8"]]);
  await entrenar(b, "Rutina de Bea", [["Sentadilla", "100", "5"]]);

  await irA(a, "Diario");
  await irA(b, "Diario");
  const diarioA = a.getByRole("list", { name: "Entrenamientos" });
  const diarioB = b.getByRole("list", { name: "Entrenamientos" });
  await expect(diarioA.getByRole("listitem")).toHaveCount(1);
  await expect(diarioA).toContainText("Rutina de Ana");
  await expect(diarioB.getByRole("listitem")).toHaveCount(1);
  await expect(diarioB).toContainText("Rutina de Bea");

  // Ni rutinas ni historial de la otra cuenta
  await irA(b, "Rutinas");
  await expect(b.getByRole("list", { name: "Mis rutinas" })).not.toContainText("Rutina de Ana");
});
