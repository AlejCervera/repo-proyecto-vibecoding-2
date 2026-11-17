import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { vaciar } from "./api/cache";

// La precarga hace peticiones por su cuenta y desordenaría las respuestas simuladas de cada
// prueba: aquí no hace nada. Se prueba aparte en precarga.test.ts.
vi.mock("./precarga", () => ({
  precargarPestanas: vi.fn(async () => undefined),
  precargarHistoriales: vi.fn(async () => undefined),
}));

afterEach(() => {
  cleanup();
  vaciar(); // la memoria de la API no pasa de una prueba a otra
  vi.unstubAllGlobals();
  sessionStorage.clear();
  localStorage.clear();
});

/** Simula fetch con una lista de respuestas, en orden. */
export function simularFetch(...respuestas: { status: number; body: unknown }[]) {
  const fn = vi.fn();
  for (const r of respuestas) {
    fn.mockResolvedValueOnce(
      new Response(r.status === 204 ? null : JSON.stringify(r.body), {
        status: r.status,
        headers: { "Content-Type": "application/json" },
      }),
    );
  }
  vi.stubGlobal("fetch", fn);
  return fn;
}
