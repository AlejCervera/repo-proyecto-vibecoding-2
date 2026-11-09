import { expect, type Page } from "@playwright/test";
import { CODIGO } from "./entorno";

export const PASSWORD = "contraseña-e2e";

/** Nombre único por ejecución para que las pruebas no choquen entre sí. */
export function nombreUnico(prefijo: string) {
  return `${prefijo}${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(0, 30);
}

export async function registrar(page: Page, usuario: string) {
  await page.goto("/");
  await page.getByRole("button", { name: "Crear una cuenta" }).click();
  await page.getByLabel("Usuario").fill(usuario);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByLabel("Código de invitación").fill(CODIGO);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByRole("button", { name: "Cerrar sesión" })).toBeVisible();
}

export async function entrar(page: Page, usuario: string, password = PASSWORD) {
  await page.getByLabel("Usuario").fill(usuario);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
}

export async function salir(page: Page) {
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();
}

/** Busca un ejercicio y lo elige de las sugerencias. */
export async function elegirEjercicio(page: Page, busqueda: string, nombre: string) {
  await page.getByLabel("Ejercicio").fill(busqueda);
  await page.getByRole("list", { name: "Sugerencias" }).getByRole("button", { name: nombre, exact: true }).click();
  await expect(page.getByText(`Ejercicio: ${nombre}`)).toBeVisible();
}

export async function registrarSerie(page: Page, ejercicio: string, peso: string, reps: string) {
  const cambiar = page.getByRole("button", { name: "Cambiar" });
  if (await cambiar.isVisible()) await cambiar.click();
  await elegirEjercicio(page, ejercicio, ejercicio);
  await page.getByLabel("Peso (kg)").fill(peso);
  await page.getByLabel("Repeticiones").fill(reps);
  await page.getByRole("button", { name: "Guardar" }).click();
}
