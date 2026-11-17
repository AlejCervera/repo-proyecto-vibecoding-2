import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { hayMovimiento, saltito, salidaSuave, valorEn } from "./movimiento";
import { useCuentaArriba } from "./useCuentaArriba";

/** Simula la preferencia del sistema «Reducir movimiento». */
function preferencia(reducir: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((q: string) => ({ matches: reducir && q.includes("reduce"), media: q })),
  );
}

afterEach(() => {
  vi.useRealTimers();
});

test("salidaSuave va de 0 a 1, frena al final y no se sale de rango", () => {
  expect(salidaSuave(0)).toBe(0);
  expect(salidaSuave(1)).toBe(1);
  expect(salidaSuave(0.5)).toBeCloseTo(0.875);
  expect(salidaSuave(-1)).toBe(0);
  expect(salidaSuave(2)).toBe(1);
});

test("valorEn: empieza en 0, llega exacto al final y no se pasa", () => {
  expect(valorEn(1100, 0, 600)).toBe(0);
  expect(valorEn(1100, 300, 600)).toBeCloseTo(962.5);
  expect(valorEn(1100, 600, 600)).toBe(1100);
  expect(valorEn(1100, 9999, 600)).toBe(1100);
  expect(valorEn(7, 10, 0)).toBe(7);
});

test("hayMovimiento respeta «Reducir movimiento» y es false si el navegador no lo sabe", () => {
  expect(hayMovimiento()).toBe(false); // jsdom no tiene matchMedia
  preferencia(false);
  expect(hayMovimiento()).toBe(true);
  preferencia(true);
  expect(hayMovimiento()).toBe(false);
});

test("saltito anima el elemento solo si hay movimiento", () => {
  const el = document.createElement("input");
  const animate = vi.fn();
  Object.assign(el, { animate });
  preferencia(true);
  saltito(el);
  expect(animate).not.toHaveBeenCalled();
  preferencia(false);
  saltito(el);
  expect(animate).toHaveBeenCalledTimes(1);
  saltito(null); // sin elemento no falla
});

test("useCuentaArriba cuenta de 0 al valor final", () => {
  vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance"] });
  preferencia(false);
  const { result } = renderHook(() => useCuentaArriba(1100, 600));
  expect(result.current).toBe(0);
  act(() => vi.advanceTimersByTime(300));
  expect(result.current).toBeGreaterThan(0);
  expect(result.current).toBeLessThan(1100);
  act(() => vi.advanceTimersByTime(400));
  expect(result.current).toBe(1100);
});

test("useCuentaArriba con «Reducir movimiento» enseña el valor final desde el principio", () => {
  preferencia(true);
  const { result } = renderHook(() => useCuentaArriba(1100));
  expect(result.current).toBe(1100);
});
