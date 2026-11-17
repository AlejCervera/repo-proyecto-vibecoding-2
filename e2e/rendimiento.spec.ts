import { expect, test } from "@playwright/test";
import { entrenar, irA, nombreUnico, registrar } from "./cuentas";

/*
 * Fase 9e2. Solo corre en el proyecto «produccion», contra el servicio web-movil (la web
 * compilada, como la abre el iPhone en http://<IP>:4173). En desarrollo el móvil recibía cientos de
 * módulos sueltos y React en modo desarrollo: iba muy lento.
 */

/** Topes con margen sobre lo medido (1 JS de ~313 KB y 1 CSS de ~28 KB sin comprimir). */
const MAX_ARCHIVOS = 10;
const MAX_JS_BYTES = 450_000;

test("la versión optimizada carga pocos archivos, sin nada de desarrollo", async ({ page }) => {
  const archivos: { url: string; bytes: number; tipo: string }[] = [];
  page.on("response", async (r) => {
    const tipo = r.request().resourceType();
    if (tipo === "script" || tipo === "stylesheet") {
      archivos.push({ url: r.url(), tipo, bytes: (await r.body().catch(() => Buffer.alloc(0))).length });
    }
  });
  await page.goto("/");
  await expect(page.getByRole("button", { name: /Entrar/ }).first()).toBeVisible();
  await page.waitForLoadState("networkidle");

  expect(archivos.length, `demasiados archivos: ${archivos.map((a) => a.url).join(", ")}`).toBeLessThanOrEqual(
    MAX_ARCHIVOS,
  );
  const deDesarrollo = archivos.filter((a) => /\/@vite\/|\/@react-refresh|\/src\/|node_modules/.test(a.url));
  expect(deDesarrollo.map((a) => a.url), "se están sirviendo módulos de desarrollo").toEqual([]);
  const js = archivos.filter((a) => a.tipo === "script").reduce((n, a) => n + a.bytes, 0);
  expect(js, "el JS pesa demasiado").toBeLessThanOrEqual(MAX_JS_BYTES);
});

test("en la versión optimizada se entra, se entrena y se ve el diario (proxy a la API)", async ({ page }) => {
  test.slow();
  await registrar(page, nombreUnico("prod"));
  await entrenar(page, "Mixta", [["Press de banca", "60", "10"]]);
  await irA(page, "Diario");
  await expect(
    page.getByRole("region", { name: "Progreso" }).getByRole("article", { name: "Entrenos por semana" }).locator(".lectura"),
  ).toHaveText("1 entreno esta semana");

  // También aquí lo que se desliza es el contenido, nunca el documento
  await page.evaluate(() => document.getElementById("root")!.scrollTo(0, 1e6));
  expect(await page.evaluate(() => document.getElementById("root")!.scrollTop)).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  const barra = (await page.getByRole("navigation", { name: "Secciones" }).boundingBox())!;
  expect(Math.abs(barra.y + barra.height - 844)).toBeLessThanOrEqual(2);
});

/** Desde aquí, cada petición a la API tarda `ms` más (una wifi muy mala). Devuelve el contador. */
async function redLenta(page: import("@playwright/test").Page, ms: number) {
  const contador = { peticiones: 0 };
  await page.route("**/api/**", async (ruta) => {
    contador.peticiones++;
    await new Promise((r) => setTimeout(r, ms));
    await ruta.continue();
  });
  return contador;
}

test("con la red lenta, las pestañas salen al instante: ya estaban precargadas (Fase 9e3)", async ({ page }) => {
  test.slow();
  await registrar(page, nombreUnico("rapida"));
  await entrenar(page, "Mixta", [["Press de banca", "60", "10"]]);
  await irA(page, "Inicio");
  await page.waitForLoadState("networkidle"); // la precarga tras guardar ha terminado
  await page.waitForTimeout(1500);
  await page.waitForLoadState("networkidle");

  const red = await redLenta(page, 2500);
  const pestanas = [
    ["Diario", page.getByRole("region", { name: "Progreso" })],
    ["Entrenar", page.getByRole("list", { name: "Mis rutinas" })],
    ["Ejercicios", page.getByRole("heading", { name: "Ejercicios" })],
    ["Perfil", page.getByLabel("Altura (cm)")],
    ["Inicio", page.getByRole("article", { name: "Último entrenamiento" })],
  ] as const;
  for (const [pestana, contenido] of pestanas) {
    const t = Date.now();
    await irA(page, pestana);
    await expect(contenido).toBeVisible();
    const ms = Date.now() - t;
    expect(ms, `${pestana} ha tardado ${ms} ms: ha esperado a la red`).toBeLessThan(1000);
    await expect(page.getByText("Cargando…")).toHaveCount(0);
  }
  expect(red.peticiones, "al cambiar de pestaña no debe pedirse nada al servidor").toBe(0);
});

test("tras un cambio no se ve el dato viejo: la memoria se vacía y se vuelve a pedir", async ({ page }) => {
  test.slow();
  await registrar(page, nombreUnico("fresca"));
  await irA(page, "Perfil");
  const altura = page.getByLabel("Altura (cm)");
  await expect(altura).toHaveValue("");
  await altura.fill("181");
  await page.getByRole("button", { name: "Guardar perfil" }).click();
  await expect(page.getByRole("status")).toContainText("Perfil guardado");

  await irA(page, "Inicio");
  await irA(page, "Perfil");
  await expect(page.getByLabel("Altura (cm)")).toHaveValue("181");

  // Y lo entrenado aparece en Inicio y en el Diario, aunque ya se hubieran visitado antes
  await irA(page, "Diario");
  await entrenar(page, "Mixta", [["Press de banca", "60", "10"]]);
  await irA(page, "Inicio");
  await expect(page.getByRole("article", { name: "Último entrenamiento" })).toContainText("Mixta");
  await irA(page, "Diario");
  await expect(
    page.getByRole("region", { name: "Progreso" }).getByRole("article", { name: "Entrenos por semana" }).locator(".lectura"),
  ).toHaveText("1 entreno esta semana");
});
