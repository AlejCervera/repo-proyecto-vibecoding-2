import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { alVaciar, vaciar, VIGENCIA_MS } from "./cache";
import { enviarJson, pedir } from "./http";

/** fetch simulado que responde siempre `datos` (una copia nueva cada vez). */
function servidor(datos: unknown = [{ id: 1 }], status = 200) {
  const fn = vi.fn(async () => new Response(JSON.stringify(datos), { status }));
  vi.stubGlobal("fetch", fn);
  return fn;
}

beforeEach(() => vaciar());
afterEach(() => {
  vi.useRealTimers();
  vaciar();
});

test("una lectura repetida sale de la memoria, sin volver a la red", async () => {
  const fetch = servidor();
  expect(await pedir("/rutinas")).toEqual([{ id: 1 }]);
  expect(await pedir("/rutinas")).toEqual([{ id: 1 }]);
  expect(fetch).toHaveBeenCalledTimes(1);
});

test("cada ruta se guarda aparte (con su consulta)", async () => {
  const fetch = servidor();
  await pedir("/plan/dias?desde=2026-11-01&hasta=2026-11-30");
  await pedir("/plan/dias?desde=2026-12-01&hasta=2026-12-31");
  expect(fetch).toHaveBeenCalledTimes(2);
});

test("devuelve copias: cambiar lo recibido no estropea lo guardado", async () => {
  servidor([{ id: 1 }]);
  const a = await pedir<{ id: number }[]>("/rutinas");
  a.push({ id: 99 });
  a[0].id = 7;
  expect(await pedir("/rutinas")).toEqual([{ id: 1 }]);
});

test("dos lecturas a la vez de lo mismo hacen una sola petición", async () => {
  const fetch = servidor();
  await Promise.all([pedir("/series"), pedir("/series")]);
  expect(fetch).toHaveBeenCalledTimes(1);
});

test("cualquier escritura vacía la memoria: lo siguiente se lee del servidor", async () => {
  const fetch = servidor();
  await pedir("/series");
  await pedir("/series", enviarJson({ peso: 60 }));
  await pedir("/series");
  expect(fetch).toHaveBeenCalledTimes(3);
});

test("una lectura que acaba después de una escritura no guarda datos viejos", async () => {
  let responder: (r: Response) => void = () => {};
  const fn = vi
    .fn()
    .mockImplementationOnce(() => new Promise<Response>((r) => (responder = r))) // lectura lenta
    .mockImplementation(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
  vi.stubGlobal("fetch", fn);
  const lenta = pedir("/series");
  await pedir("/series", enviarJson({ peso: 60 }));
  responder(new Response(JSON.stringify(["viejo"]), { status: 200 }));
  expect(await lenta).toEqual(["viejo"]); // quien la pidió la recibe…
  await pedir("/series"); // …pero no se guarda: se vuelve a pedir
  expect(fn).toHaveBeenCalledTimes(3);
});

test("los errores no se guardan", async () => {
  const fetch = servidor({ error: "Inicia sesión para continuar" }, 401);
  await expect(pedir("/series")).rejects.toThrow("Inicia sesión");
  await expect(pedir("/series")).rejects.toThrow("Inicia sesión");
  expect(fetch).toHaveBeenCalledTimes(2);
});

test("la sesión (/auth) siempre se pregunta al servidor", async () => {
  const fetch = servidor({ id: 1, nombre_usuario: "ana" });
  await pedir("/auth/yo");
  await pedir("/auth/yo");
  expect(fetch).toHaveBeenCalledTimes(2);
});

test("pasado su tiempo de vigencia, se vuelve a pedir", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  const fetch = servidor();
  await pedir("/rutinas");
  vi.setSystemTime(Date.now() + VIGENCIA_MS + 1);
  await pedir("/rutinas");
  expect(fetch).toHaveBeenCalledTimes(2);
});

test("tras una escritura avisa (una vez, poco después) para volver a precargar", async () => {
  vi.useFakeTimers();
  servidor();
  const precargar = vi.fn();
  const quitar = alVaciar(precargar);
  await pedir("/series", enviarJson({ peso: 60 }));
  await pedir("/series", enviarJson({ peso: 62.5 }));
  expect(precargar).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1000);
  expect(precargar).toHaveBeenCalledTimes(1);
  quitar();
});

test("al volver a la app tras un rato en segundo plano, se olvida todo", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  const fetch = servidor();
  await pedir("/rutinas");
  const estado = vi.spyOn(document, "visibilityState", "get");
  estado.mockReturnValue("hidden");
  document.dispatchEvent(new Event("visibilitychange"));
  vi.setSystemTime(Date.now() + 2 * 60_000);
  estado.mockReturnValue("visible");
  document.dispatchEvent(new Event("visibilitychange"));
  await pedir("/rutinas");
  expect(fetch).toHaveBeenCalledTimes(2);
  estado.mockRestore();
});
