import { expect, test, type Page } from "@playwright/test";
import { crearRutina, irA, nombreUnico, registrar } from "./cuentas";

// Los e2e nunca llaman a Gemini (GEMINI_API_KEY vacía en entorno.ts): la respuesta de la IA
// se simula en el navegador; el perfil, la rutina y «Aplicar» van contra la API real.

test.beforeEach(async ({ page }) => {
  await registrar(page, nombreUnico("ia"));
});

const panel = (page: Page) => page.getByRole("region", { name: "Recomendaciones de la IA" });

async function guardarPerfil(page: Page, altura: string, peso: string) {
  await irA(page, "Perfil");
  await page.getByLabel("Altura (cm)").fill(altura);
  await page.getByLabel("Peso corporal (kg)").fill(peso);
  await page.getByRole("button", { name: "Guardar perfil" }).click();
  await expect(page.getByRole("status")).toHaveText("Perfil guardado.");
}

async function idEjercicio(page: Page, nombre: string): Promise<number> {
  const r = await page.request.get(`/api/ejercicios?q=${encodeURIComponent(nombre)}`);
  const lista = (await r.json()) as { id: number; nombre: string }[];
  return lista.find((e) => e.nombre === nombre)!.id;
}

test("el perfil se guarda y sigue ahí al recargar", async ({ page }) => {
  await guardarPerfil(page, "178", "80,5");
  await page.reload();
  await expect(page.getByLabel("Altura (cm)")).toHaveValue("178");
  await expect(page.getByLabel("Peso corporal (kg)")).toHaveValue("80,5");
});

test("sin perfil avisa y enlaza a Mi perfil; con perfil y sin clave, avisa de que no está configurado", async ({
  page,
}) => {
  await crearRutina(page, "Pecho", ["Press de banca"]);
  const url = page.url();
  await panel(page).getByRole("button", { name: "Pedir recomendaciones" }).click();
  await expect(panel(page).getByRole("alert")).toContainText("Completa tu altura y tu peso");
  await panel(page).getByRole("link", { name: "Ir a Mi perfil" }).click();
  await expect(page.getByRole("heading", { name: "Mi perfil" })).toBeVisible();

  await guardarPerfil(page, "178", "80");
  await page.goto(url);
  await panel(page).getByRole("button", { name: "Pedir recomendaciones" }).click();
  await expect(panel(page).getByRole("alert")).toContainText("no están configuradas");
});

test("con la IA simulada: muestra el peso recomendado y «Aplicar» añade el ejercicio", async ({ page }) => {
  await guardarPerfil(page, "178", "80");
  await crearRutina(page, "Empuje", ["Press de banca"]);
  const banca = await idEjercicio(page, "Press de banca");
  const militar = await idEjercicio(page, "Press militar");
  await page.route("**/api/rutinas/*/recomendaciones", (route) =>
    route.fulfill({
      json: {
        resumen: "Sube en press de banca y añade hombro.",
        anadir: [
          { ejercicio_id: militar, nombre: "Press militar", series: 4, reps_min: 6, reps_max: 8, motivo: "Hombro." },
        ],
        sustituir: [],
        objetivos: [
          {
            ejercicio_id: banca,
            nombre: "Press de banca",
            peso_kg: 82.5,
            reps_min: 8,
            reps_max: 12,
            motivo: "Hiciste 80 kg × 12 en todas.",
          },
        ],
      },
    }),
  );

  await panel(page).getByRole("button", { name: "Pedir recomendaciones" }).click();
  await expect(panel(page).getByRole("list", { name: "Objetivos recomendados" })).toContainText(
    "Press de banca: 82,5 kg, 8-12 repeticiones",
  );
  await panel(page).getByRole("button", { name: "Aplicar: añadir Press militar" }).click();
  await expect(panel(page).getByText("✓ Aplicado")).toBeVisible();

  const ejercicios = page.getByRole("list", { name: "Ejercicios de la rutina" });
  await expect(ejercicios.getByRole("link")).toHaveText(["Press de banca", "Press militar"]);
  await page.reload();
  await expect(ejercicios.getByRole("link")).toHaveText(["Press de banca", "Press militar"]);
  await expect(ejercicios).toContainText("4 × 6-8");
});

test("error 429 de Gemini: avisa al usuario", async ({ page }) => {
  await guardarPerfil(page, "170", "65");
  await crearRutina(page, "Pierna", ["Sentadilla"]);
  await page.route("**/api/rutinas/*/recomendaciones", (route) =>
    route.fulfill({
      status: 429,
      json: { error: "Gemini ha recibido demasiadas peticiones o se ha agotado la cuota gratuita." },
    }),
  );
  await panel(page).getByRole("button", { name: "Pedir recomendaciones" }).click();
  await expect(panel(page).getByRole("alert")).toContainText("demasiadas peticiones");
});
