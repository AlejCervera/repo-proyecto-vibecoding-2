import { expect, test, vi } from "vitest";

// test-setup simula la precarga para el resto de pruebas; aquí se prueba la de verdad.
const { precargarHistoriales, precargarPestanas } =
  await vi.importActual<typeof import("./precarga")>("./precarga");

function servidor(status = 200) {
  const fn = vi.fn(async () => new Response(JSON.stringify([]), { status }));
  vi.stubGlobal("fetch", fn);
  return fn;
}

const rutas = (fn: ReturnType<typeof servidor>) =>
  (fn.mock.calls as unknown as [string][]).map(([url]) => url).sort();

test("precarga lo mismo que piden las pestañas, con las mismas rutas", async () => {
  const fetch = servidor();
  await precargarPestanas("2026-11-17");
  expect(rutas(fetch)).toEqual(
    [
      "/api/series",
      "/api/rutinas",
      "/api/entrenamientos",
      "/api/plan/semana",
      "/api/plan/dias?desde=2026-09-23&hasta=2026-11-23", // Inicio: 8 semanas hasta el domingo
      "/api/plan/dias?desde=2026-11-01&hasta=2026-11-30", // Diario: el mes
      "/api/ejercicios/propios",
      "/api/perfil",
    ].sort(),
  );
});

test("lo precargado queda en memoria: abrir la pestaña ya no pide nada", async () => {
  const fetch = servidor();
  await precargarPestanas("2026-11-17");
  fetch.mockClear();
  const { listarRutinas } = await import("./api/rutinas");
  const { listarSeries } = await import("./api/series");
  await Promise.all([listarRutinas(), listarSeries()]);
  expect(fetch).not.toHaveBeenCalled();
});

test("si el servidor falla, la precarga no rompe nada", async () => {
  servidor(500);
  await expect(precargarPestanas("2026-11-17")).resolves.toBeDefined();
  await expect(precargarHistoriales([1, 2])).resolves.toBeDefined();
});

test("al empezar un entreno, precarga el historial de cada ejercicio", async () => {
  const fetch = servidor();
  await precargarHistoriales([3, 8]);
  expect(rutas(fetch)).toEqual(["/api/ejercicios/3/series", "/api/ejercicios/8/series"]);
});
