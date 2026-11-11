import { expect, type Page } from "@playwright/test";
import { CODIGO } from "./entorno";

export const PASSWORD = "contraseña-e2e";

/** Nombre único por ejecución para que las pruebas no choquen entre sí. */
export function nombreUnico(prefijo: string) {
  return `${prefijo}${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(0, 30);
}

/** Crea una cuenta nueva; queda en la pantalla de Inicio. */
export async function registrar(page: Page, usuario: string) {
  await page.goto("/");
  await page.getByRole("button", { name: "Crear una cuenta" }).click();
  await page.getByLabel("Usuario").fill(usuario);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByLabel("Código de invitación").fill(CODIGO);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByRole("navigation", { name: "Secciones" })).toBeVisible();
}

export async function entrar(page: Page, usuario: string, password = PASSWORD) {
  await page.getByLabel("Usuario").fill(usuario);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
}

/** «Cerrar sesión» está en la pestaña Perfil. */
export async function salir(page: Page) {
  await irA(page, "Perfil");
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();
}

/** Pestañas de la barra inferior. «Entrenar» abre la lista de rutinas. */
export async function irA(page: Page, seccion: "Inicio" | "Entrenar" | "Diario" | "Ejercicios" | "Perfil") {
  await page
    .getByRole("navigation", { name: "Secciones" })
    .getByRole("link", { name: seccion, exact: true })
    .click();
}

/** Crea un ejercicio propio desde «Mis ejercicios». */
export async function crearEjercicioPropio(page: Page, nombre: string) {
  await irA(page, "Ejercicios");
  await page.getByLabel("Nuevo ejercicio").fill(nombre);
  await page.getByRole("button", { name: "Crear", exact: true }).click();
  await expect(
    page.getByRole("list", { name: "Mis ejercicios" }).getByRole("link", { name: nombre, exact: true }),
  ).toBeVisible();
}

/** En la pantalla de una rutina propia: añade un ejercicio buscándolo. */
export async function anadirARutina(page: Page, busqueda: string, nombre = busqueda) {
  await page.getByRole("button", { name: "Añadir ejercicio" }).click();
  await page.getByLabel("Ejercicio a añadir").fill(busqueda);
  await page
    .getByRole("list", { name: "Sugerencias" })
    .getByRole("button", { name: nombre, exact: true })
    .click();
  await page.getByRole("button", { name: "Añadir a la rutina" }).click();
  await expect(
    page.getByRole("list", { name: "Ejercicios de la rutina" }).getByRole("link", { name: nombre, exact: true }),
  ).toBeVisible();
}

/** Crea una rutina propia con esos ejercicios; queda en su pantalla. */
export async function crearRutina(page: Page, nombre: string, ejercicios: string[]) {
  await irA(page, "Entrenar");
  await page.getByLabel("Nueva rutina").fill(nombre);
  await page.getByRole("button", { name: "Crear", exact: true }).click();
  await expect(page.getByRole("heading", { name: nombre, exact: true })).toBeVisible();
  for (const e of ejercicios) await anadirARutina(page, e);
}

/** Abre una rutina predefinida. */
export async function abrirPredefinida(page: Page, nombre: string) {
  await irA(page, "Entrenar");
  await page
    .getByRole("list", { name: "Rutinas predefinidas" })
    .getByRole("link", { name: nombre, exact: true })
    .click();
}

/** Durante un entrenamiento: va al ejercicio y guarda una serie. */
export async function serieEntrenando(page: Page, ejercicio: string, peso: string, reps: string) {
  await page
    .getByRole("list", { name: "Ejercicios del entrenamiento" })
    .getByRole("link", { name: ejercicio, exact: true })
    .click();
  const paso = page.getByRole("article", { name: ejercicio });
  const hechas = paso.getByRole("list", { name: "Series de hoy" }).getByRole("listitem").filter({ hasText: "✓" });
  const antes = await hechas.count();
  await paso.getByLabel("Peso (kg)").fill(peso);
  await paso.getByLabel("Repeticiones").fill(reps);
  await paso.getByRole("button", { name: "Guardar serie" }).click();
  await expect(hechas).toHaveCount(antes + 1);
}

/** Termina el entrenamiento y lo guarda en el diario; queda en el resumen. */
export async function terminarYGuardar(page: Page) {
  await page.getByRole("navigation", { name: "Pasos" }).getByRole("link", { name: "Terminar" }).click();
  const resumen = page.getByRole("article", { name: "Resumen del entrenamiento" });
  await resumen.getByRole("button", { name: "Guardar en el diario" }).click();
  await expect(resumen.getByRole("status")).toContainText("Guardado en el diario.");
}

/** Atajo: crea una rutina con esos ejercicios, entrena las series y lo guarda en el diario. */
export async function entrenar(page: Page, rutina: string, series: [string, string, string][]) {
  await crearRutina(page, rutina, [...new Set(series.map(([e]) => e))]);
  await page.getByRole("link", { name: "▶ Empezar entrenamiento" }).click();
  for (const [ejercicio, peso, reps] of series) await serieEntrenando(page, ejercicio, peso, reps);
  await terminarYGuardar(page);
}
