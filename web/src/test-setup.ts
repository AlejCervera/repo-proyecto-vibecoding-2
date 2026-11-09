import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  sessionStorage.clear();
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
